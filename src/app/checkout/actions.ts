"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSiteSettings } from "@/lib/data";
import { validateReservationDates } from "@/lib/reservation";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type ReservationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitReservation(
  formData: FormData,
): Promise<ReservationResult> {
  const equipmentId = String(formData.get("equipmentId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();

  if (!equipmentId || !name || !email || !startDate || !endDate) {
    return { ok: false, error: "Please fill in all fields." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const settings = await getSiteSettings();
  const dateError = validateReservationDates(
    startDate,
    endDate,
    settings.max_reservation_days,
  );
  if (dateError) return { ok: false, error: dateError };

  if (!hasSupabasePublicEnv()) {
    return {
      ok: false,
      error: "Reservations require Supabase to be configured.",
    };
  }

  const supabase = await createClient();

  const { data: equipment, error: equipmentError } = await supabase
    .from("equipment")
    .select("id, quantity_available")
    .eq("id", equipmentId)
    .maybeSingle();

  if (equipmentError || !equipment) {
    return { ok: false, error: "Equipment not found." };
  }

  if (equipment.quantity_available < 1) {
    return { ok: false, error: "This item is not available to reserve." };
  }

  const { error } = await supabase.from("reservations").insert({
    equipment_id: equipmentId,
    name,
    email,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/checkout");
  redirect(`/checkout/reserve/${equipmentId}?success=1`);
}
