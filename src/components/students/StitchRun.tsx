"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/students/Locale";
import type { Strings } from "@/lib/i18n";

/**
 * Stitch Run — the student site's secret runner (README §7).
 *
 * Opens when the word "stitch" is typed anywhere outside a text field, or
 * from the near-invisible "· ×" in the footer. Everything on the canvas is
 * drawn as "×" glyphs; the loop stops the moment the modal closes.
 */

const W = 720;
const H = 220;
const CELL = 6;
const HI_KEY = "kis-stitch-run-hi";
const TRIGGER = "stitch";

const RUN: string[][] = [
  ["..xxx..", "..xxx..", "...x...", ".xxxxx.", "x..x..x", "...x...", "..x.x..", ".x...x.", "xx...xx"],
  ["..xxx..", "..xxx..", "...x...", ".xxxxx.", "x..x..x", "...x...", "..xxx..", "..x.x..", "..x.x.."],
];
const DUCK = [".......", ".......", ".......", "..xxx..", "..xxx.xx", "xxxxxxx", "x.x.x..", ".x...x.", "xx...xx"];
const CACTUS: Record<"s" | "m" | "b", string[]> = {
  s: [".x.", "xxx", "xx.", ".xx", ".x.", ".x."],
  m: ["..x..", "x.x.x", "xxxxx", "..x..", "..x..", "..x..", "..x.."],
  b: ["..x....x..", "x.x..x.x.x", "xxxxxxxxxx", "..x....x..", "..x....x..", "..x....x..", "..x....x.."],
};
const BIRD: string[][] = [
  ["..xx....", "xxxxxxxx", "..xxxx..", "...x...."],
  ["........", "xxxxxxxx", "..xxxx..", "..xx...."],
];
const CLOUD = [".x.x.", "x.x.x", ".x.x."];
const BIG_X = ["x...x", ".x.x.", "..x..", ".x.x.", "x...x"];

const RED = "#b5342c";
const INK = "#2a211c";
const FAINT = "#d9cdbb";
const MONO = "'Space Mono', 'IBM Plex Mono', ui-monospace, monospace";

type Obstacle = { kind: "bird" | "s" | "m" | "b"; x: number; y: number; w: number; h: number };
type Cloud = { x: number; y: number; s: number };
type Game = {
  t: number;
  speed: number;
  score: number;
  dist: number;
  over: boolean;
  started: boolean;
  y: number;
  vy: number;
  duck: boolean;
  obs: Obstacle[];
  clouds: Cloud[];
  nextObs: number;
};

