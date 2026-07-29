"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/data";
import { isBookableDate, startOfDay, toISODate } from "@/lib/inventory";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function reserveItemInline(
  equipmentId: string,
  borrowerName: string,
): Promise<ActionResult> {
  const name = borrowerName.trim();
  if (!name) return { ok: false, error: "Please enter your name and class." };
  if (!equipmentId) return { ok: false, error: "Missing equipment." };

  if (!hasSupabaseEnv()) {
    return { ok: true };
  }

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("equipment")
    .select("id, quantity_available")
    .eq("id", equipmentId)
    .maybeSingle();

  if (error || !item) return { ok: false, error: "Equipment not found." };
  if (item.quantity_available < 1) {
    return { ok: false, error: "This item is unavailable." };
  }

  const today = toISODate(startOfDay(new Date()));

  const { error: insertError } = await supabase.from("reservations").insert({
    equipment_id: equipmentId,
    name,
    email: null,
    start_date: today,
    end_date: today,
    status: "pending",
  });

  if (insertError) return { ok: false, error: insertError.message };

  const { error: updateError } = await supabase
    .from("equipment")
    .update({ quantity_available: item.quantity_available - 1 })
    .eq("id", equipmentId);

  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/admin");
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
