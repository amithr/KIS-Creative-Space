"use client";

import { useMemo, useState, useTransition } from "react";
import {
  cancelPeriodBooking,
  createPeriodBooking,
} from "@/app/actions/public";
import { DayTypeLegend } from "@/components/DayTypeLegend";
import { useConfirm } from "@/components/ConfirmDialog";
import { SiteFooter } from "@/components/SiteFooter";
import { WeekPager } from "@/components/WeekPager";
import {
  bookingKey,
  formatDayShort,
  startOfDay,
  toISODate,
} from "@/lib/inventory";
import {
  activeTrainingAt,
  blockAt,
  evaluatePeriodSlot,
} from "@/lib/period-slot";
import {
  dayHeaderPillStyle,
  dayTypeOf,
  isScheduleBookableDate,
  weekDays,
} from "@/lib/school-calendar";
import { cellVisual, statusPillColors, weekdayOfDate } from "@/lib/schedule-ui";
import type { SpaceBlock, SpaceBooking, TrainingSession } from "@/lib/types";

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const NOTE_MAX = 280;

type ScheduleClientProps = {
  initialBookings: SpaceBooking[];
  initialBlocks: SpaceBlock[];
  initialTraining: TrainingSession[];
};

type Selection = {
  key: string;
  period: number;
  day: string;
  dateLabel: string;
  iso: string;
  booking?: SpaceBooking;
};

function pickDisplayBooking(list: SpaceBooking[]): SpaceBooking | undefined {
  const confirmed = list.find((b) => b.status === "confirmed");
  if (confirmed) return confirmed;
  return list.find((b) => b.status === "pending");
}

