"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getPeriodBookings,
  getSpaceBlocks,
  getTrainingSessions,
  hasSupabaseEnv,
} from "@/lib/data";
import { isBookableDate, startOfDay, toISODate } from "@/lib/inventory";
import {
  qtyCapForSelection,
  type PeriodSelection,
} from "@/lib/reservation-availability";
import {
  activeSpaceAt,
  activeTrainingAt,
  blockAt,
  slotIsRequestable,
} from "@/lib/period-slot";
import { isScheduleBookableDate } from "@/lib/school-calendar";
import type { Reservation } from "@/lib/types";

export type ActionResult =
  | {
      ok: true;
      reservationId?: string;
      bookingId?: string;
      sessionId?: string;
    }
  | { ok: false; error: string };

export type CreateReservationInput = {
  equipmentId: string;
  qty: number;
  by: string;
  days: string[];
  periods: PeriodSelection;
};

function periodsToColumns(periods: PeriodSelection) {
  if (periods === "all") {
    return { period_start: null as number | null, period_end: null as number | null };
  }
  return { period_start: periods.start, period_end: periods.end };
}

async function loadActiveReservations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  equipmentId: string,
): Promise<Reservation[]> {
  const { data } = await supabase
    .from("reservations")
    .select("*")
    .eq("equipment_id", equipmentId)
    .neq("status", "returned");

  return (data ?? []).map((row) => ({
    id: row.id as string,
    equipment_id: row.equipment_id as string,
    name: (row.name as string) ?? "",
    qty: Number(row.qty ?? 1),
    days: Array.isArray(row.days) ? row.days.map(String) : [],
    period_start: row.period_start == null ? null : Number(row.period_start),
    period_end: row.period_end == null ? null : Number(row.period_end),
    status: (row.status as Reservation["status"]) ?? "reserved",
    out_qty: Number(row.out_qty ?? 0),
    source: (row.source as Reservation["source"]) ?? "web",
    created_at: String(row.created_at ?? ""),
    out_at: row.out_at ? String(row.out_at) : null,
    returned_at: row.returned_at ? String(row.returned_at) : null,
  }));
}

export async function createReservation(
  input: CreateReservationInput,
): Promise<ActionResult> {
  const by = input.by.trim();
  if (!by) return { ok: false, error: "Please enter your name and class." };
  if (!input.equipmentId) return { ok: false, error: "Missing equipment." };
  if (!Number.isFinite(input.qty) || input.qty < 1) {
    return { ok: false, error: "Choose how many units to reserve." };
  }
  if (!input.days.length) {
    return { ok: false, error: "Select at least one day." };
  }

  const today = startOfDay(new Date());
  for (const day of input.days) {
    const d = new Date(`${day}T00:00:00`);
    if (Number.isNaN(d.getTime()) || !isBookableDate(d, today)) {
      return { ok: false, error: "Days must be within the next week (school days)." };
    }
  }

  if (input.periods !== "all") {
    const { start, end } = input.periods;
    if (start < 1 || end > 8 || end < start) {
      return { ok: false, error: "Invalid period range." };
    }
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, reservationId: "demo" };
  }

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("equipment")
    .select("id, name, quantity_available, in_space_only")
    .eq("id", input.equipmentId)
    .maybeSingle();

  if (error || !item) return { ok: false, error: "Equipment not found." };

  if (item.in_space_only) {
    return {
      ok: false,
      error: `${item.name} stays in the Makerspace — it can't be checked out or taken to another space.`,
    };
  }

  const existing = await loadActiveReservations(supabase, input.equipmentId);
  const cap = qtyCapForSelection(
    item.quantity_available,
    input.days,
    input.periods,
    existing,
    input.equipmentId,
  );

  if (input.qty > cap) {
    return {
      ok: false,
      error: `Only ${cap} free for this selection.`,
    };
  }

  const cols = periodsToColumns(input.periods);
  const { data: inserted, error: insertError } = await supabase
    .from("reservations")
    .insert({
      equipment_id: input.equipmentId,
      name: by,
      qty: input.qty,
      days: input.days,
      period_start: cols.period_start,
      period_end: cols.period_end,
      status: "reserved",
      out_qty: 0,
      source: "web",
      email: null,
      start_date: input.days.slice().sort()[0] ?? null,
      end_date: input.days.slice().sort().at(-1) ?? null,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: insertError?.message ?? "Failed to reserve." };
  }

  const { error: activityError } = await supabase.from("activity_events").insert({
    type: "reserve",
    item_id: input.equipmentId,
    reservation_id: inserted.id,
    actor: by,
    source: "WEBSITE",
    message: `Reserved ${input.qty} × ${item.name}`,
  });
  if (activityError) {
    console.error("activity_events insert failed:", activityError.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, reservationId: inserted.id as string };
}

