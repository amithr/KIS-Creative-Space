export const dynamic = "force-dynamic";

import { StudentLanding } from "@/components/students/StudentLanding";
import { boardCounts, toLiveJobs } from "@/lib/board";
import { getAllPrintRequests } from "@/lib/data";
import { leaderboard } from "@/lib/ledger";

/**
 * The hero's live line needs the open-job counts; the leaderboard is built but
 * gated (NEXT_PUBLIC_SHOW_LEADERBOARD=1 and ≥3 makers). One query serves both.
 */
export default async function StudentsHomePage() {
  const show = process.env.NEXT_PUBLIC_SHOW_LEADERBOARD === "1";
  const all = await getAllPrintRequests();
  const board = show ? leaderboard(all) : [];
  const { printing, queued } = boardCounts(toLiveJobs(all));
  return <StudentLanding board={board} showLeaderboard={show} live={{ printing, queued }} />;
}