export function ScheduleClient({
  initialBookings,
  initialBlocks,
  initialTraining,
}: ScheduleClientProps) {
  const askConfirm = useConfirm();
  const [bookings, setBookings] = useState(initialBookings);
  const blocks = initialBlocks;
  const training = initialTraining;
  const [weekIndex, setWeekIndex] = useState(0);
  const [sel, setSel] = useState<Selection | null>(null);
  const [bookName, setBookName] = useState("");
  const [bookNote, setBookNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [mobileDay, setMobileDay] = useState(0);
  const [popKey, setPopKey] = useState<string | null>(null);

  const now = startOfDay(new Date());
  const dates = useMemo(() => weekDays(weekIndex, now), [weekIndex, now]);
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

  function changeWeek(next: number) {
    setWeekIndex(next);
    setSel(null);
    setMobileDay(0);
  }

  function slotFor(iso: string, period: number, isSel: boolean) {
    const booking = pickDisplayBooking(bySlot.get(bookingKey(iso, period)) ?? []);
    const block = blockAt(blocks, iso, period, "space");
    const trainingSession = activeTrainingAt(training, iso, period);
    const d = new Date(`${iso}T00:00:00`);
    const state = evaluatePeriodSlot({
      mode: "space",
      inWindow: isScheduleBookableDate(d, now),
      isSelected: isSel,
      block,
      spaceBooking: booking,
      trainingSession,
    });
    return { booking, state, style: cellVisual(state, isSel) };
  }

  function selectOpen(
    key: string,
    period: number,
    day: string,
    dateLabel: string,
    iso: string,
    booking?: SpaceBooking,
  ) {
    setSel({ key, period, day, dateLabel, iso, booking });
    setBookName("");
    setBookNote("");
    setError("");
  }

  function submitRequest() {
    if (!sel || sel.booking) return;
    startTransition(async () => {
      setError("");
      const savedKey = sel.key;
      const noteTrim = bookNote.trim().slice(0, NOTE_MAX);
      const result = await createPeriodBooking(
        sel.iso,
        sel.period,
        bookName,
        noteTrim || undefined,
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
        purpose: noteTrim || null,
        area: null,
        request_group: null,
        status: "pending",
        created_at: new Date().toISOString(),
        decided_at: null,
        decided_by: null,
        decline_reason: null,
      };
      setBookings((prev) => [...prev, temp]);
      setPopKey(savedKey);
      window.setTimeout(() => setPopKey(null), 400);
      setSel(null);
      setBookName("");
      setBookNote("");
    });
  }

  const requestCta = sel
    ? `Request P${sel.period} · ${sel.day.charAt(0)}${sel.day.slice(1).toLowerCase()} ${sel.dateLabel.split(" ")[0]} →`
    : "";

  const bookingBar = sel ? (
    <div className="page-gutter sticky top-3 z-40 mb-4 pt-3 md:top-[88px] md:mb-6 md:pt-4">
      <div className="kis-pop border-2 border-[#141414] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(20,20,20,0.15)] md:px-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <p className="shrink-0 font-mono text-[12px] tracking-[0.14em] text-[#c8102e]">
            {sel.day} {sel.dateLabel} · PERIOD {sel.period}
          </p>
          {sel.booking ? (
            <>
              <span
                className="shrink-0 self-start rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wide"
                style={statusPillColors(
                  sel.booking.status === "confirmed" ? "confirmed" : "pending",
                )}
              >
                {sel.booking.status === "pending" ? "PENDING" : "CONFIRMED"}
              </span>
              <p className="min-w-0 flex-1 text-[14.5px]">
                {sel.booking.status === "pending"
                  ? "Requested by"
                  : "Confirmed for"}{" "}
                <strong>{sel.booking.teacher_name}</strong>
                {sel.booking.purpose ? (
                  <span className="text-[#6d6759]">
                    {" "}
                    — &ldquo;{sel.booking.purpose}&rdquo;
                  </span>
                ) : null}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const booking = sel.booking!;
                  askConfirm({
                    title: "Cancel this booking?",
                    body: `${booking.teacher_name} · ${sel.day} ${sel.dateLabel} · Period ${sel.period} — the period opens up for other teachers.`,
                    action: "Cancel booking",
                    fn: async () => {
                      const result = await cancelPeriodBooking(booking.id);
                      if (!result.ok) {
                        setError(result.error);
                        throw new Error(result.error);
                      }
                      setBookings((prev) =>
                        prev.map((b) =>
                          b.id === booking.id
                            ? { ...b, status: "cancelled" as const }
                            : b,
                        ),
                      );
                      setSel(null);
                    },
                  });
                }}
                className="kis-press min-h-11 border border-[#c8102e] px-4 py-3 text-[14px] font-semibold text-[#c8102e] hover:bg-[#c8102e] hover:text-white md:py-2"
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
                className="min-h-11 min-w-0 flex-1 border border-[#e3e0d8] bg-white px-3 py-2.5 text-[14.5px] outline-none focus:border-[#141414]"
              />
              <input
                value={bookNote}
                onChange={(e) =>
                  setBookNote(e.target.value.slice(0, NOTE_MAX))
                }
                placeholder="Optional — what do you need during this time?"
                maxLength={NOTE_MAX}
                className="min-h-11 min-w-0 flex-1 border border-dashed border-[#d5d1c8] bg-white px-3 py-2.5 text-[14.5px] outline-none focus:border-[#141414]"
              />
              <button
                type="button"
                disabled={pending || !bookName.trim()}
                onClick={submitRequest}
                className="kis-press hidden min-h-11 bg-[#c8102e] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#a50d26] disabled:bg-[#d5d1c8] md:inline-flex md:items-center"
              >
                Request this period
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setSel(null)}
            className="kis-press hidden text-[14px] text-[#6d6759] md:inline"
          >
            Close
          </button>
        </div>
        {!sel.booking && (
          <button
            type="button"
            disabled={pending || !bookName.trim()}
            onClick={submitRequest}
            className="kis-press mt-3 flex min-h-11 w-full items-center justify-center rounded-full bg-[#c8102e] px-4 text-[13.5px] font-semibold text-white hover:bg-[#a50d26] disabled:bg-[#d5d1c8] md:hidden"
          >
            {requestCta}
          </button>
        )}
        <button
          type="button"
          onClick={() => setSel(null)}
          className="kis-press mt-2 w-full text-center text-[14px] text-[#6d6759] md:hidden"
        >
          Close
        </button>
        {error && (
          <p className="mt-3 text-[14px] text-[#c8102e]">{error}</p>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col">
      {bookingBar}

      <section className="page-gutter flex flex-col items-start gap-5 pb-5 pt-6 md:gap-6 md:pb-[26px] md:pt-8">
        <div>
          <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-[#8a857a] md:mb-3 md:text-[12px] md:tracking-[0.2em] md:text-[#6d6759]">
            РОЗКЛАД · SCHEDULE
          </p>
          <h1 className="font-display text-[25px] font-light leading-[1.05] tracking-[-0.01em] md:text-[46px] md:tracking-[-0.02em]">
            Schedule the space
          </h1>
          <span className="kis-title-underline !mt-2.5 !w-12 md:!mt-3.5 md:!w-16" />
          <p className="mt-2.5 text-[12.5px] text-[#8a857a] md:mt-3 md:text-[14.5px] md:text-[#6d6759]">
            <span className="md:hidden">
              Book class periods up to three weeks ahead
            </span>
            <span className="hidden md:inline">
              Teachers can request class periods up to three weeks ahead. The
              Design Studio team confirms each request — you&apos;ll get a
              notification.
            </span>
          </p>
        </div>
        <WeekPager weekIndex={weekIndex} days={dates} onChange={changeWeek} />
      </section>

      <div className="page-gutter mb-4 flex gap-1.5 overflow-x-auto pb-1 md:hidden">
        {dates.map((d, i) => {
          const iso = toISODate(d);
          const active = mobileDay === i;
          const type = dayTypeOf(iso);
          const bookable = isScheduleBookableDate(d, now);
          const pill = dayHeaderPillStyle(type, iso === todayIso);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => {
                setMobileDay(i);
                setSel(null);
              }}
              className="kis-press min-h-11 min-w-[48px] flex-1 rounded-[10px] px-1 py-2 text-center"
              style={{
                background: active ? "#c8102e" : pill.background,
                color: active ? "#fff" : bookable ? "#3f3b33" : "#b6b0a3",
                border: active ? "1px solid #c8102e" : pill.border,
                boxShadow: active
                  ? "0 0 0 3px rgba(200,16,46,.15)"
                  : undefined,
              }}
            >
              <div className="font-mono text-[9px] tracking-[0.1em]">
                {weekdayOfDate(d)}
              </div>
              <div className="mt-0.5 text-[13.5px] font-semibold">
                {d.getDate()}
              </div>
            </button>
          );
        })}
      </div>

      <div className="page-gutter mb-8 hidden border-t border-[#141414] md:block">
        <div className="grid grid-cols-[90px_repeat(5,1fr)] border-b border-[#e3e0d8]">
          <div className="py-3 font-mono text-[11px] tracking-[0.16em] text-[#6d6759]">
            PERIOD
          </div>
          {dates.map((d) => {
            const iso = toISODate(d);
            const today = iso === todayIso;
            const type = dayTypeOf(iso);
            const pill = dayHeaderPillStyle(type, today);
            return (
              <div key={iso} className="px-1 py-3 text-center">
                <div
                  className="font-mono text-[11px] tracking-[0.16em]"
                  style={{ color: today ? "#c8102e" : "#6d6759" }}
                >
                  {weekdayOfDate(d)}
                </div>
                <div
                  className="mt-1 inline-block rounded-lg px-3 py-0.5 text-[14.5px] font-semibold"
                  style={pill}
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
            <div className="flex items-center font-mono text-[12px] text-[#6d6759]">
              P{period}
            </div>
            {dates.map((d, di) => {
              const iso = toISODate(d);
              const key = bookingKey(iso, period);
              const isSel = sel?.key === key;
              const { booking, style } = slotFor(iso, period, isSel);
              const delay = di * 60 + period * 20;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!style.clickable}
                  onClick={() => {
                    if (!style.clickable) return;
                    selectOpen(
                      key,
                      period,
                      weekdayOfDate(d),
                      formatDayShort(d),
                      iso,
                      booking,
                    );
                  }}
                  className={`kis-fadeup kis-press kis-sched-cell m-1 min-h-[56px] rounded-[10px] px-1 text-center text-[14.5px] ${
                    isSel ? "kis-sched-cell-selected" : ""
                  } ${popKey === key ? "kis-pop" : ""}`}
                  style={{
                    background: style.background,
                    color: style.color,
                    border: style.border,
                    cursor: style.cursor,
                    animationDelay: `${delay}ms`,
                  }}
                >
                  {style.text}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="page-gutter mb-8 border-t border-[#141414] md:hidden">
        {PERIODS.map((period) => {
          const d = dates[mobileDay];
          const iso = toISODate(d);
          const key = bookingKey(iso, period);
          const isSel = sel?.key === key;
          const { booking, style } = slotFor(iso, period, isSel);

          return (
            <div
              key={key}
              className="flex items-center gap-3 border-b border-[#eeece5] py-2.5"
            >
              <span className="w-[26px] shrink-0 font-mono text-[11px] text-[#8a857a]">
                P{period}
              </span>
              <button
                type="button"
                disabled={!style.clickable}
                onClick={() => {
                  if (!style.clickable) return;
                  selectOpen(
                    key,
                    period,
                    weekdayOfDate(d),
                    formatDayShort(d),
                    iso,
                    booking,
                  );
                }}
                className={`kis-press kis-sched-cell min-h-11 flex-1 rounded-[10px] px-3.5 py-2.5 text-left text-[12px] ${
                  isSel ? "kis-sched-cell-selected" : ""
                } ${popKey === key ? "kis-pop" : ""}`}
                style={{
                  background: style.background,
                  color: style.color,
                  border: style.border,
                  cursor: style.cursor,
                }}
              >
                {style.text ||
                  (isSel
                    ? "Selected — confirm below"
                    : "Open — tap to book")}
              </button>
            </div>
          );
        })}
      </div>

      <div className="page-gutter mb-6 hidden flex-wrap gap-6 text-[14.5px] text-[#6d6759] md:flex">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-[4px] border border-[#e3e0d8] bg-white" />{" "}
          Open — click to book
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-[4px] bg-[#e8f1f8]"
            style={{ border: "1.5px dashed #5d93b5" }}
          />{" "}
          Requested — awaiting confirmation
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-[4px] bg-[#dff2e3]"
            style={{ border: "1.5px solid #2f9e44" }}
          />{" "}
          Confirmed
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-[4px]"
            style={{
              border: "1px solid #eccfcf",
              background:
                "repeating-linear-gradient(45deg, #fbeeee 0, #fbeeee 3px, #f3dcdc 3px, #f3dcdc 6px)",
            }}
          />{" "}
          Blocked by the Design Studio team
        </span>
        <DayTypeLegend />
      </div>

      <p className="page-gutter mb-10 hidden text-[14.5px] text-[#6d6759] md:block">
        Requests are per class period (P1–P8) · up to three weeks ahead · day
        colors follow the 2026–27 school calendar
      </p>

      <SiteFooter />
    </div>
  );
}
