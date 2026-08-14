"use client";

import { useMemo, useRef, useState } from "react";
import { resourceAreaFilters } from "@/lib/areas";
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
import { MobileResourcesList } from "@/components/MobileResourcesList";
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
  areaNames: string[];
};

export function ResourcesClient({
  equipment: initial,
  reservations: initialReservations,
  itemRequests,
  areaNames,
}: ResourcesClientProps) {
  const [items] = useState(initial);
  const [reservations, setReservations] = useState(initialReservations);
  const filters = useMemo(() => {
    const used = new Set(items.map((d) => d.area));
    return resourceAreaFilters(areaNames.filter((a) => used.has(a)));
  }, [areaNames, items]);
  const [cat, setCat] = useState("All");
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

  function dismissReceipt(id: string) {
    setReceipts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function undoReceipt(id: string, reservationId: string) {
    setReservations((prev) => prev.filter((r) => r.id !== reservationId));
    dismissReceipt(id);
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col">
      {/* Desktop hero */}
      <section className="page-gutter hidden flex-wrap items-end justify-between gap-4 pb-8 pt-[48px] md:flex">
        <div>
          <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-[#6d6759]">
            РЕСУРСИ · RESOURCES
          </p>
          <h1 className="font-display text-[46px] font-light leading-[1.05] tracking-[-0.02em]">
            What&apos;s available right now
          </h1>
          <span className="kis-title-underline !mt-3.5 !w-16" />
          <WishlistCta
            onJump={() => scrollToWishlist(wishlistNameRef.current)}
          />
        </div>
        <p className="pb-1 font-mono text-[12px] tracking-[0.14em] text-[#6d6759]">
          UPDATED {formatUpdatedLabel()}
        </p>
      </section>

      {/* Desktop filters */}
      <section className="page-gutter mb-6 hidden items-center justify-between gap-4 md:flex">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((c) => {
            const active = cat === c;
            const isNew = c === "New this week";
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className="kis-press shrink-0 rounded-full px-[15px] py-2 text-[14.5px] font-semibold"
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
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a857a]">
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources…"
            className="w-[180px] rounded-full border border-[#e3e0d8] bg-transparent py-2 pl-9 pr-4 text-[14.5px] outline-none focus:border-[#141414]"
          />
        </div>
      </section>

      {/* Desktop inventory table */}
      <section className="page-gutter mb-10 hidden md:block">
        <div className="border-t border-[#141414]">
          <div className="grid grid-cols-[44px_2.2fr_1.1fr_100px_120px_120px] gap-4 border-b border-[#eeece5] py-3 font-mono text-[11px] tracking-[0.16em] text-[#6d6759]">
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
              const canReserve = itemHasNearTermAvailability(
                item,
                reservations,
              );
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
                    className={`kis-row grid grid-cols-[44px_2.2fr_1.1fr_100px_120px_120px] items-center gap-4 border-b border-[#eeece5] py-[17px] ${rowFlash}`}
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

                  {loans.map((loan) => (
                    <OutStatusBand key={loan.id} loan={loan} />
                  ))}

                  {receipt && (
                    <ReservationReceipt
                      receipt={receipt}
                      onDismiss={() => dismissReceipt(item.id)}
                      onUndone={() =>
                        undoReceipt(item.id, receipt.reservationId)
                      }
                    />
                  )}

                  {isReserving && reservingItem && (
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
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Mobile decluttered list (10a) */}
      <div className="md:hidden">
        <MobileResourcesList
          items={items}
          areaNames={areaNames}
          reservations={reservations}
          receipts={receipts}
          onDismissReceipt={dismissReceipt}
          onReceiptUndone={undoReceipt}
          onReserve={(id) => openReserve(id, true)}
          wishlistNameRef={wishlistNameRef}
        />
      </div>

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

      <WishlistSection initial={itemRequests} nameInputRef={wishlistNameRef} />

      <SiteFooter />
    </div>
  );
}
