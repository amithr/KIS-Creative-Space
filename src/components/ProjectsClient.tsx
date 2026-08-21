"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStudentProject,
  ensureProjectEditKey,
  fetchSharedProject,
  signInTeacherPortal,
  signOutTeacherPortal,
  updatePortalSprintDue,
  updatePortalSprintStatus,
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
import type { SprintStatus, StudentProject } from "@/lib/types";

type View = "signin" | "create" | "list" | "board";

type LinkContext = {
  kind: "share" | "edit";
  projectId: string;
  editKey: string | null;
  canEdit: boolean;
  project: StudentProject | null;
};

type ProjectsClientProps = {
  signedInEmail: string | null;
  initialProjects: StudentProject[];
  link: LinkContext | null;
};

const fieldLabel =
  "font-mono text-[10.5px] tracking-[0.16em] text-[#6d6759]";
const underline =
  "w-full border-0 border-b border-[#e3e0d8] bg-transparent px-0 py-2 text-[14.5px] outline-none focus:border-[#141414]";

const STATUS_OPTS: Array<{
  v: SprintStatus;
  label: string;
  bg: string;
  fg: string;
}> = [
  { v: "todo", label: "TO DO", bg: "#eeece5", fg: "#3f3b33" },
  { v: "doing", label: "DOING", bg: "#fdf4e3", fg: "#9a6e06" },
  { v: "done", label: "DONE", bg: "#dff2e3", fg: "#2f7d3f" },
];

function copyText(url: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(url).catch(() => {
      window.prompt("Copy this link:", url);
    });
  }
  window.prompt("Copy this link:", url);
  return Promise.resolve();
}

