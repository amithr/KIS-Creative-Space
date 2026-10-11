"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Tone = "ok" | "err";
type ToastOpts = { tone?: Tone; undo?: () => void | Promise<void> };
type Toast = { msg: string; tone: Tone; undo: (() => void | Promise<void>) | null };

export type ToastFn = (msg: string, opts?: Tone | ToastOpts) => void;

const StudentToastContext = createContext<{ toast: ToastFn } | null>(null);

export function useStudentToast() {
  const ctx = useContext(StudentToastContext);
  if (!ctx) throw new Error("useStudentToast must be used within StudentToastProvider");
  return ctx.toast;
}

/** Fixed bottom-centre toast: ink for info, red for errors; UNDO keeps it 4.8s. */
export function StudentToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ToastFn>((msg, opts) => {
    const o: ToastOpts = typeof opts === "string" ? { tone: opts } : (opts ?? {});
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, tone: o.tone ?? "ok", undo: o.undo ?? null });
    timer.current = setTimeout(() => setToast(null), o.undo ? 4800 : 3200);
  }, []);

  return (
    <StudentToastContext.Provider value={{ toast: show }}>
      {children}
      {toast && (
        <div
          role="status"
          className="st-toast"
          style={{ background: toast.tone === "err" ? "#b5342c" : "#2a211c" }}
        >
          <span>{toast.msg}</span>
          {toast.undo && (
            <button
              type="button"
              className="st-toast-undo"
              onClick={() => {
                const fn = toast.undo;
                if (timer.current) clearTimeout(timer.current);
                setToast(null);
                void fn?.();
              }}
            >
              UNDO
            </button>
          )}
        </div>
      )}
    </StudentToastContext.Provider>
  );
}
