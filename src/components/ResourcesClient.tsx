"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AREA_FILTERS } from "@/lib/constants";
import { areaPillColors, stockBarColor } from "@/lib/area-styles";
import {
  formatUpdatedLabel,
  isNewItem,
  statusDotColor,
  stockStatus,
} from "@/lib/inventory";
import {
  itemHasNearTermAvailability,
  outLoansForItem,
} from "@/lib/reservation-availability";
import type { Equipment, ItemRequest, Reservation } from "@/lib/types";
import { SiteFooter } from "@/components/SiteFooter";
import {
  OutStatusBand,
  ReservationReceipt,
  ReservePanel,
  type ReceiptState,
} from "@/components/ReservePanel";
import {
  scrollToWishlist,
  WishlistCta,
  WishlistSection,
} from "@/components/WishlistSection";

type ResourcesClientProps = {
  equipment: Equipment[];
  reservations: Reservation[];
  itemRequests: ItemRequest[];
};

export function ResourcesClient({
  equipment: initial,
  reservations: initialReservations,
  itemRequests,
}: ResourcesClientProps) {
  const [items] = useState(initial);
  const [reservations, setReservations] = useState(initialReservations);
  const [cat, setCat] = useState<(typeof AREA_FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Record<string, ReceiptState>>({});
  const [isMobileReserve, setIsMobileReserve] = useState(false);
  const wishlistNameRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const rows = items.filter((d) => {
    const catOk =
      cat === "All" ||
      (cat === "New this week" ? isNewItem(d) : d.area === cat);
    const queryOk =
      !q || `${d.name} ${d.detail} ${d.area}`.toLowerCase().includes(q);
    return catOk && queryOk;
  });

  const reservingItem = useMemo(
    () => items.find((i) => i.id === reservingId) ?? null,
    [items, reservingId],
  );

  function openReserve(id: string, mobile: boolean) {
    const target = items.find((e) => e.id === id);
    if (target?.in_space_only) return;
    setReservingId(id);
    setIsMobileReserve(mobile);
    setReceipts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function closeReserve() {
    setReservingId(null);
    setIsMobileReserve(false);
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col">
      <section className="page-gutter flex flex-wrap items-end justify-between gap-4 pb-5 pt-6 md:pb-8 md:pt-[48px]">
        <div>
          <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-[#8a857a] md:mb-3 md:text-[12px] md:tracking-[0.2em] md:text-[#6d6759]">
            РЕСУРСИ · RESOURCES
          </p>
          <h1 className="font-display text-[27px] font-light leading-[1.05] tracking-[-0.01em] md:text-[46px] md:tracking-[-0.02em]">
            What&apos;s available right now
          </h1>
          <span className="kis-title-underline !mt-2.5 !w-12 md:!mt-3.5 md:!w-16" />
          <WishlistCta
            onJump={() => scrollToWishlist(wishlistNameRef.current)}
          />
        </div>
        <p className="hidden pb-1 font-mono text-[12px] tracking-[0.14em] text-[#6d6759] md:block">
          UPDATED {formatUpdatedLabel()}
        </p>
      </section>

      <section className="page-gutter mb-4 flex flex-col gap-2.5 md:mb-6 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="order-1 relative md:order-2">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a857a]">
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources…"
            className="min-h-11 w-full rounded-full border border-[#e3e0d8] bg-[#faf9f6] py-2.5 pl-10 pr-4 text-[13.5px] outline-none focus:border-[#141414] md:min-h-0 md:w-[180px] md:bg-transparent md:py-2 md:pl-9 md:text-[14.5px]"
          />
        </div>

        <div className="order-2 flex gap-1.5 overflow-x-auto pb-1 md:order-1 md:gap-2">
          {AREA_FILTERS.map((c) => {
            const active = cat === c;
            const isNew = c === "New this week";
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className="kis-press min-h-9 shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-semibold md:min-h-0 md:px-[15px] md:py-2 md:text-[14.5px]"
                style={{
                  background: active
                    ? isNew
                      ? "#c8102e"
                      : "#141414"
                    : "#fff",
                  color: active
                    ? "#fff"
                    : isNew
                      ? "#c8102e"
                      : "#55524a",
                  border: `1px solid ${
                    active
                      ? isNew
                        ? "#c8102e"
                        : "#141414"
                      : isNew
                        ? "#e8b8c0"
                        : "#e3e0d8"
                  }`,
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      <section className="page-gutter mb-10">
        <div className="border-t border-[#141414]">
          <div className="hidden grid-cols-[44px_2.2fr_1.1fr_100px_120px_120px] gap-4 border-b border-[#eeece5] py-3 font-mono text-[11px] tracking-[0.16em] text-[#6d6759] md:grid">
            <span />
            <span>ITEM</span>
            <span>AREA</span>
            <span>AVAILABLE</span>
            <span>STATUS</span>
            <span />
          </div>

          {rows.length === 0 ? (
            <p className="py-10 text-[14px] text-[#6d6759]">No items match.</p>
          ) : (
            rows.map((item, i) => {
              const status = stockStatus(
                item.quantity_available,
                item.quantity_total,
              );
              const isNew = isNewItem(item);
              const isReserving = reservingId === item.id && !isMobileReserve;
              const canReserve = itemHasNearTermAvailability(item, reservations);
              const loans = outLoansForItem(reservations, item.id);
              const receipt = receipts[item.id];
              const pill = areaPillColors(item.area);
              const fillPct =
                item.quantity_total > 0
                  ? Math.min(
                      100,
                      (item.quantity_available / item.quantity_total) * 100,
                    )
                  : 0;
              const rowFlash = receipt ? "kis-row-flash" : "";

              return (
                <div
                  key={item.id}
                  className="kis-fadeup"
                  style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}
                >
                  <div
                    className={`kis-row hidden grid-cols-[44px_2.2fr_1.1fr_100px_120px_120px] items-center gap-4 border-b border-[#eeece5] py-[17px] md:grid ${rowFlash}`}
                  >
                    <span className="font-mono text-[12px] text-[#c8b9a0]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[18px] font-semibold">
                          {item.name}
                        </span>
                        {isNew && (
                          <span className="rounded-full bg-[#c8102e] px-[7px] py-0.5 font-mono text-[9px] tracking-wide text-white">
                            NEW
                          </span>
                        )}
                        {item.in_space_only && (
                          <span
                            title="This item stays in the Makerspace — use it there during your booked periods"
                            className="rounded-full bg-[#141414] px-[7px] py-0.5 font-mono text-[10px] tracking-[0.1em] whitespace-nowrap text-[#f4f1ea]"
                          >
                            IN-SPACE ONLY
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[15.5px] leading-[1.65] text-[#6d6759]">
                        {item.detail}
                      </p>
                    </div>
                    <span>
                      <span
                        className="inline-block rounded-full px-3 py-1 text-[13px] font-semibold"
                        style={{ background: pill.bg, color: pill.fg }}
                      >
                        {item.area}
                      </span>
                    </span>
                    <div>
                      <span className="font-mono text-[14.5px]">
                        {item.quantity_available}
                        <span className="text-[#98917f]">
                          /{item.quantity_total}
                        </span>
                      </span>
                      <div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-[#eeece5]">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: `${fillPct}%`,
                            background: stockBarColor(status),
                          }}
                        />
                      </div>
                    </div>
                    <span className="flex items-center gap-2 text-[14.5px]">
                      <span
                        className={`h-[7px] w-[7px] rounded-full ${
                          status === "Low stock" || status === "Unavailable"
                            ? "kis-pulse"
                            : ""
                        }`}
                        style={{ background: statusDotColor(status) }}
                      />
                      {status}
                    </span>
                    <div>
                      {item.in_space_only ? (
                        <div
                          title="Stays in the Makerspace — book the space to use it"
                          className="select-none border border-dashed border-[#d5d1c8] px-1 py-1.5 text-center text-[13px] leading-[1.35] text-[#6d6759]"
                        >
                          Use in the space
                        </div>
                      ) : isReserving ? (
                        <button
                          type="button"
                          onClick={closeReserve}
                          className="kis-press w-full border border-[#141414] py-[7px] text-[14px] font-semibold"
                        >
                          Cancel ×
                        </button>
                      ) : canReserve ? (
                        <button
                          type="button"
                          onClick={() => openReserve(item.id, false)}
                          className="kis-press w-full border border-[#141414] py-[7px] text-[14px] font-semibold transition-colors hover:bg-[#141414] hover:text-white"
                        >
                          Reserve
                        </button>
                      ) : (
                        <span className="block text-center text-[14px] text-[#98917f]">
                          —
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`kis-row border-b border-[#eeece5] py-3.5 md:hidden ${rowFlash}`}
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        {(status === "Low stock" ||
                          status === "Unavailable") && (
                          <span
                            className="kis-pulse h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: statusDotColor(status) }}
                          />
                        )}
                        <span className="truncate text-[15px] font-medium">
                          {item.name}
                        </span>
                        {isNew && (
                          <span className="shrink-0 rounded-full bg-[#c8102e] px-1.5 py-0.5 font-mono text-[8px] tracking-wide text-white">
                            NEW
                          </span>
                        )}
                        {item.in_space_only && (
                          <span className="shrink-0 rounded-full bg-[#141414] px-1.5 py-0.5 font-mono text-[8px] tracking-[0.08em] text-[#f4f1ea]">
                            IN-SPACE ONLY
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-mono text-[12.5px]">
                          {item.quantity_available}
                          <span className="text-[#b6b0a3]">
                            /{item.quantity_total}
                          </span>
                        </span>
                        <div className="ml-auto mt-1 h-[3px] w-11 overflow-hidden rounded-full bg-[#eeece5]">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{
                              width: `${fillPct}%`,
                              background: stockBarColor(status),
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold"
                        style={{ background: pill.bg, color: pill.fg }}
                      >
                        {item.area}
                      </span>
                      {item.in_space_only ? (
                        <div className="select-none border border-dashed border-[#d5d1c8] px-3 py-1.5 text-center text-[11.5px] text-[#6d6759]">
                          Use in the space
                        </div>
                      ) : canReserve ? (
                        <button
                          type="button"
                          onClick={() => openReserve(item.id, true)}
                          className="kis-press min-h-9 rounded-full border border-[#141414] bg-white px-4 text-[12px] font-semibold"
                        >
                          Reserve
                        </button>
                      ) : (
                        <span className="text-[12px] text-[#98917f]">—</span>
                      )}
                    </div>
                    {item.in_space_only && (
                      <p className="mt-2 text-[11.5px] leading-[1.45] text-[#8a857a] md:hidden">
                        Stays in the Makerspace —{" "}
                        <Link href="/schedule" className="underline">
                          book the space
                        </Link>{" "}
                        to use it during your period.
                      </p>
                    )}
                  </div>

                  {loans.map((loan) => (
                    <OutStatusBand key={loan.id} loan={loan} />
                  ))}

                  {receipt && (
                    <ReservationReceipt
                      receipt={receipt}
                      onDismiss={() =>
                        setReceipts((prev) => {
                          const next = { ...prev };
                          delete next[item.id];
                          return next;
                        })
                      }
                      onUndone={() => {
                        setReservations((prev) =>
                          prev.filter((r) => r.id !== receipt.reservationId),
                        );
                        setReceipts((prev) => {
                          const next = { ...prev };
                          delete next[item.id];
                          return next;
                        });
                      }}
                    />
                  )}

                  {isReserving && reservingItem && (
                    <div className="hidden md:block">
                      <ReservePanel
                        item={reservingItem}
                        reservations={reservations}
                        variant="inline"
                        onClose={closeReserve}
                        onConfirmed={(r) => {
                          setReservations((prev) => [
                            {
                              id: r.reservationId,
                              equipment_id: item.id,
                              name: r.name,
                              qty: r.qty,
                              days: r.days,
                              period_start:
                                r.periods === "all" ? null : r.periods.start,
                              period_end:
                                r.periods === "all" ? null : r.periods.end,
                              status: "reserved",
                              out_qty: 0,
                              source: "web",
                              created_at: new Date().toISOString(),
                              out_at: null,
                              returned_at: null,
                            },
                            ...prev,
                          ]);
                          setReceipts((prev) => ({ ...prev, [item.id]: r }));
                          closeReserve();
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {reservingItem && isMobileReserve && (
        <ReservePanel
          item={reservingItem}
          reservations={reservations}
          variant="sheet"
          onClose={closeReserve}
          onConfirmed={(r) => {
            setReservations((prev) => [
              {
                id: r.reservationId,
                equipment_id: reservingItem.id,
                name: r.name,
                qty: r.qty,
                days: r.days,
                period_start: r.periods === "all" ? null : r.periods.start,
                period_end: r.periods === "all" ? null : r.periods.end,
                status: "reserved",
                out_qty: 0,
                source: "web",
                created_at: new Date().toISOString(),
                out_at: null,
                returned_at: null,
              },
              ...prev,
            ]);
            setReceipts((prev) => ({ ...prev, [reservingItem.id]: r }));
            closeReserve();
          }}
        />
      )}

      <div className="page-gutter sticky bottom-4 z-20 pb-5 md:hidden">
        <Link
          href="/schedule"
          className="kis-press flex min-h-11 w-full items-center justify-center rounded-full bg-[#141414] text-[13.5px] font-semibold text-white shadow-none hover:text-white"
        >
          Schedule the space →
        </Link>
      </div>

      <WishlistSection initial={itemRequests} nameInputRef={wishlistNameRef} />

      <SiteFooter />
    </div>
  );
}
