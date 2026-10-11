import type { PrintOrigin, PrintRequest } from "@/lib/types";

/**
 * Points economy — the single source of truth for balance / stitches / rank.
 * Imported by the student site, the Studio Admin and the server actions, so
 * every surface agrees. Mirror any change in the Flutter app's ledger.dart.
 */
export const START_POINTS = 30;
export const PRINT_COST = 10;

export type OriginRule = {
  base: number;
  bonus: [number, number, number, number];
  free?: boolean;
};

export const ORG: Record<PrintOrigin, OriginRule> = {
  mine: { base: 15, bonus: [0, 5, 10, 15] },
  school: { base: 0, bonus: [0, 0, 0, 0], free: true },
  found: { base: 0, bonus: [0, 0, 0, 0] },
};

export type RankBand = "ribbon" | "diamond" | "star" | "tree" | "bird";

export const RANKS: { key: string; min: number; band: RankBand }[] = [
  { key: "thread", min: 0, band: "ribbon" },
  { key: "needle", min: 15, band: "diamond" },
  { key: "stitcher", min: 40, band: "star" },
  { key: "weaver", min: 80, band: "tree" },
  { key: "master", min: 150, band: "bird" },
];

export function originRule(origin: PrintOrigin | string | null | undefined) {
  return ORG[(origin as PrintOrigin) in ORG ? (origin as PrintOrigin) : "found"];
}

export function costOf(r: Pick<PrintRequest, "origin">) {
  return originRule(r.origin).free ? 0 : PRINT_COST;
}

/** Points earned back for a request (paid only once READY). */
export function earnOf(r: Pick<PrintRequest, "origin" | "quality">) {
  const o = originRule(r.origin);
  const q = Math.min(3, Math.max(0, Number(r.quality) || 1));
  return o.base + o.bonus[q];
}

/** Earn range for an origin across quality 1–3, e.g. [20, 30] for own designs. */
export function earnRange(origin: PrintOrigin): [number, number] {
  const o = originRule(origin);
  return [o.base + o.bonus[1], o.base + o.bonus[3]];
}

export type Ledger = {
  balance: number;
  earned: number;
  pending: number;
  own: number;
  school: number;
  found: number;
  count: number;
};

export function ledgerFor(list: PrintRequest[], email: string): Ledger {
  const needle = email.trim().toLowerCase();
  const mine = needle ? list.filter((r) => r.email === needle) : [];
  const spent = mine.reduce((a, r) => a + costOf(r), 0);
  const earned = mine
    .filter((r) => r.status === 3)
    .reduce((a, r) => a + earnOf(r), 0);
  const pending = mine
    .filter((r) => r.status < 3)
    .reduce((a, r) => a + earnOf(r), 0);
  const adj = mine.reduce((a, r) => a + (Number(r.adjust) || 0), 0);
  return {
    balance: START_POINTS - spent + earned + adj,
    earned,
    pending,
    own: mine.filter((r) => r.origin === "mine").length,
    school: mine.filter((r) => r.origin === "school").length,
    found: mine.filter((r) => r.origin !== "mine" && r.origin !== "school").length,
    count: mine.length,
  };
}

/** Rank index for a lifetime stitch count. */
export function rankFor(stitches: number) {
  let i = 0;
  RANKS.forEach((r, k) => {
    if (stitches >= r.min) i = k;
  });
  return i;
}

export function canAfford(balance: number, origin: PrintOrigin) {
  return originRule(origin).free || balance >= PRINT_COST;
}

export type LeaderRow = {
  email: string;
  name: string;
  earned: number;
  own: number;
};

/** Top makers by stitches earned, then own-design count. */
export function leaderboard(list: PrintRequest[], limit = 6): LeaderRow[] {
  const emails = [...new Set(list.map((r) => r.email))];
  return emails
    .map((email) => {
      const l = ledgerFor(list, email);
      const name = list.find((r) => r.email === email)?.name || email;
      return { email, name, earned: l.earned, own: l.own };
    })
    .filter((x) => x.earned > 0)
    .sort((a, b) => b.earned - a.earned || b.own - a.own)
    .slice(0, limit);
}
