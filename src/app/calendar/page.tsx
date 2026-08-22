export const dynamic = "force-dynamic";

import { CalendarClient } from "@/components/CalendarClient";
import {
  getPeriodBookings,
  getSpaceBlocks,
  getTrainingSessions,
} from "@/lib/data";
import { threeWeekHorizon } from "@/lib/school-calendar";

export default async function CalendarPage() {
  const { from, to } = threeWeekHorizon();

  const [bookings, blocks, training] = await Promise.all([
    getPeriodBookings(from, to),
    getSpaceBlocks(),
    getTrainingSessions(from, to),
  ]);

  return (
    <CalendarClient
      initialBookings={bookings}
      initialBlocks={blocks}
      initialTraining={training}
    />
  );
}
