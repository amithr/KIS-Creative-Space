"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/data";
import {
  MAX_PROJECT_WEEKS,
  MIN_PROJECT_WEEKS,
  PROJECT_COURSES,
  normalizeProject,
  normalizeSprint,
  publicProject,
} from "@/lib/projects";
import {
  checkTeacherPortalPassword,
  clearTeacherPortalSession,
  getTeacherPortalEmail,
  isValidTeacherEmail,
  setTeacherPortalSession,
  teacherPortalConfigured,
} from "@/lib/teacher-portal";
import type { ProjectSprint, SprintStatus, StudentProject } from "@/lib/types";

export type ProjectActionResult =
  | { ok: true; projectId?: string; project?: StudentProject; editKey?: string }
  | { ok: false; error: string };

function revalidateProjects() {
  revalidatePath("/projects");
  revalidatePath("/admin");
}

function newEditKey() {
  return randomBytes(6).toString("base64url").slice(0, 8);
}

async function loadProjectRow(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error) return { error: error.message as string, project: null as null };
  if (!data) return { error: null, project: null };
  return {
    error: null,
    project: normalizeProject(data as Record<string, unknown>),
  };
}

/** Owner (session email) or valid editKey for this board. */
async function authorizeBoardWrite(
  project: StudentProject,
  editKey?: string | null,
): Promise<boolean> {
  const sessionEmail = await getTeacherPortalEmail();
  if (
    sessionEmail &&
    sessionEmail.toLowerCase() === project.email.toLowerCase()
  ) {
    return true;
  }
  if (
    editKey &&
    project.editKey &&
    editKey === project.editKey
  ) {
    return true;
  }
  return false;
}

export type CreateProjectInput = {
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
  const sessionEmail = await getTeacherPortalEmail();
  if (!sessionEmail) {
    return { ok: false, error: "Sign in to create a project." };
  }
  if (!teacherPortalConfigured()) {
    return {
      ok: false,
      error: "Teacher portal password is not configured (TEACHER_PORTAL_PW).",
    };
  }

  const email = sessionEmail;
  const unit = input.unit.trim();
  const initials = input.initials.trim().toUpperCase();
  const summary = input.summary.trim();
  const start = input.start.trim();
  const course = input.course.trim();

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
    revalidateProjects();
    return { ok: true, projectId: demo.id, project: publicProject(demo) };
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

  revalidateProjects();
  const project = publicProject(
    normalizeProject(data as Record<string, unknown>),
  );
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
    return {
      ok: false,
      error: "Enter the school email you created your projects with.",
    };
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

/** Lazy-generate editKey for the signed-in owner. */
export async function ensureProjectEditKey(
  projectId: string,
): Promise<ProjectActionResult> {
  const sessionEmail = await getTeacherPortalEmail();
  if (!sessionEmail) return { ok: false, error: "Sign in required." };
  if (!projectId) return { ok: false, error: "Missing project." };

  if (!hasSupabaseEnv()) {
    return { ok: true, editKey: newEditKey() };
  }

  const loaded = await loadProjectRow(projectId);
  if (loaded.error) return { ok: false, error: loaded.error };
  if (!loaded.project) return { ok: false, error: "Project not found." };
  if (loaded.project.email.toLowerCase() !== sessionEmail.toLowerCase()) {
    return { ok: false, error: "Only the board owner can create a teacher link." };
  }

  if (loaded.project.editKey) {
    return { ok: true, editKey: loaded.project.editKey };
  }

  const key = newEditKey();
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_projects")
    .update({ edit_key: key })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, editKey: key };
}

export async function fetchSharedProject(
  projectId: string,
): Promise<ProjectActionResult> {
  if (!projectId) return { ok: false, error: "Missing project." };
  if (!hasSupabaseEnv()) return { ok: false, error: "Unavailable." };
  const loaded = await loadProjectRow(projectId);
  if (loaded.error) return { ok: false, error: loaded.error };
  if (!loaded.project) return { ok: false, error: "Project not found." };
  return { ok: true, project: publicProject(loaded.project) };
}

export async function updatePortalSprintStatus(
  projectId: string,
  sprintN: number,
  status: SprintStatus,
  editKey?: string | null,
): Promise<ProjectActionResult> {
  if (!projectId) return { ok: false, error: "Missing project." };
  if (!["todo", "doing", "done"].includes(status)) {
    return { ok: false, error: "Invalid status." };
  }
  if (!hasSupabaseEnv()) return { ok: false, error: "Unavailable." };

  const loaded = await loadProjectRow(projectId);
  if (loaded.error) return { ok: false, error: loaded.error };
  if (!loaded.project) return { ok: false, error: "Project not found." };
  if (!(await authorizeBoardWrite(loaded.project, editKey))) {
    return { ok: false, error: "You don't have edit access to this board." };
  }

  const weeks = loaded.project.weeks.map((w) =>
    w.n === sprintN ? { ...w, status } : w,
  );
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_projects")
    .update({ weeks })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };

  revalidateProjects();
  return {
    ok: true,
    project: publicProject({ ...loaded.project, weeks }),
  };
}

export async function updatePortalSprintDue(
  projectId: string,
  sprintN: number,
  due: string,
  editKey?: string | null,
): Promise<ProjectActionResult> {
  if (!projectId) return { ok: false, error: "Missing project." };
  const nextDue = due.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue)) {
    return { ok: false, error: "Invalid due date." };
  }
  if (!hasSupabaseEnv()) return { ok: false, error: "Unavailable." };

  const loaded = await loadProjectRow(projectId);
  if (loaded.error) return { ok: false, error: loaded.error };
  if (!loaded.project) return { ok: false, error: "Project not found." };
  if (!(await authorizeBoardWrite(loaded.project, editKey))) {
    return { ok: false, error: "You don't have edit access to this board." };
  }

  const weeks = loaded.project.weeks.map((w) =>
    w.n === sprintN ? { ...w, due: nextDue } : w,
  );
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_projects")
    .update({ weeks })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };

  revalidateProjects();
  return {
    ok: true,
    project: publicProject({ ...loaded.project, weeks }),
  };
}
