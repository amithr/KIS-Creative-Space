export const dynamic = "force-dynamic";

import { LiveBoardClient } from "@/components/students/LiveBoardClient";
import { getFilamentColors, getLiveBoard } from "@/lib/data";

/** ON THE PRINTERS — public live board: names only, polls while open. */
export default async function StudentBoardPage() {
  const [{ jobs, now }, colors] = await Promise.all([getLiveBoard(), getFilamentColors()]);
  return <LiveBoardClient initial={jobs} colors={colors} serverNow={now} />;
}
