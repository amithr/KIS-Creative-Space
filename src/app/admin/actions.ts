"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateUniqueItemCode } from "@/lib/qr";
import { generateUniqueSerialNumber } from "@/lib/serial";
import { toISODate, startOfDay } from "@/lib/inventory";
import { dueBackLabel } from "@/lib/reservation-availability";
import type { Reservation } from "@/lib/types";

async function requireTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin?error=auth_failed");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!teacher) {
    await supabase.auth.signOut();
    redirect("/admin?error=not_teacher");
  }

  return { supabase, user };
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin?error=auth_failed");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!teacher) {
    await supabase.auth.signOut();
    redirect("/admin?error=not_teacher");
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin");
}

export type EquipmentInput = {
  area: string;
  name: string;
  detail: string;
  quantity_available: number;
  quantity_total: number;
  in_space_only?: boolean;
  qr_code?: string;
  sort_order?: number;
};

function revalidateInventory() {
  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/admin");
  revalidatePath("/schedule");
}

async function serialExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  serial: string,
) {
  const { data } = await supabase
    .from("equipment_units")
    .select("id")
    .eq("serial_number", serial)
    .maybeSingle();
  return Boolean(data);
}

async function createEquipmentUnits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  equipmentId: string,
  count: number,
) {
  if (count < 1) return;

  for (let i = 0; i < count; i++) {
    const serial_number = await generateUniqueSerialNumber((serial) =>
      serialExists(supabase, serial),
    );

    const { error } = await supabase.from("equipment_units").insert({
      equipment_id: equipmentId,
      serial_number,
    });

    if (error) throw new Error(error.message);
  }
}

