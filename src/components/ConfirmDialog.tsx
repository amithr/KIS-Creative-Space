"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConfirmConfig = {
  title: string;
  body: string;
  action: string;
  fn: () => void | Promise<void>;
};

type ConfirmContextValue = {
  askConfirm: (cfg: ConfirmConfig) => void;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx.askConfirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<ConfirmConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const cfgRef = useRef<ConfirmConfig | null>(null);
  cfgRef.current = cfg;

  const askConfirm = useCallback((next: ConfirmConfig) => {
    setCfg(next);
    setBusy(false);
  }, []);

  const close = useCallback(() => {
    if (busy) return;
    setCfg(null);
  }, [busy]);

  const run = useCallback(async () => {
    const current = cfgRef.current;
    if (!current || busy) return;
    setBusy(true);
    try {
      await current.fn();
      setCfg(null);
    } catch {
      // Keep dialog open on failure so the user can retry or dismiss.
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return (
    <ConfirmContext.Provider value={{ askConfirm }}>
      {children}
      {cfg && (
        <div
          className="no-print fixed inset-0 z-[110] flex items-start justify-center bg-[rgba(20,20,20,0.55)] pt-[18vh]"
          onClick={close}
          role="presentation"
        >
          <div
            className="kis-confirm-pop w-[min(400px,calc(100vw-32px))] border-2 border-[#141414] bg-white px-[26px] py-6 shadow-[0_24px_60px_rgba(20,20,20,0.35)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="kis-confirm-title"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="h-[10px] w-[10px] shrink-0 bg-[#c8102e]"
                aria-hidden
              />
              <h2
                id="kis-confirm-title"
                className="text-[19px] font-semibold"
              >
                {cfg.title}
              </h2>
            </div>
            <p className="mt-2.5 text-[14.5px] leading-[1.55] text-[#6d6759]">
              {cfg.body}
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void run()}
                className="flex-1 bg-[#c8102e] py-[11px] text-center text-[14.5px] font-semibold text-white transition-colors hover:bg-[#a50d26] active:scale-[0.97] disabled:opacity-60"
              >
                {busy ? "Working…" : cfg.action}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={close}
                className="border border-[#e3e0d8] px-[18px] py-[11px] text-[14.5px] font-semibold text-[#3f3b33] transition-colors hover:border-[#141414] disabled:opacity-60"
              >
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
