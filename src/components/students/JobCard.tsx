"use client";

import { useLocale } from "@/components/students/Locale";
import { Motif } from "@/components/students/Motif";
import { localizedMetaLine, stageNames } from "@/lib/i18n";
import { earnOf, originRule } from "@/lib/ledger";
import { colorLabel, swatchOf } from "@/lib/prints";
import { teacherName } from "@/lib/teachers";
import type { FilamentColor, PrintRequest } from "@/lib/types";

type Props = {
  request: PrintRequest;
  colors: FilamentColor[];
  index?: number;
  onCancel?: (r: PrintRequest) => void;
};

/** Job card with origin chip and the 4-step stitched tracker (My requests). */
export function JobCard({ request: r, colors, index = 0, onCancel }: Props) {
  const { t } = useLocale();
  const stages = stageNames(t, r.kind);
  const rule = originRule(r.origin);
  const earn = earnOf(r);
  const chip = rule.free
    ? t.track.chipSchool(teacherName(r.teacher))
    : `${r.origin === "mine" ? t.track.chipOwn : t.track.chipFound} · ${
        r.status === 3
          ? `+${earn}${rule.base ? ` · ${"★".repeat(r.quality)}` : ""}`
          : rule.base
            ? t.track.chipPending
            : "−10"
      }`;
  const chipTip = rule.free
    ? t.track.tipSchool
    : r.status === 3
      ? rule.base
        ? t.track.tipPaidRated
        : t.track.tipPaid
      : t.track.tipPending;
  const own = r.origin === "mine";

  return (
    <article
      className="st-fadeup-4 border border-[#e9dfd0] bg-white px-[18px] py-4"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="flex items-start gap-3.5">
        <span
          className="st-diamond mt-1 !h-[22px] !w-[22px]"
          style={{ background: swatchOf(r.color, colors) }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="st-mono shrink-0 bg-[#2a211c] px-[7px] py-[3px] text-[9px] tracking-[0.12em] text-[#fbf6ee]">
              {t.form.kinds[r.kind].tag}
            </span>
            <span className="min-w-0 truncate text-[17px] font-semibold">{r.file}</span>
            <span
              className="st-mono shrink-0 border px-[7px] py-[2px] text-[9px] tracking-[0.1em]"
              style={{
                color: own ? "#b5342c" : "#8c7a68",
                borderColor: own ? "#e7b6b1" : "#e9dfd0",
              }}
              title={chipTip}
            >
              {chip}
            </span>
          </div>
          <p className="st-mono mt-[3px] text-[10px] tracking-[0.1em] text-[#8c7a68]">
            {localizedMetaLine(r, t, colorLabel(r.color, colors))}
          </p>
        </div>
        {r.status === 0 && onCancel && (
          <button
            type="button"
            className="st-cancel"
            title={t.track.cancelTitle}
            aria-label={`${t.track.cancelTitle}: ${r.file}`}
            onClick={() => onCancel(r)}
          >
            ×
          </button>
        )}
      </div>

      <div className="st-tracker" aria-label={stages[r.status]}>
        {stages.map((label, k) => {
          const done = k < r.status;
          const current = k === r.status;
          const fg = done ? "#2f7d3f" : current ? "#b5342c" : "#c9b9a1";
          return (
            <div key={label} className="st-tracker-col">
              <span
                className="st-tracker-line"
                style={{ background: k === 0 ? "transparent" : k <= r.status ? "#2f7d3f" : "#e9dfd0" }}
              />
              <span className="st-tracker-glyph" data-current={current} style={{ color: fg }}>
                {done || current ? "×" : "·"}
              </span>
              <span className="st-tracker-label" style={{ color: fg }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {r.status === 3 && (
        <p className="mt-3 border border-[#e9dfd0] bg-[#fbf6ee] px-3.5 py-2.5 text-[16px]">
          {t.track.readyNotice}
        </p>
      )}
    </article>
  );
}

export function TrackTitleMotif() {
  return <Motif name="check" cell={9} color="#2f7d3f" speed={40} />;
}
