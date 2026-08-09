"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import type { Equipment, Reservation } from "@/lib/types";
import { SiteFooter } from "@/components/SiteFooter";
import {
  OutStatusBand,
  ReservationReceipt,
  ReservePanel,
  type ReceiptState,
} from "@/components/ReservePanel";

type ResourcesClientProps = {
  equipment: Equipment[];
  reservations: Reservation[];
};

export function ResourcesClient({
  equipment: initial,
  reservations: initialReservations,
}: ResourcesClientProps) {
  const [items] = useState(initial);
  const [reservations, setReservations] = useState(initialReservations);
  const [cat, setCat] = useState<(typeof AREA_FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Record<string, ReceiptState>>({});
  const [isMobileReserve, setIsMobileReserve] = useState(false);

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
      <section className="page-gutter flex flex-wrap items-end justify-between gap-4 pb-8 pt-[48px] md:pb-8">
        <div>
          <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-[#6d6759]">
            РЕСУРСИ · RESOURCES
          </p>
          <h1 className="font-display text-[46px] font-normal leading-[1.05] tracking-[-0.02em]">
            What&apos;s available right now
          </h1>
          <span className="kis-title-underline" />
        </div>
        <p className="pb-1 font-mono text-[12px] tracking-[0.14em] text-[#6d6759]">
          UPDATED {formatUpdatedLabel()}
        </p>
      </section>

      <section className="page-gutter mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="order-2 flex gap-2 overflow-x-auto pb-1 md:order-1">
          {AREA_FILTERS.map((c) => {
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
                  color: active ? "#fff" : isNew ? "#c8102e" : "#3f3b33",
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

        <div className="order-1 relative md:order-2">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6d6759] md:hidden">
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-full border border-[#e3e0d8] bg-[#faf9f6] py-2 pl-9 pr-3.5 text-[14.5px] outline-none focus:border-[#141414] md:w-[180px] md:bg-transparent md:pl-3.5"
          />
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
                      {isReserving ? (
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
                    className={`kis-row border-b border-[#eeece5] py-[17px] md:hidden ${rowFlash}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[18px] font-semibold">
                            {item.name}
                          </span>
                          {isNew && (
                            <span className="rounded-full bg-[#c8102e] px-[7px] py-0.5 font-mono text-[9px] text-white">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[14.5px] text-[#6d6759]">
                          <span
                            className={`h-[7px] w-[7px] rounded-full ${
                              status === "Low stock" || status === "Unavailable"
                                ? "kis-pulse"
                                : ""
                            }`}
                            style={{ background: statusDotColor(status) }}
                          />
                          <span
                            className="inline-block rounded-full px-3 py-1 text-[13px] font-semibold"
                            style={{ background: pill.bg, color: pill.fg }}
                          >
                            {item.area}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <div className="text-right">
                          <span className="font-mono text-[14.5px] text-[#6d6759]">
                            {item.quantity_available} / {item.quantity_total}
                          </span>
                          <div className="mt-1.5 ml-auto h-1 w-16 overflow-hidden rounded-full bg-[#eeece5]">
                            <div
                              className="h-full rounded-full transition-[width] duration-500"
                              style={{
                                width: `${fillPct}%`,
                                background: stockBarColor(status),
                              }}
                            />
                          </div>
                        </div>
                        {canReserve && (
                          <button
                            type="button"
                            onClick={() => openReserve(item.id, true)}
                            className="kis-press border border-[#141414] bg-white px-4 py-[7px] text-[14px] font-semibold"
                          >
                            Reserve
                          </button>
                        )}
                      </div>
                    </div>
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

      <div className="page-gutter sticky bottom-4 z-20 pb-6 md:hidden">
        <Link
          href="/schedule"
          className="kis-press block w-full rounded-full bg-[#141414] py-3.5 text-center text-[14.5px] font-semibold text-white shadow-none hover:text-white"
        >
          Schedule the space
        </Link>
      </div>

      <SiteFooter />
    </div>
  );
}
