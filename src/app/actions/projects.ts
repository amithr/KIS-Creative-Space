"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/data";
import {
  MAX_PROJECT_WEEKS,
  MIN_PROJECT_WEEKS,
  PROJECT_COURSES,
  normalizeSprint,
} from "@/lib/projects";
import {
  checkTeacherPortalPassword,
  clearTeacherPortalSession,
  isValidTeacherEmail,
  setTeacherPortalSession,
  teacherPortalConfigured,
} from "@/lib/teacher-portal";
import type { ProjectSprint, StudentProject } from "@/lib/types";

export type ProjectActionResult =
  | { ok: true; projectId?: string; project?: StudentProject }
  | { ok: false; error: string };

function revalidateProjects() {
  revalidatePath("/projects");
  revalidatePath("/admin");
}

export type CreateProjectInput = {
  email: string;
  course: string;
  unit: string;
  initials: string;
  summary: string;
  start: string;
  weeks: Array<{ objective: string; due: string }>;
};

export async function createStudentProject(
  input: CreateProjectInput,
): Promise<ProjectActionResult> {
  const email = input.email.trim().toLowerCase();
  const unit = input.unit.trim();
  const initials = input.initials.trim().toUpperCase();
  const summary = input.summary.trim();
  const start = input.start.trim();
  const course = input.course.trim();

  if (!isValidTeacherEmail(email)) {
    return { ok: false, error: "Enter a valid school email address." };
  }
  if (!unit) return { ok: false, error: "Unit name is required." };
  if (!initials) return { ok: false, error: "Student initials are required." };
  if (!summary) return { ok: false, error: "Summary is required." };
  if (!start) return { ok: false, error: "Start date is required." };
  if (!(PROJECT_COURSES as readonly string[]).includes(course)) {
    return { ok: false, error: "Pick a course from the list." };
  }

  const weekCount = input.weeks.length;
  if (weekCount < MIN_PROJECT_WEEKS || weekCount > MAX_PROJECT_WEEKS) {
    return {
      ok: false,
      error: `Projects need ${MIN_PROJECT_WEEKS}–${MAX_PROJECT_WEEKS} weeks.`,
    };
  }

  const weeks: ProjectSprint[] = input.weeks.map((w, i) =>
    normalizeSprint(
      {
        n: i + 1,
        objective: w.objective.trim() || `Sprint ${i + 1}`,
        due: w.due.trim(),
        status: "todo",
      },
      i,
    ),
  );

  for (const w of weeks) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w.due)) {
      return { ok: false, error: `Sprint ${w.n} needs a valid due date.` };
    }
  }

  if (!teacherPortalConfigured()) {
    return {
      ok: false,
      error: "Teacher portal password is not configured (TEACHER_PORTAL_PW).",
    };
  }

  if (!hasSupabaseEnv()) {
    const demo: StudentProject = {
      id: `local-${Date.now()}`,
      email,
      course,
      unit,
      initials,
      summary,
      start,
      createdAt: Date.now(),
      weeks,
    };
    await setTeacherPortalSession(email);
    revalidateProjects();
    return { ok: true, projectId: demo.id, project: demo };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_projects")
    .insert({
      email,
      course,
      unit,
      initials,
      summary,
      start_date: start,
      weeks,
    })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  await setTeacherPortalSession(email);
  revalidateProjects();

  const project = {
    id: String(data.id),
    email,
    course,
    unit,
    initials,
    summary,
    start,
    createdAt: new Date(String(data.created_at)).getTime(),
    weeks,
  };
  return { ok: true, projectId: project.id, project };
}

export async function signInTeacherPortal(
  email: string,
  password: string,
): Promise<ProjectActionResult> {
  if (!teacherPortalConfigured()) {
    return {
      ok: false,
      error: "Teacher portal password is not configured (TEACHER_PORTAL_PW).",
    };
  }
  if (!isValidTeacherEmail(email)) {
    return { ok: false, error: "Enter a valid school email address." };
  }
  if (!checkTeacherPortalPassword(password)) {
    return {
      ok: false,
      error: "That's not it — check with the coordinator and try again.",
    };
  }
  await setTeacherPortalSession(email.trim());
  revalidatePath("/projects");
  return { ok: true };
}

export async function signOutTeacherPortal(): Promise<void> {
  await clearTeacherPortalSession();
  revalidatePath("/projects");
}
