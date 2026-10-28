export const dynamic = "force-dynamic";

import { StudentLanding } from "@/components/students/StudentLanding";
import { boardCounts, toLiveJobs } from "@/lib/board";
import { getAllPrintRequests } from "@/lib/data";

/** The hero's live line needs the open-job counts. */
export default async function StudentsHomePage() {
  const { printing, queued } = boardCounts(toLiveJobs(await getAllPrintRequests()));
  return <StudentLanding live={{ printing, queued }} />;
}
