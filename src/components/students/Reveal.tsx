"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Animated disclosure: the row slides from 0fr to 1fr (see .st-reveal).
 * Children mount when opened and unmount once the collapse has finished, so
 * a closed 3D preview holds no WebGL context.
 */
export function Reveal({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  // `closing` keeps the children mounted while the panel collapses.
  const [closing, setClosing] = useState(false);
  const [seenOpen, setSeenOpen] = useState(open);
  if (seenOpen !== open) {
    setSeenOpen(open);
    setClosing(!open);
  }
  useEffect(() => {
    if (!closing) return;
    const tm = window.setTimeout(() => setClosing(false), 380);
    return () => window.clearTimeout(tm);
  }, [closing]);
  return (
    <div className="st-reveal" data-open={open} id={id} aria-hidden={!open}>
      <div className="st-reveal-inner">{(open || closing) && children}</div>
    </div>
  );
}
