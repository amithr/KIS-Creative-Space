import type {
  PrintColor,
  PrintCut,
  PrintGrade,
  PrintKind,
  PrintRequest,
} from "@/lib/types";

export const PRINT_FILES_BUCKET = "print-files";
export const MAX_PRINT_FILE_BYTES = 50 * 1024 * 1024;
export const STUDENT_EMAIL_SESSION_KEY = "kis-student-email";

export const PRINT_GRADES: PrintGrade[] = [
  "G6",
  "G7",
  "G8",
  "G9",
  "G10",
  "G11",
  "G12",
];

export type PrintKindMeta = {
  v: PrintKind;
  label: string;
  tag: string;
  hint: string;
  motif: "cube" | "poster" | "sticker";
  accept: string;
  re: RegExp;
  extensions: string[];
  fileLabel: string;
  fileSub: string;
  title: string;
  notes: string;
  pickToast: string;
  wrongFileToast: string;
  defaultSize: string;
};

export const PRINT_KINDS: PrintKindMeta[] = [
  {
    v: "3d",
    label: "3D print",
    tag: "3D",
    hint: ".STL · .3MF",
    motif: "cube",
    accept: ".stl,.3mf,.obj",
    re: /\.(stl|3mf|obj)$/i,
    extensions: ["stl", "3mf", "obj"],
    fileLabel: "YOUR 3D FILE · .STL OR .3MF",
    fileSub: ".STL or .3MF · under 50 MB",
    title: "Tell us about your print",
    notes: "e.g. a gear for my robotics project — it needs to fit a 5 mm shaft",
    pickToast: "3D PRINT · ATTACH AN .STL OR .3MF",
    wrongFileToast: "THAT ISN'T A 3D FILE — EXPORT AS .STL OR .3MF",
    defaultSize: "M",
  },
  {
    v: "poster",
    label: "Poster",
    tag: "POSTER",
    hint: "PDF · PNG · SVG",
    motif: "poster",
    accept: ".pdf,.png,.jpg,.jpeg,.svg",
    re: /\.(pdf|png|jpe?g|svg)$/i,
    extensions: ["pdf", "png", "jpg", "jpeg", "svg"],
    fileLabel: "YOUR ARTWORK · PDF, PNG OR SVG AT FULL SIZE",
    fileSub: "PDF, PNG or SVG · under 50 MB",
    title: "Tell us about your poster",
    notes: "e.g. A3 for the science fair board — matte if possible",
    pickToast: "POSTER · PRINTED ON ADHESIVE VINYL",
    wrongFileToast: "THAT FILE TYPE WON'T PRINT — USE PDF · PNG · SVG",
    defaultSize: "A3",
  },
  {
    v: "sticker",
    label: "Stickers",
    tag: "STICKERS",
    hint: "SVG · PNG · CUT TO SHAPE",
    motif: "sticker",
    accept: ".svg,.pdf,.png",
    re: /\.(svg|pdf|png)$/i,
    extensions: ["svg", "pdf", "png"],
    fileLabel: "YOUR DESIGN · SVG CUTS BEST, PNG WORKS TOO",
    fileSub: "SVG, PDF or PNG · we print on adhesive vinyl and cut it out",
    title: "Tell us about your stickers",
    notes: "e.g. club logo for 12 laptops — about 6 cm wide",
    pickToast: "STICKERS · PRINTED ON VINYL, THEN CUT TO SHAPE",
    wrongFileToast: "THAT FILE TYPE WON'T PRINT — USE SVG · PNG",
    defaultSize: "S",
  },
];

export function kindMeta(kind: string | null | undefined): PrintKindMeta {
  return PRINT_KINDS.find((k) => k.v === kind) ?? PRINT_KINDS[0];
}

export function isPrintKind(v: unknown): v is PrintKind {
  return v === "3d" || v === "poster" || v === "sticker";
}

export const STAGES_3D = ["RECEIVED", "SLICING", "PRINTING", "READY"] as const;
export const STAGES_VINYL = [
  "RECEIVED",
  "PRINTING",
  "CUTTING",
  "READY",
] as const;

export function stagesFor(kind: PrintKind): readonly string[] {
  return kind === "3d" ? STAGES_3D : STAGES_VINYL;
}

export function stageLabel(r: Pick<PrintRequest, "kind" | "status">) {
  return stagesFor(r.kind)[r.status] ?? "RECEIVED";
}

export const PRINT_COLORS: { v: PrintColor; label: string; swatch: string }[] =
  [
    { v: "red", label: "RED", swatch: "#b5342c" },
    { v: "white", label: "WHITE", swatch: "#f4efe6" },
    { v: "black", label: "BLACK", swatch: "#2a211c" },
    { v: "blue", label: "BLUE", swatch: "#2f5d8a" },
    { v: "yellow", label: "YELLOW", swatch: "#e0b020" },
    { v: "natural", label: "NATURAL", swatch: "#d9c7a8" },
  ];

export const VINYL_SWATCH =
  "repeating-linear-gradient(45deg, #b5342c 0 4px, #fbf6ee 4px 8px)";
export const VINYL_SWATCH_ADMIN =
  "repeating-linear-gradient(45deg, #b5342c 0 3px, #fbf6ee 3px 6px)";

