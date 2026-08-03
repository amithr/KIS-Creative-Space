import { toISODate } from "@/lib/inventory";
import type { SpaceBlock, SpaceBooking } from "@/lib/types";

export const DOW_NAMES = ["MON", "TUE", "WED", "THU", "FRI"] as const;
export type DowName = (typeof DOW_NAMES)[number];

const MONS = [
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
] as const;

export function dowOfIso(isoDate: string): DowName | null {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const idx = (d.getDay() + 6) % 7;
  if (idx > 4) return null;
  return DOW_NAMES[idx];
}

/** Applicability: from ≤ period ≤ to AND date/dow/until match. */
export function blockApplies(
  block: SpaceBlock,
  isoDate: string,
  period: number,
): boolean {
  if (period < block.period_from || period > block.period_to) return false;
  if (block.repeat === "once") {
    return block.block_date === isoDate;
  }
  const dow = dowOfIso(isoDate);
  if (!dow || dow !== block.dow) return false;
  if (block.until_date && isoDate > block.until_date) return false;
  return true;
}

export function findBlock(
  blocks: SpaceBlock[],
  isoDate: string,
  period: number,
): SpaceBlock | undefined {
  return blocks.find((b) => blockApplies(b, isoDate, period));
}

export function periodRangeLabel(from: number, to: number) {
  return from === to ? `P${from}` : `P${from}–P${to}`;
}

export function formatBlockWhen(block: SpaceBlock): string {
  const fmtOnce = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    const all = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const label = all[(d.getDay() + 6) % 7];
    return `${label} ${String(d.getDate()).padStart(2, "0")} ${MONS[d.getMonth()]}`;
  };

  const range = periodRangeLabel(block.period_from, block.period_to);
  if (block.repeat === "once" && block.block_date) {
    return `${fmtOnce(block.block_date)} · ${range}`;
  }
  const until = block.until_date ? ` UNTIL ${fmtOnce(block.until_date)}` : "";
  return `EVERY ${block.dow}${until} · ${range}`;
}

/** Count pending/confirmed bookings overlapped by a proposed block. */
export function countBlockConflicts(
  bookings: SpaceBooking[],
  draft: Pick<
    SpaceBlock,
    "repeat" | "block_date" | "dow" | "until_date" | "period_from" | "period_to"
  >,
): number {
  const probe: SpaceBlock = {
    id: "draft",
    repeat: draft.repeat,
    block_date: draft.block_date,
    dow: draft.dow,
    until_date: draft.until_date,
    period_from: draft.period_from,
    period_to: draft.period_to,
    reason: "Blocked",
    created_at: new Date().toISOString(),
  };

  let n = 0;
  for (const b of bookings) {
    if (b.status !== "pending" && b.status !== "confirmed") continue;
    if (blockApplies(probe, b.booking_date, b.period)) n += 1;
  }
  return n;
}

export function normalizePeriodRange(from: number, to: number) {
  return {
    period_from: Math.min(from, to),
    period_to: Math.max(from, to),
  };
}

export function todayIsoDate() {
  return toISODate(new Date());
}
