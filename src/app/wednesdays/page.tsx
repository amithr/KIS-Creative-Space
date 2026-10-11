export const dynamic = "force-dynamic";

import { WednesdaysClient } from "@/components/WednesdaysClient";
import {
  getPeriodBookings,
  getSpaceBlocks,
  getStudentProjectsByEmail,
  getTrainingSessions,
  getWednesdayEntries,
} from "@/lib/data";
import { getTeacherPortalEmail } from "@/lib/teacher-portal";
import { wednesdayHorizonIso } from "@/lib/wednesdays";

export default async function WednesdaysPage() {
  const email = await getTeacherPortalEmail();
  const { from, to } = wednesdayHorizonIso();

  const [entries, bookings, blocks, training, projects] = await Promise.all([
    getWednesdayEntries(from, to),
    getPeriodBookings(from, to),
    getSpaceBlocks(),
    getTrainingSessions(from, to),
    email ? getStudentProjectsByEmail(email) : Promise.resolve([]),
  ]);

  return (
    <WednesdaysClient
      initialEmail={email}
      initialEntries={entries}
      initialProjects={projects}
      initialBookings={bookings}
      initialBlocks={blocks}
      initialTraining={training}
    />
  );
}
