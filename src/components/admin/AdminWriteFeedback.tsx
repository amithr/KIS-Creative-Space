"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ChipMode = "idle" | "saving" | "saved" | "failed";

type AdminWriteContextValue = {
  /** Blocking write: shows SAVING… then SAVED ✓ (or FAILED). Concurrent calls ignored. */
  dbWrite: (label: string, fn: () => Promise<void>) => Promise<void>;
  /** Optimistic / instant edits: flash SAVED only. */
  flashSaved: (label: string) => void;
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
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const retryRef = useRef<(() => Promise<void>) | null>(null);

  const clearHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const showSaved = useCallback((nextLabel: string) => {
    clearHide();
    setLabel(nextLabel);
    setMode("saved");
    hideTimer.current = setTimeout(() => setMode("idle"), 1600);
  }, []);

  const flashSaved = useCallback(
    (nextLabel: string) => {
      showSaved(nextLabel);
    },
    [showSaved],
  );

  const dbWrite = useCallback(
    async (nextLabel: string, fn: () => Promise<void>) => {
      if (busyRef.current) return;
      busyRef.current = true;
      clearHide();
      setLabel(nextLabel);
      setMode("saving");
      retryRef.current = () => dbWrite(nextLabel, fn);
      try {
        await fn();
        retryRef.current = null;
        showSaved(nextLabel);
      } catch {
        setMode("failed");
      } finally {
        busyRef.current = false;
      }
    },
    [showSaved],
  );

  const onChipClick = () => {
    if (mode === "failed" && retryRef.current) {
      void retryRef.current();
    }
  };

  const show = mode !== "idle";
  const bg =
    mode === "saving"
      ? "#141414"
      : mode === "failed"
        ? "#c8102e"
        : "#2f9e44";
  const text =
    mode === "saving"
      ? `SAVING · ${label}…`
      : mode === "failed"
        ? `FAILED · ${label} — RETRY?`
        : `SAVED ✓ · ${label}`;

  return (
    <AdminWriteContext.Provider
      value={{
        dbWrite,
        flashSaved,
        savingLabel: mode === "saving" ? label : null,
      }}
    >
      {children}
      {show && (
        <button
          type="button"
          onClick={onChipClick}
          className="kis-sync-chip no-print fixed right-6 bottom-6 z-[90] flex items-center gap-2.5 px-[18px] py-[11px] text-[#f4f1ea] shadow-[0_10px_30px_rgba(20,20,20,0.28)] transition-[background-color] duration-250"
          style={{ background: bg }}
        >
          {mode === "saving" && (
            <span
              className="kis-sync-spin h-3 w-3 shrink-0 rounded-none border-2 border-[rgba(244,241,234,0.35)] border-t-[#f4f1ea]"
              aria-hidden
            />
          )}
          <span className="whitespace-nowrap font-mono text-[11px] tracking-[0.12em]">
            {text}
          </span>
        </button>
      )}
    </AdminWriteContext.Provider>
  );
}
