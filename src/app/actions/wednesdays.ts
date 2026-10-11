"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getPeriodBookings,
  getSpaceBlocks,
  getStudentProjectById,
  getTrainingSessions,
  hasSupabaseEnv,
} from "@/lib/data";
import { nextOpenSprint } from "@/lib/projects";
import {
  getTeacherPortalEmail,
  teacherPortalConfigured,
} from "@/lib/teacher-portal";
import {
  normalizeWednesdayEntry,
  periodTakenOnStudioCalendar,
  studioCalendarRowsForDate,
} from "@/lib/wednesdays";
import type { WednesdayEntry } from "@/lib/types";

export type WednesdayActionResult =
  | { ok: true; entry?: WednesdayEntry; id?: string }
  | { ok: false; error: string };

function revalidateWednesdays() {
  revalidatePath("/wednesdays");
  revalidatePath("/calendar");
  revalidatePath("/admin");
}

async function loadEntry(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wednesday_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: error.message, entry: null as null };
  if (!data) return { error: null, entry: null };
  return {
    error: null,
    entry: normalizeWednesdayEntry(data as Record<string, unknown>),
  };
}

export type CreateWednesdayInput = {
  sessionDate: string;
  period: number;
  projectId?: string | null;
  text?: string;
  cls?: string;
  resources?: string;
};

export async function createWednesdayEntry(
  input: CreateWednesdayInput,
): Promise<WednesdayActionResult> {
  const email = await getTeacherPortalEmail();
  if (!email) return { ok: false, error: "Sign in to add a design session." };
  if (!teacherPortalConfigured()) {
    return {
      ok: false,
      error: "Teacher portal password is not configured (TEACHER_PORTAL_PW).",
    };
  }
  if (!hasSupabaseEnv()) return { ok: false, error: "Database not configured." };

  const sessionDate = input.sessionDate.trim();
  const period = input.period;
  if (!sessionDate || period < 1 || period > 8) {
    return { ok: false, error: "Pick a Wednesday and a period." };
  }

  const [bookings, training, blocks] = await Promise.all([
    getPeriodBookings(sessionDate, sessionDate),
    getTrainingSessions(sessionDate, sessionDate),
    getSpaceBlocks(),
  ]);
  const cal = studioCalendarRowsForDate(
    sessionDate,
    bookings,
    training,
    blocks,
  );
  if (periodTakenOnStudioCalendar(period, cal)) {
    return {
      ok: false,
      error: `P${period} is already taken that day — see the schedule on the right.`,
    };
  }

  let cls = (input.cls ?? "").trim().toUpperCase();
  let text = (input.text ?? "").trim();
  let projectId: string | null = input.projectId?.trim() || null;

  if (projectId) {
    const project = await getStudentProjectById(projectId);
    if (!project || project.email.toLowerCase() !== email.toLowerCase()) {
      return { ok: false, error: "That project isn't available." };
    }
    cls = project.initials;
    const next = nextOpenSprint(project);
    text = next
      ? `${project.unit} — Sprint ${next.n}: ${next.objective}`
      : project.unit;
  } else {
    projectId = null;
    if (!text) {
      return {
        ok: false,
        error: "Tell us what you'll be doing — one line is plenty.",
      };
    }
    if (!cls) {
      return { ok: false, error: "Which class is coming? e.g. 3B." };
    }
  }

  const resources = input.resources?.trim() || null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wednesday_entries")
    .insert({
      session_date: sessionDate,
      email,
      period,
      cls,
      text,
      resources,
      project_id: projectId,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: `P${period} is already taken that day — see the schedule on the right.`,
      };
    }
    return { ok: false, error: error.message };
  }

  revalidateWednesdays();
  return {
    ok: true,
    entry: normalizeWednesdayEntry(data as Record<string, unknown>),
  };
}

export async function updateWednesdayEntry(
  id: string,
  input: { text: string; cls: string; resources?: string },
): Promise<WednesdayActionResult> {
  const email = await getTeacherPortalEmail();
  if (!email) return { ok: false, error: "Sign in to edit." };

  const { error: loadError, entry } = await loadEntry(id);
  if (loadError) return { ok: false, error: loadError };
  if (!entry) return { ok: false, error: "Sign-up not found." };
  if (entry.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, error: "You can only edit your own entries." };
  }

  const text = input.text.trim();
  const cls = input.cls.trim().toUpperCase();
  if (!text || !cls) {
    return {
      ok: false,
      error: "Keep a description and a class — both are needed.",
    };
  }
  const resources = input.resources?.trim() || null;
  const clearProject = text !== entry.text;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wednesday_entries")
    .update({
      text,
      cls,
      resources,
      ...(clearProject ? { project_id: null } : {}),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidateWednesdays();
  return {
    ok: true,
    entry: normalizeWednesdayEntry(data as Record<string, unknown>),
  };
}

export async function deleteWednesdayEntry(
  id: string,
): Promise<WednesdayActionResult> {
  const email = await getTeacherPortalEmail();
  if (!email) return { ok: false, error: "Sign in to remove." };

  const { error: loadError, entry } = await loadEntry(id);
  if (loadError) return { ok: false, error: loadError };
  if (!entry) return { ok: false, error: "Sign-up not found." };
  if (entry.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, error: "You can only remove your own entries." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("wednesday_entries")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateWednesdays();
  return { ok: true, id, entry };
}

/** Admin restore after undo — re-inserts a deleted row snapshot. */
export async function restoreWednesdayEntry(
  snapshot: WednesdayEntry,
): Promise<WednesdayActionResult> {
  const email = await getTeacherPortalEmail();
  if (!email) return { ok: false, error: "Sign in to restore." };
  if (snapshot.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, error: "You can only restore your own entries." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wednesday_entries")
    .insert({
      session_date: snapshot.session_date,
      email: snapshot.email,
      period: snapshot.period,
      cls: snapshot.cls,
      text: snapshot.text,
      resources: snapshot.resources,
      project_id: snapshot.project_id,
    })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidateWednesdays();
  return {
    ok: true,
    entry: normalizeWednesdayEntry(data as Record<string, unknown>),
  };
}
