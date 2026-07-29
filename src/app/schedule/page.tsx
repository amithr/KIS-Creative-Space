export const dynamic = "force-dynamic";

import { ScheduleClient } from "@/components/ScheduleClient";
import { getPeriodBookings } from "@/lib/data";
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

  const bookings = await getPeriodBookings(from, to);

  return <ScheduleClient initialBookings={bookings} />;
}
