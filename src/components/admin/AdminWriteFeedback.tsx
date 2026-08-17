"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ChipMode = "idle" | "saving" | "toast" | "failed";

type NotifyOpts = {
  /** Default #2f9e44 (positive). Use #141414 for removals. */
  bg?: string;
  /** When set, toast stays ~6s and shows an UNDO pill. */
  undo?: () => void | Promise<void>;
};

type AdminWriteContextValue = {
  /** Blocking write: shows SAVING… then SAVED ✓ (or FAILED). Concurrent calls ignored. */
  dbWrite: (label: string, fn: () => Promise<void>) => Promise<void>;
  /** Optimistic / instant edits: flash SAVED only. */
  flashSaved: (label: string) => void;
  /** Detailed toast — green by default; pass undo for destructive reversals. */
  notify: (label: string, opts?: NotifyOpts) => void;
  savingLabel: string | null;
};

const AdminWriteContext = createContext<AdminWriteContextValue | null>(null);

export function useAdminWrite() {
  const ctx = useContext(AdminWriteContext);
  if (!ctx) {
    throw new Error("useAdminWrite must be used within AdminWriteProvider");
  }
  return ctx;
}

export function AdminWriteProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ChipMode>("idle");
  const [label, setLabel] = useState("");
  const [bg, setBg] = useState("#2f9e44");
  const [hasUndo, setHasUndo] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const retryRef = useRef<(() => Promise<void>) | null>(null);
  const undoRef = useRef<(() => void | Promise<void>) | null>(null);

  const clearHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const clearToast = useCallback(() => {
    clearHide();
    undoRef.current = null;
    setHasUndo(false);
    setMode("idle");
  }, []);

  const notify = useCallback(
    (nextLabel: string, opts?: NotifyOpts) => {
      clearHide();
      setLabel(nextLabel);
      setBg(opts?.bg ?? "#2f9e44");
      undoRef.current = opts?.undo ?? null;
      setHasUndo(!!opts?.undo);
      setMode("toast");
      const ms = opts?.undo ? 6000 : 2200;
      hideTimer.current = setTimeout(() => {
        undoRef.current = null;
        setHasUndo(false);
        setMode("idle");
      }, ms);
    },
    [],
  );

  const flashSaved = useCallback(
    (nextLabel: string) => {
      notify(`SAVED ✓ · ${nextLabel}`);
    },
    [notify],
  );

  const dbWrite = useCallback(
    async (nextLabel: string, fn: () => Promise<void>) => {
      if (busyRef.current) return;
      busyRef.current = true;
      clearHide();
      undoRef.current = null;
      setHasUndo(false);
      setLabel(nextLabel);
      setBg("#141414");
      setMode("saving");
      retryRef.current = () => dbWrite(nextLabel, fn);
      try {
        await fn();
        retryRef.current = null;
        notify(`SAVED ✓ · ${nextLabel}`);
      } catch {
        setMode("failed");
        setBg("#c8102e");
      } finally {
        busyRef.current = false;
      }
    },
    [notify],
  );

  const onChipClick = () => {
    if (mode === "failed" && retryRef.current) {
      void retryRef.current();
    }
  };

  const onUndo = () => {
    const fn = undoRef.current;
    clearToast();
    if (fn) void fn();
  };

  const show = mode !== "idle";
  const text =
    mode === "saving"
      ? `SAVING · ${label}…`
      : mode === "failed"
        ? `FAILED · ${label} — RETRY?`
        : label;

  return (
    <AdminWriteContext.Provider
      value={{
        dbWrite,
        flashSaved,
        notify,
        savingLabel: mode === "saving" ? label : null,
      }}
    >
      {children}
      {show && (
        <div
          role="status"
          className="kis-sync-chip no-print fixed right-6 bottom-6 z-[90] flex items-center gap-2.5 px-[18px] py-[11px] text-[#f4f1ea] shadow-[0_10px_30px_rgba(20,20,20,0.28)]"
          style={{ background: mode === "failed" ? "#c8102e" : bg }}
        >
          {mode === "saving" && (
            <span
              className="kis-sync-spin h-3 w-3 shrink-0 rounded-none border-2 border-[rgba(244,241,234,0.35)] border-t-[#f4f1ea]"
              aria-hidden
            />
          )}
          {mode === "failed" ? (
            <button
              type="button"
              onClick={onChipClick}
              className="whitespace-nowrap font-mono text-[11px] tracking-[0.12em]"
            >
              {text}
            </button>
          ) : (
            <span className="whitespace-nowrap font-mono text-[11px] tracking-[0.12em]">
              {text}
            </span>
          )}
          {hasUndo && mode === "toast" && (
            <button
              type="button"
              onClick={onUndo}
              className="rounded-full border border-[rgba(244,241,234,0.5)] px-3 py-1 font-mono text-[11px] font-bold tracking-[0.12em] text-white transition-colors hover:border-[#f4f1ea] hover:bg-[#f4f1ea] hover:text-[#141414] active:scale-95"
            >
              UNDO
            </button>
          )}
        </div>
      )}
    </AdminWriteContext.Provider>
  );
}
