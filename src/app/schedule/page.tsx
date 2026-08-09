export const dynamic = "force-dynamic";

import { ScheduleClient } from "@/components/ScheduleClient";
import { getPeriodBookings, getSpaceBlocks } from "@/lib/data";
import { startOfDay } from "@/lib/inventory";
import { rollingSevenRange } from "@/lib/schedule-ui";

export default async function SchedulePage() {
  const { from, to } = rollingSevenRange(startOfDay(new Date()));

  const [bookings, blocks] = await Promise.all([
    getPeriodBookings(from, to),
    getSpaceBlocks(),
  ]);

  return (
    <ScheduleClient initialBookings={bookings} initialBlocks={blocks} />
  );
}
