import { toISODate, startOfDay } from "@/lib/inventory";
import { findAnyBlock, blockScope } from "@/lib/space-blocks";
import {
  activeSpaceAt,
  activeTrainingAt,
} from "@/lib/period-slot";
import type {
  SpaceBlock,
  SpaceBooking,
  TrainingSession,
  WednesdayEntry,
} from "@/lib/types";

/** Next four Wednesdays including today if Wednesday. */
export function nextWednesdays(now = startOfDay(new Date()), count = 4): Date[] {
  const first = new Date(now);
  first.setDate(now.getDate() + ((3 - now.getDay() + 7) % 7));
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(first);
    d.setDate(first.getDate() + i * 7);
    return d;
  });
}

export function formatWedShort(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatWedLong(d: Date) {
  return (
    "Wednesday " +
    d.toLocaleDateString("en-GB", { day: "numeric", month: "long" })
  );
}

export function normalizeWednesdayEntry(
  row: Record<string, unknown>,
): WednesdayEntry {
  return {
    id: String(row.id ?? ""),
    session_date: String(row.session_date ?? ""),
    email: String(row.email ?? "").trim().toLowerCase(),
    period: Number(row.period) || 1,
    cls: String(row.cls ?? "").trim().toUpperCase(),
    text: String(row.text ?? "").trim(),
    resources: row.resources ? String(row.resources).trim() || null : null,
    project_id: row.project_id ? String(row.project_id) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export type StudioCalRow = {
  period: number;
  kind: string;
  text: string;
  tone: "green" | "amber" | "blue" | "red";
};

/**
 * Studio-calendar occupancy for a Wednesday (space/training/closures).
 * Training-only blocks do not occupy space for design sessions.
 */
export function studioCalendarRowsForDate(
  iso: string,
  bookings: SpaceBooking[],
  training: TrainingSession[],
  blocks: SpaceBlock[],
): StudioCalRow[] {
  const rows: StudioCalRow[] = [];
  for (let p = 1; p <= 8; p++) {
    const bk = activeSpaceAt(bookings, iso, p);
    if (bk) {
      const pending = bk.status === "pending";
      rows.push({
        period: p,
        kind: pending ? "SPACE · REQUESTED" : "SPACE BOOKING",
        text: bk.purpose
          ? `${bk.teacher_name} · ${bk.purpose}`
          : bk.teacher_name,
        tone: pending ? "blue" : "green",
      });
      continue;
    }
    const tr = activeTrainingAt(training, iso, p);
    if (tr) {
      const pending = tr.status === "pending";
      rows.push({
        period: p,
        kind: pending ? "TRAINING · REQUESTED" : "TRAINING",
        text: tr.topic ? `${tr.teacher_name} · ${tr.topic}` : tr.teacher_name,
        tone: pending ? "blue" : "amber",
      });
      continue;
    }
    const blk = findAnyBlock(blocks, iso, p);
    if (blk && blockScope(blk) !== "training") {
      rows.push({
        period: p,
        kind: blockScope(blk) === "space" ? "SPACE CLOSED" : "FULLY CLOSED",
        text: blk.reason,
        tone: "red",
      });
    }
  }
  return rows;
}

export function periodTakenOnStudioCalendar(
  period: number,
  calRows: StudioCalRow[],
) {
  return calRows.some((r) => r.period === period);
}

export function wednesdayHorizonIso(now = startOfDay(new Date())) {
  const weds = nextWednesdays(now, 4);
  return {
    from: toISODate(weds[0]),
    to: toISODate(weds[weds.length - 1]),
  };
}
