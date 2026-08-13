"use client";

import { useMemo, useTransition } from "react";
import {
  advanceItemRequestStatus,
  deleteItemRequest,
} from "@/app/admin/actions";
import {
  formatItemRequestWhen,
  ITEM_REQUEST_STATUS_STYLE,
  sortItemRequestsByStage,
} from "@/lib/item-requests";
import type { ItemRequest } from "@/lib/types";

type ItemRequestsPanelProps = {
  requests: ItemRequest[];
  onDone: (msg: string) => void;
  onAddToInventory: (request: ItemRequest) => void;
};

export function ItemRequestsPanel({
  requests,
  onDone,
  onAddToInventory,
}: ItemRequestsPanelProps) {
  const [pending, startTransition] = useTransition();
  const rows = useMemo(() => sortItemRequestsByStage(requests), [requests]);
  const newCount = requests.filter((r) => r.status === "requested").length;

  function advance(id: string, label: string) {
    startTransition(async () => {
      const result = await advanceItemRequestStatus(id);
      if (!result.ok) {
        onDone(result.error);
        return;
      }
      onDone(label);
    });
  }

  function remove(id: string, label: string) {
    startTransition(async () => {
      const result = await deleteItemRequest(id);
      if (!result.ok) {
        onDone(result.error);
        return;
      }
      onDone(label);
    });
  }

  return (
    <div className="no-print page-gutter mb-11">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            Item requests
          </h2>
          {newCount > 0 && (
            <span className="rounded-full bg-[#c8102e] px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-white">
              {newCount} NEW
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] text-[#8f731c]">
          FROM THE RESOURCES WISHLIST
        </span>
      </div>
      <p className="mb-2 text-[13.5px] text-[#6d6759]">
        Teachers suggest purchases and upvote each other&apos;s requests. Move
        each request along: approve → ordered → arrived, then add it to the
        inventory.
      </p>

      {rows.length === 0 ? (
        <p className="py-2 text-[14.5px] text-[#98917f]">
          No requests yet — suggestions from the Resources page will appear
          here.
        </p>
      ) : (
        rows.map((r) => {
          const st = ITEM_REQUEST_STATUS_STYLE[r.status];
          return (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3.5 border-b border-[#eeece5] py-[11px]"
            >
              <span
                title="Teacher upvotes"
                className="flex shrink-0 items-center gap-1 rounded-full border border-[#e3e0d8] px-2.5 py-1 font-mono text-[12px] text-[#3f3b33]"
              >
                ▲ {r.votes}
              </span>
              <div className="min-w-0 flex-1">
                <div>
                  <span className="text-[15px] font-semibold">{r.name}</span>
                  {r.why && (
                    <span className="text-[13.5px] text-[#6d6759]">
                      {" "}
                      — {r.why}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-[#98917f]">
                  {r.by} · {formatItemRequestWhen(r.created_at)}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[9.5px] tracking-[0.08em]"
                style={{
                  background: st.bg,
                  color: st.fg,
                  borderColor: st.border,
                }}
              >
                {st.label}
              </span>
              <div className="flex shrink-0 flex-wrap gap-2">
                {r.status === "requested" && (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => advance(r.id, `Approved ${r.name}.`)}
                      className="bg-[#141414] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#2f9e44] disabled:opacity-60"
                    >
                      Approve ✓
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(r.id, `Declined ${r.name}.`)}
                      className="border border-[#e3e0d8] px-3 py-1.5 text-[13px] font-semibold text-[#3f3b33] transition-colors hover:border-[#c8102e] hover:text-[#c8102e] disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </>
                )}
                {r.status === "approved" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => advance(r.id, `Marked ${r.name} ordered.`)}
                    className="bg-[#141414] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#2f6b8f] disabled:opacity-60"
                  >
                    Mark ordered
                  </button>
                )}
                {r.status === "ordered" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => advance(r.id, `Marked ${r.name} arrived.`)}
                    className="bg-[#141414] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#2f9e44] disabled:opacity-60"
                  >
                    Mark arrived ✓
                  </button>
                )}
                {r.status === "arrived" && (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      title="Prefills the Add-item form below and clears the request"
                      onClick={() => onAddToInventory(r)}
                      className="bg-[#c8102e] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#a50d26] disabled:opacity-60"
                    >
                      + Add to inventory
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(r.id, `Cleared ${r.name}.`)}
                      className="border border-[#e3e0d8] px-3 py-1.5 text-[13px] font-semibold text-[#3f3b33] transition-colors hover:border-[#c8102e] hover:text-[#c8102e] disabled:opacity-60"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      <p className="pt-2.5 text-[13px] text-[#6d6759]">
        Status changes show live on the Resources wishlist, so the requester can
        follow along.
      </p>
    </div>
  );
}
