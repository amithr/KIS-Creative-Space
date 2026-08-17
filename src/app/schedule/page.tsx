export const dynamic = "force-dynamic";

import { ScheduleClient } from "@/components/ScheduleClient";
import {
  getPeriodBookings,
  getSpaceBlocks,
  getTrainingSessions,
} from "@/lib/data";
import { threeWeekHorizon } from "@/lib/school-calendar";

export default async function SchedulePage() {
  const { from, to } = threeWeekHorizon();

  const [bookings, blocks, training] = await Promise.all([
    getPeriodBookings(from, to),
    getSpaceBlocks(),
    getTrainingSessions(from, to),
  ]);

  return (
    <ScheduleClient
      initialBookings={bookings}
      initialBlocks={blocks}
      initialTraining={training}
    />
  );
}
