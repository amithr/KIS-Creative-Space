"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AREA_FILTERS } from "@/lib/constants";
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
import type { Equipment, Reservation, TelegramPost } from "@/lib/types";
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
  showTelegram: boolean;
  telegramPosts: TelegramPost[];
  telegramUrl: string | null;
  telegramHandle: string;
};

export function ResourcesClient({
  equipment: initial,
  reservations: initialReservations,
  showTelegram,
  telegramPosts,
  telegramUrl,
  telegramHandle,
}: ResourcesClientProps) {
  const [items] = useState(initial);
  const [reservations, setReservations] = useState(initialReservations);
  const [cat, setCat] = useState<(typeof AREA_FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Record<string, ReceiptState>>({});
  const [tgIndex, setTgIndex] = useState(0);
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
      {showTelegram && (
        <section className="page-gutter border-b border-[#e3e0d8] pb-[30px] pt-[26px]">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <span className="block h-[7px] w-[7px] rounded-full bg-[#c8102e]" />
              <span className="font-mono text-[11px] tracking-[0.2em] text-[#6d6759]">
                TELEGRAM FEED
              </span>
            </div>
            {telegramUrl ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[#6d6759] hover:text-[#c8102e]"
              >
                {telegramHandle} →
              </a>
            ) : (
              <span className="text-[12px] text-[#6d6759]">{telegramHandle} →</span>
            )}
          </div>

          <div className="hidden gap-4 md:flex">
            {telegramPosts.map((post) => (
              <div
                key={`${post.time}-${post.text.slice(0, 20)}`}
                className="flex-1 border border-[#e3e0d8] px-[18px] py-4 transition-colors hover:border-[#141414]"
              >
                <p className="text-[14px] leading-[1.6]">{post.text}</p>
                <p className="mt-2.5 font-mono text-[10px] text-[#6d6759]">
                  {post.time}
                </p>
              </div>
            ))}
          </div>

          <div className="md:hidden">
            <div className="border border-[#e3e0d8] px-[18px] py-4">
              <p className="text-[14px] leading-[1.6]">
                {telegramPosts[tgIndex]?.text}
              </p>
              <p className="mt-2.5 font-mono text-[10px] text-[#6d6759]">
                {telegramPosts[tgIndex]?.time}
              </p>
            </div>
            <div className="mt-3 flex justify-center gap-2">
              {telegramPosts.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Post ${i + 1}`}
                  onClick={() => setTgIndex(i)}
                  className={`h-1.5 w-1.5 rounded-full ${i === tgIndex ? "bg-[#141414]" : "bg-[#d8d4c9]"}`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="page-gutter flex flex-wrap items-end justify-between gap-4 pb-8 pt-[48px] md:pb-8">
        <div>
          <p className="mb-3 font-mono text-[11px] tracking-[0.2em] text-[#6d6759]">
            РЕСУРСИ · RESOURCES
          </p>
          <h1 className="font-display text-[34px] font-normal tracking-[-0.02em] md:text-[42px]">
            What&apos;s available right now
          </h1>
        </div>
        <p className="pb-1 font-mono text-[11px] tracking-[0.14em] text-[#6d6759]">
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
                className="shrink-0 rounded-full px-[15px] py-2 text-[13px] transition-colors"
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
            className="w-full rounded-full border border-[#e3e0d8] bg-[#faf9f6] py-2 pl-9 pr-3.5 text-[13px] outline-none focus:border-[#141414] md:w-[180px] md:bg-transparent md:pl-3.5"
          />
        </div>
      </section>

      <section className="page-gutter mb-10">
        <div className="border-t border-[#141414]">
          <div className="hidden grid-cols-[44px_2.2fr_1.1fr_100px_120px_120px] gap-4 border-b border-[#eeece5] py-3 font-mono text-[10px] tracking-[0.16em] text-[#6d6759] md:grid">
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

              return (
                <div key={item.id}>
                  <div className="hidden grid-cols-[44px_2.2fr_1.1fr_100px_120px_120px] items-center gap-4 border-b border-[#eeece5] py-4 transition-colors hover:bg-[#f7f7f5] md:grid">
                    <span className="font-mono text-[11px] text-[#c8b9a0]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[16px] font-semibold">{item.name}</span>
                        {isNew && (
                          <span className="rounded-full bg-[#c8102e] px-[7px] py-0.5 font-mono text-[9px] tracking-wide text-white">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] leading-[1.5] text-[#6d6759]">
                        {item.detail}
                      </p>
                    </div>
                    <span className="text-[13.5px] text-[#3f3b33]">
                      {item.area}
                    </span>
                    <span className="font-mono text-[13px]">
                      {item.quantity_available}
                      <span className="text-[#98917f]">
                        /{item.quantity_total}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-[12px]">
                      <span
                        className="h-[7px] w-[7px] rounded-full"
                        style={{ background: statusDotColor(status) }}
                      />
                      {status}
                    </span>
                    <div>
                      {isReserving ? (
                        <button
                          type="button"
                          onClick={closeReserve}
                          className="w-full border border-[#141414] py-[7px] text-[12.5px] font-semibold"
                        >
                          Cancel ×
                        </button>
                      ) : canReserve ? (
                        <button
                          type="button"
                          onClick={() => openReserve(item.id, false)}
                          className="w-full border border-[#141414] py-[7px] text-[12.5px] font-semibold transition-colors hover:bg-[#141414] hover:text-white"
                        >
                          Reserve
                        </button>
                      ) : (
                        <span className="block text-center text-[12.5px] text-[#98917f]">
                          —
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-b border-[#eeece5] py-4 md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[16px] font-semibold">
                            {item.name}
                          </span>
                          {isNew && (
                            <span className="rounded-full bg-[#c8102e] px-[7px] py-0.5 font-mono text-[9px] text-white">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[12px] text-[#6d6759]">
                          <span
                            className="h-[7px] w-[7px] rounded-full"
                            style={{ background: statusDotColor(status) }}
                          />
                          {item.area}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="font-mono text-[13px] text-[#6d6759]">
                          {item.quantity_available} / {item.quantity_total}
                        </span>
                        {canReserve && (
                          <button
                            type="button"
                            onClick={() => openReserve(item.id, true)}
                            className="border border-[#141414] bg-white px-4 py-[7px] text-[12.5px] font-semibold"
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
          className="block w-full rounded-full bg-[#141414] py-3.5 text-center text-[14px] font-medium text-white shadow-none hover:text-white"
        >
          Schedule the space
        </Link>
      </div>

      <SiteFooter />
    </div>
  );
}
