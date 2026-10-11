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
type Toast = { msg: string; tone: Tone };

type Ctx = { toast: (msg: string, tone?: Tone) => void };

const StudentToastContext = createContext<Ctx | null>(null);

export function useStudentToast() {
  const ctx = useContext(StudentToastContext);
  if (!ctx) throw new Error("useStudentToast must be used within StudentToastProvider");
  return ctx.toast;
}

/** Fixed bottom-centre toast: ink for info, red for errors, ~3.2s. */
export function StudentToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, tone: Tone = "ok") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, tone });
    timer.current = setTimeout(() => setToast(null), 3200);
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
        </div>
      )}
    </StudentToastContext.Provider>
  );
}
