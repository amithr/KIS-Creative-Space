"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  adminDeletePrintRequest,
  adminRestorePrintRequest,
  adminSetPrintStatus,
} from "@/app/admin/actions";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAdminWrite } from "@/components/admin/AdminWriteFeedback";
import {
  PRINT_FILES_BUCKET,
  adminMetaLine,
  filterPrints,
  formatDueShort,
  isOverdue,
  kindMeta,
  sortAdminPrints,
  stagesFor,
  swatchOf,
  type PrintFilter,
} from "@/lib/prints";
import { getSupabaseUrl } from "@/lib/supabase/env";
import type { PrintRequest } from "@/lib/types";

type Props = {
  requests: PrintRequest[];
  onDone?: () => void;
};

const STAGE_TONES = [
  { bg: "#eeece5", fg: "#3f3b33" }, // RECEIVED
  { bg: "#fdf4e3", fg: "#9a6e06" }, // mid
  { bg: "#fdf4e3", fg: "#9a6e06" }, // mid
  { bg: "#dff2e3", fg: "#2f7d3f" }, // READY
];

function fileUrl(path: string | null) {
  const base = getSupabaseUrl();
  if (!path || !base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${PRINT_FILES_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function AdminPrintsPanel({ requests: initial, onDone }: Props) {
  const [rows, setRows] = useState(initial);
  const [seen, setSeen] = useState(initial);
  const [filter, setFilter] = useState<PrintFilter>("open");
  const [justId, setJustId] = useState<string | null>(null);
  const askConfirm = useConfirm();
  const { notify } = useAdminWrite();
  const [pending, startTransition] = useTransition();

  // Server refresh → adopt the new list (state derived from props).
  if (seen !== initial) {
    setSeen(initial);
    setRows(initial);
  }

  const open = useMemo(() => rows.filter((r) => r.status < 3).length, [rows]);
  const visible = useMemo(
    () => sortAdminPrints(filterPrints(rows, filter)),
    [rows, filter],
  );

  function flash(id: string) {
    setJustId(id);
    window.setTimeout(() => setJustId((cur) => (cur === id ? null : cur)), 900);
  }

  function setStatus(r: PrintRequest, status: 0 | 1 | 2 | 3) {
    if (r.status === status) return;
    const prev = r.status;
    const label = stagesFor(r.kind)[status];
    setRows((list) =>
      list.map((x) => (x.id === r.id ? { ...x, status } : x)),
    );
    flash(r.id);
    startTransition(async () => {
      const result = await adminSetPrintStatus(r.id, status);
      if (!result.ok) {
        setRows((list) =>
          list.map((x) => (x.id === r.id ? { ...x, status: prev } : x)),
        );
        notify(result.error, { bg: "#c8102e" });
        return;
      }
      if (result.request) {
        const updated = result.request;
        setRows((list) => list.map((x) => (x.id === r.id ? updated : x)));
      }
      notify(
        `${r.file.toUpperCase()} → ${label}`,
        {
          undo: async () => {
            setRows((list) =>
              list.map((x) => (x.id === r.id ? { ...x, status: prev } : x)),
            );
            const back = await adminSetPrintStatus(r.id, prev);
            if (back.ok) {
              flash(r.id);
              notify("STAGE RESTORED ✓");
            } else {
              notify(back.error, { bg: "#c8102e" });
            }
            onDone?.();
          },
        },
      );
      onDone?.();
    });
  }

  function remove(r: PrintRequest) {
    askConfirm({
      title: "Remove this request?",
      body: `${r.file} from ${r.name} — the student will no longer see it.`,
      action: "Remove request",
      fn: () => {
        startTransition(async () => {
          const result = await adminDeletePrintRequest(r.id);
          if (!result.ok) {
            notify(result.error, { bg: "#c8102e" });
            return;
          }
          const snap = result.request ?? r;
          setRows((list) => list.filter((x) => x.id !== r.id));
          notify("REQUEST REMOVED", {
            bg: "#141414",
            undo: async () => {
              const restored = await adminRestorePrintRequest(snap);
              if (restored.ok && restored.request) {
                const back = restored.request;
                setRows((list) => [back, ...list.filter((x) => x.id !== back.id)]);
                flash(back.id);
                notify("REQUEST RESTORED ✓");
              } else if (!restored.ok) {
                notify(restored.error, { bg: "#c8102e" });
              }
              onDone?.();
            },
          });
          onDone?.();
        });
      },
    });
  }

  const filters: { v: PrintFilter; label: string }[] = [
    { v: "open", label: `OPEN · ${open}` },
    { v: "ready", label: "READY" },
    { v: "vinyl", label: "VINYL ONLY" },
    { v: "all", label: `ALL · ${rows.length}` },
  ];

  return (
    <div className="no-print page-gutter flex flex-col gap-4 pb-11">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="mr-2 text-[13.5px] text-[#857e6e]">
          Requests from the{" "}
          <Link
            href="/"
            className="font-semibold text-[#c8102e] hover:underline"
          >
            student site
          </Link>{" "}
          — move each job along as you work it.
        </p>
        <div className="flex-1" />
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter print requests">
          {filters.map((f) => {
            const on = filter === f.v;
            return (
              <button
                key={f.v}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(f.v)}
                className="rounded-full px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] transition-colors"
                style={{
                  background: on ? "#141414" : "#fff",
                  color: on ? "#fff" : "#6d6759",
                  border: `1px solid ${on ? "#141414" : "#e3e0d8"}`,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 && (
        <p className="border border-dashed border-[#d5d1c8] p-9 text-center text-[15px] text-[#6d6759]">
          {rows.length === 0
            ? "No print requests yet — students send them from the student site."
            : "Nothing in this view."}
        </p>
      )}

      {visible.map((r) => {
        const over = isOverdue(r);
        const stages = stagesFor(r.kind);
        const url = fileUrl(r.file_path);
        return (
          <article
            key={r.id}
            className={`border border-[#e3e0d8] bg-white ${justId === r.id ? "kis-admin-flash" : ""}`}
            style={{
              borderTop: `3px solid ${r.status === 3 ? "#2f9e44" : over ? "#c8102e" : "#141414"}`,
            }}
          >
            <div className="flex flex-wrap items-center gap-3.5 px-5 py-3.5">
              <span className="shrink-0 bg-[#141414] px-[9px] py-1 font-mono text-[9.5px] tracking-[0.12em] text-white">
                {kindMeta(r.kind).tag}
              </span>
              <span
                className="h-4 w-4 shrink-0 border border-[rgba(20,20,20,0.25)]"
                style={{ background: swatchOf(r.color, true) }}
                title={r.color === "vinyl" ? "Vinyl" : r.color}
                aria-hidden
              />
              <div className="min-w-[220px] flex-1">
                <p className="text-[16.5px] font-semibold">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open the uploaded file"
                      className="hover:text-[#c8102e] hover:underline"
                    >
                      {r.file}
                    </a>
                  ) : (
                    r.file
                  )}
                </p>
                <p className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#857e6e]">
                  {adminMetaLine(r)}
                </p>
              </div>
              <span
                className="shrink-0 font-mono text-[10.5px] tracking-[0.08em]"
                style={{ color: over ? "#c8102e" : "#857e6e" }}
              >
                {r.due
                  ? `${over ? "OVERDUE" : "NEEDED"} · ${formatDueShort(r.due).toUpperCase()}`
                  : "NO DEADLINE"}
              </span>
              <div className="flex w-full lg:w-auto">
                <div
                  className="flex shrink-0 overflow-hidden rounded-full border border-[#e3e0d8]"
                  role="radiogroup"
                  aria-label={`Stage for ${r.file}`}
                >
                  {stages.map((label, i) => {
                    const cur = r.status === i;
                    const tone = STAGE_TONES[i];
                    return (
                      <button
                        key={label}
                        type="button"
                        role="radio"
                        aria-checked={cur}
                        disabled={pending && cur}
                        onClick={() => setStatus(r, i as 0 | 1 | 2 | 3)}
                        className="px-[11px] py-[5px] font-mono text-[9.5px] tracking-[0.08em] transition-colors hover:text-[#141414]"
                        style={{
                          background: cur ? tone.bg : "#fff",
                          color: cur ? tone.fg : "#b5afa1",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                title="Remove request"
                aria-label={`Remove ${r.file}`}
                onClick={() => remove(r)}
                className="px-1.5 text-[17px] text-[#857e6e] hover:text-[#c8102e]"
              >
                ×
              </button>
            </div>
            {r.notes && (
              <p className="border-t border-[#eeece5] px-5 pt-2.5 pb-3 text-[13.5px] text-[#6d6759]">
                “{r.notes}”
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