/** @deprecated Use createReservation — kept for any leftover callers. */
export async function reserveItemInline(
  equipmentId: string,
  borrowerName: string,
): Promise<ActionResult> {
  const today = toISODate(startOfDay(new Date()));
  return createReservation({
    equipmentId,
    qty: 1,
    by: borrowerName,
    days: [today],
    periods: "all",
  });
}

export async function cancelReservation(
  reservationId: string,
): Promise<ActionResult> {
  if (!reservationId) return { ok: false, error: "Missing reservation." };

  if (!hasSupabaseEnv()) return { ok: true };

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("reservations")
    .select("id, status, equipment_id, name, qty")
    .eq("id", reservationId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, error: "Reservation not found." };
  }
  if (existing.status !== "reserved") {
    return { ok: false, error: "Only reserved bookings can be undone." };
  }

  const { error: deleteError } = await supabase
    .from("reservations")
    .delete()
    .eq("id", reservationId)
    .eq("status", "reserved");

  if (deleteError) return { ok: false, error: deleteError.message };

  const { error: activityError } = await supabase.from("activity_events").insert({
    type: "reserve",
    item_id: existing.equipment_id,
    reservation_id: reservationId,
    actor: existing.name ?? "",
    source: "WEBSITE",
    message: `Cancelled reservation (${existing.qty} units)`,
  });
  if (activityError) {
    console.error("activity_events insert failed:", activityError.message);
  }

  revalidatePath("/");
  return { ok: true };
}

