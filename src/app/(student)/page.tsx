export const dynamic = "force-dynamic";

import { StudentLanding } from "@/components/students/StudentLanding";
import { getAllPrintRequests } from "@/lib/data";
import { leaderboard } from "@/lib/ledger";

/** Leaderboard is built but gated: NEXT_PUBLIC_SHOW_LEADERBOARD=1 and ≥3 makers. */
export default async function StudentsHomePage() {
  const show = process.env.NEXT_PUBLIC_SHOW_LEADERBOARD === "1";
  const board = show ? leaderboard(await getAllPrintRequests()) : [];
  return <StudentLanding board={board} showLeaderboard={show} />;
}
