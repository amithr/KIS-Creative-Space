export const dynamic = "force-dynamic";

import { TrainingClient } from "@/components/TrainingClient";
import {
  getPeriodBookings,
  getSpaceBlocks,
  getTrainingSessions,
} from "@/lib/data";
import { threeWeekHorizon } from "@/lib/school-calendar";

export default async function TrainingPage() {
  const { from, to } = threeWeekHorizon();

  const [sessions, spaceBookings, blocks] = await Promise.all([
    getTrainingSessions(from, to),
    getPeriodBookings(from, to),
    getSpaceBlocks(),
  ]);

  return (
    <TrainingClient
      initialSessions={sessions}
      initialSpaceBookings={spaceBookings}
      initialBlocks={blocks}
    />
  );
}
