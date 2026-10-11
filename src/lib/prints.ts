import type {
  FilamentColor,
  PrintCut,
  PrintKind,
  PrintOrigin,
  PrintQuality,
  PrintRequest,
} from "@/lib/types";

export const PRINT_FILES_BUCKET = "print-files";

/** Public download URL for an upload (the bucket is public-read); `download=` forces an attachment. */
export function printFileUrl(filePath: string, fileName: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const path = filePath.split("/").map(encodeURIComponent).join("/");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${PRINT_FILES_BUCKET}/${path}?download=${encodeURIComponent(fileName)}`;
}
export const MAX_PRINT_FILE_BYTES = 50 * 1024 * 1024;
export const STUDENT_EMAIL_SESSION_KEY = "kis-student-email";

export type PrintKindMeta = {
  v: PrintKind;
  motif: "cube" | "poster" | "sticker";
  accept: string;
  re: RegExp;
  extensions: string[];
};

export const PRINT_KINDS: PrintKindMeta[] = [
  {
    v: "3d",
    motif: "cube",
    accept: ".stl,.3mf,.obj",
    re: /\.(stl|3mf|obj)$/i,
    extensions: ["stl", "3mf", "obj"],
  },
  {
    v: "poster",
    motif: "poster",
    accept: ".pdf,.png,.jpg,.jpeg,.svg",
    re: /\.(pdf|png|jpe?g|svg)$/i,
    extensions: ["pdf", "png", "jpg", "jpeg", "svg"],
  },
  {
    v: "sticker",
    motif: "sticker",
    accept: ".svg,.pdf,.png",
    re: /\.(svg|pdf|png)$/i,
    extensions: ["svg", "pdf", "png"],
  },
];

export function kindMeta(kind: string | null | undefined): PrintKindMeta {
  return PRINT_KINDS.find((k) => k.v === kind) ?? PRINT_KINDS[0];
}

export function isPrintKind(v: unknown): v is PrintKind {
  return v === "3d" || v === "poster" || v === "sticker";
}

export function isPrintOrigin(v: unknown): v is PrintOrigin {
  return v === "mine" || v === "school" || v === "found";
}

export const PRINT_ORIGINS: PrintOrigin[] = ["mine", "school", "found"];

export const STAGES_3D = ["RECEIVED", "SLICING", "PRINTING", "READY"] as const;
export const STAGES_VINYL = ["RECEIVED", "PRINTING", "CUTTING", "READY"] as const;

export function stagesFor(kind: PrintKind): readonly string[] {
  return kind === "3d" ? STAGES_3D : STAGES_VINYL;
}

export function stageLabel(r: Pick<PrintRequest, "kind" | "status">) {
  return stagesFor(r.kind)[r.status] ?? "RECEIVED";
}

export const PRINT_CUTS: PrintCut[] = ["contour", "border", "square"];

export function isPrintCut(v: unknown): v is PrintCut {
  return PRINT_CUTS.includes(v as PrintCut);
}

/** Fallback palette when the database is not configured. */
export const DEFAULT_COLORS: FilamentColor[] = [
  { v: "red", label: "RED", hex: "#b5342c", on: true, sort: 0 },
  { v: "white", label: "WHITE", hex: "#f4efe6", on: true, sort: 1 },
  { v: "black", label: "BLACK", hex: "#2a211c", on: true, sort: 2 },
  { v: "blue", label: "BLUE", hex: "#2f5d8a", on: true, sort: 3 },
  { v: "yellow", label: "YELLOW", hex: "#e0b020", on: true, sort: 4 },
  { v: "natural", label: "NATURAL", hex: "#d9c7a8", on: true, sort: 5 },
];

export const VINYL_SWATCH =
  "repeating-linear-gradient(45deg, #b5342c 0 4px, #fbf6ee 4px 8px)";
export const VINYL_SWATCH_ADMIN =
  "repeating-linear-gradient(45deg, #b5342c 0 3px, #fbf6ee 3px 6px)";

/** CSS background for a request's colour. Unknown slugs fall back to hairline. */
export function swatchOf(color: string, colors: FilamentColor[], admin = false) {
  if (color === "vinyl") return admin ? VINYL_SWATCH_ADMIN : VINYL_SWATCH;
  return colors.find((c) => c.v === color)?.hex ?? "#e9dfd0";
}

export function colorLabel(color: string, colors: FilamentColor[]) {
  if (color === "vinyl") return "VINYL";
  return colors.find((c) => c.v === color)?.label ?? color.toUpperCase();
}

export function slugifyColor(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeFilamentColor(row: Record<string, unknown>): FilamentColor {
  return {
    v: String(row.v ?? ""),
    label: String(row.label ?? "").trim().toUpperCase(),
    hex: String(row.hex ?? "#888888"),
    on: row.on !== false,
    sort: Number(row.sort) || 0,
  };
}

export function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email.trim());
}

export function fileMatchesKind(kind: PrintKind, fileName: string) {
  return kindMeta(kind).re.test(fileName.trim());
}

/** Safe object name for storage: keeps the extension, strips odd characters. */
export function sanitizeFileName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, "-");
  const cleaned = trimmed.replace(/[^A-Za-z0-9._-]/g, "");
  return cleaned.replace(/^\.+/, "") || "file";
}

export function normalizePrintRequest(row: Record<string, unknown>): PrintRequest {
  const kind = isPrintKind(row.kind) ? row.kind : "3d";
  const statusRaw = Number(row.status);
  const status = (Number.isFinite(statusRaw)
    ? Math.min(3, Math.max(0, Math.round(statusRaw)))
    : 0) as 0 | 1 | 2 | 3;
  const qRaw = Number(row.quality);
  const quality = (Number.isFinite(qRaw)
    ? Math.min(3, Math.max(1, Math.round(qRaw)))
    : 1) as PrintQuality;
  const createdAt = String(row.created_at ?? "");
  const atMs = Date.parse(createdAt);
  return {
    id: String(row.id ?? ""),
    kind,
    origin: isPrintOrigin(row.origin) ? row.origin : "found",
    teacher: row.teacher ? String(row.teacher) : null,
    quality,
    adjust: Number(row.adjust) || 0,
    name: String(row.name ?? "").trim(),
    email: String(row.email ?? "").trim().toLowerCase(),
    file: String(row.file_name ?? row.file ?? "").trim(),
    file_path: row.file_path ? String(row.file_path) : null,
    file_size: Number(row.file_size) || 0,
    color: String(row.color ?? (kind === "3d" ? "red" : "vinyl")),
    qty: Math.max(1, Number(row.qty) || 1),
    cut: isPrintCut(row.cut) ? row.cut : null,
    status,
    at: Number.isFinite(atMs) ? atMs : Date.now(),
    ready_at: row.ready_at ? String(row.ready_at) : null,
  };
}

/** Row payload for (re)inserting a full snapshot — used by undo/restore. */
export function printRequestInsertRow(r: PrintRequest) {
  return {
    id: r.id,
    kind: r.kind,
    origin: r.origin,
    teacher: r.teacher,
    quality: r.quality,
    adjust: r.adjust,
    name: r.name,
    email: r.email,
    file_name: r.file,
    file_path: r.file_path,
    file_size: r.file_size,
    color: r.color,
    qty: r.qty,
    cut: r.cut,
    status: r.status,
    ready_at: r.ready_at,
    created_at: new Date(r.at).toISOString(),
  };
}

export function isOverdue() {
  return false;
}

/** Admin sort: by stage, then newest first. */
export function sortAdminPrints(list: PrintRequest[]) {
  return [...list].sort((a, b) => a.status - b.status || b.at - a.at);
}

export type PrintFilter = "open" | "ready" | "vinyl" | "all";

export function filterPrints(list: PrintRequest[], filter: PrintFilter) {
  return list.filter((r) =>
    filter === "all"
      ? true
      : filter === "open"
        ? r.status < 3
        : filter === "ready"
          ? r.status === 3
          : r.kind !== "3d",
  );
}

export function formatMb(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1);
}
