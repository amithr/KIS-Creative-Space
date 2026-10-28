"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { listLiveBoard } from "@/app/actions/prints";
import { useLocale } from "@/components/students/Locale";
import { Motif } from "@/components/students/Motif";
import { useStudentToast } from "@/components/students/StudentToast";
import {
  agoBucket,
  boardCounts,
  groupLiveJobs,
  needleLeft,
  type LiveJob,
} from "@/lib/board";
import { stageNames, type Strings } from "@/lib/i18n";
import { swatchOf } from "@/lib/prints";
import type { FilamentColor } from "@/lib/types";

const POLL_MS = 12000;
const RED = "#b5342c";
const INK = "#2a211c";
const GREEN = "#2f7d3f";
const FAINT = "#d9cdbb";
const HAIR = "#e9dfd0";

type Props = { initial: LiveJob[]; colors: FilamentColor[]; serverNow: number };

/**
 * ON THE PRINTERS (handoff Part A §3b): every open job plus READY ones for
 * three days, grouped by stage, names only. Polls while the tab is visible.
 */
export function LiveBoardClient({ initial, colors, serverNow }: Props) {
  const { t } = useLocale();
  const toast = useStudentToast();
  const [jobs, setJobs] = useState<LiveJob[]>(initial);
  const [now, setNow] = useState(serverNow);
  const opened = useRef(false);

  const load = useCallback(async () => {
    try {
      const list = await listLiveBoard();
      setJobs(list);
      setNow(Date.now());
    } catch {
      // keep the last good board; the next tick retries
    }
  }, []);

  // "LIVE · N JOBS ON THE GO" once, right after the board paints.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const open = boardCounts(initial).open;
    const tm = window.setTimeout(() => toast(t.board.openToast(open)), 150);
    return () => window.clearTimeout(tm);
  }, [initial, toast, t.board]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void load();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  const counts = boardCounts(jobs);
  const groups = groupLiveJobs(jobs);
  const B = t.board;
  const headline = counts.printing
    ? counts.printing === 1
      ? B.headlineOne
      : B.headlinePrinting(counts.printing)
    : counts.queued
      ? B.headlineQueue(counts.queued)
      : counts.ready
        ? B.headlineReady
        : B.headlineQuiet;
  const counters = [
    { n: counts.queued, label: B.counters.queued, color: INK },
    { n: counts.printing, label: B.counters.printing, color: RED },
    { n: counts.ready, label: B.counters.ready, color: GREEN },
  ];

  return (
    <>
      <section className="st-fadeup-4 st-gutter flex flex-wrap items-end justify-between gap-5 pt-10 pb-2.5">
        <div>
          <p className="st-mono text-[11.5px] tracking-[0.2em] text-[#b5342c]">{B.eyebrow}</p>
          <h1 className="mt-2.5 text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-semibold">
            {headline}
          </h1>
          <p className="mt-2 text-[17px] text-[#5e5047]">{B.lede}</p>
        </div>
        <div className="flex flex-wrap items-end gap-7">
          {counters.map((c, i) => (
            <div
              key={c.label}
              className="st-fadeup-4 text-center"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <p
                className="st-mono text-[34px] leading-none font-bold"
                style={{ color: c.color }}
              >
                {c.n}
              </p>
              <p className="st-mono mt-1.5 text-[10px] tracking-[0.16em] text-[#8c7a68]">
                {c.label}
              </p>
            </div>
          ))}
          <div className="st-sway">
            <Motif name="printer" cell={7} speed={25} />
          </div>
        </div>
      </section>

      {jobs.length === 0 && (
        <p className="mx-[5vw] mt-7 mb-14 border border-dashed border-[#d9cdbb] px-6 py-10 text-center text-[18px] leading-[1.5] text-[#8c7a68]">
          {B.emptyPre}
          <Link href="/print" className="font-semibold !text-[#b5342c]">
            {B.emptyLink}
          </Link>
          {B.emptyPost}
        </p>
      )}

      {groups.length > 0 && (
        <div className="mx-[5vw] mt-7 mb-14 flex flex-col gap-7">
          {groups.map((g, gi) => (
            <section
              key={g.key}
              className="st-fadeup-45"
              style={{ animationDelay: `${gi * 0.1}s` }}
              aria-label={B.groups[g.key]}
            >
              <header className="st-group-head">
                <span
                  className="st-group-dot"
                  data-active={g.active}
                  style={{ background: g.color }}
                  aria-hidden
                />
                <span className="st-mono text-[12.5px] tracking-[0.18em] text-[#2a211c]">
                  {B.groups[g.key]}
                </span>
                <span className="st-mono text-[10.5px] tracking-[0.1em] text-[#8c7a68]">
                  {B.jobs(g.jobs.length)}
                </span>
                <span
                  className="st-thread-rule"
                  data-active={g.active}
                  style={{
                    background: g.active
                      ? `repeating-linear-gradient(90deg, ${g.color} 0 8px, transparent 8px 12px)`
                      : HAIR,
                  }}
                  aria-hidden
                />
              </header>
              <div className="flex flex-col gap-2">
                {g.jobs.map((r, i) => (
                  <BoardRow key={r.id} job={r} index={i} colors={colors} now={now} t={t} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="st-gutter -mt-[30px] mb-14 text-[14px] text-[#8c7a68]">
        {B.footer}{" "}
        <Link href="/print" className="font-semibold !text-[#b5342c]">
          {B.footerLink}
        </Link>
      </p>
    </>
  );
}

type RowProps = {
  job: LiveJob;
  index: number;
  colors: FilamentColor[];
  now: number;
  t: Strings;
};

function BoardRow({ job: r, index, colors, now, t }: RowProps) {
  const stages = stageNames(t, r.kind);
  const cur = r.status;
  const ready = cur === 3;
  const ago = agoBucket(r.at, now);
  const stageColor = ready ? GREEN : cur === 0 ? "#8c7a68" : RED;
  return (
    <article
      className="st-board-row"
      data-ready={ready}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="st-board-tile" aria-hidden>
        <span className="st-board-swatch" style={{ background: swatchOf(r.color, colors) }} />
        <span className="st-board-tag">{t.board.kindTag[r.kind]}</span>
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-baseline gap-2.5">
          <span className="max-w-full truncate text-[19px] font-semibold">{r.file}</span>
          <span className="st-mono text-[10.5px] tracking-[0.1em] text-[#8c7a68]">
            {t.board.by(r.who || t.board.someone)}
          </span>
        </div>
        <ThreadTracker stages={stages} cur={cur} rowIndex={index} />
      </div>
      <div className="st-board-right">
        <span
          className="st-mono inline-flex items-center gap-2 text-[11px] tracking-[0.12em]"
          style={{ color: stageColor }}
        >
          {ready && (
            <span className="st-readypulse inline-block" aria-hidden>
              ✓
            </span>
          )}
          {stages[cur]}
        </span>
        <span className="st-mono mt-1 block text-[9.5px] tracking-[0.1em] text-[#8c7a68]">
          {t.board.ago[ago.unit](ago.n)}
        </span>
      </div>
    </article>
  );
}

/**
 * Thread tracker: one bold × per stage joined by 2px lines. Completed stitches
 * are red, the current one ink (green when READY) with a glow, future ones
 * faint; the line leaving the current stitch is a running dashed thread and a
 * needle bobs over the current stitch while the job is on the machines.
 */
function ThreadTracker({
  stages,
  cur,
  rowIndex,
}: {
  stages: string[];
  cur: number;
  rowIndex: number;
}) {
  const n = stages.length;
  return (
    <div className="st-thread" aria-hidden>
      {stages.map((label, k) => {
        const last = k === n - 1;
        const color = k < cur ? RED : k === cur ? (cur === 3 ? GREEN : INK) : FAINT;
        const anim =
          k === cur && cur > 0 && cur < 3
            ? "st-glow 1.6s ease-in-out infinite"
            : k <= cur
              ? `st-stitch 0.45s ease ${rowIndex * 60 + k * 90}ms both`
              : "none";
        const lineBg =
          k < cur
            ? RED
            : k === cur && cur < 3
              ? `repeating-linear-gradient(90deg, ${RED} 0 6px, transparent 6px 12px)`
              : HAIR;
        const lineAnim = k === cur && cur < 3 ? "st-threadrun 1s linear infinite" : "none";
        return (
          <div key={label} className="st-thread-step" data-last={last}>
            <span className="st-thread-x" title={label} style={{ color, animation: anim }}>
              ×
            </span>
            {!last && (
              <span className="st-thread-line" style={{ background: lineBg, animation: lineAnim }} />
            )}
          </div>
        );
      })}
      {cur > 0 && cur < 3 && (
        <span className="st-needle" style={{ left: needleLeft(cur, n) }}>
          <span />
        </span>
      )}
    </div>
  );
}
