import { BLOCKED_BG } from "@/lib/period-slot";
import { blockScope } from "@/lib/space-blocks";
import type { SpaceBlock, SpaceBooking, TrainingSession } from "@/lib/types";

export type CalendarCell =
  | { kind: "no-school" }
  | { kind: "free" }
  | {
      kind: "space";
      pending: boolean;
      text: string;
    }
  | {
      kind: "training";
      pending: boolean;
      text: string;
    }
  | {
      kind: "block";
      tag: "CLOSED" | "NO TRAINING" | "SPACE CLOSED";
      reason: string;
    };

export type CalendarCellVisual = {
  background: string;
  color: string;
  border: string;
  tag?: string;
  tagColor?: string;
  text: string;
};

/** Precedence: space → training → block → free / no-school. */
export function resolveCalendarCell(input: {
  isSchoolDay: boolean;
  spaceBooking?: SpaceBooking;
  trainingSession?: TrainingSession;
  block?: SpaceBlock;
}): CalendarCell {
  if (!input.isSchoolDay) return { kind: "no-school" };

  const space = input.spaceBooking;
  if (space && (space.status === "pending" || space.status === "confirmed")) {
    const note = space.purpose?.trim();
    return {
      kind: "space",
      pending: space.status === "pending",
      text: note
        ? `${space.teacher_name} · ${note}`
        : space.teacher_name,
    };
  }

  const training = input.trainingSession;
  if (
    training &&
    (training.status === "pending" || training.status === "confirmed")
  ) {
    const topic = training.topic?.trim();
    return {
      kind: "training",
      pending: training.status === "pending",
      text: topic
        ? `${training.teacher_name} · ${topic}`
        : training.teacher_name,
    };
  }

  if (input.block) {
    const scope = blockScope(input.block);
    const tag =
      scope === "training"
        ? "NO TRAINING"
        : scope === "space"
          ? "SPACE CLOSED"
          : "CLOSED";
    return {
      kind: "block",
      tag,
      reason: input.block.reason,
    };
  }

  return { kind: "free" };
}

export function calendarCellVisual(cell: CalendarCell): CalendarCellVisual {
  switch (cell.kind) {
    case "no-school":
      return {
        background: "#f2f0ea",
        color: "#98917f",
        border: "1px solid #f2f0ea",
        text: "",
      };
    case "free":
      return {
        background: "#fff",
        color: "#98917f",
        border: "1px solid #e3e0d8",
        text: "",
      };
    case "space":
      return cell.pending
        ? {
            background: "#e8f1f8",
            color: "#2f6b8f",
            border: "1.5px dashed #5d93b5",
            tag: "SPACE · REQUESTED",
            tagColor: "#5d93b5",
            text: cell.text,
          }
        : {
            background: "#dff2e3",
            color: "#1f6b30",
            border: "1.5px solid #2f9e44",
            tag: "SPACE",
            tagColor: "#2f7d3f",
            text: cell.text,
          };
    case "training":
      return cell.pending
        ? {
            background: "#e8f1f8",
            color: "#2f6b8f",
            border: "1.5px dashed #5d93b5",
            tag: "TRAINING · REQUESTED",
            tagColor: "#5d93b5",
            text: cell.text,
          }
        : {
            background: "#fdf4e3",
            color: "#7d5c05",
            border: "1.5px solid #e0a010",
            tag: "TRAINING",
            tagColor: "#9a6e06",
            text: cell.text,
          };
    case "block":
      return {
        background: BLOCKED_BG,
        color: "#a05252",
        border: "1px solid #eccfcf",
        tag: cell.tag,
        tagColor: "#a05252",
        text: cell.reason,
      };
  }
}