async function syncEquipmentUnits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  equipmentId: string,
  targetQuantity: number,
) {
  const { data: units, error } = await supabase
    .from("equipment_units")
    .select("id")
    .eq("equipment_id", equipmentId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const current = units?.length ?? 0;

  if (targetQuantity > current) {
    await createEquipmentUnits(supabase, equipmentId, targetQuantity - current);
    return;
  }

  if (targetQuantity < current) {
    const toRemove = (units ?? []).slice(targetQuantity);
    for (const unit of toRemove) {
      const { error: deleteError } = await supabase
        .from("equipment_units")
        .delete()
        .eq("id", unit.id);
      if (deleteError) throw new Error(deleteError.message);
    }
  }
}

export async function createEquipment(input: EquipmentInput) {
  const { supabase } = await requireTeacher();

  const total = Math.max(0, input.quantity_total);
  const avail = Math.min(Math.max(0, input.quantity_available), total);

  async function codeExists(code: string) {
    const { data } = await supabase
      .from("equipment")
      .select("id")
      .ilike("qr_code", code)
      .maybeSingle();
    return Boolean(data);
  }

  const qrCode =
    input.qr_code?.trim() ||
    (await generateUniqueItemCode(codeExists));

  const { data, error } = await supabase
    .from("equipment")
    .insert({
      area: input.area.trim(),
      name: input.name.trim(),
      detail: input.detail.trim(),
      quantity_available: avail,
      quantity_total: total,
      in_space_only: Boolean(input.in_space_only),
      qr_code: qrCode,
      sort_order: input.sort_order ?? 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create equipment.");
  }

  await createEquipmentUnits(supabase, data.id, total);

  revalidateInventory();
  return { id: data.id as string };
}

export async function addEquipmentUnit(equipmentId: string) {
  const { supabase } = await requireTeacher();

  const { data: equipment, error: equipmentError } = await supabase
    .from("equipment")
    .select("id, quantity_available, quantity_total")
    .eq("id", equipmentId)
    .maybeSingle();

  if (equipmentError || !equipment) {
    throw new Error("Equipment not found.");
  }

  await createEquipmentUnits(supabase, equipmentId, 1);

  const { error: updateError } = await supabase
    .from("equipment")
    .update({
      quantity_available: equipment.quantity_available + 1,
      quantity_total: (equipment.quantity_total ?? equipment.quantity_available) + 1,
    })
    .eq("id", equipmentId);

  if (updateError) throw new Error(updateError.message);

  revalidateInventory();
}

export async function updateEquipment(
  id: string,
  input: Partial<EquipmentInput>,
) {
  const { supabase } = await requireTeacher();

  const payload: Record<string, unknown> = {};
  if (input.area !== undefined) payload.area = input.area.trim();
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.detail !== undefined) payload.detail = input.detail.trim();
  if (input.quantity_available !== undefined)
    payload.quantity_available = input.quantity_available;
  if (input.quantity_total !== undefined)
    payload.quantity_total = input.quantity_total;
  if (input.in_space_only !== undefined)
    payload.in_space_only = Boolean(input.in_space_only);
  // qr_code is immutable — never updated from admin edits
  if (input.sort_order !== undefined) payload.sort_order = input.sort_order;

  if (
    input.quantity_total !== undefined &&
    input.quantity_available === undefined
  ) {
    const { data: current } = await supabase
      .from("equipment")
      .select("quantity_available")
      .eq("id", id)
      .maybeSingle();
    if (current) {
      payload.quantity_available = Math.min(
        current.quantity_available,
        input.quantity_total,
      );
    }
  }

  const { error } = await supabase
    .from("equipment")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (input.quantity_total !== undefined) {
    await syncEquipmentUnits(supabase, id, input.quantity_total);
  }

  revalidateInventory();
  revalidatePath(`/equipment/${input.qr_code ?? ""}`);
}

export async function deleteEquipment(id: string) {
  const { supabase } = await requireTeacher();

  const { error } = await supabase.from("equipment").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidateInventory();
}

export async function resetToSampleData() {
  const { supabase } = await requireTeacher();

  const { error: clearError } = await supabase
    .from("equipment")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (clearError) throw new Error(clearError.message);

  const samples = [
    { name: "LEGO Spike Prime kit", detail: "Includes hub, motors, sensors", area: "LEGO Play", quantity_available: 6, quantity_total: 8, in_space_only: false, qr_code: "KIS-SPIKE1", sort_order: 1 },
    { name: "LEGO Technic bins", detail: "Sorted by element type", area: "LEGO Play", quantity_available: 12, quantity_total: 12, in_space_only: false, qr_code: "KIS-TECHN2", sort_order: 2 },
    { name: "mBot2 robot", detail: "Charged and ready", area: "Robotics", quantity_available: 4, quantity_total: 10, in_space_only: false, qr_code: "KIS-MBOT2A", sort_order: 3 },
    { name: "Arduino starter kit", detail: "Breadboard, jumper set, sensor pack", area: "Robotics", quantity_available: 9, quantity_total: 15, in_space_only: false, qr_code: "KIS-ARDUIN", sort_order: 4 },
    { name: "Soldering station", detail: "Teacher supervision required", area: "Robotics", quantity_available: 2, quantity_total: 3, in_space_only: true, qr_code: "KIS-SOLDER", sort_order: 5 },
    { name: "Cutting mats & knives", detail: "Blades replaced weekly", area: "Art & Design", quantity_available: 14, quantity_total: 16, in_space_only: false, qr_code: "KIS-MATS01", sort_order: 6 },
    { name: "Acrylic paint set", detail: "Restock requested", area: "Art & Design", quantity_available: 3, quantity_total: 20, in_space_only: false, qr_code: "KIS-PAINT1", sort_order: 7 },
    { name: "Meta Quest 3 headset", detail: "Wipe before return", area: "VR Lab", quantity_available: 5, quantity_total: 6, in_space_only: false, qr_code: "KIS-QUEST3", sort_order: 8 },
    { name: "Prusa MK4 printer", detail: "PLA only", area: "3D Printing", quantity_available: 2, quantity_total: 4, in_space_only: true, qr_code: "KIS-PRUSA4", sort_order: 9 },
    { name: "PLA filament (1 kg)", detail: "White, black, red in stock", area: "3D Printing", quantity_available: 7, quantity_total: 10, in_space_only: false, qr_code: "KIS-FILAMT", sort_order: 10 },
  ];

  for (const sample of samples) {
    const { data, error } = await supabase
      .from("equipment")
      .insert(sample)
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to seed sample.");
    await createEquipmentUnits(supabase, data.id, sample.quantity_total);
  }

  revalidateInventory();
}

export type AdminCodeLookup =
  | { ok: false; error: string }
  | {
      ok: true;
      mode: "checkout";
      equipmentId: string;
      name: string;
      code: string;
      available: number;
    }
  | {
      ok: true;
      mode: "in_space_only";
      equipmentId: string;
      name: string;
      code: string;
      available: number;
    }
  | {
      ok: true;
      mode: "checkin";
      equipmentId: string;
      name: string;
      code: string;
      loan: Reservation;
      dueBack: string;
    };

function mapReservation(row: Record<string, unknown>): Reservation {
  return {
    id: String(row.id),
    equipment_id: String(row.equipment_id),
    name: String(row.name ?? ""),
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
  };
}

export async function resolveAdminItemCode(
  rawCode: string,
): Promise<AdminCodeLookup> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter an item code." };

  const { supabase } = await requireTeacher();
  const { data: item, error } = await supabase
    .from("equipment")
    .select("id, name, qr_code, quantity_available, in_space_only")
    .ilike("qr_code", code)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!item) return { ok: false, error: "No item matches this code." };

  const { data: loans } = await supabase
    .from("reservations")
    .select("*")
    .eq("equipment_id", item.id)
    .eq("status", "out")
    .order("out_at", { ascending: false })
    .limit(1);

  const loanRow = loans?.[0];
  if (loanRow) {
    const loan = mapReservation(loanRow as Record<string, unknown>);
    return {
      ok: true,
      mode: "checkin",
      equipmentId: item.id,
      name: item.name,
      code: item.qr_code,
      loan,
      dueBack: dueBackLabel(loan),
    };
  }

  if (item.in_space_only) {
    return {
      ok: true,
      mode: "in_space_only",
      equipmentId: item.id,
      name: item.name,
      code: item.qr_code,
      available: item.quantity_available,
    };
  }

  return {
    ok: true,
    mode: "checkout",
    equipmentId: item.id,
    name: item.name,
    code: item.qr_code,
    available: item.quantity_available,
  };
}

