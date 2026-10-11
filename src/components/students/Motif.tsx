import type { CSSProperties } from "react";

/** Cross-stitch bitmaps: 'x' = stitch, '.' = empty. */
export const MOTIFS = {
  tree: [
    "....x....", "...xxx...", "..x.x.x..", "....x....", "...xxx...", ".x..x..x.",
    "..x.x.x..", "...xxx...", "....x....", "xx..x..xx", ".x..x..x.", "..x.x.x..",
    "...xxx...", "....x....", "....x....", "..xxxxx..", ".x.....x.",
  ],
  bird: [
    "..........xx", ".........xxx", "........xx..", "..xx....xxxx", ".xxxxxxxxx..",
    "xxxxxxxxx...", ".xxxxxxx....", "...xxxx.....", "....x.x.....", "....x.x.....",
  ],
  printer: [
    "xxxxxxxxxxxxx", "x...........x", "x..xxxxxxx..x", "x..x.....x..x", "x..x.....x..x",
    "x..x..x..x..x", "x..x.xxx.x..x", "x..xxxxxxx..x", "x...........x", "xxxxxxxxxxxxx",
    "xxxxxxxxxxxxx", "xx.xx...xx.xx", "xxxxxxxxxxxxx",
  ],
  smallPrinter: [
    "xxxxxxxxx", "x.......x", "x.xxxxx.x", "x.x...x.x", "x.x.x.x.x", "x.xxxxx.x",
    "xxxxxxxxx", "x.xx.xx.x", "xxxxxxxxx",
  ],
  cube: [
    "...xxx...", "..x...x..", ".x.....x.", "x...x...x", ".x.x.x.x.", "..x.x.x..",
    "...x.x...", "....x....",
  ],
  diamond: [
    ".....x.....", "....x.x....", "...x...x...", "..x..x..x..", ".x..xxx..x.",
    "x..xxxxx..x", ".x..xxx..x.", "..x..x..x..", "...x...x...", "....x.x....",
    ".....x.....",
  ],
  star: [
    "....x....", "....x....", ".x..x..x.", "..x.x.x..", "...xxx...", "xxxxxxxxx",
    "...xxx...", "..x.x.x..", ".x..x..x.", "....x....", "....x....",
  ],
  file: [
    "xxxxxx..", "x....xx.", "x....xxx", "x......x", "x.xxxx.x", "x......x",
    "x.xxxx.x", "x......x", "xxxxxxxx",
  ],
  check: [".......x", "......xx", ".....xx.", "x...xx..", "xx.xx...", ".xxx....", "..x....."],
  poster: [
    "xxxxxxxxx", "x.......x", "x.xx.xx.x", "x.......x", "x..xxx..x", "x.......x",
    "x.xxxxx.x", "x.......x", "xxxxxxxxx",
  ],
  sticker: [
    "...xxx...", ".xx...xx.", "x..x.x..x", "x...x...x", "x..x.x..x", "x.......x",
    ".xx...xx.", "...xxx...", "......x..",
  ],
  ribbon: ["x.x.x.x.x.x.x.x", ".x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x"],
} as const;

export type MotifName = keyof typeof MOTIFS;

type Props = {
  name: MotifName;
  /** Cell size in px. Can be overridden per breakpoint with a `--cell` class. */
  cell?: number;
  color?: string;
  /** Base delay (ms) before the first stitch. */
  delay?: number;
  /** Per-stitch stagger (ms). */
  speed?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

/**
 * Renders a motif as a grid of "×" glyphs that stitch themselves in on mount
 * (staggered `st-stitch`). The glyph grid is the design — never swap for art.
 */
export function Motif({
  name,
  cell,
  color = "#b5342c",
  delay = 0,
  speed = 18,
  className,
  style,
  title,
}: Props) {
  const rows = MOTIFS[name];
  let i = 0;
  return (
    <div
      className={["st-motif", className].filter(Boolean).join(" ")}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      style={
        {
          "--cols": rows[0].length,
          ...(cell ? { "--cell": `${cell}px` } : {}),
          color,
          ...style,
        } as CSSProperties
      }
    >
      {rows.flatMap((r, y) =>
        r.split("").map((ch, x) =>
          ch === "x" ? (
            <span
              key={`${y}-${x}`}
              className="x"
              style={{ animationDelay: `${delay + i++ * speed}ms` }}
            >
              ×
            </span>
          ) : (
            <span key={`${y}-${x}`} />
          ),
        ),
      )}
    </div>
  );
}

/** Nine alternating red/ink diamonds — divider + footer rule. */
export function DiamondRow({ className }: { className?: string }) {
  return (
    <div className={["st-diamond-row", className].filter(Boolean).join(" ")}>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i}>
          <Motif
            name="diamond"
            cell={5}
            color={i % 2 ? "#b5342c" : "#2a211c"}
            delay={i * 120}
            speed={6}
          />
        </div>
      ))}
    </div>
  );
}
