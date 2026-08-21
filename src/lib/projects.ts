import { toISODate } from "@/lib/inventory";
import type { ProjectSprint, SprintStatus, StudentProject } from "@/lib/types";

export const PROJECT_COURSES = [
  "Design & Technology",
  "Robotics",
  "Computer Science",
  "Art & Design",
  "Grade 6 STEM",
  "Science",
] as const;

export type ProjectCourse = (typeof PROJECT_COURSES)[number];

export const MIN_PROJECT_WEEKS = 6;
export const MAX_PROJECT_WEEKS = 12;

/** First Friday on/after start, then +7·weekIdx days (0-based week index). */
export function fridayFor(startIso: string, weekIdx: number): string {
  const d = new Date(`${startIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return startIso;
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7) + weekIdx * 7);
  return toISODate(d);
}

export function defaultSprintPlan(
  startIso: string,
  weekCount: number,
): ProjectSprint[] {
  const n = Math.min(
    MAX_PROJECT_WEEKS,
    Math.max(MIN_PROJECT_WEEKS, weekCount),
  );
  return Array.from({ length: n }, (_, i) => ({
    n: i + 1,
    objective: "",
    due: fridayFor(startIso, i),
    status: "todo" as SprintStatus,
  }));
}

export function normalizeSprint(raw: unknown, index: number): ProjectSprint {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const status =
    row.status === "doing" || row.status === "done" ? row.status : "todo";
  const n = Number(row.n);
  return {
    n: Number.isFinite(n) && n >= 1 ? n : index + 1,
    objective: String(row.objective ?? ""),
    due: String(row.due ?? ""),
    status,
  };
}

export function normalizeProject(row: Record<string, unknown>): StudentProject {
  const weeksRaw = Array.isArray(row.weeks) ? row.weeks : [];
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    course: String(row.course ?? ""),
    unit: String(row.unit ?? ""),
    initials: String(row.initials ?? ""),
    summary: String(row.summary ?? ""),
    start: String(row.start_date ?? row.start ?? ""),
    createdAt: row.created_at
      ? new Date(String(row.created_at)).getTime()
      : Number(row.createdAt) || Date.now(),
    weeks: weeksRaw.map((w, i) => normalizeSprint(w, i)),
  };
}

export function sprintProgress(project: StudentProject) {
  const total = project.weeks.length;
  const done = project.weeks.filter((w) => w.status === "done").length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function nextOpenSprint(project: StudentProject): ProjectSprint | null {
  return project.weeks.find((w) => w.status !== "done") ?? null;
}

export function isSprintOverdue(sprint: ProjectSprint, todayIso: string) {
  return sprint.status !== "done" && sprint.due < todayIso;
}

export function formatSprintDue(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const MON = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return `${DOW[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${MON[d.getMonth()]}`;
}

export function todayIsoLocal() {
  return toISODate(new Date());
}
