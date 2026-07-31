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
  show_telegram: boolean;
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

export type PeriodBooking = {
  id: string;
  booking_date: string;
  period: number;
  teacher_name: string;
  created_at: string;
};

export type TelegramPost = {
  text: string;
  time: string;
};

export type StockStatus = "Available" | "Low stock" | "Unavailable";