export function ProjectsClient({
  signedInEmail,
  initialProjects,
  link,
}: ProjectsClientProps) {
  const router = useRouter();
  const isLink = !!link;
  const [view, setView] = useState<View>(() => {
    if (link) return "board";
    if (signedInEmail) return "list";
    return "signin";
  });
  const [projects, setProjects] = useState(initialProjects);
  const [boardId, setBoardId] = useState<string | null>(
    link?.projectId ?? null,
  );
  const [linkProject, setLinkProject] = useState<StudentProject | null>(
    link?.project ?? null,
  );
  const [email, setEmail] = useState(signedInEmail ?? "");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

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
    setFObjectives((prev) =>
      Array.from({ length: fWeeks }, (_, i) => prev[i] ?? ""),
    );
  }, [fWeeks]);

  // Live refresh for share / guest link boards
  useEffect(() => {
    if (!link?.projectId) return;
    const tick = () => {
      void fetchSharedProject(link.projectId).then((result) => {
        if (result.ok && result.project) setLinkProject(result.project);
      });
    };
    const id = window.setInterval(tick, 8000);
    return () => window.clearInterval(id);
  }, [link?.projectId]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }

  function go(next: View) {
    setView(next);
    setFError("");
    setSiError("");
  }

  const board = useMemo(() => {
    if (link) return linkProject;
    return projects.find((p) => p.id === boardId) ?? null;
  }, [link, linkProject, projects, boardId]);

  const role: "owner" | "guest" | "student" | null = useMemo(() => {
    if (!link && board && email && board.email.toLowerCase() === email.toLowerCase()) {
      return "owner";
    }
    if (link?.kind === "edit" && link.canEdit) return "guest";
    if (link) return "student";
    if (board && email && board.email.toLowerCase() === email.toLowerCase()) {
      return "owner";
    }
    return null;
  }, [link, board, email]);

  const canEdit = role === "owner" || role === "guest";
  const editKeyForWrite = link?.canEdit ? link.editKey : null;

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

  function patchBoard(next: StudentProject) {
    if (link) {
      setLinkProject(next);
      return;
    }
    setProjects((prev) => prev.map((p) => (p.id === next.id ? next : p)));
  }

  function submitCreate() {
    const missing = {
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
      showToast("SIGNED IN ✓");
      go("list");
      router.refresh();
    });
  }

  async function copyShareLink(project: StudentProject) {
    const url = `${window.location.origin}/projects?share=${project.id}`;
    await copyText(url);
    setCopiedMsg("STUDENT LINK COPIED ✓ · VIEW ONLY, NO PASSWORD");
    window.setTimeout(() => setCopiedMsg(null), 4500);
    showToast("STUDENT LINK COPIED ✓ · VIEW ONLY");
  }

  async function copyEditLink(project: StudentProject) {
    startTransition(async () => {
      const result = await ensureProjectEditKey(project.id);
      if (!result.ok || !result.editKey) {
        showToast(result.ok ? "Could not create link" : result.error);
        return;
      }
      const url = `${window.location.origin}/projects?edit=${project.id}.${result.editKey}`;
      await copyText(url);
      setCopiedMsg("TEACHER LINK COPIED ✓ · ANYONE WITH IT CAN EDIT THIS BOARD");
      window.setTimeout(() => setCopiedMsg(null), 4500);
      showToast("TEACHER LINK COPIED ✓ · VIEW + EDIT");
    });
  }

  function setSprintStatus(project: StudentProject, n: number, status: SprintStatus) {
    if (project.weeks.find((w) => w.n === n)?.status === status) return;
    const label = STATUS_OPTS.find((o) => o.v === status)?.label ?? status;
    const prev = project;
    const next: StudentProject = {
      ...project,
      weeks: project.weeks.map((w) => (w.n === n ? { ...w, status } : w)),
    };
    patchBoard(next);
    startTransition(async () => {
      const result = await updatePortalSprintStatus(
        project.id,
        n,
        status,
        editKeyForWrite,
      );
      if (!result.ok) {
        patchBoard(prev);
        showToast(result.error);
        return;
      }
      if (result.project) patchBoard(result.project);
      showToast(`SPRINT ${n} → ${label} ✓`);
    });
  }

  function setSprintDue(project: StudentProject, n: number, due: string) {
    if (!due) return;
    const prev = project;
    const next: StudentProject = {
      ...project,
      weeks: project.weeks.map((w) => (w.n === n ? { ...w, due } : w)),
    };
    patchBoard(next);
    startTransition(async () => {
      const result = await updatePortalSprintDue(
        project.id,
        n,
        due,
        editKeyForWrite,
      );
      if (!result.ok) {
        patchBoard(prev);
        showToast(result.error);
        return;
      }
      if (result.project) patchBoard(result.project);
      showToast(`DUE DATE UPDATED · S${n} · ${formatSprintDue(due)}`);
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col">
      <div className="page-gutter flex-1 pb-12 pt-6 md:pt-8">
        {view === "signin" && !isLink && (
          <div className="flex justify-center pt-8 md:pt-14">
            <div
              className={`kis-pop w-full max-w-[440px] border-2 border-[#141414] bg-white px-7 py-7 ${shake ? "kis-shake" : ""}`}
              key={`si-${shake}`}
            >
              <p className="font-mono text-[10px] tracking-[0.18em] text-[#c8102e]">
                PASSWORD PROTECTED
              </p>
              <h1 className="mt-1 text-[24px] font-semibold">
                Sign in to Projects
              </h1>
              <p className="mt-2 text-[14.5px] leading-snug text-[#6d6759]">
                This area needs a sign-in. Your email decides which boards you
                can edit — students use a read-only link instead, no password
                needed.
              </p>
              <label className="mt-5 flex flex-col gap-1.5">
                <span className={fieldLabel}>SCHOOL EMAIL</span>
                <input
                  value={siEmail}
                  onChange={(e) => setSiEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitSignIn();
                  }}
                  className="border border-[#e3e0d8] px-3 py-2.5 text-[15.5px] outline-none focus:border-[#141414]"
                  placeholder="you@kis.edu"
                />
              </label>
              <label className="mt-3.5 flex flex-col gap-1.5">
                <span className={fieldLabel}>TEACHER PASSWORD</span>
                <input
                  type="password"
                  value={siPw}
                  onChange={(e) => setSiPw(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitSignIn();
                  }}
                  className="border border-[#e3e0d8] px-3 py-2.5 text-[15.5px] tracking-[0.12em] outline-none focus:border-[#141414]"
                  style={siError ? { borderColor: "#c8102e" } : undefined}
                  placeholder="Password"
                />
              </label>
              {siError && (
                <div className="mt-2 flex items-center gap-1.5 text-[13.5px] text-[#c8102e]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8102e]" />
                  {siError}
                </div>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={submitSignIn}
                className="mt-[18px] w-full bg-[#c8102e] py-3 text-[14.5px] font-semibold text-white hover:bg-[#a50d26] disabled:opacity-60"
              >
                Sign in →
              </button>
              <p className="mt-3.5 font-mono text-[11px] tracking-[0.06em] text-[#98917f]">
                FORGOT IT? ASK THE CREATIVITY SPACE COORDINATOR
              </p>
            </div>
          </div>
        )}

        {view === "create" && signedInEmail && (
          <div
            className={`kis-pop mx-auto max-w-3xl ${shake ? "kis-shake" : ""}`}
            key={shake}
          >
            <button
              type="button"
              onClick={() => go("list")}
              className="mb-4 font-mono text-[11px] tracking-[0.14em] text-[#6d6759] hover:text-[#c8102e]"
            >
              ← PROJECTS
            </button>
            <h1 className="text-[26px] font-semibold md:text-[38px] md:font-normal md:tracking-[-0.02em]">
              Design a project
            </h1>
            <span className="kis-title-underline !mt-3 !w-14" />

            <div className="mt-6 border border-[#e3e0d8] border-t-[3px] border-t-[#141414] bg-white p-5 md:p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>CREATING AS</span>
                  <div className="mt-0.5 inline-flex items-center gap-2.5 bg-[#eeece5] px-3.5 py-2.5 font-mono text-[13px] tracking-[0.04em] text-[#3f3b33]">
                    {signedInEmail}
                    <span className="text-[11px] text-[#2f9e44]">
                      ✓ SIGNED IN
                    </span>
                  </div>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>UNIT NAME</span>
                  <input
                    value={fUnit}
                    onChange={(e) => setFUnit(e.target.value)}
                    placeholder="e.g. Mars Rover Mission"
                    className={underline}
                    style={
                      fInvalid.unit ? { borderColor: "#c8102e" } : undefined
                    }
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
                    placeholder="e.g. D.K. or D.K. + M.T."
                    className={underline}
                    style={
                      fInvalid.initials
                        ? { borderColor: "#c8102e" }
                        : undefined
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
                  <span className={fieldLabel}>WEEKS · MIN 6</span>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={fWeeks <= MIN_PROJECT_WEEKS}
                      onClick={() =>
                        setFWeeks((w) => Math.max(MIN_PROJECT_WEEKS, w - 1))
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#141414] text-[16px] disabled:border-[#e3e0d8] disabled:text-[#d5d1c8]"
                    >
                      −
                    </button>
                    <span className="min-w-[2ch] text-center font-mono text-[18px] font-semibold">
                      {fWeeks}
                    </span>
                    <button
                      type="button"
                      disabled={fWeeks >= MAX_PROJECT_WEEKS}
                      onClick={() =>
                        setFWeeks((w) => Math.min(MAX_PROJECT_WEEKS, w + 1))
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#141414] text-[16px] disabled:border-[#e3e0d8] disabled:text-[#d5d1c8]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <label className="mt-5 flex flex-col gap-1.5">
                <span className={fieldLabel}>PROJECT SUMMARY</span>
                <textarea
                  value={fSummary}
                  onChange={(e) => setFSummary(e.target.value)}
                  rows={3}
                  placeholder="What are the students building, and what should they walk away knowing?"
                  className="border border-[#e3e0d8] bg-white px-3 py-2.5 text-[14.5px] outline-none focus:border-[#141414]"
                  style={
                    fInvalid.summary ? { borderColor: "#c8102e" } : undefined
                  }
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

        {view === "list" && signedInEmail && (
          <div className="kis-pop">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[12px] tracking-[0.2em] text-[#6d6759]">
                  ПРОЄКТИ · PROJECTS
                </p>
                <h1 className="mt-2 text-[26px] font-semibold md:text-[38px] md:font-normal md:tracking-[-0.02em]">
                  Your project boards
                </h1>
                <span className="kis-title-underline !mt-3 !w-14" />
                <p className="mt-2.5 max-w-xl text-[14px] text-[#6d6759]">
                  You can edit every board under your email. Students see boards
                  through a read-only link you copy from any board.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3.5 pb-1">
                <span className="font-mono text-[11px] tracking-[0.1em] text-[#6d6759]">
                  {email.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      await signOutTeacherPortal();
                      setEmail("");
                      go("signin");
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
              <div className="border border-dashed border-[#d5d1c8] px-5 py-10 text-center text-[15px] text-[#6d6759]">
                No projects under {email} yet —{" "}
                <button
                  type="button"
                  onClick={() => go("create")}
                  className="font-semibold text-[#c8102e]"
                >
                  design your first one
                </button>
                .
              </div>
            ) : (
              <div className="space-y-3.5">
                {byCourse.map(([course, rows]) => {
                  const open = openCourses[course] !== false;
                  return (
                    <div key={course} className="border border-[#e3e0d8] bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCourses((o) => ({
                            ...o,
                            [course]: !open,
                          }))
                        }
                        className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-[#faf9f5]"
                      >
                        <span className="h-2.5 w-2.5 shrink-0 bg-[#c8102e]" />
                        <span className="text-[17px] font-semibold">
                          {course}
                        </span>
                        <span className="rounded-full bg-[#eeece5] px-2 py-0.5 font-mono text-[10px] tracking-wide text-[#3f3b33]">
                          {rows.length}
                        </span>
                        <span className="ml-auto font-mono text-[12px] text-[#98917f]">
                          {open ? "▲" : "▼"}
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
                              className="kis-fadeup flex w-full flex-wrap items-center gap-4 border-t border-[#eeece5] px-5 py-3.5 text-left hover:bg-[#fdf1f3]"
                              style={{ animationDelay: `${i * 50}ms` }}
                            >
                              <span className="shrink-0 bg-[#141414] px-2.5 py-1.5 font-mono text-[12px] font-bold text-white">
                                {p.initials}
                              </span>
                              <div className="min-w-[160px]">
                                <p className="text-[15.5px] font-semibold">
                                  {p.unit}
                                </p>
                                <p className="mt-0.5 font-mono text-[10px] tracking-[0.1em] text-[#98917f]">
                                  {p.weeks.length} SPRINTS · STARTED{" "}
                                  {formatSprintDue(p.start)}
                                </p>
                              </div>
                              <div className="h-1.5 min-w-[120px] flex-1 overflow-hidden bg-[#eeece5]">
                                <div
                                  className="kis-bar h-full bg-[#c8102e]"
                                  style={{ width: `${prog.pct}%` }}
                                />
                              </div>
                              <span
                                className="shrink-0 font-mono text-[10.5px] tracking-[0.1em]"
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
                              <span className="font-mono text-[12px] text-[#98917f]">
                                →
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

        {view === "board" && (
          <BoardView
            project={board}
            today={today}
            role={
              !board
                ? "student"
                : role === "owner"
                  ? "owner"
                  : role === "guest"
                    ? "guest"
                    : link
                      ? "student"
                      : "owner"
            }
            canEdit={canEdit && !!board}
            pending={pending}
            copiedMsg={copiedMsg}
            showBack={!link}
            onBack={() => go(email ? "list" : "signin")}
            onCopyShare={() => board && void copyShareLink(board)}
            onCopyEdit={() => board && void copyEditLink(board)}
            onStatus={(n, status) =>
              board && setSprintStatus(board, n, status)
            }
            onDue={(n, due) => board && setSprintDue(board, n, due)}
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
  role,
  canEdit,
  pending,
  copiedMsg,
  showBack,
  onBack,
  onCopyShare,
  onCopyEdit,
  onStatus,
  onDue,
}: {
  project: StudentProject | null;
  today: string;
  role: "owner" | "guest" | "student";
  canEdit: boolean;
  pending: boolean;
  copiedMsg: string | null;
  showBack: boolean;
  onBack: () => void;
  onCopyShare: () => void;
  onCopyEdit: () => void;
  onStatus: (n: number, status: SprintStatus) => void;
  onDue: (n: number, due: string) => void;
}) {
  const missing = !project;
  const prog = project ? sprintProgress(project) : { done: 0, total: 0, pct: 0 };
  const next = project ? nextOpenSprint(project) : null;
  const cols = [
    { key: "todo" as const, label: "TO DO", dot: "#98917f", edge: "#98917f" },
    {
      key: "doing" as const,
      label: "IN PROGRESS",
      dot: "#e0a010",
      edge: "#e0a010",
    },
    { key: "done" as const, label: "DONE", dot: "#2f9e44", edge: "#2f9e44" },
  ];

  const footNote =
    role === "student"
      ? "Read-only student view — cards move as your teacher updates sprints. Check back after each Friday."
      : role === "guest"
        ? "You have edit access via a teacher link — click a status to move a card, or change a due date."
        : "Click a status to move a card, or change a due date — students with your link see it instantly.";

  return (
    <div className="kis-pop">
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 font-mono text-[11px] tracking-[0.14em] text-[#6d6759] hover:text-[#c8102e]"
        >
          ← YOUR PROJECTS
        </button>
      )}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-semibold md:text-[38px] md:font-normal md:tracking-[-0.02em]">
              {missing ? "Board not found" : project.unit}
            </h1>
            {!missing && (
              <span className="bg-[#141414] px-2.5 py-1.5 font-mono text-[12px] font-bold text-white">
                {project.initials}
              </span>
            )}
          </div>
          {!missing && <span className="kis-title-underline !mt-3 !w-14" />}
          {!missing && (
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-[#eeece5] px-2.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-[#3f3b33]">
                {project.course.toUpperCase()}
              </span>
              <span className="font-mono text-[10px] tracking-[0.12em] text-[#6d6759]">
                {project.email.toUpperCase()}
              </span>
              {next && (
                <span
                  className="font-mono text-[10px] tracking-[0.12em]"
                  style={{
                    color: isSprintOverdue(next, today) ? "#c8102e" : "#6d6759",
                  }}
                >
                  {isSprintOverdue(next, today)
                    ? `OVERDUE · ${formatSprintDue(next.due)}`
                    : `NEXT DUE ${formatSprintDue(next.due)}`}
                </span>
              )}
            </div>
          )}
        </div>
        {!missing && (
          <div className="min-w-[200px] pb-1">
            <div className="flex justify-between font-mono text-[10.5px] tracking-[0.12em] text-[#6d6759]">
              <span>SPRINTS DONE</span>
              <span>
                {prog.done} / {prog.total}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden bg-[#eeece5]">
              <div
                className="kis-bar h-full bg-[#c8102e]"
                style={{ width: `${prog.pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <p className="mt-3.5 max-w-2xl text-[15px] leading-relaxed text-[#6d6759]">
        {missing
          ? "This link doesn't match a project any more — ask your teacher for a fresh one."
          : project.summary}
      </p>

      {!missing && (
        <div className="mt-[18px] flex flex-wrap items-center gap-3">
          {role === "owner" && (
            <>
              <span className="rounded-full bg-[#dff2e3] px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-[#2f7d3f]">
                YOUR BOARD · EDITS SAVE INSTANTLY
              </span>
              <button
                type="button"
                onClick={onCopyShare}
                className="bg-[#141414] px-[18px] py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#c8102e]"
              >
                ⧉ Copy student link
              </button>
              <button
                type="button"
                onClick={onCopyEdit}
                disabled={pending}
                className="border-[1.5px] border-[#141414] px-[18px] py-2 text-[13.5px] font-semibold text-[#141414] transition-colors hover:bg-[#141414] hover:text-white disabled:opacity-60"
              >
                ✎ Copy teacher link
              </button>
              {copiedMsg && (
                <span className="kis-pop font-mono text-[10.5px] tracking-[0.1em] text-[#2f9e44]">
                  {copiedMsg}
                </span>
              )}
            </>
          )}
          {role === "student" && (
            <>
              <span className="rounded-full bg-[#fdf4e3] px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-[#9a6e06]">
                STUDENT VIEW · READ-ONLY
              </span>
              <span className="font-mono text-[10.5px] tracking-[0.08em] text-[#98917f]">
                CARDS MOVE HERE AS YOUR TEACHER UPDATES SPRINTS
              </span>
            </>
          )}
          {role === "guest" && (
            <>
              <span className="rounded-full bg-[#e6edf4] px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-[#3b6285]">
                SHARED WITH YOU · CAN EDIT
              </span>
              <span className="font-mono text-[10.5px] tracking-[0.08em] text-[#98917f]">
                EDITS SAVE INSTANTLY — THE OWNER AND STUDENTS SEE THEM LIVE
              </span>
            </>
          )}
        </div>
      )}

      {!missing && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {cols.map((col) => {
            const cards = project.weeks.filter((w) => w.status === col.key);
            return (
              <div
                key={col.key}
                className="min-h-[220px] border border-[#eeece5] bg-[#faf9f5] p-3.5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: col.dot }}
                  />
                  <span className="font-mono text-[11px] tracking-[0.16em] text-[#3f3b33]">
                    {col.label}
                  </span>
                  <span className="font-mono text-[10px] text-[#98917f]">
                    {cards.length}
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
                          <span className="font-mono text-[9.5px] tracking-[0.14em] text-[#98917f]">
                            SPRINT {w.n}
                          </span>
                          <span
                            className="font-mono text-[9.5px] tracking-[0.1em]"
                            style={{
                              color: overdue ? "#c8102e" : "#98917f",
                            }}
                          >
                            {formatSprintDue(w.due)}
                          </span>
                        </div>
                        <p
                          className="mt-1.5 text-[14.5px] leading-snug"
                          style={{
                            color: col.key === "done" ? "#98917f" : "#3f3b33",
                          }}
                        >
                          {w.objective}
                        </p>
                        {canEdit && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <div
                              className="flex overflow-hidden rounded-full border border-[#e3e0d8]"
                              title="Move this sprint"
                            >
                              {STATUS_OPTS.map((o) => {
                                const selected = w.status === o.v;
                                return (
                                  <button
                                    key={o.v}
                                    type="button"
                                    disabled={pending || selected}
                                    onClick={() => onStatus(w.n, o.v)}
                                    className="px-[9px] py-1 font-mono text-[9px] tracking-[0.08em] transition-colors hover:text-[#141414] disabled:cursor-default"
                                    style={{
                                      background: selected ? o.bg : "#fff",
                                      color: selected ? o.fg : "#b5afa1",
                                    }}
                                  >
                                    {o.label}
                                  </button>
                                );
                              })}
                            </div>
                            <input
                              type="date"
                              value={w.due}
                              disabled={pending}
                              onChange={(e) => onDue(w.n, e.target.value)}
                              className="border border-[#e3e0d8] px-1.5 py-1 text-[12px] outline-none focus:border-[#141414]"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[13px] text-[#98917f]">{footNote}</p>
    </div>
  );
}
