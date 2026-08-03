"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createSpaceBlock,
  deleteSpaceBlock,
} from "@/app/admin/actions";
import {
  countBlockConflicts,
  DOW_NAMES,
  formatBlockWhen,
  normalizePeriodRange,
  type DowName,
} from "@/lib/space-blocks";
import type { SpaceBlock, SpaceBooking } from "@/lib/types";

type BlockPeriodsPanelProps = {
  blocks: SpaceBlock[];
  bookings: SpaceBooking[];
  onDone: (msg: string) => void;
};

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const fieldLabel =
  "font-mono text-[10.5px] tracking-[0.16em] text-[#6d6759]";
const underline =
  "border-0 border-b border-[#e3e0d8] bg-transparent px-0 py-2 text-[14.5px] outline-none focus:border-[#141414]";

export function BlockPeriodsPanel({
  blocks,
  bookings,
  onDone,
}: BlockPeriodsPanelProps) {
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

  const range = normalizePeriodRange(from, to);

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

  return (
    <div className="no-print page-gutter mb-11">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 pb-1.5 text-left select-none"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
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
          <div className="flex flex-wrap items-end gap-3.5 pt-3.5 pb-1.5">
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>REPEAT</span>
              <select
                value={repeat}
                onChange={(e) =>
                  setRepeat(e.target.value as "once" | "weekly")
                }
                className={underline}
              >
                <option value="once">One day only</option>
                <option value="weekly">Every week</option>
              </select>
            </label>

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
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>EVERY</span>
                  <select
                    value={dow}
                    onChange={(e) => setDow(e.target.value as DowName)}
                    className={underline}
                  >
                    {DOW_NAMES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
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

            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>FROM</span>
              <select
                value={from}
                onChange={(e) => setFrom(Number(e.target.value))}
                className={underline}
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    P{p}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>TO</span>
              <select
                value={to}
                onChange={(e) => setTo(Number(e.target.value))}
                className={underline}
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    P{p}
                  </option>
                ))}
              </select>
            </label>

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
                  setReason("");
                  onDone("Block added");
                });
              }}
              className="bg-[#141414] px-[22px] py-2.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-[#c8102e] disabled:opacity-40"
            >
              Block →
            </button>
          </div>

          {conflicts > 0 && (
            <div className="my-2.5 bg-[#fdf8ec] px-3.5 py-2.5 text-[13.5px] text-[#9a6e06]">
              ⚠ This block overlaps {conflicts} existing booking
              {conflicts === 1 ? "" : "s"}. Existing bookings stay — cancel them
              in the Booking requests section above if needed.
            </div>
          )}

          {blocks.length > 0 && (
            <div className="pt-2.5">
              <div className="mb-1 font-mono text-[10px] tracking-[0.16em] text-[#857e6e]">
                ACTIVE BLOCKS
              </div>
              {blocks.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2.5 py-1.5 text-[14px]"
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
                      startTransition(async () => {
                        setError("");
                        const result = await deleteSpaceBlock(b.id);
                        if (!result.ok) {
                          setError(result.error);
                          return;
                        }
                        onDone("Block removed");
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

          <p className="pt-3 text-[13px] text-[#6d6759]">
            Blocked periods show striped on the public Schedule page with your
            reason — teachers can&apos;t request them.
          </p>

          {error && <p className="pt-2 text-[14px] text-[#c8102e]">{error}</p>}
        </>
      )}
    </div>
  );
}
