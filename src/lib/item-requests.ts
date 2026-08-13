import type { ItemRequest, ItemRequestStatus } from "@/lib/types";

export const ITEM_REQUEST_STAGE_ORDER: Record<ItemRequestStatus, number> = {
  requested: 0,
  approved: 1,
  ordered: 2,
  arrived: 3,
};

export const ITEM_REQUEST_STATUS_STYLE: Record<
  ItemRequestStatus,
  { label: string; bg: string; fg: string; border: string }
> = {
  requested: {
    label: "REQUESTED",
    bg: "#f2f0ea",
    fg: "#6d6759",
    border: "#f2f0ea",
  },
  approved: {
    label: "APPROVED",
    bg: "#dff2e3",
    fg: "#1f6b30",
    border: "#2f9e44",
  },
  ordered: {
    label: "ORDERED",
    bg: "#e8f1f8",
    fg: "#2f6b8f",
    border: "#5d93b5",
  },
  arrived: {
    label: "ARRIVED",
    bg: "#2f9e44",
    fg: "#fff",
    border: "#2f9e44",
  },
};

/** Public wishlist: votes desc, then newest. */
export function sortItemRequestsByVotes(rows: ItemRequest[]): ItemRequest[] {
  return [...rows].sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return b.created_at.localeCompare(a.created_at);
  });
}

/** Admin / app queue: stage first, then votes desc. */
export function sortItemRequestsByStage(rows: ItemRequest[]): ItemRequest[] {
  return [...rows].sort((a, b) => {
    const stage =
      ITEM_REQUEST_STAGE_ORDER[a.status] - ITEM_REQUEST_STAGE_ORDER[b.status];
    if (stage !== 0) return stage;
    if (b.votes !== a.votes) return b.votes - a.votes;
    return b.created_at.localeCompare(a.created_at);
  });
}

export function formatItemRequestWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function normalizeItemRequest(
  row: Record<string, unknown>,
  voted?: boolean,
): ItemRequest {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    why: row.why == null || row.why === "" ? null : String(row.why),
    by: String(row.by_name ?? row.by ?? ""),
    votes: Math.max(0, Number(row.votes ?? 0)),
    status: (row.status as ItemRequestStatus) ?? "requested",
    created_at: String(row.created_at ?? ""),
    voted,
  };
}
