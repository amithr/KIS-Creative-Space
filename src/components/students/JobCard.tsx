"use client";

import { Motif } from "@/components/students/Motif";
import { stagesFor, studentMetaLine, swatchOf, kindMeta } from "@/lib/prints";
import type { PrintRequest } from "@/lib/types";

type Props = {
  request: PrintRequest;
  index?: number;
  onCancel?: (r: PrintRequest) => void;
};

/** Job card with the 4-step stitched tracker (My requests). */
export function JobCard({ request: r, index = 0, onCancel }: Props) {
  const stages = stagesFor(r.kind);
  return (
    <article
      className="st-fadeup-4 border border-[#e9dfd0] bg-white px-[18px] py-4"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="flex items-start gap-3.5">
        <span
          className="st-diamond mt-1 !h-[22px] !w-[22px]"
          style={{ background: swatchOf(r.color) }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="st-mono shrink-0 bg-[#2a211c] px-[7px] py-[3px] text-[9px] tracking-[0.12em] text-[#fbf6ee]">
              {kindMeta(r.kind).tag}
            </span>
            <span className="truncate text-[20px] font-semibold">{r.file}</span>
          </div>
          <p className="st-mono mt-[3px] text-[10px] tracking-[0.1em] text-[#8c7a68]">
            {studentMetaLine(r)}
          </p>
        </div>
        {r.status === 0 && onCancel && (
          <button
            type="button"
            className="st-cancel"
            title="Cancel this request"
            aria-label={`Cancel ${r.file}`}
            onClick={() => onCancel(r)}
          >
            ×
          </button>
        )}
      </div>

      <div className="st-tracker" aria-label={`Stage: ${stages[r.status]}`}>
        {stages.map((label, k) => {
          const done = k < r.status;
          const current = k === r.status;
          const fg = done ? "#2f7d3f" : current ? "#b5342c" : "#c9b9a1";
          return (
            <div key={label} className="st-tracker-col">
              <span
                className="st-tracker-line"
                style={{
                  background:
                    k === 0 ? "transparent" : k <= r.status ? "#2f7d3f" : "#e9dfd0",
                }}
              />
              <span
                className="st-tracker-glyph"
                data-current={current}
                style={{ color: fg }}
              >
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
          Ready to collect from the Creativity Space — bring your student card.
        </p>
      )}
    </article>
  );
}

export function TrackTitleMotif() {
  return <Motif name="check" cell={9} color="#2f7d3f" speed={40} />;
}
