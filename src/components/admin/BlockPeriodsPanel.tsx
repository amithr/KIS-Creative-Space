"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createSpaceBlock,
  deleteSpaceBlock,
  restoreSpaceBlock,
} from "@/app/admin/actions";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAdminWrite } from "@/components/admin/AdminWriteFeedback";
import {
  countBlockConflicts,
  DOW_NAMES,
  formatBlockWhen,
  normalizePeriodRange,
  periodRangeLabel,
  type DowName,
} from "@/lib/space-blocks";
import type { SpaceBlock, SpaceBooking } from "@/lib/types";

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
  const [open, setOpen] = useState(false);
  const [repeat, setRepeat] = useState<"once" | "weekly">("once");
  const [date, setDate] = useState("");
  const [dow, setDow] = useState<DowName>("MON");
  const [until, setUntil] = useState("");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [flashId, setFlashId] = useState<string | null>(null);

  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  function flash(id: string) {
    setFlashId(id);
    window.setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 900);
  }

  const range = normalizePeriodRange(from, to);
  const rangeHint =
    range.period_from === range.period_to
      ? `P${range.period_from} — tap a later period to extend the range`
      : `P${range.period_from}–P${range.period_to}`;

  const conflicts = useMemo(
    () =>
      countBlockConflicts(bookings, {
        repeat,
        block_date: repeat === "once" ? date || null : null,
        dow: repeat === "weekly" ? dow : null,
        until_date: repeat === "weekly" && until ? until : null,
        period_from: range.period_from,
        period_to: range.period_to,
      }),
    [bookings, repeat, date, dow, until, range.period_from, range.period_to],
  );

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
              Close the space for classes, maintenance or events — one day or
              every week.
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
                    <span className={fieldLabel}>UNTIL · OPTIONAL</span>
                    <input
                      type="date"
                      value={until}
                      onChange={(e) => setUntil(e.target.value)}
                      className={underline}
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
                disabled={pending || (repeat === "once" && !date)}
                onClick={() => {
                  if (repeat === "once" && !date) return;
                  startTransition(async () => {
                    setError("");
                    const result = await createSpaceBlock({
                      repeat,
                      blockDate: date,
                      dow,
                      untilDate: until,
                      periodFrom: from,
                      periodTo: to,
                      reason,
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
                    setReason("");
                    notify(`BLOCK ADDED ✓ · ${when} · ${toastRange}`);
                    if (result.id) flash(result.id);
                    onDone();
                  });
                }}
                className="bg-[#141414] px-[22px] py-2.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-[#c8102e] disabled:opacity-40"
              >
                Block →
              </button>
            </div>

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
                {blocks.map((b) => (
                  <div
                    key={b.id}
                    className={`flex items-center gap-2.5 py-1.5 text-[14px] ${
                      flashId === b.id ? "kis-admin-flash" : ""
                    }`}
                  >
                    <span
                      className="h-3 w-3 shrink-0 border border-[#d5d1c8]"
                      style={{
                        background:
                          "repeating-linear-gradient(45deg, #f2f0ea 0, #f2f0ea 3px, #d5d1c8 3px, #d5d1c8 6px)",
                      }}
                    />
                    <span className="shrink-0 font-mono text-[11px] text-[#3f3b33]">
                      {formatBlockWhen(b)}
                    </span>
                    <span className="text-[#6d6759]">{b.reason}</span>
                    <span className="flex-1" />
                    <button
                      type="button"
                      title="Remove block"
                      disabled={pending}
                      onClick={(e) => {
                        e.stopPropagation();
                        askConfirm({
                          title: "Remove this block?",
                          body: `${formatBlockWhen(b)} — “${b.reason}”. Teachers can request these periods again.`,
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
                              untilDate: b.until_date ?? undefined,
                              periodFrom: b.period_from,
                              periodTo: b.period_to,
                              reason: b.reason,
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
                ))}
              </div>
            )}

            <p className="border-t border-[#eeece5] px-5 py-2.5 text-[12.5px] text-[#857e6e]">
              Blocked periods show striped on the public Schedule page with your
              reason — teachers can&apos;t request them.
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
