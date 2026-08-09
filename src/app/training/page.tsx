export const dynamic = "force-dynamic";

import { TrainingClient } from "@/components/TrainingClient";
import {
  getPeriodBookings,
  getSpaceBlocks,
  getTrainingSessions,
} from "@/lib/data";
import { startOfDay } from "@/lib/inventory";
import { rollingSevenRange } from "@/lib/schedule-ui";

export default async function TrainingPage() {
  const { from, to } = rollingSevenRange(startOfDay(new Date()));

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