export async function createPeriodBooking(
  bookingDate: string,
  period: number,
  teacherName: string,
  purpose?: string,
  area?: string,
): Promise<ActionResult> {
  const name = teacherName.trim();
  if (!name) return { ok: false, error: "Enter your name." };
  if (period < 1 || period > 8) return { ok: false, error: "Invalid period." };

  const date = new Date(`${bookingDate}T00:00:00`);
  if (Number.isNaN(date.getTime()) || !isScheduleBookableDate(date)) {
    return { ok: false, error: "That date is not bookable." };
  }

  const purposeTrim = purpose?.trim().slice(0, 280) || null;

  if (!hasSupabaseEnv()) {
    return { ok: true, bookingId: `local-${Date.now()}` };
  }

  const [blocks, spaceBookings, trainingSessions] = await Promise.all([
    getSpaceBlocks(),
    getPeriodBookings(bookingDate, bookingDate),
    getTrainingSessions(bookingDate, bookingDate),
  ]);

  const gate = slotIsRequestable({
    mode: "space",
    inWindow: true,
    block: blockAt(blocks, bookingDate, period),
    spaceBooking: activeSpaceAt(spaceBookings, bookingDate, period),
    trainingSession: activeTrainingAt(trainingSessions, bookingDate, period),
  });
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("space_bookings")
    .insert({
      booking_date: bookingDate,
      period,
      teacher_name: name,
      purpose: purposeTrim,
      area: area?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/schedule");
  revalidatePath("/training");
  revalidatePath("/book");
  revalidatePath("/admin");
  return { ok: true, bookingId: data?.id as string | undefined };
}

/** Soft-cancel a pending or confirmed space request (public schedule). */
export async function cancelPeriodBooking(
  bookingId: string,
): Promise<ActionResult> {
  if (!bookingId) return { ok: false, error: "Missing booking." };
  if (!hasSupabaseEnv()) return { ok: true };

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("space_bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) return { ok: false, error: "Booking not found." };
  if (existing.status !== "pending" && existing.status !== "confirmed") {
    return { ok: false, error: "That request is no longer active." };
  }

  const { error } = await supabase
    .from("space_bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .in("status", ["pending", "confirmed"]);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/schedule");
  revalidatePath("/training");
  revalidatePath("/book");
  revalidatePath("/admin");
  return { ok: true };
}

function revalidateTraining() {
  revalidatePath("/training");
  revalidatePath("/book");
  revalidatePath("/admin");
}

/**
 * Request a coordinator training session.
 * Slot must be in the bookable window, free of space bookings/blocks, and unused for training.
 */
export async function createTrainingSession(
  sessionDate: string,
  period: number,
  teacherName: string,
  topic: string,
): Promise<ActionResult> {
  const name = teacherName.trim();
  const topicTrim = (topic.trim() || "Training session").slice(0, 280);
  if (!name) return { ok: false, error: "Enter your name." };
  if (period < 1 || period > 8) return { ok: false, error: "Invalid period." };

  const date = new Date(`${sessionDate}T00:00:00`);
  if (Number.isNaN(date.getTime()) || !isScheduleBookableDate(date)) {
    return { ok: false, error: "That date is not bookable." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, sessionId: `local-${Date.now()}` };
  }

  const [blocks, spaceBookings, existing] = await Promise.all([
    getSpaceBlocks(),
    getPeriodBookings(sessionDate, sessionDate),
    getTrainingSessions(sessionDate, sessionDate),
  ]);

  const gate = slotIsRequestable({
    mode: "training",
    inWindow: true,
    block: blockAt(blocks, sessionDate, period),
    spaceBooking: activeSpaceAt(spaceBookings, sessionDate, period),
    trainingSession: activeTrainingAt(existing, sessionDate, period),
  });
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_sessions")
    .insert({
      session_date: sessionDate,
      period,
      teacher_name: name,
      topic: topicTrim,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTraining();
  return { ok: true, sessionId: data?.id as string | undefined };
}

/** Soft-cancel a pending or confirmed training session (public page). */
export async function cancelTrainingSession(
  sessionId: string,
): Promise<ActionResult> {
  if (!sessionId) return { ok: false, error: "Missing session." };
  if (!hasSupabaseEnv()) return { ok: true };

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("training_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) return { ok: false, error: "Session not found." };
  if (existing.status !== "pending" && existing.status !== "confirmed") {
    return { ok: false, error: "That session is no longer active." };
  }

  const { error } = await supabase
    .from("training_sessions")
    .update({ status: "cancelled" })
    .eq("id", sessionId)
    .in("status", ["pending", "confirmed"]);

  if (error) return { ok: false, error: error.message };

  revalidateTraining();
  return { ok: true };
}

function revalidateItemRequests() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export type ItemRequestActionResult =
  | {
      ok: true;
      id?: string;
      votes?: number;
      voted?: boolean;
      name?: string;
      why?: string | null;
      by?: string;
      status?: string;
      created_at?: string;
    }
  | { ok: false; error: string };

export async function createItemRequest(input: {
  name: string;
  why?: string;
  by: string;
  voterKey: string;
}): Promise<ItemRequestActionResult> {
  const name = input.name.trim();
  const by = input.by.trim();
  const why = input.why?.trim() ?? "";
  const voterKey = input.voterKey.trim();

  if (!name) return { ok: false, error: "Item name is required." };
  if (!by) return { ok: false, error: "Your name is required." };
  if (!voterKey) return { ok: false, error: "Missing voter key." };

  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      id: `demo-${Date.now()}`,
      name,
      why: why || null,
      by,
      votes: 1,
      status: "requested",
      created_at: new Date().toISOString(),
      voted: true,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_item_request", {
    p_name: name,
    p_why: why,
    p_by: by,
    p_voter_key: voterKey,
  });

  if (error) return { ok: false, error: error.message };

  const row = data as Record<string, unknown>;
  revalidateItemRequests();
  return {
    ok: true,
    id: String(row.id),
    name: String(row.name ?? name),
    why: row.why == null ? null : String(row.why),
    by: String(row.by ?? by),
    votes: Number(row.votes ?? 1),
    status: String(row.status ?? "requested"),
    created_at: String(row.created_at ?? new Date().toISOString()),
    voted: true,
  };
}

export async function listMyVotedRequestIds(
  voterKey: string,
): Promise<string[]> {
  const key = voterKey.trim();
  if (!key || !hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_request_votes")
    .select("request_id")
    .eq("voter_key", key);

  if (error) {
    console.error("Failed to load request votes:", error.message);
    return [];
  }
  return (data ?? []).map((r) => String(r.request_id));
}

export async function toggleItemRequestVote(input: {
  requestId: string;
  voterKey: string;
}): Promise<ItemRequestActionResult> {
  const requestId = input.requestId.trim();
  const voterKey = input.voterKey.trim();
  if (!requestId) return { ok: false, error: "Missing request." };
  if (!voterKey) return { ok: false, error: "Missing voter key." };

  if (!hasSupabaseEnv()) {
    return { ok: true, votes: 1, voted: true };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_item_request_vote", {
    p_request_id: requestId,
    p_voter_key: voterKey,
  });

  if (error) return { ok: false, error: error.message };

  const row = data as Record<string, unknown>;
  revalidateItemRequests();
  return {
    ok: true,
    votes: Number(row.votes ?? 0),
    voted: Boolean(row.voted),
  };
}
