import Link from "next/link";

/** Admin footer. */
export function SiteFooter() {
  return (
    <footer className="page-gutter mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e0d8] py-8 text-[12px] text-[#6d6759]">
      <p>
        KIS Creativity Space · changes save automatically and sync to the app.
      </p>
      <Link href="/" className="hover:text-[#c8102e]">
        Student site →
      </Link>
    </footer>
  );
}