function readHi() {
  try {
    return Number(localStorage.getItem(HI_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}
function writeHi(n: number) {
  try {
    localStorage.setItem(HI_KEY, String(n));
  } catch {
    // ignore
  }
}

function fresh(): Game {
  return {
    t: 0,
    speed: 5,
    score: 0,
    dist: 0,
    over: false,
    started: false,
    y: 0,
    vy: 0,
    duck: false,
    obs: [],
    clouds: Array.from({ length: 4 }, () => ({
      x: Math.random() * W,
      y: 20 + Math.random() * 60,
      s: 0.3 + Math.random() * 0.4,
    })),
    nextObs: 60,
  };
}

function drawMotif(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  cell: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.font = `700 ${cell * 1.3}px ${MONO}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  rows.forEach((r, ry) => {
    for (let rx = 0; rx < r.length; rx++) {
      if (r[rx] === "x") ctx.fillText("×", x + rx * cell + cell / 2, y + ry * cell);
    }
  });
}

function tick(g: Game, ctx: CanvasRenderingContext2D, T: Strings["game"], onOver: (score: number) => void) {
  const groundY = H - 40;
  ctx.clearRect(0, 0, W, H);

  // sky stitches
  for (const c of g.clouds) {
    if (g.started && !g.over) c.x -= c.s * g.speed * 0.3;
    if (c.x < -60) {
      c.x = W + 20;
      c.y = 20 + Math.random() * 60;
    }
    drawMotif(ctx, CLOUD, c.x, c.y, 5, "#e9dfd0");
  }

  // ground
  ctx.fillStyle = INK;
  ctx.fillRect(0, groundY + CELL * 1.5, W, 1.5);
  const off = -(g.dist % (CELL * 2));
  ctx.fillStyle = FAINT;
  ctx.font = `700 8px ${MONO}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  for (let x = off; x < W + CELL; x += CELL * 2) ctx.fillText("×", x, groundY + CELL * 2);

  if (g.started && !g.over) {
    g.t++;
    g.dist += g.speed;
    g.score = Math.floor(g.dist / 12);
    g.speed = 5 + Math.min(7, Math.floor(g.score / 100) * 0.6);
    g.vy += 0.6;
    g.y = Math.min(0, g.y + g.vy);
    if (g.y === 0) g.vy = 0;
    g.nextObs -= g.speed;
    if (g.nextObs <= 0) {
      const bird = g.score > 150 && Math.random() < 0.3;
      if (bird) {
        g.obs.push({ kind: "bird", x: W + 20, y: groundY - (Math.random() < 0.5 ? 14 : 44), w: 44, h: 22 });
      } else {
        const k = (["s", "m", "b"] as const)[Math.floor(Math.random() * (g.score > 60 ? 3 : 2))];
        const m = CACTUS[k];
        g.obs.push({
          kind: k,
          x: W + 20,
          w: m[0].length * CELL,
          h: m.length * CELL,
          y: groundY + CELL * 1.5 - m.length * CELL,
        });
      }
      g.nextObs = 220 + Math.random() * 260 - Math.min(120, g.score);
    }
    for (const o of g.obs) o.x -= g.speed * (o.kind === "bird" ? 1.3 : 1);
    g.obs = g.obs.filter((o) => o.x > -80);
  }

  // obstacles
  for (const o of g.obs) {
    if (o.kind === "bird") drawMotif(ctx, BIRD[Math.floor(g.t / 8) % 2], o.x, o.y, 5.5, INK);
    else drawMotif(ctx, CACTUS[o.kind], o.x, o.y, CELL, "#6d8a3a");
  }

  // runner
  const rx = 60;
  const duck = g.duck && g.y === 0;
  const rows = g.y < 0 ? RUN[0] : duck ? DUCK : RUN[Math.floor(g.t / 6) % 2];
  const rh = rows.length * CELL;
  const ry = groundY + CELL * 1.5 - rh + g.y;
  drawMotif(ctx, rows, rx, ry, CELL, g.over ? "#8c7a68" : RED);

  // collision (AABB with a few px of forgiveness)
  if (g.started && !g.over) {
    const top = duck ? ry + CELL * 3 : ry + CELL;
    const pw = 7 * CELL - 8;
    const px = rx + 4;
    for (const o of g.obs) {
      if (px < o.x + o.w - 6 && px + pw > o.x + 6 && top < o.y + o.h - 4 && ry + rh > o.y + 4) {
        g.over = true;
        onOver(g.score);
        break;
      }
    }
  }

  // HUD
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK;
  ctx.font = `700 14px ${MONO}`;
  ctx.fillText(String(g.score).padStart(5, "0"), W - 6, 8);
  ctx.textAlign = "center";
  if (!g.started) {
    ctx.fillStyle = "#8c7a68";
    ctx.font = `11px ${MONO}`;
    ctx.fillText(T.idle, W / 2, 70);
  }
  if (g.over) {
    drawMotif(ctx, BIG_X, W / 2 - 15, 40, 6, RED);
    ctx.fillStyle = INK;
    ctx.font = `700 13px ${MONO}`;
    ctx.fillText(T.snagged(g.score), W / 2, 84);
    ctx.fillStyle = "#8c7a68";
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(T.rethread, W / 2, 104);
  }
}

type Props = { open: boolean; onOpen: () => void; onClose: () => void };

export function StitchRun({ open, onOpen, onClose }: Props) {
  const { t } = useLocale();
  const T = t.game;
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game>(fresh());
  const typed = useRef("");
  const [hi, setHi] = useState(0);

  const jump = useCallback(() => {
    const g = game.current;
    if (g.over) {
      game.current = { ...fresh(), started: true, clouds: g.clouds };
      return;
    }
    g.started = true;
    if (g.y === 0) g.vy = -11.5;
  }, []);

  // Trigger word + in-game keys. One listener covers both modes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = /^(input|textarea|select)$/i.test(target?.tagName ?? "") || !!target?.isContentEditable;
      if (!open) {
        const k = e.key.toLowerCase();
        if (!inField && k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          typed.current = (typed.current + k).slice(-TRIGGER.length);
          if (typed.current === TRIGGER) {
            typed.current = "";
            onOpen();
          }
        }
        return;
      }
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        jump();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        game.current.duck = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") game.current.duck = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [open, onOpen, onClose, jump]);

  // The loop lives only while the modal is open.
  useEffect(() => {
    if (!open) return;
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    game.current = fresh();
    let stored = readHi();
    queueMicrotask(() => setHi(stored));
    let raf = 0;
    const onOver = (score: number) => {
      stored = Math.max(stored, score);
      writeHi(stored);
      setHi(stored);
    };
    const loop = () => {
      tick(game.current, ctx, T, onOver);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [open, T]);

  if (!open) return null;

  return (
    <div className="st-game-backdrop" role="dialog" aria-modal="true" aria-label={T.title}>
      <div className="st-game">
        <div className="st-game-head">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="st-mono text-[11px] tracking-[0.2em] text-[#b5342c]">{T.eyebrow}</span>
            <span className="text-[24px] leading-none font-bold">{T.title}</span>
            <span className="text-[15px] text-[#8c7a68]">{T.tagline}</span>
          </div>
          <div className="flex items-center gap-3.5">
            <span className="st-mono text-[11.5px] tracking-[0.12em] text-[#8c7a68]">
              {T.best} {String(hi).padStart(5, "0")}
            </span>
            <button type="button" className="st-game-close" onClick={onClose}>
              {T.close}
            </button>
          </div>
        </div>
        <div className="st-game-stage" onClick={jump}>
          <canvas ref={canvas} width={W} height={H} />
        </div>
        <div className="st-game-hints">
          <span>{T.hintKeys}</span>
          <span>{T.hintSpeed}</span>
        </div>
      </div>
    </div>
  );
}
