"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  calendarCellVisual,
  resolveCalendarCell,
} from "@/lib/calendar-ui";
import {
  bookingKey,
  formatDayShort,
  startOfDay,
  toISODate,
} from "@/lib/inventory";
import {
  activeSpaceAt,
  activeTrainingAt,
} from "@/lib/period-slot";
import {
  dayHeaderPillStyle,
  dayTypeOf,
  isSchoolDay,
  weekDays,
} from "@/lib/school-calendar";
import { findAnyBlock } from "@/lib/space-blocks";
import { weekdayOfDate } from "@/lib/schedule-ui";
import type { SpaceBlock, SpaceBooking, TrainingSession } from "@/lib/types";
import { WeekPager } from "@/components/WeekPager";

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const REFRESH_MS = 30_000;

type CalendarClientProps = {
  initialBookings: SpaceBooking[];
  initialBlocks: SpaceBlock[];
  initialTraining: TrainingSession[];
};

export function CalendarClient({
  initialBookings,
  initialBlocks,
  initialTraining,
}: CalendarClientProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [training, setTraining] = useState(initialTraining);
  const [weekIndex, setWeekIndex] = useState(0);
  const [mobileDay, setMobileDay] = useState(0);

  useEffect(() => {
    setBookings(initialBookings);
    setBlocks(initialBlocks);
    setTraining(initialTraining);
  }, [initialBookings, initialBlocks, initialTraining]);

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [router]);

  const now = startOfDay(new Date());
  const dates = useMemo(() => weekDays(weekIndex, now), [weekIndex, now]);
  const todayIso = toISODate(now);

  function changeWeek(next: number) {
    setWeekIndex(next);
    setMobileDay(0);
  }

  function cellFor(iso: string, period: number) {
    const cell = resolveCalendarCell({
      isSchoolDay: isSchoolDay(iso),
      spaceBooking: activeSpaceAt(bookings, iso, period),
      trainingSession: activeTrainingAt(training, iso, period),
      block: findAnyBlock(blocks, iso, period),
    });
    return calendarCellVisual(cell);
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col">
      <section className="page-gutter flex flex-wrap items-end justify-between gap-6 pb-5 pt-6 md:gap-8 md:pb-[26px] md:pt-11">
        <div>
          <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-[#8a857a] md:mb-3 md:text-[12px] md:tracking-[0.2em] md:text-[#6d6759]">
            КАЛЕНДАР · THIS WEEK IN THE STUDIO
          </p>
          <h1 className="font-display text-[25px] font-light leading-[1.05] tracking-[-0.01em] md:text-[46px] md:tracking-[-0.02em]">
            Design Studio calendar
          </h1>
          <span className="kis-title-underline !mt-2.5 !w-12 md:!mt-3.5 md:!w-16" />
          <p className="mt-2.5 max-w-[640px] text-[12.5px] leading-[1.6] text-[#8a857a] md:mt-2.5 md:text-[15.5px] md:text-[#6d6759]">
            See what&apos;s happening in the studio this week — every class
            visit, training session and closed period in one place. Just
            looking? You&apos;re in the right spot. Ready to book? Head to{" "}
            <Link href="/schedule" className="underline hover:text-[#c8102e]">
              Schedule the space
            </Link>{" "}
            or{" "}
            <Link href="/training" className="underline hover:text-[#c8102e]">
              Book training
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3.5 pb-1">
          <span className="shrink-0 rounded-full bg-[#eeece5] px-3 py-[5px] font-mono text-[10px] tracking-[0.14em] text-[#3f3b33]">
            VIEW ONLY
          </span>
          <WeekPager
            weekIndex={weekIndex}
            days={dates}
            onChange={changeWeek}
          />
        </div>
      </section>

      <div className="page-gutter mb-4 flex gap-1.5 overflow-x-auto pb-1 md:hidden">
        {dates.map((d, i) => {
          const iso = toISODate(d);
          const active = mobileDay === i;
          const type = dayTypeOf(iso);
          const pill = dayHeaderPillStyle(type, iso === todayIso);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setMobileDay(i)}
              className="min-h-11 min-w-[48px] flex-1 rounded-[10px] px-1 py-2 text-center"
              style={{
                background: active ? "#c8102e" : pill.background,
                color: active ? "#fff" : type ? "#3f3b33" : "#b6b0a3",
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

      <div className="page-gutter mb-4 hidden border-t border-[#141414] md:block">
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
              <div key={iso} className="px-2.5 py-3 text-center">
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
            <div className="flex items-center font-mono text-[14.5px] text-[#6d6759]">
              P{period}
            </div>
            {dates.map((d, di) => {
              const iso = toISODate(d);
              const key = bookingKey(iso, period);
              const style = cellFor(iso, period);
              const delay = di * 60 + period * 20;
              return (
                <div
                  key={key}
                  className="kis-fadeup m-1 flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-[10px] px-2 py-1.5 text-center text-[13.5px] leading-[1.35]"
                  style={{
                    background: style.background,
                    color: style.color,
                    border: style.border,
                    animationDelay: `${delay}ms`,
                    cursor: "default",
                  }}
                >
                  {style.tag ? (
                    <span
                      className="font-mono text-[8px] tracking-[0.12em]"
                      style={{ color: style.tagColor }}
                    >
                      {style.tag}
                    </span>
                  ) : null}
                  {style.text}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="page-gutter mb-6 border-t border-[#141414] md:hidden">
        {PERIODS.map((period) => {
          const d = dates[mobileDay];
          const iso = toISODate(d);
          const key = bookingKey(iso, period);
          const style = cellFor(iso, period);
          return (
            <div
              key={key}
              className="flex items-center gap-3 border-b border-[#eeece5] py-2.5"
            >
              <span className="w-[26px] shrink-0 font-mono text-[11px] text-[#8a857a]">
                P{period}
              </span>
              <div
                className="flex min-h-11 flex-1 flex-col justify-center gap-0.5 rounded-[10px] px-3.5 py-2.5 text-left text-[12px]"
                style={{
                  background: style.background,
                  color: style.color,
                  border: style.border,
                  cursor: "default",
                }}
              >
                {style.tag ? (
                  <span
                    className="font-mono text-[8px] tracking-[0.12em]"
                    style={{ color: style.tagColor }}
                  >
                    {style.tag}
                  </span>
                ) : null}
                {style.text || (
                  <span className="text-[#b6b0a3]">
                    {dayTypeOf(iso) ? "Free" : "No school"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="page-gutter mb-6 flex flex-wrap items-center gap-x-[22px] gap-y-3 text-[14.5px] text-[#6d6759]">
        <span className="flex items-center gap-[7px]">
          <span className="inline-block h-3 w-3 rounded-[4px] border border-[#e3e0d8] bg-white" />
          Free
        </span>
        <span className="flex items-center gap-[7px]">
          <span
            className="inline-block h-3 w-3 rounded-[4px] bg-[#dff2e3]"
            style={{ border: "1.5px solid #2f9e44" }}
          />
          Class booking
        </span>
        <span className="flex items-center gap-[7px]">
          <span
            className="inline-block h-3 w-3 rounded-[4px] bg-[#fdf4e3]"
            style={{ border: "1.5px solid #e0a010" }}
          />
          Training session
        </span>
        <span className="flex items-center gap-[7px]">
          <span
            className="inline-block h-3 w-3 rounded-[4px] bg-[#e8f1f8]"
            style={{ border: "1.5px dashed #5d93b5" }}
          />
          Requested — not yet confirmed
        </span>
        <span className="flex items-center gap-[7px]">
          <span
            className="inline-block h-3 w-3 rounded-[4px]"
            style={{
              border: "1px solid #eeddb2",
              background:
                "repeating-linear-gradient(45deg, #fdf4e3 0, #fdf4e3 3px, #f7e7c3 3px, #f7e7c3 6px)",
            }}
          />
          Open for classes — no training
        </span>
        <span className="flex items-center gap-[7px]">
          <span
            className="inline-block h-3 w-3 rounded-[4px]"
            style={{
              border: "1px solid #b9cede",
              background:
                "repeating-linear-gradient(45deg, #e6edf4 0, #e6edf4 3px, #d3e0ec 3px, #d3e0ec 6px)",
            }}
          />
          Open for training — no classes
        </span>
        <span className="flex items-center gap-[7px]">
          <span
            className="inline-block h-3 w-3 rounded-[4px]"
            style={{
              border: "1px solid #eccfcf",
              background:
                "repeating-linear-gradient(45deg, #fbeeee 0, #fbeeee 3px, #f3dcdc 3px, #f3dcdc 6px)",
            }}
          />
          Fully closed
        </span>
        <span className="hidden h-4 w-px bg-[#e3e0d8] md:inline-block" />
        <span className="flex items-center gap-[7px]">
          <span
            className="inline-block h-3 w-3 rounded-[4px]"
            style={{ border: "1.5px solid #c8102e" }}
          />
          Red day
        </span>
        <span className="flex items-center gap-[7px]">
          <span
            className="inline-block h-3 w-3 rounded-[4px]"
            style={{ border: "1.5px solid #141414" }}
          />
          Black day
        </span>
        <span className="flex items-center gap-[7px]">
          <span
            className="inline-block h-3 w-3 rounded-[4px]"
            style={{ border: "1.5px solid #2fbf2f" }}
          />
          Green day
        </span>
        <span className="flex items-center gap-[7px]">
          <span className="inline-block h-3 w-3 rounded-[4px] bg-[#f2f0ea]" />
          No school
        </span>
      </div>

      <footer className="page-gutter mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e0d8] py-4 text-[14.5px] text-[#6d6759] md:py-4">
        <p>
          This calendar updates by itself as bookings come in — check back any
          time · border colors around the dates follow the 2026–27 school
          calendar · to change something you&apos;ve booked, ask the Creativity
          Space team
        </p>
        <Link href="/admin" className="shrink-0 hover:text-[#c8102e]">
          Admin →
        </Link>
      </footer>
    </div>
  );
}
