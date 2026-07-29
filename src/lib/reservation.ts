const DAY_MS = 86_400_000;

export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayDateOnly(): string {
  return formatDateOnly(new Date());
}

export function inclusiveDayCount(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

export function maxEndDate(start: Date, maxDays: number): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + maxDays - 1);
  return end;
}

export function validateReservationDates(
  startDate: string,
  endDate: string,
  maxDays: number,
): string | null {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start || !end) return "Please enter valid dates.";

  const today = parseDateOnly(todayDateOnly())!;
  if (start < today) return "Start date cannot be in the past.";

  if (end < start) return "End date must be on or after the start date.";

  const days = inclusiveDayCount(start, end);
  if (days > maxDays) {
    return `Reservations can be at most ${maxDays} day${maxDays === 1 ? "" : "s"}.`;
  }

  return null;
}
