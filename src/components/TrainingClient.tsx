"use client";

import { useMemo, useState, useTransition } from "react";
import {
  cancelTrainingSession,
  createTrainingSession,
} from "@/app/actions/public";
import { SiteFooter } from "@/components/SiteFooter";
import {
  bookingKey,
  formatDayShort,
  startOfDay,
  toISODate,
} from "@/lib/inventory";
import {
  activeSpaceAt,
  blockAt,
  evaluatePeriodSlot,
} from "@/lib/period-slot";
import {
  cellVisual,
  rollingSevenDays,
  statusPillColors,
  weekdayOfDate,
} from "@/lib/schedule-ui";
import type { SpaceBlock, SpaceBooking, TrainingSession } from "@/lib/types";

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const QUICK_TOPICS = [
  "3D printing",
  "Laser cutting",
  "Robotics",
  "VR lab",
  "Planning a lesson here",
] as const;

type TrainingClientProps = {
  initialSessions: TrainingSession[];
  initialSpaceBookings: SpaceBooking[];
  initialBlocks: SpaceBlock[];
};

type Selection = {
  key: string;
  period: number;
  day: string;
  dateLabel: string;
  iso: string;
  session?: TrainingSession;
};

export function TrainingClient({
  initialSessions,
  initialSpaceBookings,
  initialBlocks,
}: TrainingClientProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const spaceBookings = initialSpaceBookings;
  const blocks = initialBlocks;
  const [sel, setSel] = useState<Selection | null>(null);
  const [bookName, setBookName] = useState("");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [mobileDay, setMobileDay] = useState(0);
  const [popKey, setPopKey] = useState<string | null>(null);

  const now = startOfDay(new Date());
  const dates = rollingSevenDays(now);
  const todayIso = toISODate(now);

  const sessionBySlot = useMemo(() => {
    const map = new Map<string, TrainingSession>();
    for (const s of sessions) {
      if (s.status !== "pending" && s.status !== "confirmed") continue;
      map.set(bookingKey(s.session_date, s.period), s);
    }
    return map;
  }, [sessions]);

  const canSubmit = bookName.trim().length > 0 && topic.trim().length > 0;

  function slotFor(iso: string, period: number, isSel: boolean) {
    const session = sessionBySlot.get(bookingKey(iso, period));
    const spaceBooking = activeSpaceAt(spaceBookings, iso, period);
    const block = blockAt(blocks, iso, period);
    const state = evaluatePeriodSlot({
      mode: "training",
      inWindow: true,
      isSelected: isSel,
      block,
      spaceBooking,
      trainingSession: session,
    });
    return { session, state, style: cellVisual(state, isSel) };
  }

  function selectCell(
    key: string,
    period: number,
    day: string,
    dateLabel: string,
    iso: string,
    session: TrainingSession | undefined,
  ) {
    setSel({ key, period, day, dateLabel, iso, session });
    setBookName("");
    setTopic("");
    setError("");
  }

  const bookingBar = sel ? (
    <div className="page-gutter sticky top-[88px] z-40 mb-6 pt-4">
      <div className="kis-pop border-2 border-[#141414] bg-white px-5 py-4 shadow-[0_10px_30px_rgba(20,20,20,0.15)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <p className="shrink-0 font-mono text-[12px] tracking-[0.14em] text-[#c8102e]">
            {sel.day} {sel.dateLabel} · PERIOD {sel.period}
          </p>
          {sel.session ? (
            <>
              <span
                className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wide"
                style={statusPillColors(
                  sel.session.status === "confirmed" ? "confirmed" : "pending",
                )}
              >
                {sel.session.status === "pending" ? "PENDING" : "CONFIRMED"}
              </span>
              <p className="min-w-0 flex-1 text-[14.5px]">
                <strong>{sel.session.teacher_name}</strong>
                {" — "}
                <span className="text-[#3f3b33]">
                  &ldquo;{sel.session.topic}&rdquo;
                </span>
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await cancelTrainingSession(sel.session!.id);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setSessions((prev) =>
                      prev.map((s) =>
                        s.id === sel.session!.id
                          ? { ...s, status: "cancelled" as const }
                          : s,
                      ),
                    );
                    setSel(null);
                  })
                }
                className="kis-press border border-[#c8102e] px-4 py-2 text-[14px] font-semibold text-[#c8102e] hover:bg-[#c8102e] hover:text-white"
              >
                Cancel this session
              </button>
            </>
          ) : (
            <>
              <input
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                placeholder="Teacher name (e.g. Ms. Bondar)"
                className="min-w-0 flex-1 border border-[#e3e0d8] bg-white px-3 py-2.5 text-[14.5px] outline-none focus:border-[#141414]"
              />
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What do you want help with?"
                className="min-w-0 flex-[2] border border-[#e3e0d8] bg-white px-3 py-2.5 text-[14.5px] outline-none focus:border-[#141414]"
              />
              <button
                type="button"
                disabled={pending || !canSubmit}
                onClick={() =>
                  startTransition(async () => {
                    setError("");
                    const savedKey = sel.key;
                    const result = await createTrainingSession(
                      sel.iso,
                      sel.period,
                      bookName,
                      topic,
                    );
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    const temp: TrainingSession = {
                      id: result.sessionId ?? `local-${Date.now()}`,
                      session_date: sel.iso,
                      period: sel.period,
                      teacher_name: bookName.trim(),
                      topic: topic.trim(),
                      status: "pending",
                      created_at: new Date().toISOString(),
                      decided_at: null,
                      decided_by: null,
                      decline_reason: null,
                    };
                    setSessions((prev) => [...prev, temp]);
                    setPopKey(savedKey);
                    window.setTimeout(() => setPopKey(null), 400);
                    setSel(null);
                    setBookName("");
                    setTopic("");
                  })
                }
                className="kis-press bg-[#c8102e] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#a50d26] disabled:bg-[#d5d1c8] disabled:text-white"
              >
                Request session
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setSel(null)}
            className="kis-press text-[14px] text-[#6d6759]"
          >
            Close
          </button>
        </div>

        {!sel.session && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] tracking-[0.14em] text-[#6d6759]">
              QUICK TOPICS
            </span>
            {QUICK_TOPICS.map((t) => {
              const active = topic === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className="kis-press rounded-full px-3 py-1 text-[13px] font-semibold"
                  style={{
                    background: active ? "#141414" : "#fff",
                    color: active ? "#fff" : "#3f3b33",
                    border: `1px solid ${active ? "#141414" : "#e3e0d8"}`,
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
        {error && (
          <p className="mt-3 text-[14px] text-[#c8102e]">{error}</p>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col">
      {bookingBar}

      <section className="page-gutter flex flex-wrap items-end justify-between gap-6 pb-[26px] pt-8">
        <div>
          <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-[#6d6759]">
            НАВЧАННЯ · TRAINING
          </p>
          <h1 className="font-display text-[46px] font-normal leading-[1.05] tracking-[-0.02em]">
            Book a training session
          </h1>
          <span className="kis-title-underline" />
          <p className="mt-3 text-[15.5px] text-[#6d6759]">
            Pick a free class period and tell the Creativity Space coordinator
            what you want help with. Availability follows the space schedule —
            booked or blocked periods aren&apos;t open for training.
          </p>
        </div>
        <p className="pb-1 font-mono text-[12px] tracking-[0.16em] text-[#6d6759]">
          NEXT 7 DAYS
        </p>
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
              className="kis-press shrink-0 rounded-full px-3.5 py-2 text-[14.5px] font-semibold"
              style={{
                background: active ? "#c8102e" : "#fff",
                color: active ? "#fff" : today ? "#c8102e" : "#3f3b33",
                border: `1px solid ${active ? "#c8102e" : "#e3e0d8"}`,
              }}
            >
              {weekdayOfDate(d)} {formatDayShort(d)}
            </button>
          );
        })}
      </div>

      <div className="page-gutter mb-8 hidden border-t border-[#141414] md:block">
        <div className="grid grid-cols-[90px_repeat(7,1fr)] border-b border-[#e3e0d8]">
          <div className="py-3 font-mono text-[11px] tracking-[0.16em] text-[#6d6759]">
            PERIOD
          </div>
          {dates.map((d) => {
            const today = toISODate(d) === todayIso;
            return (
              <div key={toISODate(d)} className="px-1 py-3 text-center">
                <div
                  className="font-mono text-[11px] tracking-[0.16em]"
                  style={{ color: today ? "#c8102e" : "#6d6759" }}
                >
                  {weekdayOfDate(d)}
                </div>
                <div
                  className="mt-1 text-[14.5px] font-semibold"
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
            className="grid grid-cols-[90px_repeat(7,1fr)] border-b border-[#eeece5]"
          >
            <div className="flex items-center font-mono text-[12px] text-[#6d6759]">
              P{period}
            </div>
            {dates.map((d, di) => {
              const iso = toISODate(d);
              const key = bookingKey(iso, period);
              const isSel = sel?.key === key;
              const { session, style } = slotFor(iso, period, isSel);
              const delay = di * 60 + period * 20;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!style.clickable}
                  onClick={() => {
                    if (!style.clickable) return;
                    selectCell(
                      key,
                      period,
                      weekdayOfDate(d),
                      formatDayShort(d),
                      iso,
                      session,
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

      <div className="page-gutter mb-8 space-y-2 md:hidden">
        {PERIODS.map((period) => {
          const d = dates[mobileDay];
          const iso = toISODate(d);
          const key = bookingKey(iso, period);
          const isSel = sel?.key === key;
          const { session, style } = slotFor(iso, period, isSel);

          return (
            <button
              key={key}
              type="button"
              disabled={!style.clickable}
              onClick={() => {
                if (!style.clickable) return;
                selectCell(
                  key,
                  period,
                  weekdayOfDate(d),
                  formatDayShort(d),
                  iso,
                  session,
                );
              }}
              className={`kis-press kis-sched-cell flex w-full items-center justify-between rounded-[10px] px-4 py-3.5 text-left text-[14.5px] ${
                isSel ? "kis-sched-cell-selected" : ""
              } ${popKey === key ? "kis-pop" : ""}`}
              style={{
                background: style.background,
                color: style.color,
                border: style.border,
                cursor: style.cursor,
              }}
            >
              <span className="font-mono text-[12px]">P{period}</span>
              <span>
                {style.text ||
                  (isSel ? "Selected" : "Open — tap to request")}
              </span>
            </button>
          );
        })}
      </div>

      <div className="page-gutter mb-6 flex flex-wrap gap-6 text-[14.5px] text-[#6d6759]">
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
          Confirmed (session)
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-[4px] border border-[#eeece5] bg-[#eeece5]" />{" "}
          Space in use — class booked
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
          Blocked by the Creativity Space team
        </span>
      </div>

      <p className="page-gutter mb-10 text-[14.5px] text-[#6d6759]">
        Sessions are one class period · next 7 days · availability matches
        Schedule the space · the coordinator confirms each request
      </p>

      <SiteFooter />
    </div>
  );
}
