export const dynamic = "force-dynamic";

import { StudioGate, StudioQueue } from "@/components/studio/StudioAdminClient";
import { getAllPrintRequests, getFilamentColors } from "@/lib/data";
import { isStudioAdmin, studioConfigured } from "@/lib/studio-session";

export default async function StudioPage() {
  const authed = await isStudioAdmin();
  if (!authed) {
    const all = await getAllPrintRequests();
    const open = all.filter((r) => r.status < 3).length;
    return <StudioGate openCount={open} configured={studioConfigured()} />;
  }
  const [requests, colors] = await Promise.all([getAllPrintRequests(), getFilamentColors()]);
  return <StudioQueue requests={requests} colors={colors} />;
}
