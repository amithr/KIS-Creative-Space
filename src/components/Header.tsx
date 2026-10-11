"use client";

import Link from "next/link";
import { PixelRobot } from "@/components/PixelRobot";
import { signOut } from "@/app/admin/actions";

const panelBase =
  "flex items-center border-l border-[#2b2b2b] px-5 text-[14.5px] text-[#f4f1ea] transition-colors duration-250 hover:bg-[#c8102e] hover:text-white md:px-8";

/** Black admin header: wordmark + ADMIN pill, link to the student site, sign out. */
export function Header() {
  return (
    <header className="sticky top-0 z-50 no-print">
      <div className="flex items-stretch bg-[#141414] text-[#f4f1ea]">
        <Link
          href="/admin"
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
                KIS CREATIVITY SPACE
              </span>
              <span className="rounded-full bg-[#f4f1ea] px-2 py-[3px] font-mono text-[10px] tracking-[0.14em] text-[#141414]">
                ADMIN
              </span>
            </span>
            <span className="mt-1 block font-mono text-[8.5px] tracking-[0.12em] text-[#98917f] md:text-[11px] md:tracking-[0.14em]">
              MAKERSPACE · BOOKINGS & EQUIPMENT
            </span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-stretch">
          <Link href="/studio" className={panelBase}>
            Print queue
          </Link>
          <Link href="/" className={panelBase}>
            Student site
          </Link>
          <form action={signOut} className="flex">
            <button type="submit" className={panelBase}>
              Sign out
            </button>
          </form>
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
