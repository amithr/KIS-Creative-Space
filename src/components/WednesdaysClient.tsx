"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createWednesdayEntry,
  deleteWednesdayEntry,
  restoreWednesdayEntry,
  updateWednesdayEntry,
} from "@/app/actions/wednesdays";
import {
  signInTeacherPortal,
  signOutTeacherPortal,
} from "@/app/actions/projects";
import { nextOpenSprint } from "@/lib/projects";
import { toISODate } from "@/lib/inventory";
import {
  formatWedLong,
  formatWedShort,
  nextWednesdays,
  periodTakenOnStudioCalendar,
  studioCalendarRowsForDate,
} from "@/lib/wednesdays";
import type {
  SpaceBlock,
  SpaceBooking,
  StudentProject,
  TrainingSession,
  WednesdayEntry,
} from "@/lib/types";

const fieldLabel =
  "font-mono text-[10.5px] tracking-[0.16em] text-[#6d6759]";
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

type Props = {
  initialEmail: string | null;
  initialEntries: WednesdayEntry[];
  initialProjects: StudentProject[];
  initialBookings: SpaceBooking[];
  initialBlocks: SpaceBlock[];
  initialTraining: TrainingSession[];
};

type Toast = {
  msg: string;
  tone?: "ok" | "err";
  undo?: () => void | Promise<void>;
};

