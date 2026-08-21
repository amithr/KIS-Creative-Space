"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStudentProject,
  signInTeacherPortal,
  signOutTeacherPortal,
} from "@/app/actions/projects";
import { SiteFooter } from "@/components/SiteFooter";
import { toISODate } from "@/lib/inventory";
import {
  MAX_PROJECT_WEEKS,
  MIN_PROJECT_WEEKS,
  PROJECT_COURSES,
  fridayFor,
  formatSprintDue,
  isSprintOverdue,
  nextOpenSprint,
  sprintProgress,
  todayIsoLocal,
} from "@/lib/projects";
import type { StudentProject } from "@/lib/types";

type View = "home" | "create" | "signin" | "list" | "board";

type ProjectsClientProps = {
  signedInEmail: string | null;
  initialProjects: StudentProject[];
};

const fieldLabel =
  "font-mono text-[10.5px] tracking-[0.16em] text-[#6d6759]";
const underline =
  "w-full border-0 border-b border-[#e3e0d8] bg-transparent px-0 py-2 text-[14.5px] outline-none focus:border-[#141414]";

export function ProjectsClient({
  signedInEmail,
  initialProjects,
}: ProjectsClientProps) {
  const router = useRouter();
  const [view, setView] = useState<View>(
    signedInEmail ? "list" : "home",
  );
  const [projects, setProjects] = useState(initialProjects);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [email, setEmail] = useState(signedInEmail ?? "");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  // Create form
  const [fEmail, setFEmail] = useState("");
  const [fUnit, setFUnit] = useState("");
  const [fCourse, setFCourse] = useState<string>(PROJECT_COURSES[0]);
  const [fInitials, setFInitials] = useState("");
  const [fStart, setFStart] = useState(toISODate(new Date()));
  const [fWeeks, setFWeeks] = useState(MIN_PROJECT_WEEKS);
  const [fSummary, setFSummary] = useState("");
  const [fObjectives, setFObjectives] = useState<string[]>(
    Array(MIN_PROJECT_WEEKS).fill(""),
  );
  const [fDues, setFDues] = useState<Record<number, string>>({});
  const [fError, setFError] = useState("");
  const [fInvalid, setFInvalid] = useState<Record<string, boolean>>({});

  // Sign in
  const [siEmail, setSiEmail] = useState("");
  const [siPw, setSiPw] = useState("");
  const [siError, setSiError] = useState("");

  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    if (signedInEmail) setEmail(signedInEmail);
  }, [signedInEmail]);

  useEffect(() => {
    setFObjectives((prev) => {
      const next = Array.from({ length: fWeeks }, (_, i) => prev[i] ?? "");
      return next;
    });
  }, [fWeeks]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }

  function go(next: View) {
    setView(next);
    setFError("");
    setSiError("");
  }

  const board = useMemo(
    () => projects.find((p) => p.id === boardId) ?? null,
    [projects, boardId],
  );

  const today = todayIsoLocal();

  const byCourse = useMemo(() => {
    const map = new Map<string, StudentProject[]>();
    for (const p of projects) {
      const list = map.get(p.course) ?? [];
      list.push(p);
      map.set(p.course, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [projects]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const [c] of byCourse) next[c] = openCourses[c] ?? true;
    setOpenCourses((prev) => ({ ...next, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byCourse.length]);

  function dueFor(i: number) {
    return fDues[i] || fridayFor(fStart, i);
  }

  function submitCreate() {
    const missing = {
      email: !/.+@.+\..+/.test(fEmail.trim()),
      unit: !fUnit.trim(),
      initials: !fInitials.trim(),
      summary: !fSummary.trim(),
    };
    setFInvalid(missing);
    if (Object.values(missing).some(Boolean)) {
      setFError("Fill in the highlighted fields.");
      setShake((n) => n + 1);
      return;
    }
    startTransition(async () => {
      setFError("");
      const result = await createStudentProject({
        email: fEmail,
        course: fCourse,
        unit: fUnit,
        initials: fInitials,
        summary: fSummary,
        start: fStart,
        weeks: Array.from({ length: fWeeks }, (_, i) => ({
          objective: fObjectives[i] || "",
          due: dueFor(i),
        })),
      });
      if (!result.ok) {
        setFError(result.error);
        setShake((n) => n + 1);
        return;
      }
      if (result.project) {
        setProjects((prev) => [result.project!, ...prev]);
        setBoardId(result.project.id);
      } else if (result.projectId) {
        setBoardId(result.projectId);
      }
      setEmail(fEmail.trim().toLowerCase());
      showToast(`PROJECT CREATED ✓ · ${fWeeks} SPRINTS · FRIDAYS`);
      go("board");
      router.refresh();
    });
  }

  function submitSignIn() {
    startTransition(async () => {
      setSiError("");
      const result = await signInTeacherPortal(siEmail, siPw);
      if (!result.ok) {
        setSiError(result.error);
        setShake((n) => n + 1);
        return;
      }
      setEmail(siEmail.trim().toLowerCase());
      go("list");
      router.refresh();
    });
  }

  const cardHover =
    "transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#c8102e]";

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col">
      <div className="page-gutter flex-1 pb-12 pt-6 md:pt-8">
        {view === "home" && (
          <div className="kis-pop mx-auto max-w-2xl">
            <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-[#8a857a] md:text-[12px]">
              ПРОЄКТИ · PROJECTS
            </p>
            <h1 className="text-[27px] font-semibold tracking-[-0.01em] md:text-[40px]">
              Long-term student projects
            </h1>
            <span className="kis-title-underline !mt-2.5 !w-14" />
            <p className="mt-3 max-w-xl text-[14.5px] text-[#6d6759]">
              Design a multi-week sprint plan, then check progress on each
              student board.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => go("create")}
                className={`border-2 border-[#141414] bg-white px-5 py-8 text-left ${cardHover}`}
              >
                <p className="font-mono text-[10.5px] tracking-[0.18em] text-[#c8102e]">
                  FOR TEACHERS · NEW
                </p>
                <p className="mt-3 text-[20px] font-semibold">
                  Design a project →
                </p>
              </button>
              <button
                type="button"
                onClick={() => go(signedInEmail ? "list" : "signin")}
                className={`border-2 border-[#141414] bg-[#141414] px-5 py-8 text-left text-white ${cardHover}`}
              >
                <p className="font-mono text-[10.5px] tracking-[0.18em] text-[#f4f1ea]/opacity-70">
                  ALREADY STARTED
                </p>
                <p className="mt-3 text-[20px] font-semibold">
                  Check progress →
                </p>
              </button>
            </div>
          </div>
        )}

        {view === "create" && (
          <div className={`kis-pop mx-auto max-w-3xl ${shake ? "kis-shake" : ""}`} key={shake}>
            <button
              type="button"
              onClick={() => go("home")}
              className="mb-4 text-[13px] text-[#6d6759] hover:text-[#c8102e]"
            >
              ← Projects
            </button>
            <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-[#8a857a]">
              NEW PROJECT
            </p>
            <h1 className="text-[26px] font-semibold">Design a project</h1>
            <span className="kis-title-underline !mt-2.5 !w-12" />

            <div className="mt-6 border border-[#e3e0d8] border-t-[3px] border-t-[#141414] bg-white p-5 md:p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>EMAIL</span>
                  <input
                    value={fEmail}
                    onChange={(e) => setFEmail(e.target.value)}
                    placeholder="m.bondar@kis.edu"
                    className={underline}
                    style={fInvalid.email ? { borderColor: "#c8102e" } : undefined}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>UNIT NAME</span>
                  <input
                    value={fUnit}
                    onChange={(e) => setFUnit(e.target.value)}
                    placeholder="Mars Rover Mission"
                    className={underline}
                    style={fInvalid.unit ? { borderColor: "#c8102e" } : undefined}
                  />
                </label>
              </div>

              <div className="mt-5">
                <span className={fieldLabel}>COURSE</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PROJECT_COURSES.map((c) => {
                    const on = fCourse === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFCourse(c)}
                        className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
                        style={{
                          background: on ? "#141414" : "#fff",
                          color: on ? "#fff" : "#3f3b33",
                          border: `1px solid ${on ? "#141414" : "#e3e0d8"}`,
                        }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>STUDENT INITIALS</span>
                  <input
                    value={fInitials}
                    onChange={(e) => setFInitials(e.target.value)}
                    placeholder="D.K. or S.P. + L.M."
                    className={underline}
                    style={
                      fInvalid.initials ? { borderColor: "#c8102e" } : undefined
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>START DATE</span>
                  <input
                    type="date"
                    value={fStart}
                    onChange={(e) => {
                      setFStart(e.target.value);
                      setFDues({});
                    }}
                    className={underline}
                  />
                </label>
                <div className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>WEEKS</span>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={fWeeks <= MIN_PROJECT_WEEKS}
                      onClick={() => setFWeeks((w) => Math.max(MIN_PROJECT_WEEKS, w - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#141414] text-[16px] disabled:border-[#e3e0d8] disabled:text-[#d5d1c8]"
                    >
                      −
                    </button>
                    <span className="min-w-[2ch] text-center text-[18px] font-semibold">
                      {fWeeks}
                    </span>
                    <button
                      type="button"
                      disabled={fWeeks >= MAX_PROJECT_WEEKS}
                      onClick={() => setFWeeks((w) => Math.min(MAX_PROJECT_WEEKS, w + 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#141414] text-[16px] disabled:border-[#e3e0d8] disabled:text-[#d5d1c8]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <label className="mt-5 flex flex-col gap-1.5">
                <span className={fieldLabel}>SUMMARY</span>
                <textarea
                  value={fSummary}
                  onChange={(e) => setFSummary(e.target.value)}
                  rows={3}
                  placeholder="Overall project goals for the student team…"
                  className="border border-[#e3e0d8] bg-white px-3 py-2.5 text-[14.5px] outline-none focus:border-[#141414]"
                  style={fInvalid.summary ? { borderColor: "#c8102e" } : undefined}
                />
              </label>
            </div>

            <div className="mt-6">
              <p className="font-mono text-[11px] tracking-[0.16em] text-[#857e6e]">
                SPRINT PLAN · FRIDAYS BY DEFAULT
              </p>
              <div className="mt-3 space-y-2">
                {Array.from({ length: fWeeks }, (_, i) => (
                  <div
                    key={i}
                    className="kis-fadeup flex flex-wrap items-end gap-3 border-b border-[#eeece5] py-3"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span className="shrink-0 bg-[#141414] px-2 py-1 font-mono text-[10px] tracking-wide text-white">
                      SPRINT {i + 1}
                    </span>
                    <label className="min-w-[200px] flex-1">
                      <span className="sr-only">Objective</span>
                      <input
                        value={fObjectives[i] ?? ""}
                        onChange={(e) => {
                          const next = fObjectives.slice();
                          next[i] = e.target.value;
                          setFObjectives(next);
                        }}
                        placeholder={
                          i === 0
                            ? "e.g. Research + concept sketches"
                            : i === fWeeks - 1
                              ? "e.g. Final demo + reflection"
                              : "Objective for this week"
                        }
                        className={underline}
                      />
                    </label>
                    <label className="w-[150px] shrink-0">
                      <span className={fieldLabel}>DUE</span>
                      <input
                        type="date"
                        value={dueFor(i)}
                        onChange={(e) =>
                          setFDues((d) => ({ ...d, [i]: e.target.value }))
                        }
                        className={underline}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {fError && (
              <p className="mt-4 text-[14px] text-[#c8102e]">{fError}</p>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={submitCreate}
              className="mt-5 bg-[#c8102e] px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-[#a50d26] disabled:opacity-60"
            >
              Create project →
            </button>
          </div>
        )}

        {view === "signin" && (
          <div
            className={`kis-pop mx-auto w-full max-w-[440px] border border-[#e3e0d8] border-t-[3px] border-t-[#141414] bg-white px-6 py-7 ${shake ? "kis-shake" : ""}`}
            key={`si-${shake}`}
          >
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#c8102e]">
              TEACHERS ONLY
            </p>
            <h1 className="mt-2 text-[24px] font-semibold">Sign in</h1>
            <p className="mt-1 text-[13.5px] text-[#6d6759]">
              Use your school email and the shared teacher password.
            </p>
            <label className="mt-5 flex flex-col gap-1.5">
              <span className={fieldLabel}>EMAIL</span>
              <input
                value={siEmail}
                onChange={(e) => setSiEmail(e.target.value)}
                className={underline}
                placeholder="m.bondar@kis.edu"
              />
            </label>
            <label className="mt-4 flex flex-col gap-1.5">
              <span className={fieldLabel}>TEACHER PASSWORD</span>
              <input
                type="password"
                value={siPw}
                onChange={(e) => setSiPw(e.target.value)}
                className={underline}
              />
            </label>
            {siError && (
              <p className="mt-3 text-[13.5px] text-[#c8102e]">{siError}</p>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={submitSignIn}
              className="mt-5 w-full bg-[#c8102e] py-3 text-[14.5px] font-semibold text-white hover:bg-[#a50d26]"
            >
              Sign in →
            </button>
            <button
              type="button"
              onClick={() => go("home")}
              className="mt-3 w-full text-center text-[13px] text-[#6d6759]"
            >
              ← Back
            </button>
          </div>
        )}

        {view === "list" && (
          <div className="kis-pop">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] tracking-[0.16em] text-[#98917f]">
                  SIGNED IN · {email.toUpperCase()}
                </p>
                <h1 className="mt-1 text-[26px] font-semibold">Your boards</h1>
                <span className="kis-title-underline !mt-2.5 !w-12" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      await signOutTeacherPortal();
                      setEmail("");
                      go("home");
                      router.refresh();
                    });
                  }}
                  className="border border-[#e3e0d8] px-4 py-2 text-[13.5px] font-semibold text-[#3f3b33] hover:border-[#141414]"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  onClick={() => go("create")}
                  className="bg-[#141414] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[#c8102e]"
                >
                  + New project
                </button>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="border border-dashed border-[#d5d1c8] px-5 py-10 text-center text-[14.5px] text-[#6d6759]">
                No projects yet.{" "}
                <button
                  type="button"
                  onClick={() => go("create")}
                  className="underline hover:text-[#c8102e]"
                >
                  Design a project →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {byCourse.map(([course, rows]) => {
                  const open = openCourses[course] !== false;
                  return (
                    <div key={course} className="border border-[#e3e0d8]">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCourses((o) => ({
                            ...o,
                            [course]: !open,
                          }))
                        }
                        className="flex w-full items-center justify-between gap-3 bg-[#faf9f5] px-4 py-3 text-left"
                      >
                        <span className="text-[15px] font-semibold">{course}</span>
                        <span className="rounded-full bg-[#eeece5] px-2 py-0.5 font-mono text-[10px] tracking-wide text-[#3f3b33]">
                          {rows.length} PROJECT{rows.length === 1 ? "" : "S"}
                        </span>
                      </button>
                      {open &&
                        rows.map((p, i) => {
                          const prog = sprintProgress(p);
                          const next = nextOpenSprint(p);
                          const overdue = next
                            ? isSprintOverdue(next, today)
                            : false;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setBoardId(p.id);
                                go("board");
                              }}
                              className="kis-fadeup flex w-full flex-wrap items-center gap-3 border-t border-[#eeece5] px-4 py-3.5 text-left hover:bg-[#fdf1f3]"
                              style={{ animationDelay: `${i * 50}ms` }}
                            >
                              <span className="shrink-0 bg-[#141414] px-2 py-1 font-mono text-[11px] text-white">
                                {p.initials}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-semibold">
                                  {p.unit}
                                </p>
                                <p className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#98917f]">
                                  {p.weeks.length} SPRINTS · STARTED{" "}
                                  {formatSprintDue(p.start)}
                                </p>
                                <div className="mt-2 h-1.5 w-full max-w-[220px] overflow-hidden bg-[#eeece5]">
                                  <div
                                    className="kis-bar h-full bg-[#c8102e]"
                                    style={{ width: `${prog.pct}%` }}
                                  />
                                </div>
                              </div>
                              <span
                                className="shrink-0 font-mono text-[10.5px] tracking-[0.06em]"
                                style={{
                                  color: overdue
                                    ? "#c8102e"
                                    : prog.done === prog.total
                                      ? "#2f9e44"
                                      : "#6d6759",
                                }}
                              >
                                {prog.done === prog.total
                                  ? "ALL SPRINTS DONE ✓"
                                  : overdue && next
                                    ? `OVERDUE · ${formatSprintDue(next.due)}`
                                    : next
                                      ? `NEXT DUE ${formatSprintDue(next.due)}`
                                      : ""}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === "board" && board && (
          <BoardView
            project={board}
            today={today}
            onBack={() => go(email ? "list" : "home")}
          />
        )}
      </div>

      {toast && (
        <div className="kis-sync-chip fixed right-6 bottom-6 z-[90] bg-[#2f9e44] px-[18px] py-[11px] font-mono text-[11px] tracking-[0.12em] text-white shadow-[0_10px_30px_rgba(20,20,20,0.28)]">
          {toast}
        </div>
      )}

      <SiteFooter />
    </div>
  );
}

function BoardView({
  project,
  today,
  onBack,
}: {
  project: StudentProject;
  today: string;
  onBack: () => void;
}) {
  const prog = sprintProgress(project);
  const next = nextOpenSprint(project);
  const cols = [
    {
      key: "todo" as const,
      label: "TO DO",
      dot: "#98917f",
      edge: "#98917f",
    },
    {
      key: "doing" as const,
      label: "IN PROGRESS",
      dot: "#e0a010",
      edge: "#e0a010",
    },
    {
      key: "done" as const,
      label: "DONE",
      dot: "#2f9e44",
      edge: "#2f9e44",
    },
  ];

  return (
    <div className="kis-pop">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-[13px] text-[#6d6759] hover:text-[#c8102e]"
      >
        ← Boards
      </button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[26px] font-semibold md:text-[32px]">
              {project.unit}
            </h1>
            <span className="bg-[#141414] px-2 py-1 font-mono text-[11px] text-white">
              {project.initials}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-[#6d6759]">
            <span className="rounded-full border border-[#e3e0d8] px-2.5 py-0.5 text-[12px] font-semibold text-[#3f3b33]">
              {project.course}
            </span>
            <span>{project.email}</span>
            {next && (
              <span
                style={{
                  color: isSprintOverdue(next, today) ? "#c8102e" : undefined,
                }}
              >
                · Next due {formatSprintDue(next.due)}
              </span>
            )}
          </div>
          {project.summary && (
            <p className="mt-3 max-w-2xl text-[14.5px] text-[#3f3b33]">
              {project.summary}
            </p>
          )}
        </div>
        <div className="min-w-[160px] text-right">
          <p className="font-mono text-[11px] tracking-[0.12em] text-[#857e6e]">
            SPRINTS DONE {prog.done} / {prog.total}
          </p>
          <div className="mt-2 ml-auto h-2 w-40 overflow-hidden bg-[#eeece5]">
            <div
              className="kis-bar h-full bg-[#c8102e]"
              style={{ width: `${prog.pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 bg-[#faf9f5] p-4 md:grid-cols-3">
        {cols.map((col) => {
          const cards = project.weeks.filter((w) => w.status === col.key);
          return (
            <div key={col.key}>
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: col.dot }}
                />
                <span className="font-mono text-[11px] tracking-[0.14em] text-[#6d6759]">
                  {col.label}
                </span>
              </div>
              <div className="space-y-2.5">
                {cards.map((w, i) => {
                  const overdue = isSprintOverdue(w, today);
                  const edge = overdue ? "#c8102e" : col.edge;
                  return (
                    <div
                      key={w.n}
                      className="kis-pop border border-[#e3e0d8] border-l-[3px] bg-white px-3.5 py-3"
                      style={{
                        borderLeftColor: edge,
                        animationDelay: `${i * 60}ms`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] tracking-wide text-[#141414]">
                          SPRINT {w.n}
                        </span>
                        <span
                          className="font-mono text-[10px] tracking-wide"
                          style={{ color: overdue ? "#c8102e" : "#98917f" }}
                        >
                          {formatSprintDue(w.due)}
                        </span>
                      </div>
                      <p
                        className="mt-1.5 text-[13.5px]"
                        style={{
                          color: col.key === "done" ? "#98917f" : "#3f3b33",
                        }}
                      >
                        {w.objective}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[12.5px] text-[#857e6e]">
        Cards are moved by the Creativity Space team — teachers can view progress
        here.
      </p>
    </div>
  );
}
