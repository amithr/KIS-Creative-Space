"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  cancelTrainingSessionAdmin,
  confirmTrainingSession,
  declineTrainingSession,
} from "@/app/admin/actions";
import type { TrainingSession } from "@/lib/types";

type TrainingSessionsPanelProps = {
  sessions: TrainingSession[];
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

export function TrainingSessionsPanel({
  sessions,
  onDone,
}: TrainingSessionsPanelProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const pendingReqs = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "pending")
        .sort(
          (a, b) =>
            a.session_date.localeCompare(b.session_date) ||
            a.period - b.period,
        ),
    [sessions],
  );

  const upcoming = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "confirmed")
        .sort(
          (a, b) =>
            a.session_date.localeCompare(b.session_date) ||
            a.period - b.period,
        ),
    [sessions],
  );

  return (
    <div className="no-print page-gutter mb-11">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            Training sessions
          </h2>
          {pendingReqs.length > 0 && (
            <span className="rounded-full bg-[#c8102e] px-2 py-0.5 font-mono text-[10px] tracking-wide text-white">
              {pendingReqs.length} AWAITING
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] text-[#8f731c]">
          FROM THE TRAINING PAGE
        </span>
      </div>

      {pendingReqs.length === 0 && upcoming.length === 0 && (
        <p className="text-[14.5px] text-[#6d6759]">
          No training requests yet — teacher requests from the{" "}
          <Link href="/training" className="underline hover:text-[#c8102e]">
            Training page
          </Link>{" "}
          will appear here.
        </p>
      )}

      {pendingReqs.map((s) => {
        const d = parseIso(s.session_date);
        return (
          <div
            key={s.id}
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
              <div className="text-[15px] font-semibold">{s.teacher_name}</div>
              <div className="mt-0.5 text-[13px] text-[#6d6759]">
                Period {s.period} · requested {formatRequested(s.created_at)}
              </div>
              <div className="mt-1 text-[13.5px] text-[#3f3b33]">
                &ldquo;{s.topic}&rdquo;
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError("");
                    const result = await confirmTrainingSession(s.id);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    onDone(`Confirmed training for ${s.teacher_name}`);
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
                    const result = await declineTrainingSession(s.id, reason);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    onDone(`Declined training for ${s.teacher_name}`);
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
          {upcoming.map((s) => {
            const d = parseIso(s.session_date);
            return (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-2.5 py-1.5 text-[14px]"
              >
                <span className="shrink-0 rounded-full border border-[#2f9e44] px-2 py-0.5 font-mono text-[10px] tracking-wide text-[#2f9e44]">
                  CONFIRMED
                </span>
                <span className="text-[#3f3b33]">
                  <span className="font-semibold">{s.teacher_name}</span>
                  {" · "}
                  {DOW[d.getDay()]} {d.getDate()} {MON[d.getMonth()]} · Period{" "}
                  {s.period}
                  {" — "}
                  <span className="text-[#6d6759]">&ldquo;{s.topic}&rdquo;</span>
                </span>
                <span className="flex-1" />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setError("");
                      const result = await cancelTrainingSessionAdmin(s.id);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      onDone(`Cancelled training for ${s.teacher_name}`);
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
        Training slots follow the space schedule; confirming notifies the
        teacher in the app. Declining frees the slot.
      </p>
      {error && <p className="pt-2 text-[14px] text-[#c8102e]">{error}</p>}
    </div>
  );
}
