import { printFileUrl } from "@/lib/prints";
import type { PrintKind, PrintRequest } from "@/lib/types";

/**
 * ON THE PRINTERS — the public live board (handoff Part A §3b).
 * Pure helpers shared by the server action, the page and the client: which
 * jobs are "live", how they group, and the names-only view the public sees.
 */

/** READY jobs stay on the board this long after `ready_at`. */
export const BOARD_READY_WINDOW_MS = 3 * 86400000;

/** A job as the public board sees it — first name + last initial, never an email. */
export type LiveJob = {
  id: string;
  kind: PrintKind;
  /** "Olena K." — empty when the student left no name. */
  who: string;
  file: string;
  color: string;
  status: 0 | 1 | 2 | 3;
  at: number;
  /** When the current stage began — what "N min ago" counts from. */
  statusAt: number;
  readyAt: number | null;
  /** Public URL of a 3D upload while it still exists — the board's in-page preview. */
  model: string | null;
};

export type BoardCounts = { queued: number; printing: number; ready: number; open: number };

export type BoardGroupKey = "ready" | "machines" | "prepared" | "queue";

export const BOARD_GROUPS: {
  key: BoardGroupKey;
  status: 0 | 1 | 2 | 3;
  color: string;
  /** Active groups blink and run a dashed thread along the rule. */
  active: boolean;
}[] = [
  { key: "ready", status: 3, color: "#2f7d3f", active: false },
  { key: "machines", status: 2, color: "#b5342c", active: true },
  { key: "prepared", status: 1, color: "#b8860b", active: true },
  { key: "queue", status: 0, color: "#2a211c", active: false },
];

/** "Olena Kovalenko" → "Olena K."; "Olena K." → "Olena K."; "" → "". */
export function displayName(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const initial = parts[1] ? ` ${parts[1][0].toUpperCase()}.` : "";
  return parts[0] + initial;
}

function readyAtMs(r: PrintRequest): number | null {
  if (!r.ready_at) return null;
  const ms = Date.parse(r.ready_at);
  return Number.isFinite(ms) ? ms : null;
}

/** Open jobs, plus READY ones for three days after they were marked READY. */
export function isLiveJob(r: PrintRequest, now = Date.now()): boolean {
  if (r.status < 3) return true;
  return now - (readyAtMs(r) ?? r.at) < BOARD_READY_WINDOW_MS;
}

/** Board rows: status desc, then newest first. Strips every private field. */
export function toLiveJobs(list: PrintRequest[], now = Date.now()): LiveJob[] {
  return list
    .filter((r) => isLiveJob(r, now))
    .sort((a, b) => b.status - a.status || b.at - a.at)
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      who: displayName(r.name),
      file: r.file,
      color: r.color,
      status: r.status,
      at: r.at,
      statusAt: r.status_at,
      readyAt: readyAtMs(r),
      model: r.kind === "3d" && r.file_path ? printFileUrl(r.file_path, r.file) : null,
    }));
}

export function boardCounts(jobs: LiveJob[]): BoardCounts {
  const queued = jobs.filter((r) => r.status === 0).length;
  const printing = jobs.filter((r) => r.status === 1 || r.status === 2).length;
  const ready = jobs.filter((r) => r.status === 3).length;
  return { queued, printing, ready, open: queued + printing };
}

/** Non-empty groups in board order (READY → machines → prepared → queue). */
export function groupLiveJobs(jobs: LiveJob[]) {
  return BOARD_GROUPS.map((g) => ({
    ...g,
    jobs: jobs.filter((r) => r.status === g.status),
  })).filter((g) => g.jobs.length > 0);
}

/**
 * Needle position over the current stitch: stitches sit at 0, 1/(n−1), … of
 * the track, each line carrying 6px margins (12px total) that the percentage
 * does not account for; +4px centres the 2px needle on the 17px glyph.
 */
export function needleLeft(cur: number, n: number): string {
  const f = n > 1 ? cur / (n - 1) : 0;
  return `calc(${f * 100}% - ${f * 12}px + 4px)`;
}

export type AgoBucket = { unit: "min" | "h" | "d"; n: number };

/** Coarse relative time: 1–59 MIN, 1–23 H, then days. */
export function agoBucket(at: number, now = Date.now()): AgoBucket {
  const m = Math.max(1, Math.round((now - at) / 60000));
  if (m < 60) return { unit: "min", n: m };
  if (m < 1440) return { unit: "h", n: Math.max(1, Math.round(m / 60)) };
  return { unit: "d", n: Math.max(1, Math.round(m / 1440)) };
}
