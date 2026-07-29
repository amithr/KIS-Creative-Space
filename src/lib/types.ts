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

export type Reservation = {
  id: string;
  equipment_id: string;
  name: string;
  email: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "pending" | "confirmed" | "cancelled" | "returned";
  created_at: string;
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
