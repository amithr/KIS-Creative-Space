"use client";

import Link from "next/link";
import { useLocale } from "@/components/students/Locale";
import { DiamondRow, Motif, type MotifName } from "@/components/students/Motif";
import { RANKS, rankFor, type LeaderRow } from "@/lib/ledger";

const STEP_MOTIFS: { motif: MotifName; delay: number; speed: number }[] = [
  { motif: "cube", delay: 0, speed: 25 },
  { motif: "file", delay: 300, speed: 25 },
  { motif: "smallPrinter", delay: 600, speed: 20 },
  { motif: "check", delay: 900, speed: 40 },
];

type Props = {
  board: LeaderRow[];
  showLeaderboard: boolean;
  /** Counts for the hero live line (ON THE PRINTERS). */
  live: { printing: number; queued: number };
};

export function StudentLanding({ board, showLeaderboard, live }: Props) {
  const { t } = useLocale();
  const L = t.landing;
  const showBoard = showLeaderboard && board.length >= 3;
  return (
    <>
      <section className="st-grid-hero st-gutter pt-14 pb-9">
        <div className="st-fadeup">
          <p className="st-mono text-[12px] tracking-[0.2em] text-[#b5342c]">{L.eyebrow}</p>
          <h1
            className="mt-3.5 text-[clamp(42px,6vw,76px)] leading-[1.0] font-semibold tracking-[-0.01em]"
            style={{ textWrap: "balance" }}
          >
            {L.headline}
          </h1>
          <p
            className="mt-[18px] max-w-[520px] text-[18.5px] leading-[1.55] text-[#5e5047]"
            style={{ textWrap: "pretty" }}
          >
            {L.body}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/print?kind=3d" className="st-btn st-btn-red !text-[#fbf6ee]">
              {L.btn3d}
            </Link>
            <Link href="/print?kind=sticker" className="st-btn st-btn-ink !text-[#fbf6ee]">
              {L.btnVinyl}
            </Link>
            <Link href="/requests" className="st-btn st-btn-outline">
              {L.btnTrack}
            </Link>
          </div>
          <Link href="/board" className="st-live-line">
            <span className="st-live-dot" aria-hidden />
            {live.printing
              ? L.liveNow(live.printing)
              : live.queued
                ? L.liveQueue(live.queued)
                : L.liveSee}
          </Link>
        </div>
        <div className="st-hero-motifs">
          <div className="st-sway">
            <Motif name="tree" className="st-hero-tree" speed={22} />
          </div>
          <div>
            <Motif name="printer" className="st-hero-printer" delay={400} speed={10} />
          </div>
          <div className="st-sway-7">
            <Motif name="bird" className="st-hero-bird" delay={900} speed={20} />
          </div>
        </div>
      </section>

      <DiamondRow />

      <section className="st-gutter pt-9 pb-5">
        <p className="st-mono text-[12px] tracking-[0.2em] text-[#8c7a68]">{L.how}</p>
        <div className="st-grid-steps mt-[18px]">
          {L.steps.map((st, i) => (
            <article key={st.n} className="st-step-card" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="flex items-center justify-between">
                <span className="st-mono text-[12px] tracking-[0.14em] text-[#b5342c]">{st.n}</span>
                <Motif
                  name={STEP_MOTIFS[i].motif}
                  cell={5}
                  delay={STEP_MOTIFS[i].delay}
                  speed={STEP_MOTIFS[i].speed}
                />
              </div>
              <h2 className="mt-2.5 text-[25px] leading-[1.15] font-semibold">{st.title}</h2>
              <p className="mt-2 text-[16.5px] leading-[1.55] text-[#5e5047]" style={{ textWrap: "pretty" }}>
                {st.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* rushnyk teaser */}
      <section
        className="st-grid-rules st-fadeup mx-[5vw] mt-6 border border-[#e9dfd0] bg-white px-7 py-6"
        style={{ animationDelay: ".2s", animationDuration: ".5s" }}
      >
        <div>
          <p className="st-mono text-[12px] tracking-[0.2em] text-[#b5342c]">{L.teaserEyebrow}</p>
          <h2 className="mt-2 text-[30px] leading-[1.15] font-semibold">{L.teaserTitle}</h2>
          <p className="mt-2 text-[17px] leading-[1.55] text-[#5e5047]" style={{ textWrap: "pretty" }}>
            {L.teaserBody}
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-center gap-[18px]">
          {RANKS.map((rk, i) => (
            <div key={rk.key} className="flex flex-col items-center gap-2">
              <Motif
                name={rk.band}
                cell={4}
                color={i % 2 ? "#2a211c" : "#b5342c"}
                delay={600 + i * 300}
                speed={12}
              />
              <span className="st-mono text-center text-[8.5px] tracking-[0.1em] text-[#8c7a68]">
                {t.track.ranks[i].short}
              </span>
            </div>
          ))}
        </div>
      </section>

      {showBoard && (
        <section
          className="st-fadeup mx-[5vw] mt-6 border border-[#e9dfd0] bg-white px-7 py-6"
          style={{ animationDelay: ".25s", animationDuration: ".5s" }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="st-mono text-[12px] tracking-[0.2em] text-[#b5342c]">{L.boardEyebrow}</p>
            <p className="st-mono text-[10.5px] tracking-[0.1em] text-[#8c7a68]">{L.boardMeta(board.length)}</p>
          </div>
          <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {board.map((b, i) => {
              const ri = rankFor(b.earned);
              return (
                <div
                  key={b.email}
                  className="flex items-center gap-3.5 border border-[#e9dfd0] px-3.5 py-3"
                  style={{ background: i === 0 ? "#fbf6ee" : "#fff" }}
                >
                  <span
                    className="st-mono min-w-[28px] text-[22px] font-bold"
                    style={{ color: i === 0 ? "#b5342c" : "#c9b9a1" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[18px] font-semibold">{b.name}</p>
                    <p className="st-mono mt-0.5 text-[10px] tracking-[0.1em] text-[#8c7a68]">
                      {L.boardRow(t.track.ranks[ri].short, b.earned, b.own)}
                    </p>
                  </div>
                  <Motif
                    name={RANKS[ri].band}
                    cell={3}
                    color={i === 0 ? "#b5342c" : "#c9b9a1"}
                    delay={i * 150}
                    speed={10}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="st-grid-rules mx-[5vw] mt-6 mb-14 bg-[#2a211c] px-[30px] py-7 text-[#fbf6ee]">
        <div>
          <p className="st-mono text-[12px] tracking-[0.2em] text-[#e2b1ab]">{L.rulesEyebrow}</p>
          <h2 className="mt-2 text-[30px] leading-[1.15] font-semibold">{L.rulesTitle}</h2>
        </div>
        <ul className="flex flex-col gap-2.5 text-[16.5px] leading-[1.45]">
          {L.rules.map((rule) => (
            <li key={rule} className="flex gap-3">
              <span className="st-mono text-[#e2b1ab]">×</span>
              {rule}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
