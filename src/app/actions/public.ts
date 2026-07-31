"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/data";
import { isBookableDate, startOfDay, toISODate } from "@/lib/inventory";
import {
  qtyCapForSelection,
  type PeriodSelection,
} from "@/lib/reservation-availability";
import type { Reservation } from "@/lib/types";

export type ActionResult =
  | { ok: true; reservationId?: string }
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
    .select("id, name, quantity_available")
    .eq("id", input.equipmentId)
    .maybeSingle();

  if (error || !item) return { ok: false, error: "Equipment not found." };

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
): Promise<ActionResult> {
  const name = teacherName.trim();
  if (!name) return { ok: false, error: "Enter your name." };
  if (period < 1 || period > 8) return { ok: false, error: "Invalid period." };

  const date = new Date(`${bookingDate}T00:00:00`);
  if (Number.isNaN(date.getTime()) || !isBookableDate(date)) {
    return { ok: false, error: "That date is not bookable." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("period_bookings").insert({
    booking_date: bookingDate,
    period,
    teacher_name: name,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That period is already booked." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/schedule");
  return { ok: true };
}

export async function cancelPeriodBooking(
  bookingDate: string,
  period: number,
): Promise<ActionResult> {
  if (!hasSupabaseEnv()) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("period_bookings")
    .delete()
    .eq("booking_date", bookingDate)
    .eq("period", period);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/schedule");
  return { ok: true };
}
