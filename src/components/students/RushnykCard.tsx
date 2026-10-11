"use client";

import { useLocale } from "@/components/students/Locale";
import { Motif } from "@/components/students/Motif";
import { RANKS, rankFor, type Ledger } from "@/lib/ledger";

type Props = {
  ledger: Ledger;
  /** Increment to replay the level-up burst. */
  celebrate: number;
  walletColor: string;
};

/** Rank card: cloth with five bands, stats, progress to the next rank. */
export function RushnykCard({ ledger, celebrate, walletColor }: Props) {
  const { t } = useLocale();
  const pts = ledger.earned;
  const lvl = rankFor(pts);
  const rank = RANKS[lvl];
  const next = RANKS[lvl + 1];
  const span = next ? next.min - rank.min : 1;
  const pct = next ? Math.round(((pts - rank.min) / span) * 100) : 100;
  const T = t.track;

  return (
    <div className="st-rushnyk mb-[18px] border border-[#e9dfd0] bg-white px-5 py-[18px]">
      <div className="relative">
        <div className="st-cloth">
          {RANKS.map((rk, i) => {
            const unlocked = i <= lvl && (i > 0 || pts > 0 || ledger.count > 0);
            return (
              <div
                key={rk.key}
                className="st-band"
                data-locked={!unlocked}
                title={unlocked ? T.bandStitched(T.ranks[i].name) : T.bandLocked(T.ranks[i].name, rk.min)}
              >
                <Motif
                  name={rk.band}
                  cell={i === 0 ? 4 : 5}
                  color={i % 2 ? "#2a211c" : "#b5342c"}
                  delay={i * 250}
                  speed={14}
                />
              </div>
            );
          })}
          <div className="mt-1 flex gap-[3px]" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className="block h-[10px] w-[2px] bg-[#b5342c]" />
            ))}
          </div>
        </div>
        {celebrate > 0 && (
          <div className="st-burst" key={celebrate} aria-hidden>
            {Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2;
              const d = 60 + (i % 3) * 18;
              return (
                <span
                  key={i}
                  style={
                    {
                      fontSize: `${12 + (i % 3) * 5}px`,
                      color: i % 2 ? "#b5342c" : "#2a211c",
                      "--dx": `${Math.cos(a) * d}px`,
                      "--dy": `${Math.sin(a) * d}px`,
                      animationDelay: `${i * 40}ms`,
                    } as React.CSSProperties
                  }
                >
                  ×
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="st-mono text-[10px] tracking-[0.18em] text-[#8c7a68]">{T.rushnyk}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-2.5">
          <span className="text-[30px] leading-none font-bold">{T.ranks[lvl].name}</span>
          <span className="st-mono text-[10px] tracking-[0.12em] text-[#b5342c]">{T.level(lvl)}</span>
        </div>
        <p className="mt-1.5 text-[15.5px] leading-[1.45] text-[#5e5047]">{T.ranks[lvl].blurb}</p>
        <div className="mt-3 flex flex-wrap items-baseline gap-[18px]">
          <div>
            <p className="st-mono text-[9px] tracking-[0.14em] text-[#8c7a68]">{T.pointsToSpend}</p>
            <p className="st-mono text-[24px] leading-[1.1] font-bold" style={{ color: walletColor }}>
              {ledger.balance}
            </p>
          </div>
          <div>
            <p className="st-mono text-[9px] tracking-[0.14em] text-[#8c7a68]">{T.pending}</p>
            <p className="st-mono text-[24px] leading-[1.1] font-bold text-[#c9b9a1]" title={T.pendingTip}>
              +{ledger.pending}
            </p>
          </div>
          <p className="min-w-[160px] flex-1 text-[14.5px] leading-[1.4] text-[#8c7a68]">{T.explainer}</p>
        </div>
        <div className="st-mono mt-3 flex justify-between text-[9.5px] tracking-[0.1em] text-[#8c7a68]">
          <span>{T.stitches(pts)}</span>
          <span>{next ? T.toNext(next.min - pts, T.ranks[lvl + 1].name) : T.topRank}</span>
        </div>
        <div className="st-rank-bar">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="st-mono mt-2.5 flex flex-wrap gap-3.5 text-[9.5px] tracking-[0.08em] text-[#8c7a68]">
          <span>
            <span className="text-[#2a211c]">{ledger.own}</span> {T.ownDesigns}
          </span>
          <span>
            <span className="text-[#2a211c]">{ledger.school}</span> {T.schoolProjects}
          </span>
          <span>
            <span className="text-[#2a211c]">{ledger.found}</span> {T.found}
          </span>
        </div>
      </div>
    </div>
  );
}
