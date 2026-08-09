"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Header() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const [menuOpen, setMenuOpen] = useState(false);

  if (isAdmin) return null;

  const isSchedule = pathname.startsWith("/schedule");

  return (
    <header className="sticky top-0 z-30 border-b border-[#e3e0d8] bg-white">
      <div className="page-gutter flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2.5 text-[#141414]">
          <span className="block h-[9px] w-[9px] rounded-full bg-[#c8102e]" />
          <span className="text-[13px] font-semibold tracking-[0.14em]">
            KIS CREATIVITY SPACE
          </span>
        </Link>

        {isSchedule ? (
          <Link href="/" className="text-[13px]">
            ← Back to resources
          </Link>
        ) : (
          <>
            <nav className="hidden items-center md:flex">
              <Link
                href="/schedule"
                className="rounded-full bg-[#141414] px-4 py-2 text-[13px] text-white transition-colors hover:bg-[#c8102e] hover:text-white"
              >
                Schedule the space
              </Link>
            </nav>

            <button
              type="button"
              aria-label="Menu"
              className="flex h-8 w-8 flex-col items-end justify-center gap-1.5 md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="block h-px w-5 bg-[#141414]" />
              <span className="block h-px w-3.5 bg-[#141414]" />
            </button>
          </>
        )}
      </div>

      {menuOpen && !isSchedule && (
        <div className="border-t border-[#e3e0d8] px-5 py-4 md:hidden">
          <Link
            href="/schedule"
            onClick={() => setMenuOpen(false)}
            className="block rounded-full bg-[#141414] px-4 py-2.5 text-center text-[14px] text-white hover:text-white"
          >
            Schedule the space
          </Link>
        </div>
      )}
    </header>
  );
}
