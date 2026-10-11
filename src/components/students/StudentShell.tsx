"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DiamondRow, Motif } from "@/components/students/Motif";
import { StudentToastProvider } from "@/components/students/StudentToast";

const TABS = [
  { href: "/", label: "HOME", match: (p: string) => p === "/" },
  {
    href: "/print",
    label: "PRINT REQUEST",
    match: (p: string) => p.startsWith("/print"),
  },
  {
    href: "/requests",
    label: "MY REQUESTS",
    match: (p: string) => p.startsWith("/requests"),
  },
] as const;

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <StudentToastProvider>
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
              FOR STUDENTS · ДЛЯ УЧНІВ
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-1.5" aria-label="Student site">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="st-nav-tab"
              data-active={t.match(pathname)}
              aria-current={t.match(pathname) ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}

      <footer className="mt-auto">
        <DiamondRow className="!py-1" />
        <div className="st-gutter flex flex-wrap justify-between gap-3 border-t border-[#e9dfd0] py-4 text-[16px] text-[#8c7a68]">
          <span>
            KIS Creativity Space · prints run Tuesday–Thursday · collect within
            a week
          </span>
          <span className="st-mono text-[10.5px] tracking-[0.14em]">
            ТВОРЧИЙ ПРОСТІР
          </span>
        </div>
      </footer>
    </StudentToastProvider>
  );
}
