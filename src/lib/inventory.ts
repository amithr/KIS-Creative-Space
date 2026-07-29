import type { Equipment, StockStatus } from "@/lib/types";
import { WEEK_MS } from "@/lib/constants";

export function isNewItem(item: Pick<Equipment, "created_at">, now = Date.now()) {
  const added = new Date(item.created_at).getTime();
  if (Number.isNaN(added)) return false;
  return now - added <= WEEK_MS;
}

export function stockStatus(avail: number, total: number): StockStatus {
  if (avail <= 0) return "Unavailable";
  const ratio = total > 0 ? avail / total : 0;
  if (ratio < 0.34) return "Low stock";
  return "Available";
}

export function statusDotColor(status: StockStatus) {
  if (status === "Unavailable") return "#c8102e";
  if (status === "Low stock") return "#e0a010";
  return "#2f9e44";
}

export function formatUpdatedLabel(date = new Date()) {
  return date
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    .toUpperCase();
}

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function mondayOfWeek(date: Date, weekOffset = 0) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + weekOffset * 7);
  return d;
}

export function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDayShort(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function isBookableDate(date: Date, now = startOfDay(new Date())) {
  const limit = new Date(now);
  limit.setDate(now.getDate() + 7);
  const d = startOfDay(date);
  return d.getTime() >= now.getTime() && d.getTime() <= limit.getTime();
}

export function bookingKey(isoDate: string, period: number) {
  return `${isoDate}|${period}`;
}
