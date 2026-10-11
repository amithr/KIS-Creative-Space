"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { LANG_STORAGE_KEY, STRINGS, isLang, type Lang, type Strings } from "@/lib/i18n";

type Ctx = { lang: Lang; t: Strings; setLang: (l: Lang) => void };

const LocaleContext = createContext<Ctx | null>(null);

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** EN / УКР for the student site. Remembered per browser; <html lang> follows. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      // ignore
    }
    const initial = isLang(saved)
      ? saved
      : typeof navigator !== "undefined" && /^uk\b/i.test(navigator.language)
        ? "uk"
        : "en";
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLangState(initial);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  return (
    <LocaleContext.Provider value={{ lang, t: STRINGS[lang], setLang }}>
      {children}
    </LocaleContext.Provider>
  );
}
