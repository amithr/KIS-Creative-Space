import { startOfDay, toISODate } from "@/lib/inventory";
import {
  BLOCKED_BG,
  CROSS_OCCUPIED_STYLE,
  type PeriodSlotState,
} from "@/lib/period-slot";

/** Full week for column headers + weekly-block resolution (never use column index). */
export const WEEKDAY_NAMES = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
] as const;

export type WeekdayName = (typeof WEEKDAY_NAMES)[number];

export function weekdayOfDate(date: Date): WeekdayName {
  return WEEKDAY_NAMES[(date.getDay() + 6) % 7];
}

export function weekdayOfIso(isoDate: string): WeekdayName | null {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return weekdayOfDate(d);
}

/** Today + next 6 calendar days (weekends included). */
export function rollingSevenDays(now = startOfDay(new Date())): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    return d;
  });
}

export function rollingSevenRange(now = startOfDay(new Date())) {
  const days = rollingSevenDays(now);
  return {
    from: toISODate(days[0]),
    to: toISODate(days[6]),
    days,
  };
}

export type CellVisual = {
  background: string;
  color: string;
  border: string;
  text: string;
  cursor: "pointer" | "default";
  clickable: boolean;
};

/** §4 cell-state palette — shared by Schedule + Training. */
export function cellVisual(
  state: PeriodSlotState,
  isSel: boolean,
): CellVisual {
  switch (state.kind) {
    case "own-pending":
      return {
        background: "#e8f1f8",
        color: "#2f6b8f",
        border: isSel ? "2px solid #c8102e" : "1.5px dashed #5d93b5",
        text: `${state.name} · pending`,
        cursor: "pointer",
        clickable: true,
      };
    case "own-confirmed":
      return {
        background: "#dff2e3",
        color: "#1f6b30",
        border: isSel ? "2px solid #c8102e" : "1.5px solid #2f9e44",
        text: state.name,
        cursor: "pointer",
        clickable: true,
      };
    case "cross-occupied":
      return {
        background: CROSS_OCCUPIED_STYLE.bg,
        color: CROSS_OCCUPIED_STYLE.color,
        border: `1px solid ${CROSS_OCCUPIED_STYLE.border}`,
        text: state.label,
        cursor: "default",
        clickable: false,
      };
    case "past":
      return {
        background: "#f2f0ea",
        color: "#98917f",
        border: "1px solid #f2f0ea",
        text: "",
        cursor: "default",
        clickable: false,
      };
    case "blocked":
      return {
        background: BLOCKED_BG,
        color: "#a05252",
        border: "1px solid #eccfcf",
        text: state.reason,
        cursor: "default",
        clickable: false,
      };
    case "selected":
      return {
        background: "#fdf1f3",
        color: "#c8102e",
        border: "1.5px solid #c8102e",
        text: "Selected",
        cursor: "pointer",
        clickable: true,
      };
    case "open":
      return {
        background: "#fff",
        color: "#98917f",
        border: "1px solid #e3e0d8",
        text: "",
        cursor: "pointer",
        clickable: true,
      };
  }
}

export function statusPillColors(status: "pending" | "confirmed") {
  if (status === "pending") {
    return { color: "#2f6b8f", borderColor: "#5d93b5" };
  }
  return { color: "#1f6b30", borderColor: "#2f9e44" };
}
