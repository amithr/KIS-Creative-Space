"use client";

import { useMemo, useState, useTransition } from "react";
import {
  cancelPeriodBooking,
  createPeriodBooking,
} from "@/app/actions/public";
import { SiteFooter } from "@/components/SiteFooter";
import {
  bookingKey,
  formatDayShort,
  isBookableDate,
  mondayOfWeek,
  startOfDay,
  toISODate,
} from "@/lib/inventory";
import { findBlock } from "@/lib/space-blocks";
import type { SpaceBlock, SpaceBooking } from "@/lib/types";

const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI"] as const;
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const BLOCKED_BG =
  "repeating-linear-gradient(45deg, #f2f0ea 0, #f2f0ea 6px, #e7e4db 6px, #e7e4db 12px)";

type ScheduleClientProps = {
  initialBookings: SpaceBooking[];
  initialBlocks: SpaceBlock[];
};

type Selection = {
  key: string;
  period: number;
  day: string;
  dateLabel: string;
  iso: string;
  booking?: SpaceBooking;
};

/** Prefer confirmed over pending when both occupy a slot. */
function pickDisplayBooking(list: SpaceBooking[]): SpaceBooking | undefined {
  const confirmed = list.find((b) => b.status === "confirmed");
  if (confirmed) return confirmed;
  return list.find((b) => b.status === "pending");
}

