"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  cancelSpaceBooking,
  confirmSpaceBooking,
  declineSpaceBooking,
} from "@/app/admin/actions";
import { bookingKey } from "@/lib/inventory";
import type { SpaceBooking } from "@/lib/types";

type SpaceBookingsPanelProps = {
  bookings: SpaceBooking[];
  onDone: (msg: string) => void;
};

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const MON = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

function parseIso(iso: string) {
  return new Date(`${iso}T00:00:00`);
}

function formatRequested(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function SpaceBookingsPanel({
  bookings,
  onDone,
}: SpaceBookingsPanelProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const pendingReqs = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "pending")
        .sort(
          (a, b) =>
            a.booking_date.localeCompare(b.booking_date) ||
            a.period - b.period,
        ),
    [bookings],
  );

  const upcoming = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "confirmed")
        .sort(
          (a, b) =>
            a.booking_date.localeCompare(b.booking_date) ||
            a.period - b.period,
        ),
    [bookings],
  );

  const confirmedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) {
      if (b.status === "confirmed") {
        set.add(bookingKey(b.booking_date, b.period));
      }
    }
    return set;
  }, [bookings]);

  const overlapLabel = (b: SpaceBooking) => {
    if (!confirmedKeys.has(bookingKey(b.booking_date, b.period))) return null;
    const other = bookings.find(
      (x) =>
        x.status === "confirmed" &&
        x.booking_date === b.booking_date &&
        x.period === b.period,
    );
    if (!other) return null;
    const short =
      other.teacher_name.split(/[—–-]/)[0]?.trim() || other.teacher_name;
    return `⚠ Overlaps ${short} · P${b.period}`;
  };

  if (pendingReqs.length === 0 && upcoming.length === 0) {
    return (
      <div className="no-print page-gutter mb-11 text-[14.5px] text-[#6d6759]">
        No space requests yet — teacher requests from the{" "}
        <Link href="/schedule" className="underline hover:text-[#c8102e]">
          Schedule page
        </Link>{" "}
        will appear here.
      </div>
    );
  }

  return (
    <div className="no-print page-gutter mb-11">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            Booking requests
          </h2>
          {pendingReqs.length > 0 && (
            <span className="rounded-full bg-[#c8102e] px-2 py-0.5 font-mono text-[10px] tracking-wide text-white">
              {pendingReqs.length} AWAITING
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] text-[#8f731c]">
          FROM THE SCHEDULE PAGE
        </span>
      </div>

      {pendingReqs.map((b) => {
        const d = parseIso(b.booking_date);
        const overlap = overlapLabel(b);
        return (
          <div
            key={b.id}
            className="flex flex-wrap items-center gap-3.5 py-3"
          >
            <div className="w-[52px] shrink-0 text-center">
              <div className="font-mono text-[9.5px] tracking-wide text-[#6d6759]">
                {DOW[d.getDay()]}
              </div>
              <div className="text-[16px] font-semibold leading-tight">
                {d.getDate()}
              </div>
              <div className="font-mono text-[9px] text-[#857e6e]">
                {MON[d.getMonth()]}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{b.teacher_name}</div>
              <div className="mt-0.5 text-[13px] text-[#6d6759]">
                Period {b.period} · requested {formatRequested(b.created_at)}
                {b.purpose ? ` · ${b.purpose}` : ""}
              </div>
              {overlap && (
                <div className="mt-1 font-mono text-[9px] tracking-wide text-[#c8102e]">
                  {overlap}
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError("");
                    const result = await confirmSpaceBooking(b.id);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    onDone(`Confirmed ${b.teacher_name}`);
                  })
                }
                className="bg-[#141414] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#2f9e44]"
              >
                Confirm ✓
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError("");
                    const reason =
                      typeof window !== "undefined"
                        ? window.prompt(
                            "Optional decline reason (shown to the teacher):",
                          )
                        : null;
                    if (reason === null) return;
                    const result = await declineSpaceBooking(b.id, reason);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    onDone(`Declined ${b.teacher_name}`);
                  })
                }
                className="border border-[#e3e0d8] px-3.5 py-2 text-[13.5px] font-semibold text-[#3f3b33] transition-colors hover:border-[#c8102e] hover:text-[#c8102e]"
              >
                Decline
              </button>
            </div>
          </div>
        );
      })}

      {upcoming.length > 0 && (
        <div className="pt-2">
          <div className="mb-1 font-mono text-[10px] tracking-[0.16em] text-[#857e6e]">
            UPCOMING · CONFIRMED
          </div>
          {upcoming.map((b) => {
            const d = parseIso(b.booking_date);
            return (
              <div
                key={b.id}
                className="flex flex-wrap items-center gap-2.5 py-1.5 text-[14px]"
              >
                <span className="shrink-0 rounded-full border border-[#2f9e44] px-2 py-0.5 font-mono text-[10px] tracking-wide text-[#2f9e44]">
                  CONFIRMED
                </span>
                <span className="text-[#3f3b33]">
                  <span className="font-semibold">{b.teacher_name}</span>
                  {" · "}
                  {DOW[d.getDay()]} {d.getDate()} {MON[d.getMonth()]} · Period{" "}
                  {b.period}
                </span>
                <span className="flex-1" />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setError("");
                      const result = await cancelSpaceBooking(b.id);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      onDone(`Cancelled ${b.teacher_name}`);
                    })
                  }
                  className="text-[13px] text-[#857e6e] underline hover:text-[#c8102e]"
                >
                  Cancel
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="pt-3 text-[13px] text-[#6d6759]">
        Confirming turns the slot solid on the public Schedule page and notifies
        the teacher in the app. Declining frees the slot.
      </p>
      {error && <p className="pt-2 text-[14px] text-[#c8102e]">{error}</p>}
    </div>
  );
}
