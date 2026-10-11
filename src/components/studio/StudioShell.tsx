"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { studioSignOut } from "@/app/actions/studio";
import { DiamondRow, Motif } from "@/components/students/Motif";
import { StudentToastProvider, useStudentToast } from "@/components/students/StudentToast";

export function StudioShell({ authed, children }: { authed: boolean; children: ReactNode }) {
  return (
    <StudentToastProvider>
      <ShellInner authed={authed}>{children}</ShellInner>
    </StudentToastProvider>
  );
}

function ShellInner({ authed, children }: { authed: boolean; children: ReactNode }) {
  const router = useRouter();
  const toast = useStudentToast();
  const [, startTransition] = useTransition();

  return (
    <>
      <div className="st-band st-band-ink" aria-hidden />
      <header className="st-gutter flex flex-wrap items-center justify-between gap-4 border-b border-[#e9dfd0] py-[18px]">
        <div className="flex items-center gap-3.5">
          <span className="leading-none">
            <Motif name="cube" cell={4} color="#2a211c" speed={30} />
          </span>
          <span>
            <span className="flex items-center gap-2.5">
              <span className="text-[24px] leading-none font-bold tracking-[0.02em]">KIS Creativity Space</span>
              <span className="st-mono bg-[#2a211c] px-2 py-[3px] text-[9px] tracking-[0.16em] text-[#fbf6ee]">
                STUDIO ADMIN
              </span>
            </span>
            <span className="st-mono mt-1 block text-[10px] tracking-[0.18em] text-[#8c7a68]">
              PRINT QUEUE · ЧЕРГА ДРУКУ
            </span>
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-1.5">
          <Link href="/" className="st-nav-tab">
            STUDENT SITE ↗
          </Link>
          {authed && (
            <button
              type="button"
              className="st-nav-tab !border-[#2a211c] !text-[#2a211c] hover:!bg-[#2a211c] hover:!text-[#fbf6ee]"
              onClick={() =>
                startTransition(async () => {
                  await studioSignOut();
                  toast("SIGNED OUT");
                  router.refresh();
                })
              }
            >
              SIGN OUT
            </button>
          )}
        </nav>
      </header>

      {children}

      <footer className="mt-auto">
        <DiamondRow className="!py-1" />
        <div className="st-gutter flex flex-wrap justify-between gap-3 border-t border-[#e9dfd0] py-4 text-[16px] text-[#8c7a68]">
          <span>
            Stage and rating changes appear on students&apos; boards instantly · marking READY pays
            their points
          </span>
          <span className="st-mono text-[10.5px] tracking-[0.14em]">ТВОРЧИЙ ПРОСТІР</span>
        </div>
      </footer>
    </>
  );
}
