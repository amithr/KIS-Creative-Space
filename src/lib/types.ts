export type PrintKind = "3d" | "poster" | "sticker";
export type PrintCut = "contour" | "border" | "square";
/** Who designed the file — the student claims it; the Studio Admin can change it. */
export type PrintOrigin = "mine" | "school" | "found";
export type PrintQuality = 1 | 2 | 3;

/** Student print request (3D print, vinyl poster or die-cut stickers). */
export type PrintRequest = {
  id: string;
  kind: PrintKind;
  origin: PrintOrigin;
  /** Teacher id from the school directory; required when origin = "school". */
  teacher: string | null;
  /** Admin quality rating (default 1); only meaningful for origin = "mine". */
  quality: PrintQuality;
  /** Admin manual point adjustments (+10 top-ups). */
  adjust: number;
  name: string;
  email: string;
  /** Original upload filename, shown everywhere. */
  file: string;
  /** Object path in the `print-files` bucket; null for seeded demo rows. */
  file_path: string | null;
  file_size: number;
  /** FilamentColor.v for 3d; "vinyl" for poster/sticker. */
  color: string;
  qty: number;
  cut: PrintCut | null;
  /** Index into the kind's stage list (0 RECEIVED … 3 READY). */
  status: 0 | 1 | 2 | 3;
  /** Epoch ms of creation. */
  at: number;
  ready_at: string | null;
};

/** Filament colour on offer; students only see `on` colours. */
export type FilamentColor = {
  v: string;
  label: string;
  hex: string;
  on: boolean;
  sort: number;
};
