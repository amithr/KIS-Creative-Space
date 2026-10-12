import type { Metadata } from "next";
import { StudioShell } from "@/components/studio/StudioShell";
import { isStudioAdmin } from "@/lib/studio-session";

export const metadata: Metadata = {
  title: "KIS Design Studio · Admin",
  robots: { index: false },
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const authed = await isStudioAdmin();
  return (
    <div className="kis-students">
      <StudioShell authed={authed}>{children}</StudioShell>
    </div>
  );
}