export function WednesdaysClient({
  initialEmail,
  initialEntries,
  initialProjects,
  initialBookings,
  initialBlocks,
  initialTraining,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [entries, setEntries] = useState(initialEntries);
  const [projects, setProjects] = useState(initialProjects);
  const bookings = initialBookings;
  const blocks = initialBlocks;
  const training = initialTraining;

  useEffect(() => {
    setEmail(initialEmail);
    setEntries(initialEntries);
    setProjects(initialProjects);
  }, [initialEmail, initialEntries, initialProjects]);

  const [siEmail, setSiEmail] = useState("");
  const [siPw, setSiPw] = useState("");
  const [siError, setSiError] = useState("");
  const [shake, setShake] = useState(0);

  const [wedIdx, setWedIdx] = useState(0);
  const [selProject, setSelProject] = useState("");
  const [fText, setFText] = useState("");
  const [fClass, setFClass] = useState("");
  const [fResources, setFResources] = useState("");
  const [fPeriod, setFPeriod] = useState<number | null>(null);
  const [fError, setFError] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCls, setEditCls] = useState("");
  const [editResources, setEditResources] = useState("");

  const [toast, setToast] = useState<Toast | null>(null);
  const [pending, startTransition] = useTransition();

  const weds = useMemo(() => nextWednesdays(), []);
  const sel = weds[wedIdx];
  const selIso = toISODate(sel);
  const selShort = formatWedShort(sel);

  const dayEntries = useMemo(
    () =>
      entries
        .filter((e) => e.session_date === selIso)
        .slice()
        .sort((a, b) => a.period - b.period),
    [entries, selIso],
  );

  const calRows = useMemo(
    () => studioCalendarRowsForDate(selIso, bookings, training, blocks),
    [selIso, bookings, training, blocks],
  );

  const mine = useMemo(
    () =>
      projects.filter(
        (p) => email && p.email.toLowerCase() === email.toLowerCase(),
      ),
    [projects, email],
  );

  const proj = mine.find((p) => p.id === selProject);
  const isCustom = !proj;
  const nextSprint = proj ? nextOpenSprint(proj) : null;

  function showToast(
    msg: string,
    opts?: { tone?: "ok" | "err"; undo?: () => void | Promise<void> },
  ) {
    setToast({ msg, tone: opts?.tone, undo: opts?.undo });
    window.setTimeout(
      () => setToast(null),
      opts?.undo ? 4500 : 2800,
    );
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
      setSiPw("");
      showToast("SIGNED IN ✓ · PICK A WEDNESDAY BELOW");
      router.refresh();
    });
  }

  function signOut() {
    startTransition(async () => {
      await signOutTeacherPortal();
      setEmail(null);
      showToast("SIGNED OUT");
    });
  }

  function pickWed(i: number) {
    if (i === wedIdx) return;
    setWedIdx(i);
    setFError("");
    setEditId(null);
    const iso = toISODate(weds[i]);
    const n = entries.filter((e) => e.session_date === iso).length;
    showToast(
      `SHOWING WED ${formatWedShort(weds[i]).toUpperCase()} · ${
        n === 0 ? "NOTHING BOOKED YET" : `${n} ALREADY ON THE SCHEDULE`
      }`,
    );
  }

  const clsPreview = isCustom
    ? fClass.trim().toUpperCase()
    : proj?.initials ?? "";
  const whatPreview = isCustom ? fText.trim() : proj?.unit ?? "";
  const missing: string[] = [];
  if (!whatPreview) missing.push(isCustom ? "what you'll be doing" : "a project");
  if (isCustom && !clsPreview) missing.push("your class");
  if (!fPeriod) missing.push("a period");
  const ready = missing.length === 0;

  function addEntry() {
    if (!fPeriod) {
      setFError("Pick a period so we know when you're coming.");
      return;
    }
    if (isCustom && !fText.trim()) {
      setFError("Tell us what you'll be doing — one line is plenty.");
      return;
    }
    if (isCustom && !fClass.trim()) {
      setFError("Which class is coming? e.g. 3B.");
      return;
    }
    startTransition(async () => {
      setFError("");
      const result = await createWednesdayEntry({
        sessionDate: selIso,
        period: fPeriod,
        projectId: isCustom ? null : proj!.id,
        text: isCustom ? fText : undefined,
        cls: isCustom ? fClass : undefined,
        resources: fResources,
      });
      if (!result.ok) {
        setFError(result.error);
        return;
      }
      if (result.entry) {
        setEntries((prev) => [...prev, result.entry!]);
        const e = result.entry;
        showToast(
          `YOU'RE ON THE SCHEDULE ✓ · ${selShort.toUpperCase()} · P${e.period} · ${e.cls}${
            e.resources ? " · WE'LL HAVE YOUR RESOURCES NOTED" : ""
          }`,
        );
      }
      setFText("");
      setFPeriod(null);
      setFResources("");
    });
  }

  function removeMine(entry: WednesdayEntry) {
    startTransition(async () => {
      const snap = entry;
      const result = await deleteWednesdayEntry(entry.id);
      if (!result.ok) {
        showToast(result.error, { tone: "err" });
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      showToast(`REMOVED · P${snap.period} · ${snap.cls}`, {
        undo: async () => {
          const restored = await restoreWednesdayEntry(snap);
          if (restored.ok && restored.entry) {
            setEntries((prev) => [...prev, restored.entry!]);
            showToast("PUT BACK ✓");
          }
        },
      });
    });
  }

  function saveEdit(entry: WednesdayEntry) {
    const text = editText.trim();
    const cls = editCls.trim().toUpperCase();
    if (!text || !cls) {
      showToast("KEEP A DESCRIPTION AND A CLASS — BOTH ARE NEEDED", {
        tone: "err",
      });
      return;
    }
    startTransition(async () => {
      const prev = entry;
      const result = await updateWednesdayEntry(entry.id, {
        text,
        cls,
        resources: editResources,
      });
      if (!result.ok) {
        showToast(result.error, { tone: "err" });
        return;
      }
      if (result.entry) {
        setEntries((prevList) =>
          prevList.map((e) => (e.id === entry.id ? result.entry! : e)),
        );
      }
      setEditId(null);
      showToast(`UPDATED ✓ · P${entry.period} · ${cls}`, {
        undo: async () => {
          const back = await updateWednesdayEntry(entry.id, {
            text: prev.text,
            cls: prev.cls,
            resources: prev.resources ?? "",
          });
          if (back.ok && back.entry) {
            setEntries((prevList) =>
              prevList.map((e) => (e.id === entry.id ? back.entry! : e)),
            );
            showToast("CHANGE UNDONE ✓");
          }
        },
      });
    });
  }

  type DayRow =
    | {
        sort: number;
        kind: "session";
        entry: WednesdayEntry;
      }
    | {
        sort: number;
        kind: "cal";
        period: number;
        label: string;
        text: string;
        tone: "green" | "amber" | "blue" | "red";
      };

  const dayRows: DayRow[] = [
    ...dayEntries.map(
      (entry): DayRow => ({ sort: entry.period, kind: "session", entry }),
    ),
    ...calRows.map(
      (r): DayRow => ({
        sort: r.period,
        kind: "cal",
        period: r.period,
        label: r.kind,
        text: r.text,
        tone: r.tone,
      }),
    ),
  ].sort((a, b) => a.sort - b.sort);

  const toneStyles = {
    green: { bg: "#dff2e3", fg: "#2f7d3f" },
    amber: { bg: "#fdf4e3", fg: "#9a6e06" },
    blue: { bg: "#e8f1f8", fg: "#2f6b8f" },
    red: { bg: "#fbeeee", fg: "#a05252" },
  };

  if (!email) {
    return (
      <div className="flex min-h-[calc(100vh-73px)] flex-col">
        <div className="page-gutter flex flex-1 justify-center pb-12 pt-8 md:pt-14">
          <div
            className={`kis-pop w-full max-w-[440px] border-2 border-[#141414] bg-white px-7 py-7 ${shake ? "kis-shake" : ""}`}
            key={`si-${shake}`}
          >
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#c8102e]">
              PASSWORD PROTECTED
            </p>
            <h1 className="mt-1 text-[24px] font-semibold">
              Sign in to Wednesdays
            </h1>
            <p className="mt-2 text-[14.5px] leading-snug text-[#6d6759]">
              Teachers sign their class up for Wednesday design sessions here.
              Same password as Projects.
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
              <span className="text-[12.5px] leading-snug text-[#98917f]">
                Please use your KIS email address — it keeps your sign-ups
                together.
              </span>
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
                className="border border-[#e3e0d8] px-3 py-2.5 text-[15.5px] outline-none focus:border-[#141414]"
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
          </div>
        </div>
        {toast && <ToastBar toast={toast} onClear={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col">
      <section className="page-gutter flex flex-wrap items-end justify-between gap-6 pb-2 pt-6 md:pt-11">
        <div>
          <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-[#8a857a] md:mb-3 md:text-[12px] md:tracking-[0.2em] md:text-[#6d6759]">
            СЕРЕДИ · WEDNESDAY DESIGN SESSIONS
          </p>
          <h1 className="font-display text-[clamp(26px,5vw,46px)] font-light leading-[1.05] tracking-[-0.02em]">
            Wednesday design sessions
          </h1>
          <span className="kis-title-underline !mt-2.5 !w-12 md:!mt-3.5 md:!w-16" />
          <p className="mt-2.5 max-w-xl text-[12.5px] text-[#8a857a] md:mt-3 md:text-[14.5px] md:text-[#6d6759]">
            Sign your class up for a Wednesday period in the studio. Pick a
            project you already designed, or describe a one-off activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3.5 pb-1">
          <span className="font-mono text-[11px] tracking-[0.1em] text-[#6d6759]">
            SIGNED IN · {email.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={signOut}
            className="border border-[#e3e0d8] px-4 py-2 text-[13.5px] font-semibold hover:border-[#141414]"
          >
            Sign out
          </button>
        </div>
      </section>

      <div className="page-gutter mt-2.5 flex flex-wrap items-center gap-2.5">
        <span className={fieldLabel}>PICK A WEDNESDAY</span>
        {weds.map((d, i) => (
          <button
            key={toISODate(d)}
            type="button"
            onClick={() => pickWed(i)}
            className="rounded-full px-[18px] py-[9px] text-[14px] font-semibold transition-colors"
            style={{
              background: i === wedIdx ? "#141414" : "#fff",
              color: i === wedIdx ? "#fff" : "#3f3b33",
              border: `1px solid ${i === wedIdx ? "#141414" : "#e3e0d8"}`,
            }}
          >
            {i === 0 ? `This Wed · ${formatWedShort(d)}` : formatWedShort(d)}
          </button>
        ))}
      </div>

      <div className="mx-[5vw] mb-12 mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-6">
        {/* Form */}
        <div className="kis-fadeup border border-[#e3e0d8] border-t-[3px] border-t-[#141414] bg-white px-6 py-[22px]">
          <h2 className="text-[20px] font-semibold">Add your activity</h2>

          <p className={`${fieldLabel} mt-4`}>WHAT WILL YOU BE DOING?</p>
          <select
            value={selProject}
            onChange={(e) => {
              const v = e.target.value;
              setSelProject(v);
              setFError("");
              const p = mine.find((x) => x.id === v);
              showToast(
                p
                  ? `PROJECT PICKED ✓ · ${p.initials} · WE'LL USE ITS NEXT SPRINT`
                  : "OK — DESCRIBE YOUR ACTIVITY IN YOUR OWN WORDS",
              );
            }}
            className="mt-[7px] w-full border border-[#e3e0d8] bg-white px-3 py-[11px] text-[15px]"
          >
            <option value="">✏️ I&apos;ll describe it myself…</option>
            {mine.map((p) => (
              <option key={p.id} value={p.id}>
                {p.unit} · {p.initials}
              </option>
            ))}
          </select>

          {isCustom ? (
            <>
              <p className={`${fieldLabel} mt-3.5`}>YOUR ACTIVITY</p>
              <textarea
                value={fText}
                onChange={(e) => setFText(e.target.value)}
                placeholder="e.g. Cardboard marble runs — testing ramps and measuring speed"
                className="mt-[7px] min-h-16 w-full resize-y border px-3 py-2.5 text-[15px] leading-normal"
                style={{
                  borderColor:
                    fError && !fText.trim() ? "#c8102e" : "#e3e0d8",
                }}
              />
              <p className={`${fieldLabel} mt-3.5`}>CLASS</p>
              <input
                value={fClass}
                onChange={(e) => setFClass(e.target.value)}
                placeholder="e.g. 3B"
                className="mt-[7px] w-full border px-3 py-2.5 text-[15px]"
                style={{
                  borderColor:
                    fError && !fClass.trim() ? "#c8102e" : "#e3e0d8",
                }}
              />
            </>
          ) : (
            <div className="mt-3 border border-[#eeece5] bg-[#faf9f5] px-3.5 py-3">
              <p className="font-mono text-[9px] tracking-[0.12em] text-[#98917f]">
                FROM YOUR PROJECT · NEXT SPRINT
              </p>
              <p className="mt-1 text-[14px] leading-normal text-[#3f3b33]">
                {nextSprint
                  ? `Sprint ${nextSprint.n}: ${nextSprint.objective || "(no objective yet)"}`
                  : "All sprints done — demo & celebrate!"}
              </p>
            </div>
          )}

          <p className={`${fieldLabel} mt-3.5`}>SPECIAL RESOURCES · OPTIONAL</p>
          <input
            value={fResources}
            onChange={(e) => setFResources(e.target.value)}
            placeholder="e.g. 3D printers, hot glue guns, 12 laptops"
            className="mt-[7px] w-full border border-[#e3e0d8] px-3 py-2.5 text-[15px]"
          />

          <p className={`${fieldLabel} mb-2 mt-4`}>WHICH PERIOD?</p>
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((p) => {
              const busy = periodTakenOnStudioCalendar(p, calRows);
              const selected = fPeriod === p;
              return (
                <button
                  key={p}
                  type="button"
                  title={
                    busy
                      ? "Already taken that day — see the schedule on the right"
                      : undefined
                  }
                  onClick={() => {
                    if (busy) {
                      setFError(
                        `P${p} is already taken that day — see the schedule on the right.`,
                      );
                      return;
                    }
                    setFPeriod(p);
                    setFError("");
                  }}
                  className="rounded-full px-[13px] py-2 font-mono text-[12px] font-bold"
                  style={{
                    background: selected
                      ? "#141414"
                      : busy
                        ? "#f2f0ea"
                        : "#fff",
                    color: selected
                      ? "#fff"
                      : busy
                        ? "#b5afa1"
                        : "#3f3b33",
                    border: `1px solid ${
                      selected
                        ? "#141414"
                        : fError && !fPeriod
                          ? "#c8102e"
                          : "#e3e0d8"
                    }`,
                  }}
                >
                  {busy ? `P${p} ·` : `P${p}`}
                </button>
              );
            })}
          </div>

          <div
            className="mt-4 border border-dashed px-3.5 py-2.5 text-[13px] leading-normal transition-colors"
            style={{
              background: ready ? "#dff2e3" : "#faf9f5",
              borderColor: ready ? "#2f9e44" : "#d5d1c8",
              color: ready ? "#2f7d3f" : "#857e6e",
            }}
          >
            <span className="mb-0.5 block font-mono text-[8.5px] tracking-[0.14em]">
              {ready ? "READY TO ADD ✓" : "STILL NEEDED"}
            </span>
            {ready
              ? `${clsPreview} · P${fPeriod} · ${selShort} — “${
                  whatPreview.length > 60
                    ? `${whatPreview.slice(0, 60)}…`
                    : whatPreview
                }”`
              : `Just add ${missing
                  .join(", ")
                  .replace(/, ([^,]*)$/, " and $1")} and you're set.`}
          </div>

          {fError && (
            <div className="mt-3 flex items-center gap-1.5 text-[13.5px] text-[#c8102e]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8102e]" />
              {fError}
            </div>
          )}

          <button
            type="button"
            disabled={!ready || pending}
            onClick={addEntry}
            className="mt-3.5 w-full py-[13px] text-center text-[15px] font-semibold text-white disabled:cursor-default"
            style={{ background: ready ? "#c8102e" : "#b5afa1" }}
          >
            {ready ? `Add to ${selShort} →` : "Finish the steps above"}
          </button>
        </div>

        {/* Day schedule */}
        <div className="kis-fadeup" style={{ animationDelay: "0.1s" }}>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-[21px] font-semibold">{formatWedLong(sel)}</h2>
            <span className="rounded-full bg-[#eeece5] px-2.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-[#3f3b33]">
              {dayRows.length === 0
                ? "OPEN ALL DAY"
                : `${dayRows.length} ON THE SCHEDULE`}
            </span>
          </div>

          {dayRows.length === 0 ? (
            <div className="mt-3 border border-dashed border-[#d5d1c8] px-8 py-8 text-center text-[14.5px] text-[#6d6759]">
              Nothing on the schedule yet — your class could be first! Add it on
              the left.
            </div>
          ) : (
            <div className="mt-3 border border-[#e3e0d8] bg-white">
              {dayRows.map((row) => {
                if (row.kind === "cal") {
                  const t = toneStyles[row.tone];
                  return (
                    <div
                      key={`cal-${row.period}-${row.label}`}
                      className="flex items-center gap-3.5 border-b border-[#eeece5] px-[18px] py-[13px]"
                    >
                      <span className="shrink-0 bg-[#141414] px-2.5 py-1 font-mono text-[11px] tracking-[0.1em] text-white">
                        P{row.period}
                      </span>
                      <span
                        className="shrink-0 px-2 py-1 font-mono text-[11.5px] font-bold"
                        style={{ background: t.bg, color: t.fg }}
                      >
                        {row.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] leading-snug">{row.text}</p>
                        <p className="mt-0.5 font-mono text-[9px] tracking-[0.08em] text-[#98917f]">
                          FROM THE STUDIO CALENDAR
                        </p>
                      </div>
                    </div>
                  );
                }

                const e = row.entry;
                const mineRow = e.email.toLowerCase() === email.toLowerCase();
                return (
                  <div
                    key={e.id}
                    className="border-b border-[#eeece5]"
                    style={{ background: mineRow ? "#fdfdf9" : "#fff" }}
                  >
                    <div className="flex items-center gap-3.5 px-[18px] py-[13px]">
                      <span className="shrink-0 bg-[#141414] px-2.5 py-1 font-mono text-[11px] tracking-[0.1em] text-white">
                        P{e.period}
                      </span>
                      <span className="shrink-0 bg-[#eeece5] px-2 py-1 font-mono text-[11.5px] font-bold text-[#3f3b33]">
                        {e.cls}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] leading-snug">{e.text}</p>
                        {e.resources && (
                          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#fdf4e3] px-2 py-0.5 font-mono text-[8.5px] tracking-[0.08em] text-[#9a6e06]">
                            ⚒ NEEDS: {e.resources.toUpperCase()}
                          </span>
                        )}
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          {mineRow && (
                            <span className="rounded-full bg-[#dff2e3] px-2 py-0.5 font-mono text-[8.5px] tracking-[0.1em] text-[#2f7d3f]">
                              ADDED BY YOU ✓
                            </span>
                          )}
                          <span className="font-mono text-[9px] tracking-[0.08em] text-[#98917f]">
                            DESIGN SESSION · {e.email.toUpperCase()}
                            {e.project_id ? " · FROM A CLASS PROJECT" : ""}
                          </span>
                        </div>
                      </div>
                      {mineRow && (
                        <>
                          <button
                            type="button"
                            title="Edit your entry"
                            onClick={() => {
                              setEditId(e.id);
                              setEditText(e.text);
                              setEditCls(e.cls);
                              setEditResources(e.resources ?? "");
                            }}
                            className="shrink-0 rounded-full border border-[#e3e0d8] px-2.5 py-1 font-mono text-[9.5px] tracking-[0.1em] text-[#3f3b33] hover:border-[#141414]"
                          >
                            ✎ EDIT
                          </button>
                          <button
                            type="button"
                            title="Remove your entry"
                            onClick={() => removeMine(e)}
                            className="shrink-0 px-1 text-[16px] text-[#98917f] hover:text-[#c8102e]"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                    {editId === e.id && (
                      <div className="flex flex-wrap items-start gap-2 px-[18px] pb-3.5 pl-[60px]">
                        <textarea
                          value={editText}
                          onChange={(ev) => setEditText(ev.target.value)}
                          className="min-h-11 min-w-[220px] flex-[2] border-[1.5px] border-[#141414] px-2.5 py-2 text-[14px]"
                        />
                        <input
                          value={editCls}
                          onChange={(ev) => setEditCls(ev.target.value)}
                          placeholder="Class"
                          className="w-[110px] border border-[#e3e0d8] px-2.5 py-2.5 text-[14px]"
                        />
                        <input
                          value={editResources}
                          onChange={(ev) => setEditResources(ev.target.value)}
                          placeholder="Special resources (optional)"
                          className="min-w-[160px] flex-1 border border-[#e3e0d8] px-2.5 py-2.5 text-[14px]"
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(e)}
                          className="bg-[#141414] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#c8102e]"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="border border-[#e3e0d8] px-4 py-2 text-[13px] font-semibold hover:border-[#141414]"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-2.5 text-[13px] text-[#98917f]">
            This list includes everything from the{" "}
            <Link href="/calendar" className="underline hover:text-[#c8102e]">
              studio calendar
            </Link>{" "}
            — class bookings, training and closed periods — so you can see the
            whole Wednesday at a glance. You can only remove your own entries.
          </p>
        </div>
      </div>

      <footer className="page-gutter mt-auto border-t border-[#e3e0d8] py-4 text-[14.5px] text-[#6d6759]">
        Wednesdays are design-session days in the studio · pick a project or
        describe your own activity · the schedule updates the moment you add
        your class
      </footer>

      {toast && <ToastBar toast={toast} onClear={() => setToast(null)} />}
    </div>
  );
}

function ToastBar({
  toast,
  onClear,
}: {
  toast: Toast;
  onClear: () => void;
}) {
  return (
    <div
      className="kis-pop fixed bottom-6 left-1/2 z-[60] flex max-w-[min(92vw,520px)] -translate-x-1/2 items-center gap-3 px-4 py-3 text-[13px] font-medium tracking-wide text-white shadow-lg"
      style={{
        background: toast.tone === "err" ? "#c8102e" : "#141414",
      }}
    >
      <span className="min-w-0 flex-1 font-mono text-[11px] tracking-[0.06em]">
        {toast.msg}
      </span>
      {toast.undo && (
        <button
          type="button"
          className="shrink-0 rounded-full bg-white/15 px-3 py-1 font-mono text-[10px] tracking-[0.12em] hover:bg-white/25"
          onClick={() => {
            const fn = toast.undo;
            onClear();
            void fn?.();
          }}
        >
          UNDO
        </button>
      )}
    </div>
  );
}
