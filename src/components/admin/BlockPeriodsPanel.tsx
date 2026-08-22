"use client";

import {
  createSpaceBlock,
  deleteSpaceBlock,
  restoreSpaceBlock,
  updateSpaceBlockReason,
  updateSpaceBlockScope,
} from "@/app/admin/actions";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAdminWrite } from "@/components/admin/AdminWriteFeedback";
import {
  countBlockConflicts,
  DOW_NAMES,
  formatBlockWhen,
  normalizePeriodRange,
  periodRangeLabel,
  todayIsoDate,
  type DowName,
} from "@/lib/space-blocks";
import type { SpaceBlock, SpaceBlockScope, SpaceBooking } from "@/lib/types";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

type BlockPeriodsPanelProps = {
  blocks: SpaceBlock[];
  bookings: SpaceBooking[];
  onDone: () => void;
};

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const fieldLabel =
  "font-mono text-[10.5px] tracking-[0.16em] text-[#6d6759]";
const underline =
  "border-0 border-b border-[#e3e0d8] bg-transparent px-0 py-2 text-[14.5px] outline-none focus:border-[#141414]";

function pillStyle(selected: boolean) {
  return {
    background: selected ? "#141414" : "#fff",
    color: selected ? "#fff" : "#3f3b33",
    border: `1px solid ${selected ? "#141414" : "#e3e0d8"}`,
  } as const;
}

