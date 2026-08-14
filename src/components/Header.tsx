"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PixelRobot } from "@/components/PixelRobot";
import { signOut } from "@/app/admin/actions";

const NAV = [
  { href: "/", label: "Resources", match: (p: string) => p === "/" },
  {
    href: "/schedule",
    label: "Schedule the space",
    match: (p: string) => p.startsWith("/schedule"),
  },
  {
    href: "/training",
    label: "Book training",
    match: (p: string) => p.startsWith("/training"),
  },
] as const;

const panelBase =
  "flex items-center border-l border-[#2b2b2b] px-8 text-[14.5px] text-[#f4f1ea] transition-colors duration-250 hover:bg-[#c8102e] hover:text-white";

export function Header() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isHome = pathname === "/";
  const isSubPage =
    pathname.startsWith("/schedule") || pathname.startsWith("/training");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 no-print">
      <div className="flex items-stretch bg-[#141414] text-[#f4f1ea]">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-[11px] px-4 py-3 text-[#f4f1ea] hover:text-[#f4f1ea] md:gap-4 md:px-10 md:py-[18px]"
        >
          <span className="block h-[30px] w-[30px] shrink-0 overflow-hidden md:h-[38px] md:w-[38px]">
            <PixelRobot
              size={38}
              className="origin-top-left scale-[0.79] md:scale-100"
            />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="block text-[11.5px] font-semibold tracking-[0.14em] md:text-[15px] md:tracking-[0.16em]">
                {isSubPage && !isAdmin ? (
                  <>
                    <span className="md:hidden">
                      {pathname.startsWith("/schedule")
                        ? "SCHEDULE"
                        : "TRAINING"}
                    </span>
                    <span className="hidden md:inline">
                      KIS DESIGN STUDIO
                    </span>
                  </>
                ) : (
                  "KIS DESIGN STUDIO"
                )}
              </span>
              {isAdmin && (
                <span className="rounded-full bg-[#f4f1ea] px-2 py-[3px] font-mono text-[10px] tracking-[0.14em] text-[#141414]">
                  ADMIN
                </span>
              )}
            </span>
            {!isSubPage && (
              <span className="mt-1 block font-mono text-[8.5px] tracking-[0.12em] text-[#98917f] md:text-[11px] md:tracking-[0.14em]">
                MAKERSPACE · BOOKINGS & EQUIPMENT
              </span>
            )}
            {isSubPage && (
              <span className="mt-1 hidden font-mono text-[11px] tracking-[0.14em] text-[#98917f] md:block">
                MAKERSPACE · BOOKINGS & EQUIPMENT
              </span>
            )}
          </span>
        </Link>

        {/* Mobile: hamburger on home, back link on schedule/training */}
        {!isAdmin && isHome && (
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center px-4 md:hidden"
          >
            <span className="flex flex-col gap-1">
              <span className="block h-[1.5px] w-[18px] bg-[#f4f1ea]" />
              <span className="block h-[1.5px] w-[18px] bg-[#f4f1ea]" />
              <span className="block h-[1.5px] w-[18px] bg-[#f4f1ea]" />
            </span>
          </button>
        )}
        {!isAdmin && isSubPage && (
          <Link
            href="/"
            className="flex items-center px-4 text-[12px] text-[#f4f1ea] hover:text-white md:hidden"
          >
            ← Resources
          </Link>
        )}

        {/* Desktop nav panels */}
        <nav className="hidden shrink-0 items-stretch md:flex">
          {NAV.map((item) => {
            const active = !isAdmin && item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={panelBase}
                style={
                  active
                    ? { background: "#c8102e", color: "#fff" }
                    : undefined
                }
              >
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <form action={signOut} className="flex">
              <button type="submit" className={panelBase}>
                Sign out
              </button>
            </form>
          )}
        </nav>

        {/* Admin mobile sign-out */}
        {isAdmin && (
          <form action={signOut} className="flex md:hidden">
            <button
              type="submit"
              className="flex items-center px-4 text-[12px] text-[#f4f1ea]"
            >
              Sign out
            </button>
          </form>
        )}
      </div>

      {/* Mobile slide-down menu (Resources home) */}
      {menuOpen && !isAdmin && isHome && (
        <nav className="flex flex-col border-t border-[#2b2b2b] bg-[#141414] md:hidden">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-[#2b2b2b] px-4 py-3.5 text-[14.5px] text-[#f4f1ea]"
                style={
                  active
                    ? { background: "#c8102e", color: "#fff" }
                    : undefined
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      <div
        aria-hidden
        className="h-[3px] w-full"
        style={{
          background:
            "linear-gradient(90deg, #c8102e 0 25%, #141414 25% 100%)",
        }}
      />
    </header>
  );
}
