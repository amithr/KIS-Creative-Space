"use client";

import { useMemo, useState } from "react";
import {
  formatSprintDue,
  isSprintOverdue,
  nextOpenSprint,
  sprintProgress,
} from "@/lib/projects";
import type { ProjectSprint, SprintStatus, StudentProject } from "@/lib/types";

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

const COLS = [
  { key: "todo" as const, label: "TO DO", short: "TO DO", edge: "#98917f" },
  { key: "doing" as const, label: "IN PROGRESS", short: "DOING", edge: "#e0a010" },
  { key: "done" as const, label: "DONE", short: "DONE", edge: "#2f9e44" },
];

type BoardRole = "owner" | "guest" | "student";

type TabKey = "all" | SprintStatus;

export type ProjectsBoardViewProps = {
  project: StudentProject | null;
  today: string;
  role: BoardRole;
  canEdit: boolean;
  pending: boolean;
  copiedMsg: string | null;
  showBack: boolean;
  onBack: () => void;
  onShareStudent: () => void | Promise<void>;
  onShareTeacher: () => void | Promise<void>;
  onStatus: (n: number, status: SprintStatus) => void;
  onDue: (n: number, due: string) => void;
};

export function ProjectsBoardView({
  project,
  today,
  role,
  canEdit,
  pending,
  copiedMsg,
  showBack,
  onBack,
  onShareStudent,
  onShareTeacher,
  onStatus,
  onDue,
}: ProjectsBoardViewProps) {
  const missing = !project;
  const isStudent = role === "student";
  const [tab, setTab] = useState<TabKey>(isStudent ? "all" : "doing");
  const [shareOpen, setShareOpen] = useState(false);
  const [dragN, setDragN] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<SprintStatus | null>(null);
  const [dragFrom, setDragFrom] = useState<SprintStatus | null>(null);

  function clearDrag() {
    setDragN(null);
    setOverCol(null);
    setDragFrom(null);
  }

  const prog = project ? sprintProgress(project) : { done: 0, total: 0, pct: 0 };
  const next = project ? nextOpenSprint(project) : null;

  const counts = useMemo(() => {
    const c = { todo: 0, doing: 0, done: 0, all: 0 };
    if (!project) return c;
    c.all = project.weeks.length;
    for (const w of project.weeks) c[w.status] += 1;
    return c;
  }, [project]);

  const mobileCards = useMemo(() => {
    if (!project) return [] as ProjectSprint[];
    if (tab === "all") return [...project.weeks].sort((a, b) => a.n - b.n);
    return project.weeks.filter((w) => w.status === tab);
  }, [project, tab]);

  const footNote =
    role === "student"
      ? "Read-only student view — cards move as your teacher updates sprints. Check back after each Friday."
      : role === "guest"
        ? "You have edit access via a teacher link — drag a card between columns, or tap a status."
        : "Drag a card between columns — or tap a status or due date. Students with your link see it instantly.";

  const mobileTabs: Array<{ key: TabKey; label: string; count: number }> =
    isStudent
      ? [
          { key: "all", label: "ALL", count: counts.all },
          { key: "doing", label: "DOING", count: counts.doing },
          { key: "done", label: "DONE", count: counts.done },
        ]
      : [
          { key: "todo", label: "TO DO", count: counts.todo },
          { key: "doing", label: "DOING", count: counts.doing },
          { key: "done", label: "DONE", count: counts.done },
        ];

  return (
    <div className="kis-pop">
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 min-h-11 font-mono text-[11px] tracking-[0.14em] text-[#6d6759] hover:text-[#c8102e]"
        >
          ← YOUR PROJECTS
        </button>
      )}

      {isStudent && !missing && (
        <div className="mb-3 flex md:hidden">
          <span className="rounded-full bg-[#fdf4e3] px-2.5 py-1 font-mono text-[9px] tracking-[0.1em] text-[#9a6e06]">
            READ-ONLY
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
            <h1 className="text-[22px] font-light tracking-[-0.01em] md:text-[38px] md:tracking-[-0.02em]">
              {missing ? "Board not found" : project.unit}
            </h1>
            {!missing && (
              <span className="bg-[#141414] px-2 py-1 font-mono text-[10px] font-bold text-white md:px-2.5 md:py-1.5 md:text-[12px]">
                {project.initials}
              </span>
            )}
          </div>
          {!missing && (
            <span className="kis-title-underline !mt-2 !w-12 md:!mt-3 md:!w-14" />
          )}
          {!missing && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eeece5] px-2.5 py-1 font-mono text-[8.5px] tracking-[0.1em] text-[#3f3b33] md:text-[10px]">
                {project.course.toUpperCase()}
              </span>
              {role === "owner" && (
                <span className="rounded-full bg-[#dff2e3] px-2.5 py-1 font-mono text-[8.5px] tracking-[0.1em] text-[#2f7d3f] md:text-[10px]">
                  YOUR BOARD · EDITS SAVE INSTANTLY
                </span>
              )}
              {role === "guest" && (
                <span className="rounded-full bg-[#e6edf4] px-2.5 py-1 font-mono text-[8.5px] tracking-[0.1em] text-[#3b6285] md:text-[10px]">
                  SHARED WITH YOU · CAN EDIT
                </span>
              )}
              <span className="hidden font-mono text-[10px] tracking-[0.12em] text-[#6d6759] md:inline">
                {project.email.toUpperCase()}
              </span>
              {next && (
                <span
                  className="hidden font-mono text-[10px] tracking-[0.12em] md:inline"
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
          <div className="hidden min-w-[200px] pb-1 md:block">
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

      <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-[#8a857a] md:mt-3.5 md:text-[15px] md:text-[#6d6759]">
        {missing
          ? "This link doesn't match a project any more — ask your teacher for a fresh one."
          : project.summary}
      </p>

      {!missing && (
        <div className="mt-2.5 flex items-center gap-2 md:hidden">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eeece5]">
            <div
              className="kis-bar h-full bg-[#c8102e]"
              style={{ width: `${prog.pct}%` }}
            />
          </div>
          <span className="font-mono text-[9.5px] text-[#6d6759]">
            {prog.done}/{prog.total}
          </span>
        </div>
      )}

      {/* Desktop role banners + copy buttons */}
      {!missing && (
        <div className="mt-[18px] hidden flex-wrap items-center gap-3 md:flex">
          {role === "owner" && (
            <>
              <button
                type="button"
                onClick={() => void onShareStudent()}
                className="min-h-11 bg-[#141414] px-[18px] py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#c8102e]"
              >
                ⧉ Copy student link
              </button>
              <button
                type="button"
                onClick={() => void onShareTeacher()}
                disabled={pending}
                className="min-h-11 border-[1.5px] border-[#141414] px-[18px] py-2 text-[13.5px] font-semibold text-[#141414] transition-colors hover:bg-[#141414] hover:text-white disabled:opacity-60"
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
            <span className="font-mono text-[10.5px] tracking-[0.08em] text-[#98917f]">
              EDITS SAVE INSTANTLY — THE OWNER AND STUDENTS SEE THEM LIVE
            </span>
          )}
        </div>
      )}

      {isStudent && !missing && (
        <p className="mt-2.5 font-mono text-[8.5px] tracking-[0.08em] text-[#98917f] md:hidden">
          CARDS MOVE HERE AS YOUR TEACHER UPDATES SPRINTS
        </p>
      )}

      {/* Mobile status tabs */}
      {!missing && (
        <div className="mt-3.5 flex gap-1.5 md:hidden">
          {mobileTabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="min-h-11 flex-1 rounded-full px-1 py-2.5 font-mono text-[9.5px] tracking-[0.1em]"
                style={{
                  background: active ? "#141414" : "#fff",
                  color: active ? "#fff" : "#8a857a",
                  border: active ? "1px solid #141414" : "1px solid #e3e0d8",
                }}
              >
                {t.label}{" "}
                <span style={{ opacity: active ? 0.6 : 1, color: active ? undefined : "#b6b0a3" }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile card list */}
      {!missing && (
        <div className="mt-3 space-y-2.5 md:hidden">
          {mobileCards.map((w, i) => (
            <SprintCard
              key={`${w.n}-${w.status}`}
              week={w}
              today={today}
              canEdit={canEdit}
              pending={pending}
              showStatusInHeader={isStudent && tab === "all"}
              onStatus={onStatus}
              onDue={onDue}
              delay={i * 50}
            />
          ))}
          {!isStudent && (
            <p className="pt-1 text-center font-mono text-[8.5px] tracking-[0.1em] text-[#b6b0a3]">
              SWIPE OR TAP A TAB FOR OTHER SPRINTS
            </p>
          )}
        </div>
      )}

      {/* Desktop kanban */}
      {!missing && (
        <div className="mt-6 hidden gap-4 md:grid md:grid-cols-3">
          {COLS.map((col) => {
            const cards = project.weeks.filter((w) => w.status === col.key);
            const isTarget =
              canEdit &&
              dragN != null &&
              overCol === col.key &&
              dragFrom !== col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  if (!canEdit || dragN == null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overCol !== col.key) setOverCol(col.key);
                }}
                onDragLeave={(e) => {
                  if (!canEdit) return;
                  const related = e.relatedTarget as Node | null;
                  if (related && e.currentTarget.contains(related)) return;
                  setOverCol((cur) => (cur === col.key ? null : cur));
                }}
                onDrop={(e) => {
                  if (!canEdit) return;
                  e.preventDefault();
                  const raw =
                    e.dataTransfer.getData("text/plain") ||
                    (dragN != null ? String(dragN) : "");
                  const n = Number(raw);
                  const from = dragFrom;
                  clearDrag();
                  if (!Number.isFinite(n) || !from || from === col.key) return;
                  onStatus(n, col.key);
                }}
                className="min-h-[220px] p-3.5 transition-[background,border-color] duration-150"
                style={{
                  background: isTarget ? "#fdf1f3" : "#faf9f5",
                  border: isTarget
                    ? "1.5px dashed #c8102e"
                    : "1px solid #eeece5",
                }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: col.edge }}
                  />
                  <span className="font-mono text-[11px] tracking-[0.16em] text-[#3f3b33]">
                    {col.label}
                  </span>
                  <span className="font-mono text-[10px] text-[#98917f]">
                    {cards.length}
                  </span>
                </div>
                {isTarget && (
                  <div className="kis-pop mb-2.5 border-[1.5px] border-dashed border-[#c8102e] bg-white px-3 py-3 text-center font-mono text-[9.5px] tracking-[0.12em] text-[#c8102e]">
                    RELEASE → {col.label}
                  </div>
                )}
                <div className="space-y-2.5">
                  {cards.map((w, i) => (
                    <SprintCard
                      key={w.n}
                      week={w}
                      today={today}
                      canEdit={canEdit}
                      pending={pending}
                      showStatusInHeader={false}
                      draggableCard={canEdit}
                      isDragging={dragN === w.n}
                      onStatus={onStatus}
                      onDue={onDue}
                      delay={i * 60}
                      onDragStartCard={() => {
                        setDragFrom(w.status);
                        setDragN(w.n);
                      }}
                      onDragEndCard={clearDrag}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile owner share buttons */}
      {!missing && role === "owner" && (
        <div className="mt-4 flex gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="min-h-12 flex-1 rounded-full bg-[#141414] text-[12.5px] font-semibold text-white"
          >
            ⧉ Student link
          </button>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="min-h-12 flex-1 rounded-full border-[1.5px] border-[#141414] text-[12.5px] font-semibold text-[#141414]"
          >
            ✎ Teacher link
          </button>
        </div>
      )}

      <p className="mt-4 hidden text-[13px] text-[#98917f] md:block">{footNote}</p>

      {shareOpen && (
        <ShareSheet
          copiedMsg={copiedMsg}
          pending={pending}
          onClose={() => setShareOpen(false)}
          onShareStudent={async () => {
            await onShareStudent();
          }}
          onShareTeacher={async () => {
            await onShareTeacher();
          }}
        />
      )}
    </div>
  );
}

function SprintCard({
  week,
  today,
  canEdit,
  pending,
  showStatusInHeader,
  draggableCard = false,
  isDragging = false,
  onStatus,
  onDue,
  delay,
  onDragStartCard,
  onDragEndCard,
}: {
  week: ProjectSprint;
  today: string;
  canEdit: boolean;
  pending: boolean;
  showStatusInHeader: boolean;
  draggableCard?: boolean;
  isDragging?: boolean;
  onStatus: (n: number, status: SprintStatus) => void;
  onDue: (n: number, due: string) => void;
  delay: number;
  onDragStartCard?: () => void;
  onDragEndCard?: () => void;
}) {
  const overdue = isSprintOverdue(week, today);
  const edge =
    overdue
      ? "#c8102e"
      : week.status === "doing"
        ? "#e0a010"
        : week.status === "done"
          ? "#2f9e44"
          : "#e3e0d8";
  const statusLabel =
    week.status === "done"
      ? "DONE ✓"
      : week.status === "doing"
        ? "IN PROGRESS"
        : "TO DO";
  const headerColor =
    week.status === "doing" && showStatusInHeader ? "#9a6e06" : "#98917f";
  const cardBg =
    week.status === "doing" && showStatusInHeader ? "#fffdf7" : "#fff";

  const dueShort = formatSprintDue(week.due).replace(/^[A-Z]{3}\s/, "");

  return (
    <div
      draggable={draggableCard}
      onDragStart={(e) => {
        if (!draggableCard) return;
        e.dataTransfer.setData("text/plain", String(week.n));
        e.dataTransfer.effectAllowed = "move";
        onDragStartCard?.();
      }}
      onDragEnd={() => onDragEndCard?.()}
      className={`kis-pop rounded-xl border border-[#e3e0d8] border-l-[3px] px-3.5 py-3 transition-[opacity,box-shadow] duration-150 ${
        draggableCard
          ? "cursor-grab active:cursor-grabbing hover:shadow-[0_4px_14px_rgba(20,20,20,0.12)]"
          : ""
      }`}
      style={{
        borderLeftColor: edge,
        background: cardBg,
        animationDelay: `${delay}ms`,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-mono text-[8.5px] tracking-[0.12em]"
          style={{ color: headerColor }}
        >
          SPRINT {week.n}
          {showStatusInHeader ? ` · ${statusLabel}` : ""}
        </span>
        <span
          className="font-mono text-[8.5px]"
          style={{ color: overdue ? "#c8102e" : "#98917f" }}
        >
          {week.status === "done"
            ? formatSprintDue(week.due)
            : `DUE ${formatSprintDue(week.due)}`}
        </span>
      </div>
      <p
        className="mt-1.5 text-[13.5px] leading-snug md:text-[14.5px]"
        style={{ color: week.status === "done" ? "#98917f" : "#3f3b33" }}
      >
        {week.objective}
      </p>
      {canEdit && (
        <div
          className="mt-2.5 flex flex-wrap items-center gap-2"
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
        >
          <div className="flex min-h-11 overflow-hidden rounded-full border border-[#e3e0d8]">
            {STATUS_OPTS.map((o) => {
              const selected = week.status === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  disabled={pending || selected}
                  onClick={() => onStatus(week.n, o.v)}
                  className="min-h-11 px-[11px] font-mono text-[8.5px] tracking-[0.08em] transition-colors hover:text-[#141414] disabled:cursor-default"
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
          <label className="relative min-h-11">
            <span className="flex min-h-11 items-center rounded-lg border border-[#e3e0d8] px-2.5 font-mono text-[9px] text-[#6d6759]">
              {dueShort} ▾
            </span>
            <input
              type="date"
              value={week.due}
              disabled={pending}
              onChange={(e) => onDue(week.n, e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function ShareSheet({
  copiedMsg,
  pending,
  onClose,
  onShareStudent,
  onShareTeacher,
}: {
  copiedMsg: string | null;
  pending: boolean;
  onClose: () => void;
  onShareStudent: () => Promise<void>;
  onShareTeacher: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[rgba(20,20,20,0.45)]"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[20px] border-t border-[#e3e0d8] bg-white px-5 pb-6 pt-3.5 shadow-[0_-10px_30px_rgba(20,20,20,0.14)]">
        <div className="mx-auto h-1 w-[38px] rounded-full bg-[#e3e0d8]" />
        <p className="mt-3.5 text-[16px] font-semibold">Share this board</p>

        <button
          type="button"
          disabled={pending}
          onClick={() => void onShareStudent()}
          className="mt-3 flex w-full items-start gap-3 rounded-[14px] border border-[#e3e0d8] p-3.5 text-left"
        >
          <span className="shrink-0 rounded-full bg-[#fdf4e3] px-2.5 py-1 font-mono text-[8.5px] tracking-[0.1em] text-[#9a6e06]">
            VIEW ONLY
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold">Student link</span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-[#8a857a]">
              Students watch cards move — no password, no editing.
            </span>
          </span>
          <span className="shrink-0 text-[12px] font-semibold text-[#c8102e]">
            Share →
          </span>
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => void onShareTeacher()}
          className="mt-2 flex w-full items-start gap-3 rounded-[14px] border-[1.5px] border-[#141414] bg-[#faf9f5] p-3.5 text-left"
        >
          <span className="shrink-0 rounded-full bg-[#e6edf4] px-2.5 py-1 font-mono text-[8.5px] tracking-[0.1em] text-[#3b6285]">
            CAN EDIT
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold">Teacher link</span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-[#8a857a]">
              Anyone with this link can move cards and change dates on this one
              board.
            </span>
          </span>
          <span className="shrink-0 text-[12px] font-semibold text-[#c8102e]">
            Share →
          </span>
        </button>

        {copiedMsg && (
          <p className="kis-pop mt-3 text-center font-mono text-[8.5px] tracking-[0.08em] text-[#2f9e44]">
            {copiedMsg}
          </p>
        )}
      </div>
    </div>
  );
}
