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
  /** The brand mark: a stitched D (for Design); the centre stitch is red. */
  logoD: ["xxxxx..", "x....x.", "x.....x", "x..x..x", "x.....x", "x....x.", "xxxxx.."],
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
  /** One stitch in a second colour (row/col into the bitmap). */
  accent?: { row: number; col: number; color: string };
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
  accent,
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
              style={{
                animationDelay: `${delay + i++ * speed}ms`,
                ...(accent && accent.row === y && accent.col === x ? { color: accent.color } : {}),
              }}
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

/** The three palettes the mark may be set in (CHANGES-naming-and-logo.md). */
const MARK_TONES = {
  /** Ink on cream/white — the default. */
  ink: { color: "#2a211c", accent: "#b5342c" },
  /** Cream on ink backgrounds (admin band, dark footers). */
  cream: { color: "#fbf6ee", accent: "#e2b1ab" },
  /** Cream on the red tile — app icon / favicon / avatar. */
  onRed: { color: "#fbf6ee", accent: "#2a211c" },
} as const;

type BrandMarkProps = {
  /** Overall size in px (the mark is 7 cells square); nav uses 38–44. */
  size?: number;
  tone?: keyof typeof MARK_TONES;
  delay?: number;
  speed?: number;
  className?: string;
  title?: string;
};

/**
 * KIS Design Studio mark: the stitched D rendered as the same glyph grid as
 * every other motif, so it embroiders itself in on first paint. Static SVG
 * versions live in /public/brand for favicons, emails and social.
 */
export function BrandMark({
  size = 42,
  tone = "ink",
  delay = 0,
  speed = 30,
  className,
  title,
}: BrandMarkProps) {
  const t = MARK_TONES[tone];
  return (
    <Motif
      name="logoD"
      cell={size / 7}
      color={t.color}
      accent={{ row: 3, col: 3, color: t.accent }}
      delay={delay}
      speed={speed}
      className={className}
      title={title}
    />
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
