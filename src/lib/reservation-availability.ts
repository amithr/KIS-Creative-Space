import type { Equipment, Reservation } from "@/lib/types";
import { startOfDay, toISODate } from "@/lib/inventory";

export type PeriodSelection = "all" | { start: number; end: number };

export function expandPeriods(periods: PeriodSelection): number[] {
  if (periods === "all") {
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }
  const out: number[] = [];
  for (let p = periods.start; p <= periods.end; p++) out.push(p);
  return out;
}

export function periodsFromReservation(r: Reservation): PeriodSelection {
  if (r.period_start == null || r.period_end == null) return "all";
  return { start: r.period_start, end: r.period_end };
}

export function reservationCoversPeriod(
  r: Reservation,
  period: number,
): boolean {
  const sel = periodsFromReservation(r);
  if (sel === "all") return true;
  return period >= sel.start && period <= sel.end;
}

export function reservationIncludesDay(r: Reservation, day: string): boolean {
  return r.days.includes(day);
}

/** Free units for item i on day d, period p (DATA-CONTRACT). */
export function freeUnits(
  avail: number,
  day: string,
  period: number,
  reservations: Reservation[],
  equipmentId: string,
  excludeId?: string,
): number {
  let used = 0;
  for (const r of reservations) {
    if (r.equipment_id !== equipmentId) continue;
    if (r.status === "returned") continue;
    if (excludeId && r.id === excludeId) continue;
    if (!reservationIncludesDay(r, day)) continue;
    if (!reservationCoversPeriod(r, period)) continue;
    used += r.qty;
  }
  return Math.max(0, avail - used);
}

export function qtyCapForSelection(
  avail: number,
  days: string[],
  periods: PeriodSelection,
  reservations: Reservation[],
  equipmentId: string,
): number {
  if (days.length === 0) return 0;
  const periodList = expandPeriods(periods);
  let min = avail;
  for (const day of days) {
    for (const p of periodList) {
      min = Math.min(
        min,
        freeUnits(avail, day, p, reservations, equipmentId),
      );
    }
  }
  return Math.max(0, min);
}

export function isPeriodDisabled(
  avail: number,
  days: string[],
  period: number,
  reservations: Reservation[],
  equipmentId: string,
): boolean {
  if (days.length === 0) return true;
  return days.some(
    (day) => freeUnits(avail, day, period, reservations, equipmentId) <= 0,
  );
}

export function outLoansForItem(
  reservations: Reservation[],
  equipmentId: string,
): Reservation[] {
  return reservations.filter(
    (r) => r.equipment_id === equipmentId && r.status === "out",
  );
}

/** Next N school days (Mon–Fri), starting from today if weekday else next Monday. */
export function nextSchoolDays(count = 5, from = new Date()): Date[] {
  const days: Date[] = [];
  const cursor = startOfDay(from);
  while (days.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function nextSchoolDayISOs(count = 5, from = new Date()): string[] {
  return nextSchoolDays(count, from).map(toISODate);
}

export function formatPeriodLabel(periods: PeriodSelection): string {
  if (periods === "all") return "all day";
  if (periods.start === periods.end) return `P${periods.start}`;
  return `P${periods.start}–P${periods.end}`;
}

export function formatDaysSummary(days: string[]): string {
  if (days.length === 0) return "";
  const sorted = [...days].sort();
  const format = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };
  if (sorted.length === 1) return format(sorted[0]);
  const first = new Date(`${sorted[0]}T00:00:00`);
  const last = new Date(`${sorted[sorted.length - 1]}T00:00:00`);
  const sameMonth =
    first.getMonth() === last.getMonth() &&
    first.getFullYear() === last.getFullYear();
  if (sameMonth) {
    return `${first.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })} – ${last.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`;
  }
  return `${format(sorted[0])} – ${format(sorted[sorted.length - 1])}`;
}

export function dueBackLabel(r: Reservation): string {
  const sorted = [...r.days].sort();
  const last = sorted[sorted.length - 1];
  if (!last) return "";
  const d = new Date(`${last}T00:00:00`);
  const day = d.toLocaleDateString("en-GB", { weekday: "short" });
  const periods = periodsFromReservation(r);
  const end =
    periods === "all" ? "P8" : `P${periods.end}`;
  return `${day} after ${end}`;
}

export function itemHasNearTermAvailability(
  item: Pick<Equipment, "id" | "quantity_available">,
  reservations: Reservation[],
): boolean {
  const days = nextSchoolDayISOs(5);
  for (const day of days) {
    for (let p = 1; p <= 8; p++) {
      if (
        freeUnits(
          item.quantity_available,
          day,
          p,
          reservations,
          item.id,
        ) > 0
      ) {
        return true;
      }
    }
  }
  return false;
}
