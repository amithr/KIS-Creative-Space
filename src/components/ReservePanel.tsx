"use client";

import { useMemo, useState, useTransition } from "react";
import {
  cancelReservation,
  createReservation,
} from "@/app/actions/public";
import { toISODate } from "@/lib/inventory";
import {
  dueBackLabel,
  formatDaysSummary,
  formatPeriodLabel,
  isPeriodDisabled,
  nextSchoolDays,
  qtyCapForSelection,
  type PeriodSelection,
} from "@/lib/reservation-availability";
import type { Equipment, Reservation } from "@/lib/types";

export type ReceiptState = {
  reservationId: string;
  qty: number;
  name: string;
  days: string[];
  periods: PeriodSelection;
  itemName: string;
};

type ReservePanelProps = {
  item: Equipment;
  reservations: Reservation[];
  variant: "inline" | "sheet";
  onClose: () => void;
  onConfirmed: (receipt: ReceiptState) => void;
};

function normalizeRange(
  a: number | null,
  b: number | null,
): PeriodSelection {
  if (a == null || b == null) return "all";
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

export function ReservePanel({
  item,
  reservations,
  variant,
  onClose,
  onConfirmed,
}: ReservePanelProps) {
  const schoolDays = useMemo(() => nextSchoolDays(5), []);
  const [qty, setQty] = useState(1);
  const [selectedDays, setSelectedDays] = useState<string[]>(() => [
    toISODate(schoolDays[0]),
  ]);
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);
  const [periods, setPeriods] = useState<PeriodSelection>("all");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const cap = qtyCapForSelection(
    item.quantity_available,
    selectedDays,
    periods,
    reservations,
    item.id,
  );
  const effectiveQty = Math.min(qty, Math.max(cap, 1));
  const canConfirm =
    name.trim().length > 0 && selectedDays.length > 0 && cap >= 1 && effectiveQty <= cap;

  const summary = `${effectiveQty} × ${item.name} · ${formatDaysSummary(selectedDays)} · ${formatPeriodLabel(periods)}`;

  function toggleDay(iso: string) {
    setSelectedDays((prev) => {
      if (prev.includes(iso)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== iso);
      }
      return [...prev, iso].sort();
    });
  }

  function selectPeriod(p: number) {
    if (isPeriodDisabled(item.quantity_available, selectedDays, p, reservations, item.id)) {
      return;
    }
    if (periods === "all") {
      setPeriods({ start: p, end: p });
      setRangeAnchor(p);
      return;
    }
    if (rangeAnchor == null) {
      setPeriods({ start: p, end: p });
      setRangeAnchor(p);
      return;
    }
    setPeriods(normalizeRange(rangeAnchor, p));
    setRangeAnchor(null);
  }

  function selectAllDay() {
    setPeriods("all");
    setRangeAnchor(null);
  }

  function adjustQty(delta: number) {
    setQty((q) => Math.max(1, Math.min(cap || 1, q + delta)));
  }

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] text-[#6d6759]">
            HOW MANY
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustQty(-1)}
              className="flex h-[38px] w-[38px] items-center justify-center border border-[#141414] text-[16px]"
            >
              −
            </button>
            <span className="w-10 text-center font-mono text-[17px]">
              {effectiveQty}
            </span>
            <button
              type="button"
              onClick={() => adjustQty(1)}
              disabled={effectiveQty >= cap}
              className="flex h-[38px] w-[38px] items-center justify-center bg-[#141414] text-[16px] text-white disabled:opacity-40"
            >
              +
            </button>
          </div>
          <p className="mt-2 text-[12px] text-[#6d6759]">
            {cap} free for this selection
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.16em] text-[#6d6759]">
            WHICH DAYS
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {schoolDays.map((d) => {
              const iso = toISODate(d);
              const active = selectedDays.includes(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => toggleDay(iso)}
                  className={`flex w-[52px] flex-col items-center rounded-none px-1 py-2 font-mono text-[10px] ${
                    active
                      ? "bg-[#141414] text-white"
                      : "border border-[#e3e0d8] text-[#3f3b33]"
                  }`}
                >
                  <span>
                    {d
                      .toLocaleDateString("en-GB", { weekday: "short" })
                      .toUpperCase()}
                  </span>
                  <span className="mt-0.5 text-[12px] font-semibold">
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="font-mono text-[10px] tracking-[0.16em] text-[#6d6759]">
          WHICH PERIODS
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllDay}
            className={`h-[38px] px-3 font-mono text-[11px] ${
              periods === "all"
                ? "bg-[#c8102e] text-white"
                : "border border-[#e3e0d8] text-[#3f3b33]"
            }`}
          >
            All day
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => {
            const disabled = isPeriodDisabled(
              item.quantity_available,
              selectedDays,
              p,
              reservations,
              item.id,
            );
            const selected =
              periods !== "all" && p >= periods.start && p <= periods.end;
            return (
              <button
                key={p}
                type="button"
                disabled={disabled}
                onClick={() => selectPeriod(p)}
                className={`h-[38px] w-10 font-mono text-[11px] ${
                  disabled
                    ? "cursor-not-allowed bg-[#f4f2ec] text-[#c9c3b5]"
                    : selected
                      ? "bg-[#c8102e] text-white"
                      : "border border-[#e3e0d8] text-[#3f3b33]"
                }`}
              >
                P{p}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name and class (e.g. Ms. Bondar, 7B)"
          className="w-full border border-[#e3e0d8] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#141414]"
        />
      </div>

      {error && <p className="mt-3 text-[13px] text-[#c8102e]">{error}</p>}

      <div
        className={`mt-5 flex flex-col gap-3 ${
          variant === "inline" ? "md:flex-row md:items-center md:justify-between" : ""
        }`}
      >
        {variant === "inline" && (
          <p className="text-[13px] text-[#3f3b33]">
            <span className="font-semibold">
              {effectiveQty} × {item.name}
            </span>
            {" · "}
            {formatDaysSummary(selectedDays)} · {formatPeriodLabel(periods)}
          </p>
        )}
        <button
          type="button"
          disabled={!canConfirm || pending}
          onClick={() =>
            startTransition(async () => {
              setError("");
              const result = await createReservation({
                equipmentId: item.id,
                qty: effectiveQty,
                by: name,
                days: selectedDays,
                periods,
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onConfirmed({
                reservationId: result.reservationId ?? "",
                qty: effectiveQty,
                name: name.trim(),
                days: selectedDays,
                periods,
                itemName: item.name,
              });
            })
          }
          className={`bg-[#c8102e] px-5 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#a50d26] disabled:bg-[#d5d1c8] disabled:text-white ${
            variant === "sheet" ? "w-full rounded-full" : ""
          }`}
        >
          {variant === "sheet"
            ? `Reserve ${effectiveQty} · ${formatDaysSummary(selectedDays)} · ${formatPeriodLabel(periods)}`
            : "Confirm"}
        </button>
      </div>
    </>
  );

  if (variant === "sheet") {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />
        <div className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-[22px] bg-white px-5 pb-8 pt-3">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#d5d1c8]" />
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">{item.name}</h2>
            <button type="button" onClick={onClose} className="text-[13px] text-[#6d6759]">
              Cancel ×
            </button>
          </div>
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-[#141414] bg-[#f7f7f5] px-4 py-5 md:px-6">
      <div className="mb-4 flex justify-end md:hidden">
        <button type="button" onClick={onClose} className="text-[12.5px] font-semibold">
          Cancel ×
        </button>
      </div>
      {body}
      <p className="mt-2 hidden text-[12px] text-[#98917f] md:block">{summary}</p>
    </div>
  );
}

export function ReservationReceipt({
  receipt,
  onDismiss,
  onUndone,
}: {
  receipt: ReceiptState;
  onDismiss: () => void;
  onUndone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-3 border border-[#2f9e44] bg-[#f4faf5] px-4 py-3 text-[13px]">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2f9e44] text-[12px] text-white">
        ✓
      </span>
      <p className="min-w-0 flex-1 text-[#3f3b33]">
        Reserved. {receipt.qty} × {receipt.itemName} ·{" "}
        {formatDaysSummary(receipt.days)} · {formatPeriodLabel(receipt.periods)} ·{" "}
        {receipt.name}. Pick up at the space before P1.
      </p>
      {error && <span className="text-[#c8102e]">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError("");
            const result = await cancelReservation(receipt.reservationId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            onUndone();
          })
        }
        className="text-[12.5px] font-semibold underline"
      >
        Undo
      </button>
      <button type="button" onClick={onDismiss} className="text-[14px] text-[#6d6759]">
        ×
      </button>
    </div>
  );
}

export function OutStatusBand({ loan }: { loan: Reservation }) {
  const stamp = loan.out_at
    ? new Date(loan.out_at).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="flex flex-wrap items-center gap-3 border border-[#e0a010] bg-[#fdf8ec] px-4 py-2.5 text-[12.5px]">
      <span className="rounded-full bg-[#e0a010] px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-white">
        {loan.out_qty || loan.qty} OUT
      </span>
      <span className="text-[#3f3b33]">
        Checked out to {loan.name} · due back {dueBackLabel(loan)}
      </span>
      {stamp && (
        <span className="ml-auto font-mono text-[9.5px] tracking-[0.12em] text-[#6d6759]">
          UPDATED FROM APP · {stamp}
        </span>
      )}
    </div>
  );
}
