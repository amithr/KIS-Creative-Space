import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import { isTeacher } from "@/lib/data";

export async function AdminShell({
  children,
  authenticated,
}: {
  children: React.ReactNode;
  authenticated?: boolean;
}) {
  const signedIn = authenticated ?? (await isTeacher());

  return (
    <div className="min-h-screen bg-white text-[#141414]">
      <header className="no-print page-gutter flex items-center justify-between border-b border-[#e3e0d8] py-5">
        <div className="flex items-center gap-2.5">
          <span className="block h-[9px] w-[9px] rounded-full bg-[#c8102e]" />
          <Link href="/" className="text-[13px] font-semibold tracking-[0.14em]">
            KIS CREATIVITY SPACE
          </Link>
          <span className="ml-1 rounded-full bg-[#141414] px-2 py-[3px] font-mono text-[10px] tracking-[0.16em] text-white">
            ADMIN
          </span>
        </div>
        <div className="flex items-center gap-5 text-[13px]">
          <Link href="/">← Back to resources</Link>
          {signedIn && (
            <form action={signOut}>
              <button
                type="submit"
                className="text-[#6d6759] hover:text-[#c8102e]"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