export function ScheduleClient({
  initialBookings,
  initialBlocks,
}: ScheduleClientProps) {
  const [week, setWeek] = useState(0);
  const [bookings, setBookings] = useState(initialBookings);
  const blocks = initialBlocks;
  const [sel, setSel] = useState<Selection | null>(null);
  const [bookName, setBookName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [mobileDay, setMobileDay] = useState(0);

  const now = startOfDay(new Date());
  const monday = mondayOfWeek(now, week);
  const dates = DAY_NAMES.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const todayIso = toISODate(now);

  const bySlot = useMemo(() => {
    const map = new Map<string, SpaceBooking[]>();
    for (const b of bookings) {
      if (b.status !== "pending" && b.status !== "confirmed") continue;
      const key = bookingKey(b.booking_date, b.period);
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    return map;
  }, [bookings]);

  const cellStyle = (
    booking: SpaceBooking | undefined,
    block: SpaceBlock | undefined,
    ok: boolean,
    isSel: boolean,
  ) => {
    if (booking?.status === "pending") {
      return {
        bg: "#fdf8ec",
        color: "#9a6e06",
        border: isSel ? "#c8102e" : "#e0a010",
        borderStyle: "dashed" as const,
        text: `${booking.teacher_name} · pending`,
        cursor: "pointer" as const,
        clickable: true,
      };
    }
    if (booking?.status === "confirmed") {
      return {
        bg: isSel ? "#c8102e" : "#141414",
        color: "#fff",
        border: isSel ? "#c8102e" : "#141414",
        borderStyle: "solid" as const,
        text: booking.teacher_name,
        cursor: "pointer" as const,
        clickable: true,
      };
    }
    if (!ok) {
      return {
        bg: "#f2f0ea",
        color: "#98917f",
        border: "#f2f0ea",
        borderStyle: "solid" as const,
        text: "",
        cursor: "default" as const,
        clickable: false,
      };
    }
    if (block) {
      return {
        bg: BLOCKED_BG,
        color: "#98917f",
        border: "#e3e0d8",
        borderStyle: "solid" as const,
        text: block.reason,
        cursor: "default" as const,
        clickable: false,
      };
    }
    if (isSel) {
      return {
        bg: "#fff",
        color: "#c8102e",
        border: "#c8102e",
        borderStyle: "solid" as const,
        text: "Selected",
        cursor: "pointer" as const,
        clickable: true,
      };
    }
    return {
      bg: "#fff",
      color: "#98917f",
      border: "#e3e0d8",
      borderStyle: "solid" as const,
      text: "",
      cursor: "pointer" as const,
      clickable: true,
    };
  };

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col">
      <section className="page-gutter flex flex-wrap items-end justify-between gap-6 pb-[26px] pt-11">
        <div>
          <p className="mb-3 font-mono text-[11px] tracking-[0.2em] text-[#6d6759]">
            РОЗКЛАД · SCHEDULE
          </p>
          <h1 className="font-display text-[34px] font-normal tracking-[-0.02em] md:text-[38px]">
            Schedule the space
          </h1>
          <p className="mt-2.5 text-[14.5px] text-[#6d6759]">
            Teachers can request class periods up to one week in advance. The
            Creativity Space team confirms each request — you&apos;ll get a
            notification.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { label: "This week", value: 0 },
            { label: "Next week", value: 1 },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setWeek(t.value);
                setSel(null);
              }}
              className="rounded-full px-4 py-2 text-[12.5px] transition-colors"
              style={{
                background: week === t.value ? "#141414" : "#fff",
                color: week === t.value ? "#fff" : "#3f3b33",
                border: `1px solid ${week === t.value ? "#141414" : "#e3e0d8"}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <div className="page-gutter mb-4 flex gap-2 overflow-x-auto md:hidden">
        {dates.map((d, i) => {
          const iso = toISODate(d);
          const active = mobileDay === i;
          const today = iso === todayIso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => {
                setMobileDay(i);
                setSel(null);
              }}
              className="shrink-0 rounded-full px-3.5 py-2 text-[12px]"
              style={{
                background: active ? "#c8102e" : "#fff",
                color: active ? "#fff" : today ? "#c8102e" : "#3f3b33",
                border: `1px solid ${active ? "#c8102e" : "#e3e0d8"}`,
              }}
            >
              {DAY_NAMES[i]} {formatDayShort(d)}
            </button>
          );
        })}
      </div>

      <div className="page-gutter mb-8 hidden border-t border-[#141414] md:block">
        <div className="grid grid-cols-[90px_repeat(5,1fr)] border-b border-[#e3e0d8]">
          <div className="py-3 font-mono text-[10px] tracking-[0.16em] text-[#6d6759]">
            PERIOD
          </div>
          {dates.map((d, i) => {
            const today = toISODate(d) === todayIso;
            return (
              <div key={toISODate(d)} className="px-1 py-3 text-center">
                <div
                  className="font-mono text-[10px] tracking-[0.16em]"
                  style={{ color: today ? "#c8102e" : "#6d6759" }}
                >
                  {DAY_NAMES[i]}
                </div>
                <div
                  className="mt-1 text-[13px] font-semibold"
                  style={{ color: today ? "#c8102e" : "#141414" }}
                >
                  {formatDayShort(d)}
                </div>
              </div>
            );
          })}
        </div>

        {PERIODS.map((period) => (
          <div
            key={period}
            className="grid grid-cols-[90px_repeat(5,1fr)] border-b border-[#eeece5]"
          >
            <div className="flex items-center font-mono text-[11px] text-[#6d6759]">
              P{period}
            </div>
            {dates.map((d, di) => {
              const iso = toISODate(d);
              const key = bookingKey(iso, period);
              const booking = pickDisplayBooking(bySlot.get(key) ?? []);
              const block = findBlock(blocks, iso, period);
              const ok = isBookableDate(d, now);
              const isSel = sel?.key === key;
              const style = cellStyle(booking, block, ok, isSel);

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!style.clickable}
                  onClick={() => {
                    if (!style.clickable) return;
                    setSel({
                      key,
                      period,
                      day: DAY_NAMES[di],
                      dateLabel: formatDayShort(d),
                      iso,
                      booking,
                    });
                    setBookName("");
                    setError("");
                  }}
                  className="m-1 min-h-[52px] px-1 text-center text-[13px] transition-colors"
                  style={{
                    background: style.bg,
                    color: style.color,
                    border: `1px ${style.borderStyle} ${style.border}`,
                    cursor: style.cursor,
                  }}
                >
                  {style.text}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="page-gutter mb-8 space-y-2 md:hidden">
        {PERIODS.map((period) => {
          const d = dates[mobileDay];
          const iso = toISODate(d);
          const key = bookingKey(iso, period);
          const booking = pickDisplayBooking(bySlot.get(key) ?? []);
          const block = findBlock(blocks, iso, period);
          const ok = isBookableDate(d, now);
          const isSel = sel?.key === key;
          const style = cellStyle(booking, block, ok, isSel);

          return (
            <button
              key={key}
              type="button"
              disabled={!style.clickable}
              onClick={() => {
                if (!style.clickable) return;
                setSel({
                  key,
                  period,
                  day: DAY_NAMES[mobileDay],
                  dateLabel: formatDayShort(d),
                  iso,
                  booking,
                });
                setBookName("");
                setError("");
              }}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[13px]"
              style={{
                background: style.bg,
                color: style.color,
                border: `1px ${style.borderStyle} ${style.border}`,
                opacity: !ok && !booking && !block ? 0.5 : 1,
                cursor: style.cursor,
              }}
            >
              <span className="font-mono text-[11px]">P{period}</span>
              <span>
                {booking || block
                  ? style.text
                  : ok
                    ? isSel
                      ? "Selected"
                      : "Open — tap to request"
                    : "Unavailable"}
              </span>
            </button>
          );
        })}
      </div>

      {sel && (
        <div className="page-gutter mb-8">
          <div className="flex flex-col gap-3 border border-[#141414] px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
            <p className="shrink-0 font-mono text-[11px] tracking-[0.14em] text-[#c8102e]">
              {sel.day} {sel.dateLabel} · PERIOD {sel.period}
            </p>
            {sel.booking ? (
              <>
                <span
                  className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wide"
                  style={{
                    color:
                      sel.booking.status === "pending" ? "#9a6e06" : "#2f9e44",
                    borderColor:
                      sel.booking.status === "pending" ? "#9a6e06" : "#2f9e44",
                  }}
                >
                  {sel.booking.status === "pending" ? "PENDING" : "CONFIRMED"}
                </span>
                <p className="min-w-0 flex-1 text-[13.5px]">
                  {sel.booking.status === "pending"
                    ? "Requested by"
                    : "Confirmed for"}{" "}
                  <strong>{sel.booking.teacher_name}</strong>
                </p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await cancelPeriodBooking(sel.booking!.id);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setBookings((prev) =>
                        prev.map((b) =>
                          b.id === sel.booking!.id
                            ? { ...b, status: "cancelled" as const }
                            : b,
                        ),
                      );
                      setSel(null);
                    })
                  }
                  className="border border-[#c8102e] px-4 py-2 text-[13px] font-semibold text-[#c8102e] hover:bg-[#c8102e] hover:text-white"
                >
                  Cancel this request
                </button>
              </>
            ) : (
              <>
                <input
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  placeholder="Teacher name and class (e.g. Ms. Bondar — 7B Science)"
                  className="min-w-0 flex-1 border border-[#e3e0d8] bg-white px-3 py-2.5 text-[13.5px] outline-none focus:border-[#141414]"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setError("");
                      const result = await createPeriodBooking(
                        sel.iso,
                        sel.period,
                        bookName,
                      );
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      const temp: SpaceBooking = {
                        id: result.bookingId ?? `local-${Date.now()}`,
                        booking_date: sel.iso,
                        period: sel.period,
                        teacher_name: bookName.trim(),
                        purpose: null,
                        area: null,
                        request_group: null,
                        status: "pending",
                        created_at: new Date().toISOString(),
                        decided_at: null,
                        decided_by: null,
                        decline_reason: null,
                      };
                      setBookings((prev) => [...prev, temp]);
                      setSel(null);
                      setBookName("");
                    })
                  }
                  className="bg-[#c8102e] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#a50d26]"
                >
                  Request this period
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setSel(null)}
              className="text-[13px] text-[#6d6759]"
            >
              Close
            </button>
          </div>
          {error && (
            <p className="mt-3 text-[13px] text-[#c8102e]">{error}</p>
          )}
        </div>
      )}

      <div className="page-gutter mb-6 flex flex-wrap gap-6 text-[13px] text-[#6d6759]">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 border border-[#e3e0d8] bg-white" />{" "}
          Open — click to book
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 bg-[#fdf8ec]"
            style={{ border: "1px dashed #e0a010" }}
          />{" "}
          Requested — awaiting confirmation
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 bg-[#141414]" /> Confirmed
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 border border-[#e3e0d8]"
            style={{
              background:
                "repeating-linear-gradient(45deg, #f2f0ea 0, #f2f0ea 3px, #d5d1c8 3px, #d5d1c8 6px)",
            }}
          />{" "}
          Blocked by the Creativity Space team
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 bg-[#f2f0ea]" /> Past or beyond
          one week
        </span>
      </div>

      <p className="page-gutter mb-10 text-[13px] text-[#6d6759]">
        Requests are per class period (P1–P8) · maximum one week ahead ·
        confirmations apply to booking the space itself — item reservations
        don&apos;t need approval
      </p>

      <SiteFooter />
    </div>
  );
}