export async function adminCheckOutByCode(input: {
  code: string;
  qty: number;
  by: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const by = input.by.trim();
  if (!by) return { ok: false, error: "Enter who is taking it." };
  if (!Number.isFinite(input.qty) || input.qty < 1) {
    return { ok: false, error: "Choose how many units." };
  }

  const lookup = await resolveAdminItemCode(input.code);
  if (!lookup.ok) return lookup;
  if (lookup.mode === "in_space_only") {
    return {
      ok: false,
      error: `${lookup.name} stays in the Makerspace — it can't be checked out or taken to another space.`,
    };
  }
  if (lookup.mode !== "checkout") {
    return { ok: false, error: "This item already has an open loan." };
  }
  if (input.qty > lookup.available) {
    return { ok: false, error: `Only ${lookup.available} available.` };
  }

  const { supabase } = await requireTeacher();
  const today = toISODate(startOfDay(new Date()));
  const now = new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from("reservations")
    .insert({
      equipment_id: lookup.equipmentId,
      name: by,
      qty: input.qty,
      days: [today],
      period_start: null,
      period_end: null,
      status: "out",
      out_qty: input.qty,
      source: "web-admin",
      out_at: now,
      email: null,
      start_date: today,
      end_date: today,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Check-out failed." };
  }

  await supabase.from("activity_events").insert({
    type: "checkout",
    item_id: lookup.equipmentId,
    reservation_id: inserted.id,
    actor: by,
    source: "ADMIN",
    message: `Admin checked out ${input.qty}× ${lookup.name} to ${by}`,
  });

  revalidateInventory();
  return { ok: true };
}

export async function adminCheckInByCode(
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const lookup = await resolveAdminItemCode(code);
  if (!lookup.ok) return lookup;
  if (lookup.mode !== "checkin") {
    return { ok: false, error: "No open loan for this item." };
  }

  const { supabase } = await requireTeacher();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("reservations")
    .update({
      status: "returned",
      out_qty: 0,
      returned_at: now,
    })
    .eq("id", lookup.loan.id)
    .eq("status", "out");

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_events").insert({
    type: "checkin",
    item_id: lookup.equipmentId,
    reservation_id: lookup.loan.id,
    actor: lookup.loan.name,
    source: "ADMIN",
    message: `Admin checked in ${lookup.loan.out_qty || lookup.loan.qty}× ${lookup.name}`,
  });

  revalidateInventory();
  return { ok: true };
}

