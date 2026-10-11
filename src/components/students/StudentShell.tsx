"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LocaleProvider, useLocale } from "@/components/students/Locale";
import { DiamondRow, Motif } from "@/components/students/Motif";
import { StudentToastProvider } from "@/components/students/StudentToast";

export function StudentShell({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <StudentToastProvider>
        <ShellInner>{children}</ShellInner>
      </StudentToastProvider>
    </LocaleProvider>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t, lang, setLang } = useLocale();
  const tabs = [
    { href: "/", label: t.nav.home, active: pathname === "/" },
    { href: "/print", label: t.nav.print, active: pathname.startsWith("/print") },
    {
      href: "/requests",
      label: t.nav.track,
      active: pathname.startsWith("/requests"),
    },
  ];

  return (
    <>
      <div className="st-band" aria-hidden />

      <header className="st-gutter flex flex-wrap items-center justify-between gap-4 border-b border-[#e9dfd0] py-[18px]">
        <Link
          href="/"
          className="flex items-center gap-3.5 select-none hover:!text-[#2a211c]"
        >
          <span className="leading-none">
            <Motif name="cube" cell={4} color="#b5342c" speed={30} />
          </span>
          <span>
            <span className="block text-[24px] leading-none font-bold tracking-[0.02em]">
              KIS Creativity Space
            </span>
            <span className="st-mono mt-1 block text-[10px] tracking-[0.18em] text-[#8c7a68]">
              {t.brandSub}
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1.5" aria-label="Site">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="st-nav-tab"
              data-active={tab.active}
              aria-current={tab.active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
          <div className="st-lang ml-1" role="group" aria-label={t.langLabel}>
            <button
              type="button"
              aria-pressed={lang === "en"}
              onClick={() => setLang("en")}
              lang="en"
            >
              EN
            </button>
            <button
              type="button"
              aria-pressed={lang === "uk"}
              onClick={() => setLang("uk")}
              lang="uk"
            >
              УКР
            </button>
          </div>
        </nav>
      </header>

      {children}

      <footer className="mt-auto">
        <DiamondRow className="!py-1" />
        <div className="st-gutter flex flex-wrap justify-between gap-3 border-t border-[#e9dfd0] py-4 text-[16px] text-[#8c7a68]">
          <span>{t.footer}</span>
          <span className="st-mono text-[10.5px] tracking-[0.14em]">
            {t.footerMark}
          </span>
        </div>
      </footer>
    </>
  );
}
