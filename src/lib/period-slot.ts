import { findBlock } from "@/lib/space-blocks";
import type { SpaceBlock, SpaceBooking, TrainingSession } from "@/lib/types";

/** Shared unavailable look for the other schedule's occupancy. */
export const CROSS_OCCUPIED_STYLE = {
  bg: "#eeece5",
  color: "#98917f",
  border: "#e3e0d8",
  borderStyle: "solid" as const,
};

export const BLOCKED_BG =
  "repeating-linear-gradient(45deg, #fbeeee 0, #fbeeee 6px, #f3dcdc 6px, #f3dcdc 12px)";

export type PeriodSlotMode = "space" | "training";

export type PeriodSlotState =
  | { kind: "own-pending"; name: string; topic?: string }
  | { kind: "own-confirmed"; name: string; topic?: string }
  | { kind: "cross-occupied"; label: string }
  | { kind: "blocked"; reason: string }
  | { kind: "past" }
  | { kind: "selected" }
  | { kind: "open" };

/**
 * One availability rule for Schedule + Training grids.
 * Own booking/session is shown first so it can be cancelled; otherwise
 * cross-occupancy, past window, and admin blocks are identical on both pages.
 */
export function evaluatePeriodSlot(input: {
  mode: PeriodSlotMode;
  inWindow: boolean;
  isSelected: boolean;
  block?: SpaceBlock;
  spaceBooking?: SpaceBooking;
  trainingSession?: TrainingSession;
}): PeriodSlotState {
  const { mode, inWindow, isSelected, block, spaceBooking, trainingSession } =
    input;

  if (mode === "space" && spaceBooking) {
    if (spaceBooking.status === "pending") {
      return { kind: "own-pending", name: spaceBooking.teacher_name };
    }
    if (spaceBooking.status === "confirmed") {
      return { kind: "own-confirmed", name: spaceBooking.teacher_name };
    }
  }

  if (mode === "training" && trainingSession) {
    if (trainingSession.status === "pending") {
      return {
        kind: "own-pending",
        name: trainingSession.teacher_name,
        topic: trainingSession.topic,
      };
    }
    if (trainingSession.status === "confirmed") {
      return {
        kind: "own-confirmed",
        name: trainingSession.teacher_name,
        topic: trainingSession.topic,
      };
    }
  }

  // Mutual exclusion: space ↔ training share the period.
  if (mode === "training" && spaceBooking) {
    return { kind: "cross-occupied", label: "Space in use" };
  }
  if (mode === "space" && trainingSession) {
    return { kind: "cross-occupied", label: "Training booked" };
  }

  if (!inWindow) return { kind: "past" };

  if (block) return { kind: "blocked", reason: block.reason };

  if (isSelected) return { kind: "selected" };
  return { kind: "open" };
}

export function activeSpaceAt(
  bookings: SpaceBooking[],
  iso: string,
  period: number,
): SpaceBooking | undefined {
  const list = bookings.filter(
    (b) =>
      b.booking_date === iso &&
      b.period === period &&
      (b.status === "pending" || b.status === "confirmed"),
  );
  return list.find((b) => b.status === "confirmed") ?? list[0];
}

export function activeTrainingAt(
  sessions: TrainingSession[],
  iso: string,
  period: number,
): TrainingSession | undefined {
  const list = sessions.filter(
    (s) =>
      s.session_date === iso &&
      s.period === period &&
      (s.status === "pending" || s.status === "confirmed"),
  );
  return list.find((s) => s.status === "confirmed") ?? list[0];
}

export function blockAt(
  blocks: SpaceBlock[],
  iso: string,
  period: number,
  consumer: PeriodSlotMode = "training",
): SpaceBlock | undefined {
  return findBlock(blocks, iso, period, consumer);
}

/** Server-side: can a new request be created for this mode? */
export function slotIsRequestable(input: {
  mode: PeriodSlotMode;
  inWindow: boolean;
  block?: SpaceBlock;
  spaceBooking?: SpaceBooking;
  trainingSession?: TrainingSession;
}): { ok: true } | { ok: false; error: string } {
  const state = evaluatePeriodSlot({
    ...input,
    isSelected: false,
  });
  switch (state.kind) {
    case "open":
    case "selected":
      return { ok: true };
    case "blocked":
      return { ok: false, error: `That period is blocked (${state.reason}).` };
    case "past":
      return { ok: false, error: "That date is not bookable." };
    case "cross-occupied":
      return {
        ok: false,
        error:
          input.mode === "training"
            ? "The space is booked for that period."
            : "A training session already occupies that period.",
      };
    case "own-pending":
    case "own-confirmed":
      return {
        ok: false,
        error:
          input.mode === "training"
            ? "That training slot is already taken."
            : "That period is already requested.",
      };
  }
}
