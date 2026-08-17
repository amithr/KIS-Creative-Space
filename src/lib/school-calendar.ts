import calendar from "@/data/school-calendar-2026-27.json";
import { mondayOfWeek, startOfDay, toISODate } from "@/lib/inventory";

export type DayType = "red" | "black" | "green";

/** Monday-based weeks from the current week (0 = this week). */
export const BOOKING_WEEKS = 3;

/** @deprecated Prefer BOOKING_WEEKS */
export const BOOK_AHEAD_WEEKS = BOOKING_WEEKS;
export const BOOK_AHEAD_DAYS = 21;

const dayTypes = calendar.dayTypes as Record<string, DayType>;
const flags = calendar.flags;

const noSchool = new Set<string>([
  ...flags.holidays,
  ...flags.pdDays,
  ...flags.conferenceDays,
]);

export function dayTypeOf(iso: string): DayType | null {
  if (noSchool.has(iso)) return null;
  return dayTypes[iso] ?? null;
}

export function isSchoolDay(iso: string): boolean {
  return dayTypeOf(iso) != null;
}

export function dayTypeLabel(type: DayType): string {
  return `${type} day`;
}

export function dayTypeBorder(type: DayType): string {
  if (type === "red") return "#c8102e";
  if (type === "green") return "#2fbf2f";
  return "#141414";
}

/** Mon–Fri of week index 0..2 relative to the week containing `now`. */
export function weekDays(
  weekIndex: number,
  now = startOfDay(new Date()),
): Date[] {
  const mon = mondayOfWeek(now, weekIndex);
  return [0, 1, 2, 3, 4].map((i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

/** @deprecated Prefer weekDays */
export function bookAheadWeekDays(
  weekIndex: number,
  now = startOfDay(new Date()),
): Date[] {
  return weekDays(weekIndex, now);
}

/** Inclusive ISO range covering weeks 1–3 (Mon week 0 → Fri week 2). */
export function threeWeekHorizon(now = startOfDay(new Date())) {
  const from = mondayOfWeek(now, 0);
  const to = mondayOfWeek(now, 2);
  to.setDate(to.getDate() + 4);
  return { from: toISODate(from), to: toISODate(to) };
}

export function bookAheadHorizon(now = startOfDay(new Date())) {
  return threeWeekHorizon(now);
}

/**
 * Bookable on Schedule / Training: today-or-later, within the 3-week pager,
 * and present in the school calendar dayTypes (local-time ISO).
 */
export function isScheduleBookableDate(
  date: Date,
  now = startOfDay(new Date()),
): boolean {
  const d = startOfDay(date);
  if (d.getTime() < now.getTime()) return false;
  const { to } = threeWeekHorizon(now);
  const toDate = startOfDay(new Date(`${to}T00:00:00`));
  if (d.getTime() > toDate.getTime()) return false;
  return isSchoolDay(toISODate(d));
}

export function relativeWeekLabel(
  iso: string,
  weekIndex: number,
  now = startOfDay(new Date()),
): string {
  const target = startOfDay(new Date(`${iso}T00:00:00`));
  const diffDays = Math.round(
    (target.getTime() - now.getTime()) / 86400000,
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (weekIndex === 0) return "this week";
  if (weekIndex === 1) return "next week";
  return "in 2 weeks";
}

export function weekPagerCaption(weekIndex: number): string {
  return `WEEK ${weekIndex + 1} OF ${BOOKING_WEEKS}`;
}

/** "24 AUG – 28 AUG" style for the week pager. */
export function formatWeekRange(days: Date[]): string {
  if (days.length === 0) return "";
  const a = days[0];
  const b = days[days.length - 1];
  const left = a
    .toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    .toUpperCase();
  const right = b
    .toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    .toUpperCase();
  return `${left} – ${right}`;
}

export function dayHeaderPillStyle(
  type: DayType | null,
  isToday: boolean,
): { border: string; background: string; color: string } {
  if (!type) {
    return {
      border: "1px solid #e3e0d8",
      background: "#f2f0ea",
      color: "#b6b0a3",
    };
  }
  return {
    border: `1.5px solid ${dayTypeBorder(type)}`,
    background: "#fff",
    color: isToday ? "#c8102e" : "#141414",
  };
}
