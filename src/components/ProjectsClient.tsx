"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { ProjectsBoardView } from "@/components/ProjectsBoardView";
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

function copyText(url: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(url).catch(() => {
      window.prompt("Copy this link:", url);
    });
  }
  window.prompt("Copy this link:", url);
  return Promise.resolve();
}

async function shareOrCopy(url: string, title: string) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url });
      return "shared" as const;
    } catch {
      /* cancelled or unsupported — fall through */
    }
  }
  await copyText(url);
  return "copied" as const;
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
  const [toast, setToast] = useState<{
    msg: string;
    bg?: string;
    undo?: () => void;
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  function showToast(
    msg: string,
    opts?: { bg?: string; undo?: () => void },
  ) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, bg: opts?.bg, undo: opts?.undo });
    const ms = opts?.undo ? 4500 : 2800;
    toastTimer.current = setTimeout(() => setToast(null), ms);
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
  const boardRef = useRef(board);
  boardRef.current = board;

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
    await shareOrCopy(url, project.unit);
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
      await shareOrCopy(url, `${project.unit} (edit)`);
      setCopiedMsg("TEACHER LINK COPIED ✓ · ANYONE WITH IT CAN EDIT THIS BOARD");
      window.setTimeout(() => setCopiedMsg(null), 4500);
      showToast("TEACHER LINK COPIED ✓ · VIEW + EDIT");
    });
  }

  function setSprintStatus(
    project: StudentProject,
    n: number,
    status: SprintStatus,
    opts?: { skipUndo?: boolean },
  ) {
    const prevStatus = project.weeks.find((w) => w.n === n)?.status;
    if (prevStatus === status) return;
    const label =
      status === "todo" ? "TO DO" : status === "doing" ? "DOING" : "DONE";
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
      if (opts?.skipUndo) return;
      const from = prevStatus;
      showToast(`SPRINT ${n} → ${label} ✓`, {
        bg: "#141414",
        undo: from
          ? () => {
              const current = boardRef.current ?? next;
              setSprintStatus(current, n, from, { skipUndo: true });
              showToast("MOVED BACK ✓");
            }
          : undefined,
      });
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
              className="mt-5 min-h-12 w-full rounded-full bg-[#c8102e] px-6 py-3.5 text-[14px] font-semibold text-white hover:bg-[#a50d26] disabled:opacity-60 md:w-auto md:rounded-none md:text-[14.5px]"
            >
              Create project · {fWeeks} sprints →
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
                <h1 className="mt-2 text-[23px] font-light tracking-[-0.01em] md:text-[38px] md:tracking-[-0.02em]">
                  Your project boards
                </h1>
                <span className="kis-title-underline !mt-2 !w-12 md:!mt-3 md:!w-14" />
                <p className="mt-2.5 hidden max-w-xl text-[14px] text-[#6d6759] md:block">
                  You can edit every board under your email. Students see boards
                  through a read-only link you copy from any board.
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center justify-between gap-3 pb-1 md:w-auto md:justify-end md:gap-3.5">
                <span className="font-mono text-[9.5px] tracking-[0.08em] text-[#8a857a] md:text-[11px] md:tracking-[0.1em] md:text-[#6d6759]">
                  {email.toUpperCase()}
                  <span className="md:hidden"> · CAN EDIT ALL BELOW</span>
                </span>
                <div className="flex gap-2">
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
                    className="min-h-11 border border-[#e3e0d8] px-3 py-2 text-[12px] font-semibold text-[#3f3b33] hover:border-[#141414] md:px-4 md:text-[13.5px]"
                  >
                    Sign out
                  </button>
                  <button
                    type="button"
                    onClick={() => go("create")}
                    className="min-h-11 rounded-full bg-[#141414] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#c8102e] md:rounded-none md:text-[13.5px]"
                  >
                    + New
                    <span className="hidden md:inline"> project</span>
                  </button>
                </div>
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
                    <div key={course} className="overflow-hidden rounded-[14px] border border-[#e3e0d8] bg-white md:rounded-none">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCourses((o) => ({
                            ...o,
                            [course]: !open,
                          }))
                        }
                        className="flex min-h-11 w-full items-center gap-3 bg-[#faf9f5] px-3.5 py-3 text-left md:bg-transparent md:px-5 md:py-3.5 md:hover:bg-[#faf9f5]"
                      >
                        <span className="h-2 w-2 shrink-0 bg-[#c8102e]" />
                        <span className="flex-1 text-[14.5px] font-semibold md:text-[17px]">
                          {course}
                        </span>
                        <span className="rounded-full bg-[#eeece5] px-2 py-0.5 font-mono text-[9px] tracking-wide text-[#3f3b33] md:text-[10px]">
                          {rows.length}
                        </span>
                        <span className="font-mono text-[10px] text-[#98917f] md:text-[12px]">
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
                          const meta = prog.done === prog.total
                            ? `${prog.done}/${prog.total} DONE`
                            : overdue && next
                              ? `${prog.done}/${prog.total} DONE · OVERDUE · ${formatSprintDue(next.due)}`
                              : next
                                ? `${prog.done}/${prog.total} DONE · NEXT DUE ${formatSprintDue(next.due)}`
                                : `${prog.done}/${prog.total} DONE`;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setBoardId(p.id);
                                go("board");
                              }}
                              className="kis-fadeup flex min-h-11 w-full items-center gap-3 border-t border-[#eeece5] px-3.5 py-3 text-left hover:bg-[#fdf1f3] md:gap-4 md:px-5 md:py-3.5"
                              style={{ animationDelay: `${i * 50}ms` }}
                            >
                              <span className="shrink-0 bg-[#141414] px-2 py-1.5 font-mono text-[10.5px] font-bold text-white md:px-2.5 md:text-[12px]">
                                {p.initials}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13.5px] font-semibold md:text-[15.5px]">
                                  {p.unit}
                                </p>
                                <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[#eeece5] md:mt-2 md:h-1.5 md:rounded-none md:max-w-[220px]">
                                  <div
                                    className="kis-bar h-full bg-[#c8102e]"
                                    style={{ width: `${prog.pct}%` }}
                                  />
                                </div>
                                <p
                                  className="mt-1 font-mono text-[8.5px] tracking-[0.08em] md:hidden"
                                  style={{
                                    color: overdue
                                      ? "#c8102e"
                                      : prog.done === prog.total
                                        ? "#2f9e44"
                                        : "#6d6759",
                                  }}
                                >
                                  {meta}
                                </p>
                                <p className="mt-0.5 hidden font-mono text-[10px] tracking-[0.1em] text-[#98917f] md:block">
                                  {p.weeks.length} SPRINTS · STARTED{" "}
                                  {formatSprintDue(p.start)}
                                </p>
                              </div>
                              <span
                                className="hidden shrink-0 font-mono text-[10.5px] tracking-[0.1em] md:inline"
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
                              <span className="font-mono text-[11px] text-[#98917f]">
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
          <ProjectsBoardView
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
            onShareStudent={async () => {
              if (board) await copyShareLink(board);
            }}
            onShareTeacher={async () => {
              if (board) await copyEditLink(board);
            }}
            onStatus={(n, status) =>
              board && setSprintStatus(board, n, status)
            }
            onDue={(n, due) => board && setSprintDue(board, n, due)}
          />
        )}
      </div>

      {toast && (
        <div
          className="kis-sync-chip fixed right-6 bottom-6 z-[90] flex items-center gap-3 px-[18px] py-[11px] font-mono text-[11px] tracking-[0.12em] text-white shadow-[0_10px_30px_rgba(20,20,20,0.28)]"
          style={{ background: toast.bg ?? "#2f9e44" }}
        >
          <span>{toast.msg}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                const fn = toast.undo;
                setToast(null);
                fn?.();
              }}
              className="underline underline-offset-2"
            >
              UNDO
            </button>
          )}
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
