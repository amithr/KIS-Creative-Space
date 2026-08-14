import Link from "next/link";

export function SiteFooter({
  showAdmin = true,
}: {
  showAdmin?: boolean;
}) {
  return (
    <footer className="page-gutter mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e0d8] py-8 text-[12px] text-[#6d6759]">
      <p>
        KIS Design Studio · open daily 14–17 ·{" "}
        <span className="font-mono text-[11px] tracking-[0.08em]">
          IN-SPACE ONLY
        </span>{" "}
        items stay in the Makerspace —{" "}
        <Link
          href="/schedule"
          className="underline transition-colors hover:text-[#c8102e]"
        >
          book the space
        </Link>{" "}
        to use them
      </p>
      {showAdmin && (
        <Link href="/admin" className="hover:text-[#c8102e]">
          Admin →
        </Link>
      )}
    </footer>
  );
}
