export type Equipment = {
  id: string;
  qr_code: string;
  area: string;
  name: string;
  detail: string;
  quantity_available: number;
  quantity_total: number;
  in_space_only: boolean;
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
export type SpaceBlockScope = "all" | "training" | "space";

/** Admin-created closed periods on the public schedule. */
export type SpaceBlock = {
  id: string;
  repeat: SpaceBlockRepeat;
  block_date: string | null;
  dow: SpaceBlockDow | null;
  /** Weekly only: apply on/after this ISO date. Null = no lower bound. */
  start_date: string | null;
  until_date: string | null;
  period_from: number;
  period_to: number;
  reason: string;
  /** `all` closes space + training; `training` hides from Book training only. */
  scope: SpaceBlockScope;
  created_at: string;
};

export type TrainingSessionStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled";

/** Coordinator training session (does not reserve the room for classes). */
export type TrainingSession = {
  id: string;
  session_date: string;
  period: number;
  teacher_name: string;
  topic: string;
  status: TrainingSessionStatus;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decline_reason: string | null;
};

export type StockStatus = "Available" | "Low stock" | "Unavailable";

export type ItemRequestStatus =
  | "requested"
  | "approved"
  | "ordered"
  | "arrived";

/** Wishlist suggestion from Resources — not an inventory item yet. */
export type ItemRequest = {
  id: string;
  name: string;
  why: string | null;
  by: string;
  votes: number;
  status: ItemRequestStatus;
  created_at: string;
  /** Whether the current viewer has voted (client/session-specific). */
  voted?: boolean;
};

export type SprintStatus = "todo" | "doing" | "done";

export type ProjectSprint = {
  n: number;
  objective: string;
  due: string;
  status: SprintStatus;
};

/** Teacher-designed multi-week student project. */
export type StudentProject = {
  id: string;
  email: string;
  course: string;
  unit: string;
  initials: string;
  summary: string;
  start: string;
  createdAt: number;
  weeks: ProjectSprint[];
  /** Per-project secret for teacher edit links — never send to students. */
  editKey?: string;
};

/** Teacher sign-up for a Wednesday design session. */
export type WednesdayEntry = {
  id: string;
  session_date: string;
  email: string;
  period: number;
  cls: string;
  text: string;
  resources: string | null;
  project_id: string | null;
  created_at: string;
};

export type PrintKind = "3d" | "poster" | "sticker";
export type PrintColor =
  | "red"
  | "white"
  | "black"
  | "blue"
  | "yellow"
  | "natural"
  | "vinyl";
export type PrintCut = "contour" | "border" | "square";
export type PrintGrade = "G6" | "G7" | "G8" | "G9" | "G10" | "G11" | "G12";

/** Student print request (3D print, vinyl poster or die-cut stickers). */
export type PrintRequest = {
  id: string;
  kind: PrintKind;
  name: string;
  email: string;
  grade: PrintGrade;
  /** Original upload filename, shown everywhere. */
  file: string;
  /** Object path in the `print-files` bucket; null for seeded demo rows. */
  file_path: string | null;
  file_size: number;
  color: PrintColor;
  size: string;
  qty: number;
  cut: PrintCut | null;
  /** ISO date or null. */
  due: string | null;
  notes: string;
  /** Index into the kind's stage list (0 RECEIVED … 3 READY). */
  status: 0 | 1 | 2 | 3;
  /** Epoch ms of creation. */
  at: number;
  ready_at: string | null;
};
