export const dynamic = "force-dynamic";

import { ScheduleClient } from "@/components/ScheduleClient";
import { getPeriodBookings, getSpaceBlocks } from "@/lib/data";
import {
  mondayOfWeek,
  startOfDay,
  toISODate,
} from "@/lib/inventory";

export default async function SchedulePage() {
  const now = startOfDay(new Date());
  const from = toISODate(mondayOfWeek(now, 0));
  const toDate = mondayOfWeek(now, 1);
  toDate.setDate(toDate.getDate() + 4);
  const to = toISODate(toDate);

  const [bookings, blocks] = await Promise.all([
    getPeriodBookings(from, to),
    getSpaceBlocks(),
  ]);

  return (
    <ScheduleClient initialBookings={bookings} initialBlocks={blocks} />
  );
}