export function swatchOf(color: PrintColor, admin = false) {
  if (color === "vinyl") return admin ? VINYL_SWATCH_ADMIN : VINYL_SWATCH;
  return PRINT_COLORS.find((c) => c.v === color)?.swatch ?? "#eeece5";
}

export function isPrintColor(v: unknown): v is PrintColor {
  return (
    v === "vinyl" || PRINT_COLORS.some((c) => c.v === v)
  );
}

export const PRINT_CUTS: { v: PrintCut; label: string; tip: string; hint: string }[] =
  [
    {
      v: "contour",
      label: "CUT AROUND",
      tip: "Cut tightly around the outline of your design",
      hint: "Vinyl cutter follows your outline — SVG gives the cleanest edge.",
    },
    {
      v: "border",
      label: "WITH BORDER",
      tip: "A small white border around the design",
      hint: "A 3 mm vinyl border around the shape — classic sticker look.",
    },
    {
      v: "square",
      label: "SQUARE",
      tip: "Simple square or rectangle",
      hint: "Fast and simple — good for posters and labels.",
    },
  ];

export function isPrintCut(v: unknown): v is PrintCut {
  return PRINT_CUTS.some((c) => c.v === v);
}

export function sizesFor(kind: PrintKind): { v: string; label: string }[] {
  if (kind === "3d") {
    return [
      { v: "S", label: "S · <6 cm" },
      { v: "M", label: "M · <12 cm" },
      { v: "L", label: "L · <18 cm" },
    ];
  }
  if (kind === "poster") {
    return [
      { v: "A4", label: "A4" },
      { v: "A3", label: "A3" },
      { v: "A2", label: "A2" },
      { v: "A1", label: "A1 · ASK FIRST" },
    ];
  }
  return [
    { v: "XS", label: "XS · <3 cm" },
    { v: "S", label: "S · <6 cm" },
    { v: "M", label: "M · <10 cm" },
    { v: "L", label: "L · <20 cm" },
  ];
}

export function isValidSize(kind: PrintKind, size: string) {
  return sizesFor(kind).some((s) => s.v === size);
}

export function isPrintGrade(v: unknown): v is PrintGrade {
  return PRINT_GRADES.includes(v as PrintGrade);
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
  const createdAt = String(row.created_at ?? "");
  const atMs = Date.parse(createdAt);
  const color = isPrintColor(row.color) ? row.color : kind === "3d" ? "red" : "vinyl";
  return {
    id: String(row.id ?? ""),
    kind,
    name: String(row.name ?? "").trim(),
    email: String(row.email ?? "").trim().toLowerCase(),
    grade: isPrintGrade(row.grade) ? row.grade : "G6",
    file: String(row.file_name ?? row.file ?? "").trim(),
    file_path: row.file_path ? String(row.file_path) : null,
    file_size: Number(row.file_size) || 0,
    color,
    size: String(row.size ?? ""),
    qty: Math.max(1, Number(row.qty) || 1),
    cut: isPrintCut(row.cut) ? row.cut : null,
    due: row.due ? String(row.due).slice(0, 10) : null,
    notes: String(row.notes ?? "").trim(),
    status,
    at: Number.isFinite(atMs) ? atMs : Date.now(),
    ready_at: row.ready_at ? String(row.ready_at) : null,
  };
}

export function todayIso(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "17 Oct" */
export function formatDueShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function daysUntil(iso: string, today = todayIso()) {
  const a = new Date(iso + "T00:00:00").getTime();
  const b = new Date(today + "T00:00:00").getTime();
  return Math.round((a - b) / 86400000);
}

/** Meta line under a job on the student site. */
export function studentMetaLine(r: PrintRequest) {
  const spec =
    r.kind === "3d"
      ? `${r.color.toUpperCase()} · SIZE ${r.size}`
      : `${r.qty} × ${r.size} · VINYL${r.cut ? ` · ${r.cut.toUpperCase()} CUT` : ""}`;
  return [
    spec,
    r.grade,
    r.due ? `NEEDED ${formatDueShort(r.due).toUpperCase()}` : null,
    r.notes ? r.notes.toUpperCase() : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Meta line on the admin card: NAME · GRADE · EMAIL · spec. */
export function adminMetaLine(r: PrintRequest) {
  const spec =
    r.kind === "3d"
      ? `${r.color.toUpperCase()} · SIZE ${r.size}`
      : `${r.qty} × ${r.size} · VINYL${r.cut ? ` · ${r.cut.toUpperCase()} CUT` : ""}`;
  return `${r.name.toUpperCase()} · ${r.grade} · ${r.email.toUpperCase()} · ${spec}`;
}

export function isOverdue(r: PrintRequest, today = todayIso()) {
  return Boolean(r.due && r.status < 3 && r.due < today);
}

/** Admin sort: by status, then earliest deadline (undated last). */
export function sortAdminPrints(list: PrintRequest[]) {
  return [...list].sort(
    (a, b) =>
      a.status - b.status ||
      ((a.due ?? "9") < (b.due ?? "9") ? -1 : (a.due ?? "9") > (b.due ?? "9") ? 1 : 0) ||
      b.at - a.at,
  );
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
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}
