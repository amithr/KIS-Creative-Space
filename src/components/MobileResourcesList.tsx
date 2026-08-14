"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { areaPillColors, stockBarColor } from "@/lib/area-styles";
import { isNewItem, stockStatus } from "@/lib/inventory";
import {
  dueBackLabel,
  itemHasNearTermAvailability,
  outLoansForItem,
} from "@/lib/reservation-availability";
import type { Equipment, Reservation } from "@/lib/types";
import {
  ReservationReceipt,
  type ReceiptState,
} from "@/components/ReservePanel";
import { scrollToWishlist } from "@/components/WishlistSection";

/** Approximate sticky site header height on mobile (bar + stripe). */
const HEADER_OFFSET = 57;

export function areaChipLabel(area: string): string {
  const t = area.trim();
  if (/^3d\b/i.test(t)) return "3D…";
  const first = t.split(/[\s&]+/)[0];
  return first || t;
}

export function areaSectionId(area: string): string {
  return `area-${area.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function mobileStatusDot(item: Equipment): string {
  if (item.in_space_only) return "#141414";
  const ratio =
    item.quantity_total > 0
      ? item.quantity_available / item.quantity_total
      : 0;
  if (item.quantity_available <= 0 || ratio <= 0.25) return "#e0a010";
  return "#2f9e44";
}

function loanSheetNote(loan: Reservation): string {
  const qty = loan.out_qty || loan.qty;
  const due = dueBackLabel(loan).split(" ")[0]?.toUpperCase() || "";
  return `${qty} OUT WITH ${loan.name.toUpperCase()}${due ? ` · DUE ${due}` : ""}`;
}

type MobileResourcesListProps = {
  items: Equipment[];
  areaNames: string[];
  reservations: Reservation[];
  receipts: Record<string, ReceiptState>;
  onDismissReceipt: (id: string) => void;
  onReceiptUndone: (id: string, reservationId: string) => void;
  onReserve: (id: string) => void;
  wishlistNameRef: RefObject<HTMLInputElement | null>;
};

export function MobileResourcesList({
  items,
  areaNames,
  reservations,
  receipts,
  onDismissReceipt,
  onReceiptUndone,
  onReserve,
  wishlistNameRef,
}: MobileResourcesListProps) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeArea, setActiveArea] = useState<string>("All");
  const [sheetId, setSheetId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const jumpingRef = useRef(false);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((d) =>
      `${d.name} ${d.detail} ${d.area}`.toLowerCase().includes(q),
    );
  }, [items, q]);

  const areasWithItems = useMemo(() => {
    const used = new Set(filtered.map((d) => d.area));
    return areaNames.filter((a) => used.has(a));
  }, [areaNames, filtered]);

  const groups = useMemo(() => {
    return areasWithItems.map((area) => ({
      area,
      items: filtered.filter((d) => d.area === area),
    }));
  }, [areasWithItems, filtered]);

  const sheetItem = useMemo(
    () => (sheetId ? (items.find((i) => i.id === sheetId) ?? null) : null),
    [items, sheetId],
  );

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!sheetId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetId]);

  const scrollToArea = useCallback((area: string) => {
    jumpingRef.current = true;
    setActiveArea(area);
    const chipsH = chipsRef.current?.offsetHeight ?? 44;
    if (area === "All") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = document.getElementById(areaSectionId(area));
      if (el) {
        const top =
          el.getBoundingClientRect().top +
          window.scrollY -
          HEADER_OFFSET -
          chipsH -
          8;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
    }
    window.setTimeout(() => {
      jumpingRef.current = false;
    }, 600);
  }, []);

  useEffect(() => {
    const sections = areasWithItems
      .map((area) => document.getElementById(areaSectionId(area)))
      .filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const chipsH = chipsRef.current?.offsetHeight ?? 44;
    const observer = new IntersectionObserver(
      (entries) => {
        if (jumpingRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]?.target) {
          const id = visible[0].target.id;
          const area = areasWithItems.find((a) => areaSectionId(a) === id);
          if (area) setActiveArea(area);
        }
      },
      {
        rootMargin: `-${HEADER_OFFSET + chipsH + 4}px 0px -55% 0px`,
        threshold: [0, 0.1, 0.5],
      },
    );

    for (const el of sections) observer.observe(el);

    function onScroll() {
      if (jumpingRef.current) return;
      if (window.scrollY < 40) setActiveArea("All");
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [areasWithItems]);

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  function openSheet(id: string) {
    setSheetId(id);
  }

  function closeSheet() {
    setSheetId(null);
  }

  function startReserve(id: string) {
    closeSheet();
    onReserve(id);
  }

  return (
    <>
      <div className="page-gutter flex items-center justify-between gap-3 pt-5 pb-0">
        {searchOpen ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[#141414] py-1.5 pr-2 pl-3.5">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
            />
            <button
              type="button"
              onClick={closeSearch}
              className="shrink-0 px-1.5 text-[16px] text-[#857e6e]"
              aria-label="Close search"
            >
              ×
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-[21px] font-semibold tracking-[-0.01em]">
              What&apos;s available
            </h1>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-[#e3e0d8] text-[15px] text-[#6d6759]"
              aria-label="Search resources"
            >
              ⌕
            </button>
          </>
        )}
      </div>

      <div
        ref={chipsRef}
        className="sticky z-30 border-b border-[#141414] bg-white"
        style={{ top: HEADER_OFFSET }}
      >
        <div className="page-gutter flex gap-1.5 overflow-x-auto py-2.5">
          <JumpChip
            label="All"
            active={activeArea === "All"}
            onClick={() => scrollToArea("All")}
          />
          {areasWithItems.map((area) => (
            <JumpChip
              key={area}
              label={areaChipLabel(area)}
              active={activeArea === area}
              onClick={() => scrollToArea(area)}
            />
          ))}
        </div>
      </div>

      <section className="page-gutter mb-2">
        {groups.length === 0 ? (
          <p className="py-10 text-[14px] text-[#6d6759]">No items match.</p>
        ) : (
          groups.map((group, gi) => (
            <div key={group.area} id={areaSectionId(group.area)}>
              <div
                className={`flex items-baseline justify-between pb-1.5 ${
                  gi === 0
                    ? "pt-4"
                    : "mt-0 border-t border-[#141414] pt-3.5"
                }`}
              >
                <span className="font-mono text-[10px] tracking-[0.16em] text-[#857e6e] uppercase">
                  {group.area}
                </span>
                <span className="font-mono text-[10px] text-[#b6b0a3]">
                  {group.items.length}
                </span>
              </div>
              {group.items.map((item, i) => {
                const isNew = isNewItem(item);
                const receipt = receipts[item.id];
                const isLast = i === group.items.length - 1;
                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => openSheet(item.id)}
                      className={`flex min-h-11 w-full items-center gap-2.5 py-3 text-left ${
                        isLast ? "" : "border-b border-[#eeece5]"
                      }`}
                    >
                      <span
                        className="h-[7px] w-[7px] shrink-0 rounded-full"
                        style={{ background: mobileStatusDot(item) }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                        {item.name}
                        {isNew && (
                          <span className="ml-1.5 text-[9px] font-bold tracking-[0.06em] text-[#c8102e]">
                            NEW
                          </span>
                        )}
                        {item.in_space_only && (
                          <span className="ml-1.5 font-mono text-[8px] tracking-[0.06em] text-[#6d6759]">
                            IN-SPACE
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-[12.5px]">
                        {item.quantity_available}
                        <span className="text-[#b6b0a3]">
                          /{item.quantity_total}
                        </span>
                      </span>
                      <span className="shrink-0 text-[15px] text-[#b6b0a3]">
                        ›
                      </span>
                    </button>
                    {receipt && (
                      <ReservationReceipt
                        receipt={receipt}
                        onDismiss={() => onDismissReceipt(item.id)}
                        onUndone={() =>
                          onReceiptUndone(item.id, receipt.reservationId)
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </section>

      <div className="page-gutter mb-6 flex items-center justify-between border-t border-[#e3e0d8] pt-3 pb-2">
        <button
          type="button"
          onClick={() => scrollToWishlist(wishlistNameRef.current)}
          className="text-[12.5px] text-[#6d6759] underline"
        >
          Request an item
        </button>
        <Link
          href="/schedule"
          className="text-[13px] font-semibold text-[#141414] hover:text-[#141414]"
        >
          Schedule the space →
        </Link>
      </div>

      {sheetItem && (
        <MobileItemSheet
          item={sheetItem}
          reservations={reservations}
          onClose={closeSheet}
          onReserve={() => startReserve(sheetItem.id)}
        />
      )}
    </>
  );
}

function JumpChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="kis-press shrink-0 rounded-full px-[13px] py-1.5 text-[12px] font-semibold"
      style={{
        background: active ? "#141414" : "#fff",
        color: active ? "#fff" : "#3f3b33",
        border: `1px solid ${active ? "#141414" : "#e3e0d8"}`,
      }}
    >
      {label}
    </button>
  );
}

function MobileItemSheet({
  item,
  reservations,
  onClose,
  onReserve,
}: {
  item: Equipment;
  reservations: Reservation[];
  onClose: () => void;
  onReserve: () => void;
}) {
  const status = stockStatus(item.quantity_available, item.quantity_total);
  const isNew = isNewItem(item);
  const pill = areaPillColors(item.area);
  const canReserve = itemHasNearTermAvailability(item, reservations);
  const loans = outLoansForItem(reservations, item.id);
  const fillPct =
    item.quantity_total > 0
      ? Math.min(100, (item.quantity_available / item.quantity_total) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-[rgba(20,20,20,0.45)]"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 kis-confirm-pop rounded-t-[20px] bg-white px-5 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(20,20,20,0.18)]">
        <div className="mx-auto mb-3.5 h-1 w-9 rounded-full bg-[#e3e0d8]" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[18px] font-semibold">
              {item.name}
              {isNew && (
                <span className="ml-1.5 text-[9px] font-bold tracking-[0.06em] text-[#c8102e]">
                  NEW
                </span>
              )}
            </p>
            {item.detail && (
              <p className="mt-0.5 text-[13px] text-[#6d6759]">{item.detail}</p>
            )}
          </div>
          <span
            className="shrink-0 rounded-full px-[11px] py-1 text-[10.5px] font-semibold"
            style={{ background: pill.bg, color: pill.fg }}
          >
            {item.area}
          </span>
        </div>

        <div className="mt-3.5 flex items-center gap-2.5">
          <span className="shrink-0 font-mono text-[13px]">
            {item.quantity_available}
            <span className="text-[#b6b0a3]">/{item.quantity_total}</span>{" "}
            available
          </span>
          <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[#eeece5]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${fillPct}%`,
                background: stockBarColor(status),
              }}
            />
          </div>
        </div>

        {loans.map((loan) => (
          <p
            key={loan.id}
            className="mt-2 font-mono text-[10px] text-[#9a6e06]"
          >
            {loanSheetNote(loan)}
          </p>
        ))}

        <div className="mt-4 flex gap-2">
          {item.in_space_only ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="select-none rounded-full border border-dashed border-[#d5d1c8] px-3 py-3 text-center text-[13px] text-[#6d6759]">
                Use in the space
              </div>
              <p className="text-center text-[11.5px] text-[#8a857a]">
                <Link href="/schedule" className="underline">
                  Book the space
                </Link>{" "}
                to use it during your period.
              </p>
            </div>
          ) : canReserve ? (
            <button
              type="button"
              onClick={onReserve}
              className="kis-press flex-1 rounded-full bg-[#c8102e] py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#a50d26]"
            >
              Reserve
            </button>
          ) : (
            <span className="flex flex-1 items-center justify-center text-[14px] text-[#98917f]">
              Not available soon
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="kis-press shrink-0 rounded-full border border-[#e3e0d8] px-5 py-3 text-[14px] font-semibold text-[#3f3b33]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
