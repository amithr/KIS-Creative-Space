"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  adminDeleteWednesdayEntry,
  adminRestoreWednesdayEntry,
} from "@/app/admin/actions";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAdminWrite } from "@/components/admin/AdminWriteFeedback";
import { toISODate } from "@/lib/inventory";
import {
  formatWedLong,
  nextWednesdays,
} from "@/lib/wednesdays";
import type { WednesdayEntry } from "@/lib/types";

type Props = {
  entries: WednesdayEntry[];
  onDone?: () => void;
};

export function AdminWednesdaysPanel({ entries: initial, onDone }: Props) {
  const [entries, setEntries] = useState(initial);
  const askConfirm = useConfirm();
  const { notify } = useAdminWrite();
  const [, startTransition] = useTransition();

  useEffect(() => {
    setEntries(initial);
  }, [initial]);

  const weds = useMemo(() => nextWednesdays(), []);
  const total = useMemo(() => {
    const isos = new Set(weds.map((d) => toISODate(d)));
    return entries.filter((e) => isos.has(e.session_date)).length;
  }, [entries, weds]);

  function remove(entry: WednesdayEntry) {
    askConfirm({
      title: "Remove this sign-up?",
      body: `P${entry.period} · ${entry.cls} — “${entry.text}”. The teacher will see it disappear in the app.`,
      action: "Remove sign-up",
      fn: () => {
        startTransition(async () => {
          const snap = entry;
          const result = await adminDeleteWednesdayEntry(entry.id);
          if (!result.ok) {
            notify(result.error, { bg: "#c8102e" });
            return;
          }
          setEntries((prev) => prev.filter((e) => e.id !== entry.id));
          notify(`SIGN-UP REMOVED · P${snap.period} · ${snap.cls}`, {
            bg: "#141414",
            undo: async () => {
              const restored = await adminRestoreWednesdayEntry(snap);
              if (restored.ok && restored.entry) {
                setEntries((prev) => [...prev, restored.entry!]);
                notify("SIGN-UP RESTORED ✓");
              }
            },
          });
          onDone?.();
        });
      },
    });
  }

  return (
    <div className="page-gutter pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold">Wednesdays</h2>
          <p className="mt-1 text-[13.5px] text-[#857e6e]">
            Design-session sign-ups from the app — resources teachers asked
            for are highlighted so you can prep the studio.
          </p>
        </div>
        {total > 0 && (
          <span className="rounded-full bg-[#eeece5] px-3 py-1 font-mono text-[11px] tracking-[0.1em] text-[#3f3b33]">
            {total} SIGN-UP{total === 1 ? "" : "S"}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {weds.map((d, i) => {
          const iso = toISODate(d);
          const rows = entries
            .filter((e) => e.session_date === iso)
            .slice()
            .sort((a, b) => a.period - b.period);
          const hasResources = rows.some((r) => r.resources);
          return (
            <div
              key={iso}
              className="border border-[#e3e0d8] border-t-[3px] border-t-[#141414] bg-white"
            >
              <div className="flex flex-wrap items-center gap-2.5 border-b border-[#eeece5] px-[18px] py-3">
                <h3 className="text-[16px] font-semibold">
                  {i === 0
                    ? `This Wednesday · ${d.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`
                    : formatWedLong(d).replace("Wednesday ", "Wednesday · ")}
                </h3>
                <span className="rounded-full bg-[#eeece5] px-2.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-[#3f3b33]">
                  {rows.length} {rows.length === 1 ? "CLASS" : "CLASSES"}
                </span>
                {hasResources && (
                  <span className="rounded-full bg-[#fdf4e3] px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-[#9a6e06]">
                    ⚒ RESOURCES TO PREP
                  </span>
                )}
              </div>

              {rows.length === 0 ? (
                <p className="px-[18px] py-6 text-[14px] text-[#98917f]">
                  No classes signed up yet.
                </p>
              ) : (
                rows.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3.5 border-b border-[#eeece5] px-[18px] py-3 last:border-b-0"
                  >
                    <span className="shrink-0 bg-[#141414] px-2.5 py-1 font-mono text-[11px] tracking-[0.1em] text-white">
                      P{r.period}
                    </span>
                    <span className="shrink-0 bg-[#eeece5] px-2 py-1 font-mono text-[11.5px] font-bold text-[#3f3b33]">
                      {r.cls}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] leading-snug">{r.text}</p>
                      {r.resources && (
                        <span className="mt-1 inline-flex rounded-full bg-[#fdf4e3] px-2 py-0.5 font-mono text-[8.5px] tracking-[0.08em] text-[#9a6e06]">
                          ⚒ NEEDS: {r.resources.toUpperCase()}
                        </span>
                      )}
                      <p className="mt-0.5 font-mono text-[9px] tracking-[0.08em] text-[#98917f]">
                        {r.email.toUpperCase()}
                        {r.project_id ? " · FROM A CLASS PROJECT" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="Remove sign-up"
                      onClick={() => remove(r)}
                      className="shrink-0 px-1 text-[16px] text-[#98917f] hover:text-[#c8102e]"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
