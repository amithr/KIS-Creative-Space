"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import {
  createItemRequest,
  listMyVotedRequestIds,
  toggleItemRequestVote,
} from "@/app/actions/public";
import {
  formatItemRequestWhen,
  ITEM_REQUEST_STATUS_STYLE,
  sortItemRequestsByVotes,
} from "@/lib/item-requests";
import type { ItemRequest } from "@/lib/types";

const VOTER_KEY = "kis-voter-key";

function getVoterKey(): string {
  if (typeof window === "undefined") return "";
  let key = window.localStorage.getItem(VOTER_KEY);
  if (!key) {
    key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VOTER_KEY, key);
  }
  return key;
}

export function scrollToWishlist(focusInput?: HTMLInputElement | null) {
  const el = document.getElementById("wishlist");
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: "smooth" });
  window.setTimeout(() => focusInput?.focus(), 350);
}

type WishlistSectionProps = {
  initial: ItemRequest[];
  nameInputRef?: RefObject<HTMLInputElement | null>;
};

export function WishlistSection({
  initial,
  nameInputRef,
}: WishlistSectionProps) {
  const localNameRef = useRef<HTMLInputElement>(null);
  const nameRef = nameInputRef ?? localNameRef;
  const [rows, setRows] = useState(initial);
  const [item, setItem] = useState("");
  const [why, setWhy] = useState("");
  const [by, setBy] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  useEffect(() => {
    const key = getVoterKey();
    if (!key) return;
    void listMyVotedRequestIds(key).then((ids) => {
      const voted = new Set(ids);
      setRows((prev) =>
        prev.map((r) => ({ ...r, voted: voted.has(r.id) })),
      );
    });
  }, []);

  const sorted = useMemo(() => sortItemRequestsByVotes(rows), [rows]);
  const canSubmit = item.trim().length > 0 && by.trim().length > 0 && !pending;

  function submit() {
    if (!canSubmit) return;
    const voterKey = getVoterKey();
    startTransition(async () => {
      const result = await createItemRequest({
        name: item,
        why,
        by,
        voterKey,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError("");
      setItem("");
      setWhy("");
      setBy("");
      if (result.id) {
        setRows((prev) => [
          {
            id: result.id!,
            name: result.name ?? item.trim(),
            why: result.why ?? (why.trim() || null),
            by: result.by ?? by.trim(),
            votes: result.votes ?? 1,
            status: (result.status as ItemRequest["status"]) ?? "requested",
            created_at: result.created_at ?? new Date().toISOString(),
            voted: true,
          },
          ...prev,
        ]);
      }
    });
  }

  function vote(id: string) {
    const voterKey = getVoterKey();
    startTransition(async () => {
      const result = await toggleItemRequestVote({ requestId: id, voterKey });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                votes: result.votes ?? r.votes,
                voted: Boolean(result.voted),
              }
            : r,
        ),
      );
    });
  }

  return (
    <section
      id="wishlist"
      data-wishlist="1"
      className="page-gutter mt-8 border-t border-[#141414] pt-6 pb-8 md:mt-11 md:pt-[26px] md:pb-[34px]"
    >
      <p className="font-mono text-[10px] tracking-[0.18em] text-[#8a857a] md:text-[12px] md:tracking-[0.2em] md:text-[#6d6759]">
        WISHLIST · ITEM REQUESTS
      </p>
      <h2 className="mt-1.5 text-[21px] font-semibold md:mt-1.5 md:text-[24px]">
        Don&apos;t see what you need?
      </h2>
      <p className="mt-1 text-[14px] leading-[1.55] text-[#6d6759] md:text-[15.5px] md:leading-[1.6]">
        Suggest an item for the space — colleagues can upvote it, and you can
        follow its status from requested to arrived.
      </p>

      <div className="mt-4 flex flex-col gap-2.5 md:mt-[18px] md:flex-row md:flex-wrap md:gap-2.5">
        <input
          ref={nameRef}
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="What should we get? (e.g. Cricut vinyl rolls)"
          className="min-h-11 flex-[2] border border-[#e3e0d8] px-3 py-2.5 text-[15px] outline-none focus:border-[#141414] md:min-h-0 md:min-w-[220px]"
        />
        <input
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="Why, or a link to the product (optional)"
          className="min-h-11 flex-[3] border border-[#e3e0d8] px-3 py-2.5 text-[15px] outline-none focus:border-[#141414] md:min-h-0 md:min-w-[260px]"
        />
        <input
          value={by}
          onChange={(e) => setBy(e.target.value)}
          placeholder="Your name"
          className="min-h-11 flex-[1.2] border border-[#e3e0d8] px-3 py-2.5 text-[15px] outline-none focus:border-[#141414] md:min-h-0 md:min-w-[150px]"
        />
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="min-h-11 whitespace-nowrap px-[22px] py-2.5 text-[14.5px] font-semibold text-white transition-colors md:min-h-0"
          style={{
            background: canSubmit ? "#c8102e" : "#d5d1c8",
            cursor: canSubmit ? "pointer" : "default",
          }}
          onMouseEnter={(e) => {
            if (canSubmit) e.currentTarget.style.background = "#a50d26";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = canSubmit ? "#c8102e" : "#d5d1c8";
          }}
        >
          Request it
        </button>
      </div>

      {error && (
        <p className="mt-2 text-[13.5px] text-[#c8102e]">{error}</p>
      )}

      <p className="mt-3 text-[11.5px] text-[#8a857a] md:hidden">
        Tap ▲ to upvote — one vote per person, tap again to undo.
      </p>

      <div className="mt-3.5 md:mt-3.5">
        {sorted.length === 0 ? (
          <p className="py-3.5 text-[14.5px] text-[#98917f]">
            No requests yet — be the first.
          </p>
        ) : (
          sorted.map((r) => {
            const st = ITEM_REQUEST_STATUS_STYLE[r.status];
            const voted = Boolean(r.voted);
            return (
              <div
                key={r.id}
                className="flex flex-col gap-2 border-b border-[#eeece5] py-3 md:flex-row md:items-center md:gap-3.5 md:py-3"
              >
                <div className="flex items-start gap-3 md:contents">
                  <button
                    type="button"
                    title="Upvote — one per person"
                    disabled={pending}
                    onClick={() => vote(r.id)}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[13px] transition-colors hover:border-[#141414] disabled:opacity-60"
                    style={{
                      borderColor: voted ? "#141414" : "#e3e0d8",
                      background: voted ? "#141414" : "transparent",
                      color: voted ? "#f4f1ea" : "#141414",
                    }}
                  >
                    ▲ {r.votes}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div>
                      <span className="text-[15px] font-semibold md:text-[16px]">
                        {r.name}
                      </span>
                      {r.why && (
                        <span className="text-[14px] text-[#6d6759] md:text-[14.5px]">
                          {" "}
                          — {r.why}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-[#98917f] md:hidden">
                      {r.by} · {formatItemRequestWhen(r.created_at)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-[0.08em] md:hidden"
                    style={{
                      background: st.bg,
                      color: st.fg,
                      borderColor: st.border,
                    }}
                  >
                    {st.label}
                  </span>
                </div>
                <span className="hidden shrink-0 whitespace-nowrap font-mono text-[11px] text-[#98917f] md:inline">
                  {r.by} · {formatItemRequestWhen(r.created_at)}
                </span>
                <span
                  className="hidden shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-[0.08em] md:inline"
                  style={{
                    background: st.bg,
                    color: st.fg,
                    borderColor: st.border,
                  }}
                >
                  {st.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export function WishlistCta({
  onJump,
}: {
  onJump: () => void;
}) {
  return (
    <button
      type="button"
      title="Jump to the wishlist form"
      onClick={onJump}
      className="mt-3 inline-flex items-center gap-2.5 border border-dashed border-[#d5d1c8] px-4 py-2 transition-colors hover:border-[#c8102e] hover:bg-[#fdf1f3] active:scale-[0.97] md:mt-4"
    >
      <span className="font-mono text-[10px] tracking-[0.14em] text-[#c8102e]">
        WISHLIST
      </span>
      <span className="text-[13.5px] text-[#3f3b33] md:text-[14.5px]">
        Missing something? Request an item for the space ↓
      </span>
    </button>
  );
}
