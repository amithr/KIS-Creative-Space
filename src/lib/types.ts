export type Equipment = {
  id: string;
  qr_code: string;
  area: string;
  name: string;
  detail: string;
  quantity_available: number;
  quantity_total: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type EquipmentUnit = {
  id: string;
  equipment_id: string;
  serial_number: string;
  status: "available" | "checked_out";
  created_at: string;
};

export type EquipmentWithUnits = Equipment & {
  units: EquipmentUnit[];
};

export type SiteSettings = {
  weekly_note: string;
  max_reservation_days: number;
};

export type ReservationStatus = "reserved" | "out" | "returned";
export type ReservationSource = "web" | "app" | "web-admin";

export type Reservation = {
  id: string;
  equipment_id: string;
  name: string;
  qty: number;
  days: string[];
  period_start: number | null;
  period_end: number | null;
  status: ReservationStatus;
  out_qty: number;
  source: ReservationSource;
  created_at: string;
  out_at: string | null;
  returned_at: string | null;
};

export type ActivityEvent = {
  id: string;
  type: "reserve" | "checkout" | "checkin" | "add" | "remove" | "edit" | "sync";
  item_id: string | null;
  reservation_id: string | null;
  actor: string;
  source: "WEBSITE" | "THIS PHONE" | "ADMIN" | "AUTO";
  at: string;
  message: string;
};

export type SpaceBookingStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled";

/** Room / makerspace period request (not an item reservation). */
export type SpaceBooking = {
  id: string;
  booking_date: string;
  period: number;
  teacher_name: string;
  purpose: string | null;
  area: string | null;
  request_group: string | null;
  status: SpaceBookingStatus;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decline_reason: string | null;
};

/** @deprecated Use SpaceBooking */
export type PeriodBooking = SpaceBooking;

export type SpaceBlockRepeat = "once" | "weekly";
export type SpaceBlockDow = "MON" | "TUE" | "WED" | "THU" | "FRI";

/** Admin-created closed periods on the public schedule. */
export type SpaceBlock = {
  id: string;
  repeat: SpaceBlockRepeat;
  block_date: string | null;
  dow: SpaceBlockDow | null;
  until_date: string | null;
  period_from: number;
  period_to: number;
  reason: string;
  created_at: string;
};

export type StockStatus = "Available" | "Low stock" | "Unavailable";
