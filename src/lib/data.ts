import { createClient } from "@/lib/supabase/server";
import { FALLBACK_EQUIPMENT } from "@/lib/constants";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { normalizeItemRequest } from "@/lib/item-requests";
import type {
  Equipment,
  EquipmentUnit,
  EquipmentWithUnits,
  ItemRequest,
  Reservation,
  SiteSettings,
  SpaceBlock,
  SpaceBooking,
  TrainingSession,
} from "@/lib/types";

function hasSupabaseEnv() {
  return hasSupabasePublicEnv();
}

const DEFAULT_SETTINGS: SiteSettings = {
  weekly_note:
    "Drop-in hours daily 14–17. New filament colors in the print corner.",
  max_reservation_days: 7,
};

function normalizeEquipment(
  row: Omit<Equipment, "in_space_only" | "quantity_total"> & {
    quantity_total?: number;
    in_space_only?: boolean;
  },
): Equipment {
  const total =
    typeof row.quantity_total === "number" && row.quantity_total >= 0
      ? row.quantity_total
      : row.quantity_available;
  return {
    ...row,
    quantity_total: Math.max(total, row.quantity_available),
    in_space_only: Boolean(row.in_space_only),
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

function normalizeReservation(row: Record<string, unknown>): Reservation {
  const daysRaw = row.days;
  const days = Array.isArray(daysRaw)
    ? daysRaw.map((d) => String(d))
    : [];
  return {
    id: String(row.id),
    equipment_id: String(row.equipment_id),
    name: String(row.name ?? ""),
    qty: Number(row.qty ?? 1),
    days,
    period_start:
      row.period_start == null ? null : Number(row.period_start),
    period_end: row.period_end == null ? null : Number(row.period_end),
    status: (row.status as Reservation["status"]) ?? "reserved",
    out_qty: Number(row.out_qty ?? 0),
    source: (row.source as Reservation["source"]) ?? "web",
    created_at: String(row.created_at ?? ""),
    out_at: row.out_at ? String(row.out_at) : null,
    returned_at: row.returned_at ? String(row.returned_at) : null,
  };
}

/** Active reservations (not returned) for availability math + OUT bands. */
export async function getActiveReservations(): Promise<Reservation[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .neq("status", "returned")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load reservations:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    normalizeReservation(row as Record<string, unknown>),
  );
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

function normalizeSpaceBooking(row: Record<string, unknown>): SpaceBooking {
  return {
    id: String(row.id),
    booking_date: String(row.booking_date),
    period: Number(row.period),
    teacher_name: String(row.teacher_name ?? ""),
    purpose: (row.purpose as string | null) ?? null,
    area: (row.area as string | null) ?? null,
    request_group: (row.request_group as string | null) ?? null,
    status: (row.status as SpaceBooking["status"]) ?? "confirmed",
    created_at: String(row.created_at ?? ""),
    decided_at: (row.decided_at as string | null) ?? null,
    decided_by: (row.decided_by as string | null) ?? null,
    decline_reason: (row.decline_reason as string | null) ?? null,
  };
}

/** Active slots for the public schedule grid (pending + confirmed). */
export async function getPeriodBookings(
  from: string,
  to: string,
): Promise<SpaceBooking[]> {
  return getSpaceBookings(from, to, ["pending", "confirmed"]);
}

export async function getSpaceBookings(
  from: string,
  to: string,
  statuses?: SpaceBooking["status"][],
): Promise<SpaceBooking[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  let query = supabase
    .from("space_bookings")
    .select("*")
    .gte("booking_date", from)
    .lte("booking_date", to)
    .order("booking_date")
    .order("period");

  if (statuses?.length) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load space bookings:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    normalizeSpaceBooking(row as Record<string, unknown>),
  );
}

/** Upcoming admin queue: pending any date + confirmed from today forward. */
export async function getAdminSpaceBookings(): Promise<SpaceBooking[]> {
  if (!hasSupabaseEnv()) return [];

  const today = new Date();
  const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("space_bookings")
    .select("*")
    .or(
      `status.eq.pending,and(status.eq.confirmed,booking_date.gte.${from})`,
    )
    .order("booking_date")
    .order("period");

  if (error) {
    console.error("Failed to load admin space bookings:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    normalizeSpaceBooking(row as Record<string, unknown>),
  );
}

function normalizeSpaceBlock(row: Record<string, unknown>): SpaceBlock {
  return {
    id: String(row.id),
    repeat: (row.repeat as SpaceBlock["repeat"]) ?? "once",
    block_date: (row.block_date as string | null) ?? null,
    dow: (row.dow as SpaceBlock["dow"] | null) ?? null,
    until_date: (row.until_date as string | null) ?? null,
    period_from: Number(row.period_from),
    period_to: Number(row.period_to),
    reason: String(row.reason ?? "Blocked"),
    created_at: String(row.created_at ?? ""),
  };
}

/** Newest first — admin list + schedule grid. */
export async function getSpaceBlocks(): Promise<SpaceBlock[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("space_blocks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load space blocks:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    normalizeSpaceBlock(row as Record<string, unknown>),
  );
}

function normalizeTrainingSession(row: Record<string, unknown>): TrainingSession {
  return {
    id: String(row.id),
    session_date: String(row.session_date),
    period: Number(row.period),
    teacher_name: String(row.teacher_name ?? ""),
    topic: String(row.topic ?? ""),
    status: (row.status as TrainingSession["status"]) ?? "pending",
    created_at: String(row.created_at ?? ""),
    decided_at: (row.decided_at as string | null) ?? null,
    decided_by: (row.decided_by as string | null) ?? null,
    decline_reason: (row.decline_reason as string | null) ?? null,
  };
}

/** Active training sessions for the public grid (pending + confirmed). */
export async function getTrainingSessions(
  from: string,
  to: string,
  statuses: TrainingSession["status"][] = ["pending", "confirmed"],
): Promise<TrainingSession[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  let query = supabase
    .from("training_sessions")
    .select("*")
    .gte("session_date", from)
    .lte("session_date", to)
    .order("session_date")
    .order("period");

  if (statuses.length) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load training sessions:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    normalizeTrainingSession(row as Record<string, unknown>),
  );
}

/** Admin queue: pending any date + confirmed from today forward. */
export async function getAdminTrainingSessions(): Promise<TrainingSession[]> {
  if (!hasSupabaseEnv()) return [];

  const today = new Date();
  const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_sessions")
    .select("*")
    .or(
      `status.eq.pending,and(status.eq.confirmed,session_date.gte.${from})`,
    )
    .order("session_date")
    .order("period");

  if (error) {
    console.error("Failed to load admin training sessions:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    normalizeTrainingSession(row as Record<string, unknown>),
  );
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

const FALLBACK_ITEM_REQUESTS: ItemRequest[] = [
  {
    id: "rq-demo-1",
    name: "Makey Makey classroom kits",
    why: "Intro circuits unit for grade 5",
    by: "Ms. Chen",
    votes: 4,
    status: "ordered",
    created_at: new Date(Date.now() - 12 * 864e5).toISOString(),
  },
  {
    id: "rq-demo-2",
    name: "Cricut vinyl rolls (assorted)",
    why: "cricut.com/vinyl — the sticker unit ran out",
    by: "Mr. Kovalenko",
    votes: 2,
    status: "requested",
    created_at: new Date(Date.now() - 3 * 864e5).toISOString(),
  },
];

/** Public + admin wishlist. Pass voterKey to mark which rows the viewer voted on. */
export async function getItemRequests(
  voterKey?: string,
): Promise<ItemRequest[]> {
  if (!hasSupabaseEnv()) {
    return FALLBACK_ITEM_REQUESTS.map((r) => ({ ...r, voted: false }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_requests")
    .select("*")
    .order("votes", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load item requests:", error.message);
    return FALLBACK_ITEM_REQUESTS.map((r) => ({ ...r, voted: false }));
  }

  const votedIds = new Set<string>();
  const key = voterKey?.trim();
  if (key) {
    const { data: votes } = await supabase
      .from("item_request_votes")
      .select("request_id")
      .eq("voter_key", key);
    for (const v of votes ?? []) {
      votedIds.add(String(v.request_id));
    }
  }

  return (data ?? []).map((row) =>
    normalizeItemRequest(
      row as Record<string, unknown>,
      votedIds.has(String(row.id)),
    ),
  );
}

export { hasSupabaseEnv };
