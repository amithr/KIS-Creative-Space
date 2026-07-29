import { createClient } from "@/lib/supabase/server";
import { FALLBACK_EQUIPMENT } from "@/lib/constants";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import type {
  Equipment,
  EquipmentUnit,
  EquipmentWithUnits,
  PeriodBooking,
  SiteSettings,
} from "@/lib/types";

function hasSupabaseEnv() {
  return hasSupabasePublicEnv();
}

const DEFAULT_SETTINGS: SiteSettings = {
  weekly_note:
    "Drop-in hours daily 14–17. New filament colors in the print corner.",
  show_telegram: true,
  max_reservation_days: 7,
};

function normalizeEquipment(row: Equipment): Equipment {
  const total =
    typeof row.quantity_total === "number" && row.quantity_total >= 0
      ? row.quantity_total
      : row.quantity_available;
  return {
    ...row,
    quantity_total: Math.max(total, row.quantity_available),
  };
}

export async function getEquipment(): Promise<Equipment[]> {
  if (!hasSupabaseEnv()) return FALLBACK_EQUIPMENT.map(normalizeEquipment);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .order("sort_order")
    .order("name");

  if (error) {
    console.error("Failed to load equipment:", error.message);
    return FALLBACK_EQUIPMENT.map(normalizeEquipment);
  }

  return (data ?? []).map(normalizeEquipment);
}

export async function getEquipmentWithUnits(): Promise<EquipmentWithUnits[]> {
  const equipment = await getEquipment();

  if (!hasSupabaseEnv()) {
    return equipment.map((item) => ({
      ...item,
      units: Array.from({ length: Math.max(item.quantity_total, 0) }, (_, i) => ({
        id: `${item.id}-unit-${i + 1}`,
        equipment_id: item.id,
        serial_number: `KIS-DEMO${item.id}${String(i + 1).padStart(2, "0")}`,
        status:
          i < item.quantity_available
            ? ("available" as const)
            : ("checked_out" as const),
        created_at: "",
      })),
    }));
  }

  const supabase = await createClient();
  const { data: units, error } = await supabase
    .from("equipment_units")
    .select("*")
    .order("created_at");

  if (error) {
    console.error("Failed to load equipment units:", error.message);
    return equipment.map((item) => ({ ...item, units: [] }));
  }

  const byEquipment = new Map<string, EquipmentUnit[]>();
  for (const unit of units ?? []) {
    const list = byEquipment.get(unit.equipment_id) ?? [];
    list.push(unit);
    byEquipment.set(unit.equipment_id, list);
  }

  return equipment.map((item) => ({
    ...item,
    units: byEquipment.get(item.id) ?? [],
  }));
}

export async function getEquipmentByQrCode(
  qrCode: string,
): Promise<Equipment | null> {
  if (!hasSupabaseEnv()) {
    const item = FALLBACK_EQUIPMENT.find((e) => e.qr_code === qrCode);
    return item ? normalizeEquipment(item) : null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("qr_code", qrCode)
    .maybeSingle();

  if (error) {
    console.error("Failed to load equipment:", error.message);
    return null;
  }

  return data ? normalizeEquipment(data) : null;
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
  if (!hasSupabaseEnv()) {
    const item = FALLBACK_EQUIPMENT.find((e) => e.id === id);
    return item ? normalizeEquipment(item) : null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load equipment:", error.message);
    return null;
  }

  return data ? normalizeEquipment(data) : null;
}

export async function getPeriodBookings(
  from: string,
  to: string,
): Promise<PeriodBooking[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("period_bookings")
    .select("*")
    .gte("booking_date", from)
    .lte("booking_date", to);

  if (error) {
    console.error("Failed to load period bookings:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!hasSupabaseEnv()) return DEFAULT_SETTINGS;

  const supabase = await createClient();
  const { data, error } = await supabase.from("site_settings").select("*");

  if (error || !data) {
    return DEFAULT_SETTINGS;
  }

  const map = Object.fromEntries(data.map((row) => [row.key, row.value]));

  return {
    weekly_note:
      typeof map.weekly_note === "string"
        ? map.weekly_note
        : DEFAULT_SETTINGS.weekly_note,
    show_telegram:
      typeof map.show_telegram === "boolean"
        ? map.show_telegram
        : DEFAULT_SETTINGS.show_telegram,
    max_reservation_days:
      typeof map.max_reservation_days === "number" &&
      map.max_reservation_days >= 1
        ? map.max_reservation_days
        : DEFAULT_SETTINGS.max_reservation_days,
  };
}

export async function isTeacher(): Promise<boolean> {
  if (!hasSupabaseEnv()) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return Boolean(data);
}

export { hasSupabaseEnv };
