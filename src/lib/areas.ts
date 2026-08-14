import { DEFAULT_AREAS } from "@/lib/constants";

export type Area = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

/** Stored areas ∪ any area still on an item — never leaves an item pointing nowhere. */
export function effectiveAreaNames(
  stored: string[],
  itemAreas: Iterable<string>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(name);
  };

  for (const a of stored) push(a);
  for (const a of itemAreas) push(a);

  return out.length > 0 ? out : [...DEFAULT_AREAS];
}

export function resourceAreaFilters(areas: string[]): string[] {
  return ["All", "New this week", ...areas];
}