export async function updateWeeklyNote(note: string) {
  const { supabase } = await requireTeacher();

  const { error } = await supabase.from("site_settings").upsert({
    key: "weekly_note",
    value: note,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateMaxReservationDays(days: number) {
  const { supabase } = await requireTeacher();

  if (!Number.isFinite(days) || days < 1 || days > 365) {
    throw new Error("Maximum reservation days must be between 1 and 365.");
  }

  const { error } = await supabase.from("site_settings").upsert({
    key: "max_reservation_days",
    value: days,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/checkout");
  revalidatePath("/admin");
}

export type SpaceBookingActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function revalidateSpace() {
  revalidatePath("/schedule");
  revalidatePath("/training");
  revalidatePath("/book");
  revalidatePath("/admin");
}

function revalidateTraining() {
  revalidatePath("/training");
  revalidatePath("/book");
  revalidatePath("/admin");
}

/** Idempotent: already-decided requests are a no-op success. */
export async function confirmSpaceBooking(
  bookingId: string,
): Promise<SpaceBookingActionResult> {
  const { supabase, user } = await requireTeacher();

  const { data: existing, error: loadError } = await supabase
    .from("space_bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) return { ok: false, error: "Booking not found." };
  if (existing.status !== "pending") {
    revalidateSpace();
    return { ok: true };
  }

  const { error } = await supabase
    .from("space_bookings")
    .update({
      status: "confirmed",
      decided_at: new Date().toISOString(),
      decided_by: user.email ?? user.id,
      decline_reason: null,
    })
    .eq("id", bookingId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };
  revalidateSpace();
  return { ok: true };
}

export async function declineSpaceBooking(
  bookingId: string,
  reason?: string,
): Promise<SpaceBookingActionResult> {
  const { supabase, user } = await requireTeacher();

  const { data: existing, error: loadError } = await supabase
    .from("space_bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) return { ok: false, error: "Booking not found." };
  if (existing.status !== "pending") {
    revalidateSpace();
    return { ok: true };
  }

  const trimmed = reason?.trim() || null;
  const { error } = await supabase
    .from("space_bookings")
    .update({
      status: "declined",
      decided_at: new Date().toISOString(),
      decided_by: user.email ?? user.id,
      decline_reason: trimmed,
    })
    .eq("id", bookingId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };
  revalidateSpace();
  return { ok: true };
}

export async function cancelSpaceBooking(
  bookingId: string,
): Promise<SpaceBookingActionResult> {
  const { supabase, user } = await requireTeacher();

  const { data: existing, error: loadError } = await supabase
    .from("space_bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) return { ok: false, error: "Booking not found." };
  if (existing.status !== "confirmed" && existing.status !== "pending") {
    revalidateSpace();
    return { ok: true };
  }

  const { error } = await supabase
    .from("space_bookings")
    .update({
      status: "cancelled",
      decided_at: new Date().toISOString(),
      decided_by: user.email ?? user.id,
    })
    .eq("id", bookingId)
    .in("status", ["pending", "confirmed"]);

  if (error) return { ok: false, error: error.message };
  revalidateSpace();
  return { ok: true };
}

/** Undo decline/cancel: restore a booking to pending or confirmed. */
export async function restoreSpaceBooking(
  bookingId: string,
  status: "pending" | "confirmed",
): Promise<SpaceBookingActionResult> {
  const { supabase } = await requireTeacher();
  if (!bookingId) return { ok: false, error: "Missing booking." };

  const { error } = await supabase
    .from("space_bookings")
    .update({
      status,
      decided_at: null,
      decided_by: null,
      decline_reason: null,
    })
    .eq("id", bookingId);

  if (error) return { ok: false, error: error.message };
  revalidateSpace();
  return { ok: true };
}

/** Undo decline/cancel: restore a training session to pending or confirmed. */
export async function restoreTrainingSession(
  sessionId: string,
  status: "pending" | "confirmed",
): Promise<SpaceBookingActionResult> {
  const { supabase } = await requireTeacher();
  if (!sessionId) return { ok: false, error: "Missing session." };

  const { error } = await supabase
    .from("training_sessions")
    .update({
      status,
      decided_at: null,
      decided_by: null,
      decline_reason: null,
    })
    .eq("id", sessionId);

  if (error) return { ok: false, error: error.message };
  revalidateTraining();
  return { ok: true };
}

/** Idempotent: already-decided training requests are a no-op success. */
export async function confirmTrainingSession(
  sessionId: string,
): Promise<SpaceBookingActionResult> {
  const { supabase, user } = await requireTeacher();

  const { data: existing, error: loadError } = await supabase
    .from("training_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) return { ok: false, error: "Session not found." };
  if (existing.status !== "pending") {
    revalidateTraining();
    return { ok: true };
  }

  const { error } = await supabase
    .from("training_sessions")
    .update({
      status: "confirmed",
      decided_at: new Date().toISOString(),
      decided_by: user.email ?? user.id,
      decline_reason: null,
    })
    .eq("id", sessionId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };
  revalidateTraining();
  return { ok: true };
}

export async function declineTrainingSession(
  sessionId: string,
  reason?: string,
): Promise<SpaceBookingActionResult> {
  const { supabase, user } = await requireTeacher();

  const { data: existing, error: loadError } = await supabase
    .from("training_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) return { ok: false, error: "Session not found." };
  if (existing.status !== "pending") {
    revalidateTraining();
    return { ok: true };
  }

  const trimmed = reason?.trim() || null;
  const { error } = await supabase
    .from("training_sessions")
    .update({
      status: "declined",
      decided_at: new Date().toISOString(),
      decided_by: user.email ?? user.id,
      decline_reason: trimmed,
    })
    .eq("id", sessionId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };
  revalidateTraining();
  return { ok: true };
}

export async function cancelTrainingSessionAdmin(
  sessionId: string,
): Promise<SpaceBookingActionResult> {
  const { supabase, user } = await requireTeacher();

  const { data: existing, error: loadError } = await supabase
    .from("training_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) return { ok: false, error: "Session not found." };
  if (existing.status !== "confirmed" && existing.status !== "pending") {
    revalidateTraining();
    return { ok: true };
  }

  const { error } = await supabase
    .from("training_sessions")
    .update({
      status: "cancelled",
      decided_at: new Date().toISOString(),
      decided_by: user.email ?? user.id,
    })
    .eq("id", sessionId)
    .in("status", ["pending", "confirmed"]);

  if (error) return { ok: false, error: error.message };
  revalidateTraining();
  return { ok: true };
}

export type CreateSpaceBlockInput = {
  repeat: "once" | "weekly";
  blockDate?: string;
  dow?: "MON" | "TUE" | "WED" | "THU" | "FRI";
  untilDate?: string;
  periodFrom: number;
  periodTo: number;
  reason?: string;
  scope?: "all" | "training";
};

export async function createSpaceBlock(
  input: CreateSpaceBlockInput,
): Promise<SpaceBookingActionResult> {
  const { supabase } = await requireTeacher();

  const from = Math.min(input.periodFrom, input.periodTo);
  const to = Math.max(input.periodFrom, input.periodTo);
  if (from < 1 || to > 8) {
    return { ok: false, error: "Periods must be between P1 and P8." };
  }

  const reason = input.reason?.trim() || "Blocked";
  const scope = input.scope === "training" ? "training" : "all";

  if (input.repeat === "once") {
    const date = input.blockDate?.trim();
    if (!date) return { ok: false, error: "Pick a date." };
    const { data, error } = await supabase
      .from("space_blocks")
      .insert({
        repeat: "once",
        block_date: date,
        dow: null,
        until_date: null,
        period_from: from,
        period_to: to,
        reason,
        scope,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidateSpace();
    return { ok: true, id: data?.id as string | undefined };
  } else {
    const dow = input.dow;
    if (!dow) return { ok: false, error: "Pick a weekday." };
    const until = input.untilDate?.trim() || null;
    const { data, error } = await supabase
      .from("space_blocks")
      .insert({
        repeat: "weekly",
        block_date: null,
        dow,
        until_date: until,
        period_from: from,
        period_to: to,
        reason,
        scope,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidateSpace();
    return { ok: true, id: data?.id as string | undefined };
  }
}

export async function deleteSpaceBlock(
  blockId: string,
): Promise<SpaceBookingActionResult> {
  const { supabase } = await requireTeacher();
  if (!blockId) return { ok: false, error: "Missing block." };

  const { error } = await supabase
    .from("space_blocks")
    .delete()
    .eq("id", blockId);

  if (error) return { ok: false, error: error.message };
  revalidateSpace();
  return { ok: true };
}

/** Re-create a block after undo (new id). */
export async function restoreSpaceBlock(
  input: CreateSpaceBlockInput,
): Promise<SpaceBookingActionResult> {
  return createSpaceBlock(input);
}

export type ItemRequestAdminResult =
  | { ok: true }
  | { ok: false; error: string };

const ITEM_REQUEST_NEXT: Record<string, string> = {
  requested: "approved",
  approved: "ordered",
  ordered: "arrived",
};

function revalidateItemRequestsAdmin() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function advanceItemRequestStatus(
  id: string,
): Promise<ItemRequestAdminResult> {
  const { supabase } = await requireTeacher();
  if (!id) return { ok: false, error: "Missing request." };

  const { data: row, error: loadError } = await supabase
    .from("item_requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!row) return { ok: false, error: "Request not found." };

  const next = ITEM_REQUEST_NEXT[row.status];
  if (!next) {
    return { ok: false, error: "This request can't be advanced further." };
  }

  const { error } = await supabase
    .from("item_requests")
    .update({ status: next })
    .eq("id", id)
    .eq("status", row.status);

  if (error) return { ok: false, error: error.message };
  revalidateItemRequestsAdmin();
  return { ok: true };
}

export async function deleteItemRequest(
  id: string,
): Promise<ItemRequestAdminResult> {
  const { supabase } = await requireTeacher();
  if (!id) return { ok: false, error: "Missing request." };

  const { error } = await supabase.from("item_requests").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateItemRequestsAdmin();
  return { ok: true };
}

export type AreaActionResult =
  | { ok: true; name?: string }
  | { ok: false; error: string };

function revalidateAreas() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/checkout");
}

/** Create a managed area. Case-insensitive unique; returns trimmed name. */
export async function createArea(name: string): Promise<AreaActionResult> {
  const { supabase } = await requireTeacher();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Enter an area name." };

  const { data: existing, error: listError } = await supabase
    .from("areas")
    .select("id, name, sort_order");
  if (listError) return { ok: false, error: listError.message };

  const dup = (existing ?? []).some(
    (a) => a.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (dup) return { ok: false, error: "That area already exists." };

  const nextOrder =
    (existing ?? []).reduce(
      (m, a) => Math.max(m, Number(a.sort_order ?? 0)),
      0,
    ) + 1;

  const { error } = await supabase.from("areas").insert({
    name: trimmed,
    sort_order: nextOrder,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That area already exists." };
    }
    return { ok: false, error: error.message };
  }

  revalidateAreas();
  return { ok: true, name: trimmed };
}

/** Delete an area only when no equipment references it and it is not the last. */
export async function deleteArea(id: string): Promise<AreaActionResult> {
  const { supabase } = await requireTeacher();
  if (!id) return { ok: false, error: "Missing area." };

  const { data: area, error: loadError } = await supabase
    .from("areas")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return { ok: false, error: loadError.message };
  if (!area) return { ok: false, error: "Area not found." };

  const { count: areaCount, error: countError } = await supabase
    .from("areas")
    .select("*", { count: "exact", head: true });
  if (countError) return { ok: false, error: countError.message };
  if ((areaCount ?? 0) <= 1) {
    return { ok: false, error: "Keep at least one area." };
  }

  const { count: itemCount, error: itemError } = await supabase
    .from("equipment")
    .select("*", { count: "exact", head: true })
    .eq("area", area.name);
  if (itemError) return { ok: false, error: itemError.message };
  if ((itemCount ?? 0) > 0) {
    return {
      ok: false,
      error: `Remove or reassign ${itemCount} item${itemCount === 1 ? "" : "s"} first.`,
    };
  }

  const { error } = await supabase.from("areas").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAreas();
  return { ok: true, name: area.name };
}
