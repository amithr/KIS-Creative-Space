"use client";

import { useState, useTransition } from "react";
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
import type { PeriodBooking } from "@/lib/types";

const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI"] as const;
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

type ScheduleClientProps = {
  initialBookings: PeriodBooking[];
};

type Selection = {
  key: string;
  period: number;
  day: string;
  dateLabel: string;
  iso: string;
  booked?: string;
};

export function ScheduleClient({ initialBookings }: ScheduleClientProps) {
  const [week, setWeek] = useState(0);
  const [bookings, setBookings] = useState(() => {
    const map: Record<string, string> = {};
    for (const b of initialBookings) {
      map[bookingKey(b.booking_date, b.period)] = b.teacher_name;
    }
    return map;
  });
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
            Teachers can book class periods up to one week in advance.
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

      {/* Mobile day chips */}
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

      {/* Desktop grid */}
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
              const booked = bookings[key];
              const ok = isBookableDate(d, now);
              const isSel = sel?.key === key;

              let bg = "#fff";
              let color = "#98917f";
              let border = "#e3e0d8";
              let text = "";
              let cursor = "pointer";

              if (booked) {
                bg = isSel ? "#c8102e" : "#141414";
                color = "#fff";
                border = isSel ? "#c8102e" : "#141414";
                text = booked;
              } else if (!ok) {
                bg = "#f2f0ea";
                border = "#f2f0ea";
                cursor = "default";
              } else if (isSel) {
                border = "#c8102e";
                color = "#c8102e";
                text = "Selected";
              }

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!ok && !booked}
                  onClick={() => {
                    if (!ok && !booked) return;
                    setSel({
                      key,
                      period,
                      day: DAY_NAMES[di],
                      dateLabel: formatDayShort(d),
                      iso,
                      booked,
                    });
                    setBookName("");
                    setError("");
                  }}
                  className="m-1 min-h-[52px] px-1 text-center text-[13px] transition-colors"
                  style={{ background: bg, color, border: `1px solid ${border}`, cursor }}
                >
                  {text}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile period list */}
      <div className="page-gutter mb-8 space-y-2 md:hidden">
        {PERIODS.map((period) => {
          const d = dates[mobileDay];
          const iso = toISODate(d);
          const key = bookingKey(iso, period);
          const booked = bookings[key];
          const ok = isBookableDate(d, now);
          const isSel = sel?.key === key;

          return (
            <button
              key={key}
              type="button"
              disabled={!ok && !booked}
              onClick={() => {
                if (!ok && !booked) return;
                setSel({
                  key,
                  period,
                  day: DAY_NAMES[mobileDay],
                  dateLabel: formatDayShort(d),
                  iso,
                  booked,
                });
                setBookName("");
                setError("");
              }}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[13px]"
              style={{
                background: booked ? "#141414" : isSel ? "#fff" : "#fff",
                color: booked ? "#fff" : isSel ? "#c8102e" : "#3f3b33",
                border: booked
                  ? "1px solid #141414"
                  : isSel
                    ? "1px solid #c8102e"
                    : ok
                      ? "1px dashed #d8d4c9"
                      : "1px solid #f2f0ea",
                opacity: !ok && !booked ? 0.5 : 1,
              }}
            >
              <span className="font-mono text-[11px]">P{period}</span>
              <span>
                {booked
                  ? booked
                  : ok
                    ? isSel
                      ? "Selected"
                      : "Open — tap to book"
                    : "Unavailable"}
              </span>
            </button>
          );
        })}
      </div>

      {sel && (
        <div className="page-gutter mb-8">
          <div className="border border-[#141414] px-5 py-4">
            <p className="font-mono text-[11px] tracking-[0.14em] text-[#c8102e]">
              {sel.day} {sel.dateLabel} · PERIOD {sel.period}
            </p>
            {sel.booked ? (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <p className="text-[14px]">Booked by {sel.booked}</p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await cancelPeriodBooking(
                        sel.iso,
                        sel.period,
                      );
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setBookings((prev) => {
                        const next = { ...prev };
                        delete next[sel.key];
                        return next;
                      });
                      setSel(null);
                    })
                  }
                  className="border border-[#c8102e] px-4 py-2 text-[13px] text-[#c8102e]"
                >
                  Cancel this booking
                </button>
                <button
                  type="button"
                  onClick={() => setSel(null)}
                  className="text-[13px] text-[#6d6759]"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  placeholder="Your name"
                  className="min-w-0 flex-1 border border-[#e3e0d8] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#141414]"
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
                      setBookings((prev) => ({
                        ...prev,
                        [sel.key]: bookName.trim(),
                      }));
                      setSel(null);
                      setBookName("");
                    })
                  }
                  className="bg-[#c8102e] px-4 py-2.5 text-[13px] text-white hover:bg-[#a50d26]"
                >
                  Book this period
                </button>
                <button
                  type="button"
                  onClick={() => setSel(null)}
                  className="text-[13px] text-[#6d6759]"
                >
                  Close
                </button>
              </div>
            )}
            {error && (
              <p className="mt-3 text-[13px] text-[#c8102e]">{error}</p>
            )}
          </div>
        </div>
      )}

      <div className="page-gutter mb-10 flex flex-wrap gap-6 text-[12px] text-[#6d6759]">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-5 border border-[#e3e0d8] bg-white" />{" "}
          Open
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-5 bg-[#141414]" /> Booked
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-5 bg-[#f2f0ea]" /> Unavailable
        </span>
      </div>

      <SiteFooter />
    </div>
  );
}
