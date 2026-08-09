"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  "flex items-center border-l border-[#2b2b2b] px-5 text-[14.5px] text-[#f4f1ea] transition-colors duration-250 hover:bg-[#c8102e] hover:text-white md:px-8";

export function Header() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-50 no-print">
      <div className="flex items-stretch bg-[#141414] text-[#f4f1ea]">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-4 px-5 py-[18px] text-[#f4f1ea] hover:text-[#f4f1ea] md:gap-4 md:px-10"
        >
          <PixelRobot size={38} className="hidden sm:inline-block" />
          <PixelRobot size={30} className="sm:hidden" />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="block text-[15px] font-semibold tracking-[0.16em]">
                KIS CREATIVITY SPACE
              </span>
              {isAdmin && (
                <span className="rounded-full bg-[#f4f1ea] px-2 py-[3px] font-mono text-[10px] tracking-[0.14em] text-[#141414]">
                  ADMIN
                </span>
              )}
            </span>
            <span className="mt-1 block font-mono text-[11px] tracking-[0.14em] text-[#98917f]">
              MAKERSPACE · BOOKINGS & EQUIPMENT
            </span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-stretch">
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
      </div>
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