function fmtOnce(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const mons = [
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
  const dows = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return `${dows[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${mons[d.getMonth()]}`;
}

export function BlockPeriodsPanel({
  blocks: initialBlocks,
  bookings,
  onDone,
}: BlockPeriodsPanelProps) {
  const askConfirm = useConfirm();
  const { notify } = useAdminWrite();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [open, setOpen] = useState(true);
  const [repeat, setRepeat] = useState<"once" | "weekly">("once");
  const [scope, setScope] = useState<SpaceBlockScope>("all");
  const [date, setDate] = useState("");
  const [dow, setDow] = useState<DowName>("MON");
  const [start, setStart] = useState(todayIsoDate);
  const [until, setUntil] = useState("");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [flashId, setFlashId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const editRef = useRef<HTMLInputElement | null>(null);
  const editingIdRef = useRef<string | null>(null);

  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  useEffect(() => {
    if (!editingId || !editRef.current) return;
    editRef.current.focus();
    editRef.current.select();
  }, [editingId]);

  function flash(id: string) {
    setFlashId(id);
    window.setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 900);
  }

  function startEdit(b: SpaceBlock) {
    editingIdRef.current = b.id;
    setEditingId(b.id);
    setEditDraft(b.reason);
  }

  function cancelEdit() {
    editingIdRef.current = null;
    setEditingId(null);
    setEditDraft("");
  }

  function commitEdit(b: SpaceBlock) {
    if (editingIdRef.current !== b.id) return;
    const next = editDraft.trim();
    const prev = b.reason;
    editingIdRef.current = null;
    setEditingId(null);
    setEditDraft("");
    if (!next || next === prev) return;

    startTransition(async () => {
      setError("");
      setBlocks((list) =>
        list.map((x) => (x.id === b.id ? { ...x, reason: next } : x)),
      );
      flash(b.id);
      const result = await updateSpaceBlockReason(b.id, next);
      if (!result.ok) {
        setBlocks((list) =>
          list.map((x) => (x.id === b.id ? { ...x, reason: prev } : x)),
        );
        setError(result.error);
        return;
      }
      notify(`BLOCK RENAMED · "${next.toUpperCase()}"`, {
        bg: "#141414",
        undo: async () => {
          const restored = await updateSpaceBlockReason(b.id, prev);
          if (!restored.ok) return;
          setBlocks((list) =>
            list.map((x) => (x.id === b.id ? { ...x, reason: prev } : x)),
          );
          flash(b.id);
          notify("NAME RESTORED ✓");
          onDone();
        },
      });
      onDone();
    });
  }

  const range = normalizePeriodRange(from, to);
  const rangeHint =
    range.period_from === range.period_to
      ? `P${range.period_from} — tap a later period to extend the range`
      : `P${range.period_from}–P${range.period_to}`;

  const dateRangeError =
    repeat === "weekly" && start && until && until < start
      ? "End date is before the start date."
      : "";

  const conflicts = useMemo(() => {
    if (scope === "training") return 0;
    if (dateRangeError) return 0;
    return countBlockConflicts(bookings, {
      repeat,
      block_date: repeat === "once" ? date || null : null,
      dow: repeat === "weekly" ? dow : null,
      start_date: repeat === "weekly" && start ? start : null,
      until_date: repeat === "weekly" && until ? until : null,
      period_from: range.period_from,
      period_to: range.period_to,
      scope,
    });
  }, [
    bookings,
    scope,
    repeat,
    date,
    dow,
    start,
    until,
    dateRangeError,
    range.period_from,
    range.period_to,
  ]);

  function pickPeriod(p: number) {
    if (from === to && p > from) {
      setTo(p);
    } else {
      setFrom(p);
      setTo(p);
    }
  }

  return (
    <section className="no-print page-gutter mb-11">
      <div className="border border-[#e3e0d8] border-t-[3px] border-t-[#c8102e] bg-white">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3.5 text-left select-none"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
              Block periods
            </h2>
            {blocks.length > 0 && (
              <span className="rounded-full bg-[#eeece5] px-2 py-0.5 font-mono text-[10px] tracking-wide text-[#3f3b33]">
                {blocks.length} ACTIVE
              </span>
            )}
            <span className="text-[13.5px] text-[#6d6759]">
              Close the space entirely — or reserve periods for training only.
            </span>
          </div>
          <span className="shrink-0 border border-[#141414] px-[18px] py-2 text-[14px] font-semibold transition-colors hover:bg-[#141414] hover:text-white">
            {open ? "Close" : "Block periods"}
          </span>
        </button>

        {open && (
          <>
            <div className="flex flex-wrap items-end gap-3.5 border-t border-[#eeece5] px-5 pt-3.5 pb-1.5">
              <div className="flex flex-col gap-2">
                <span className={fieldLabel}>REPEAT</span>
                <div className="flex gap-1.5">
                  {(
                    [
                      { v: "once" as const, label: "One day" },
                      { v: "weekly" as const, label: "Every week" },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setRepeat(o.v)}
                      className="rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors hover:border-[#141414] active:scale-95"
                      style={pillStyle(repeat === o.v)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className={fieldLabel}>APPLIES TO</span>
                <div className="flex gap-1.5">
                  {(
                    [
                      {
                        v: "all" as const,
                        label: "Space + training",
                      },
                      {
                        v: "training" as const,
                        label: "Training only",
                      },
                      {
                        v: "space" as const,
                        label: "Space only",
                      },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setScope(o.v)}
                      className="rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors hover:border-[#141414] active:scale-95"
                      style={pillStyle(scope === o.v)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {repeat === "once" ? (
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>DATE</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={underline}
                  />
                </label>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <span className={fieldLabel}>EVERY</span>
                    <div className="flex gap-1.5">
                      {DOW_NAMES.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDow(d)}
                          className="rounded-full px-3.5 py-2 font-mono text-[12px] font-bold tracking-[0.06em] transition-colors hover:border-[#141414] active:scale-95"
                          style={pillStyle(dow === d)}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className={fieldLabel}>STARTS</span>
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className={underline}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={fieldLabel}>ENDS · OPTIONAL</span>
                    <input
                      type="date"
                      value={until}
                      onChange={(e) => setUntil(e.target.value)}
                      className={underline}
                      style={
                        dateRangeError ? { borderColor: "#c8102e" } : undefined
                      }
                    />
                  </label>
                </>
              )}

              <div className="flex flex-col gap-2">
                <span className={fieldLabel}>PERIODS · {rangeHint}</span>
                <div className="flex gap-1">
                  {PERIODS.map((p) => {
                    const inRange =
                      p >= range.period_from && p <= range.period_to;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => pickPeriod(p)}
                        className="rounded-full px-[11px] py-2 font-mono text-[12px] font-bold transition-colors hover:border-[#141414] active:scale-95"
                        style={pillStyle(inRange)}
                      >
                        P{p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                <span className={fieldLabel}>REASON · SHOWN TO TEACHERS</span>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Grade 6 class, maintenance"
                  className={underline}
                />
              </label>

              <button
                type="button"
                disabled={
                  pending ||
                  (repeat === "once" && !date) ||
                  !!dateRangeError
                }
                onClick={() => {
                  if (repeat === "once" && !date) return;
                  if (dateRangeError) return;
                  startTransition(async () => {
                    setError("");
                    const result = await createSpaceBlock({
                      repeat,
                      blockDate: date,
                      dow,
                      startDate: start,
                      untilDate: until,
                      periodFrom: from,
                      periodTo: to,
                      reason,
                      scope,
                    });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    const when =
                      repeat === "once"
                        ? fmtOnce(date)
                        : `EVERY ${dow}`;
                    const toastRange = periodRangeLabel(
                      range.period_from,
                      range.period_to,
                    );
                    const scopeTag =
                      scope === "training"
                        ? " · TRAINING ONLY"
                        : scope === "space"
                          ? " · SPACE ONLY"
                          : "";
                    setReason("");
                    notify(
                      `BLOCK ADDED ✓ · ${when} · ${toastRange}${scopeTag}`,
                    );
                    if (result.id) flash(result.id);
                    onDone();
                  });
                }}
                className="bg-[#141414] px-[22px] py-2.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-[#c8102e] disabled:opacity-40"
              >
                Block →
              </button>
            </div>

            {dateRangeError && (
              <div className="mx-5 mt-2 flex items-center gap-1.5 text-[13px] text-[#c8102e]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8102e]" />
                {dateRangeError}
              </div>
            )}

            {conflicts > 0 && (
              <div className="mx-5 my-2.5 bg-[#fdf8ec] px-3.5 py-2.5 text-[13.5px] text-[#9a6e06]">
                ⚠ This block overlaps {conflicts} existing booking
                {conflicts === 1 ? "" : "s"}. Existing bookings stay — cancel
                them in the Booking requests section above if needed.
              </div>
            )}

            {blocks.length > 0 && (
              <div className="px-5 pt-1.5">
                <div className="mb-1 font-mono text-[10px] tracking-[0.16em] text-[#857e6e]">
                  ACTIVE BLOCKS
                </div>
                {blocks.map((b) => {
                  const scope = b.scope || "all";
                  const trainingOnly = scope === "training";
                  const spaceOnly = scope === "space";
                  const scopeOptions = [
                    { v: "all" as const, label: "SPACE + TRAINING" },
                    { v: "training" as const, label: "TRAINING ONLY" },
                    { v: "space" as const, label: "SPACE ONLY" },
                  ];
                  const swatch = spaceOnly
                    ? {
                        border: "1px solid #b9cede",
                        background:
                          "repeating-linear-gradient(45deg, #e6edf4 0, #e6edf4 3px, #b9cede 3px, #b9cede 6px)",
                      }
                    : trainingOnly
                      ? {
                          border: "1px solid #eeddb2",
                          background:
                            "repeating-linear-gradient(45deg, #fdf4e3 0, #fdf4e3 3px, #eeddb2 3px, #eeddb2 6px)",
                        }
                      : {
                          border: "1px solid #d5d1c8",
                          background:
                            "repeating-linear-gradient(45deg, #f2f0ea 0, #f2f0ea 3px, #d5d1c8 3px, #d5d1c8 6px)",
                        };
                  return (
                  <div
                    key={b.id}
                    className={`flex flex-wrap items-center gap-2.5 py-1.5 text-[14px] ${
                      flashId === b.id ? "kis-admin-flash" : ""
                    }`}
                  >
                    <span className="h-3 w-3 shrink-0" style={swatch} />
                    <span className="shrink-0 font-mono text-[11px] text-[#3f3b33]">
                      {formatBlockWhen(b)}
                    </span>
                    {editingId === b.id ? (
                      <input
                        ref={editRef}
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitEdit(b);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEdit();
                          }
                        }}
                        onBlur={() => commitEdit(b)}
                        className="min-w-[160px] border-0 px-1.5 py-0.5 text-[14px] text-[#141414] outline-none"
                        style={{
                          borderBottom: "1.5px solid #c8102e",
                          background: "#fdf1f3",
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        title="Click to rename"
                        onClick={() => startEdit(b)}
                        className="cursor-text text-left text-[14px] text-[#6d6759] hover:text-[#141414] hover:underline hover:decoration-dashed hover:decoration-[#b5afa1] hover:underline-offset-2"
                      >
                        {b.reason}
                      </button>
                    )}
                    <div
                      className="flex shrink-0 overflow-hidden rounded-full border border-[#e3e0d8]"
                      title="Switch what this block applies to"
                    >
                      {scopeOptions.map((o) => {
                        const selected = scope === o.v;
                        const selectedStyle =
                          o.v === "training"
                            ? { background: "#fdf4e3", color: "#9a6e06" }
                            : o.v === "space"
                              ? { background: "#e6edf4", color: "#3b6285" }
                              : { background: "#eeece5", color: "#3f3b33" };
                        return (
                          <button
                            key={o.v}
                            type="button"
                            disabled={pending || selected}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selected) return;
                              const prevScope = scope;
                              startTransition(async () => {
                                setError("");
                                setBlocks((prev) =>
                                  prev.map((x) =>
                                    x.id === b.id
                                      ? { ...x, scope: o.v }
                                      : x,
                                  ),
                                );
                                flash(b.id);
                                const result = await updateSpaceBlockScope(
                                  b.id,
                                  o.v,
                                );
                                if (!result.ok) {
                                  setBlocks((prev) =>
                                    prev.map((x) =>
                                      x.id === b.id
                                        ? { ...x, scope: prevScope }
                                        : x,
                                    ),
                                  );
                                  setError(result.error);
                                  return;
                                }
                                const toastMsg =
                                  o.v === "training"
                                    ? "BLOCK NOW TRAINING ONLY · SPACE OPEN TO TEACHERS"
                                    : o.v === "space"
                                      ? "BLOCK NOW SPACE ONLY · TRAINING STAYS OPEN"
                                      : "BLOCK NOW CLOSES SPACE + TRAINING";
                                notify(toastMsg, {
                                  bg: "#141414",
                                  undo: async () => {
                                    const restored =
                                      await updateSpaceBlockScope(
                                        b.id,
                                        prevScope,
                                      );
                                    if (!restored.ok) return;
                                    setBlocks((prev) =>
                                      prev.map((x) =>
                                        x.id === b.id
                                          ? { ...x, scope: prevScope }
                                          : x,
                                      ),
                                    );
                                    flash(b.id);
                                    notify("SCOPE RESTORED ✓");
                                    onDone();
                                  },
                                });
                                onDone();
                              });
                            }}
                            className="px-[9px] py-[3px] font-mono text-[9.5px] tracking-[0.08em] transition-colors enabled:hover:text-[#141414] disabled:cursor-default"
                            style={
                              selected
                                ? selectedStyle
                                : { background: "#fff", color: "#b5afa1" }
                            }
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                    <span className="flex-1" />
                    <button
                      type="button"
                      title="Remove block"
                      disabled={pending}
                      onClick={(e) => {
                        e.stopPropagation();
                        askConfirm({
                          title: "Remove this block?",
                          body: trainingOnly
                            ? `${formatBlockWhen(b)} — “${b.reason}”. Training sessions can be booked in these periods again.`
                            : spaceOnly
                              ? `${formatBlockWhen(b)} — “${b.reason}”. Teachers can request these periods again.`
                              : `${formatBlockWhen(b)} — “${b.reason}”. Teachers can request these periods again.`,
                          action: "Remove block",
                          fn: async () => {
                            setError("");
                            const result = await deleteSpaceBlock(b.id);
                            if (!result.ok) {
                              setError(result.error);
                              throw new Error(result.error);
                            }
                            setBlocks((prev) =>
                              prev.filter((x) => x.id !== b.id),
                            );
                            const snapshot = {
                              repeat: b.repeat,
                              blockDate: b.block_date ?? undefined,
                              dow: (b.dow as DowName | null) ?? undefined,
                              startDate: b.start_date ?? undefined,
                              untilDate: b.until_date ?? undefined,
                              periodFrom: b.period_from,
                              periodTo: b.period_to,
                              reason: b.reason,
                              scope: b.scope,
                            };
                            notify("BLOCK REMOVED · PERIODS OPEN AGAIN", {
                              bg: "#141414",
                              undo: async () => {
                                const restored =
                                  await restoreSpaceBlock(snapshot);
                                if (!restored.ok) return;
                                if (restored.id) flash(restored.id);
                                notify("BLOCK RESTORED ✓");
                                onDone();
                              },
                            });
                            onDone();
                          },
                        });
                      }}
                      className="px-1 text-[16px] text-[#857e6e] hover:text-[#c8102e]"
                    >
                      ×
                    </button>
                  </div>
                  );
                })}
              </div>
            )}

            <p className="border-t border-[#eeece5] px-5 py-2.5 text-[12.5px] text-[#857e6e]">
              Full blocks close both pages. Training-only blocks hide the
              periods from Book training — teachers can still book the space.
              Space-only blocks close the space on Schedule — training sessions
              can still be booked.
            </p>

            {error && (
              <p className="px-5 pb-3 text-[14px] text-[#c8102e]">{error}</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
