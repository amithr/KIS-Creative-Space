"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  cancelTrainingSessionAdmin,
  confirmTrainingSession,
  declineTrainingSession,
  restoreTrainingSession,
} from "@/app/admin/actions";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAdminWrite } from "@/components/admin/AdminWriteFeedback";
import type { TrainingSession } from "@/lib/types";

type TrainingSessionsPanelProps = {
  sessions: TrainingSession[];
  onDone: () => void;
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
  const [rows, setRows] = useState(sessions);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [flashId, setFlashId] = useState<string | null>(null);
  const askConfirm = useConfirm();
  const { notify } = useAdminWrite();

  useEffect(() => {
    setRows(sessions);
  }, [sessions]);

  function flash(id: string) {
    setFlashId(id);
    window.setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 900);
  }

  const pendingReqs = useMemo(
    () =>
      rows
        .filter((s) => s.status === "pending")
        .sort(
          (a, b) =>
            a.session_date.localeCompare(b.session_date) ||
            a.period - b.period,
        ),
    [rows],
  );

  const upcoming = useMemo(
    () =>
      rows
        .filter((s) => s.status === "confirmed")
        .sort(
          (a, b) =>
            a.session_date.localeCompare(b.session_date) ||
            a.period - b.period,
        ),
    [rows],
  );

  return (
    <section className="no-print border border-[#e3e0d8] border-t-[3px] border-t-[#141414] bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eeece5] px-5 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
            Training sessions
          </h2>
          {pendingReqs.length > 0 && (
            <span className="rounded-full bg-[#c8102e] px-2 py-0.5 font-mono text-[10px] tracking-wide text-white">
              {pendingReqs.length} AWAITING
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] tracking-[0.08em] text-[#98917f]">
          TRAINING PAGE
        </span>
      </header>

      <div className="px-5 py-1">
        {pendingReqs.length === 0 && upcoming.length === 0 && (
          <p className="py-3 text-[13.5px] text-[#6d6759]">
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
              className="my-2.5 flex flex-wrap items-center gap-3.5 border border-[#eeece5] px-3.5 py-2.5 transition-[border-color,box-shadow] hover:border-[#d5d1c8] hover:shadow-[0_4px_14px_rgba(20,20,20,0.06)]"
            >
              <div className="w-[54px] shrink-0 bg-[#f4f1ea] py-[7px] text-center">
                <div className="font-mono text-[9.5px] tracking-[0.1em] text-[#6d6759]">
                  {DOW[d.getDay()]}
                </div>
                <div className="text-[16px] font-semibold leading-tight">
                  {String(d.getDate()).padStart(2, "0")}
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
                      setRows((prev) =>
                        prev.map((row) =>
                          row.id === s.id
                            ? { ...row, status: "confirmed" as const }
                            : row,
                        ),
                      );
                      flash(s.id);
                      notify(
                        `SESSION CONFIRMED ✓ · ${s.teacher_name.toUpperCase()} · P${s.period}`,
                      );
                      onDone();
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
                    askConfirm({
                      title: "Decline this training request?",
                      body: `${s.teacher_name} · Period ${s.period} — “${s.topic}”. The teacher sees the slot free up.`,
                      action: "Decline",
                      fn: async () => {
                        setError("");
                        const result = await declineTrainingSession(s.id, "");
                        if (!result.ok) {
                          setError(result.error);
                          throw new Error(result.error);
                        }
                        setRows((prev) =>
                          prev.map((row) =>
                            row.id === s.id
                              ? { ...row, status: "declined" as const }
                              : row,
                          ),
                        );
                        notify("REQUEST DECLINED · THE SLOT IS FREE AGAIN", {
                          bg: "#141414",
                          undo: async () => {
                            const restored = await restoreTrainingSession(
                              s.id,
                              "pending",
                            );
                            if (!restored.ok) return;
                            setRows((prev) =>
                              prev.map((row) =>
                                row.id === s.id
                                  ? { ...row, status: "pending" as const }
                                  : row,
                              ),
                            );
                            flash(s.id);
                            notify("REQUEST RESTORED ✓");
                            onDone();
                          },
                        });
                        onDone();
                      },
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
          <div className="pt-2 pb-1">
            <div className="mb-1 font-mono text-[10px] tracking-[0.16em] text-[#857e6e]">
              UPCOMING · CONFIRMED
            </div>
            {upcoming.map((s) => {
              const d = parseIso(s.session_date);
              return (
                <div
                  key={s.id}
                  className={`flex flex-wrap items-center gap-2.5 py-1.5 text-[14px] ${
                    flashId === s.id ? "kis-admin-flash" : ""
                  }`}
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
                    <span className="text-[#6d6759]">
                      &ldquo;{s.topic}&rdquo;
                    </span>
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      askConfirm({
                        title: "Cancel this session?",
                        body: `${s.teacher_name} · ${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} · Period ${s.period} — the confirmed session is removed.`,
                        action: "Cancel session",
                        fn: async () => {
                          setError("");
                          const result = await cancelTrainingSessionAdmin(s.id);
                          if (!result.ok) {
                            setError(result.error);
                            throw new Error(result.error);
                          }
                          setRows((prev) =>
                            prev.map((row) =>
                              row.id === s.id
                                ? { ...row, status: "cancelled" as const }
                                : row,
                            ),
                          );
                          notify(
                            "SESSION CANCELLED · THE SLOT IS FREE AGAIN",
                            {
                              bg: "#141414",
                              undo: async () => {
                                const restored = await restoreTrainingSession(
                                  s.id,
                                  "confirmed",
                                );
                                if (!restored.ok) return;
                                setRows((prev) =>
                                  prev.map((row) =>
                                    row.id === s.id
                                      ? {
                                          ...row,
                                          status: "confirmed" as const,
                                        }
                                      : row,
                                  ),
                                );
                                flash(s.id);
                                notify("SESSION RESTORED ✓");
                                onDone();
                              },
                            },
                          );
                          onDone();
                        },
                      });
                    }}
                    className="text-[13px] text-[#857e6e] underline hover:text-[#c8102e]"
                  >
                    Cancel
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {error && <p className="py-2 text-[14px] text-[#c8102e]">{error}</p>}
      </div>

      <footer className="border-t border-[#eeece5] px-5 py-2.5 text-[12.5px] text-[#857e6e]">
        Training slots follow the space schedule — class bookings and blocked
        periods are unavailable on the Training page automatically. Confirming
        notifies the teacher in the app.
      </footer>
    </section>
  );
}
