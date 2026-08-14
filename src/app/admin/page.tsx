export const dynamic = "force-dynamic";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminShell } from "@/components/admin/AdminShell";
import { LoginForm } from "@/components/admin/LoginForm";
import {
  getActiveReservations,
  getAdminSpaceBookings,
  getAdminTrainingSessions,
  getAreas,
  getEquipmentWithUnits,
  getItemRequests,
  getSpaceBlocks,
  isTeacher,
} from "@/lib/data";

const ERROR_MESSAGES: Record<string, string> = {
  not_teacher:
    "This account is not registered as a teacher. Ask an administrator to add you to the teachers table.",
  auth_failed: "Your session expired. Please sign in again.",
};

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const authenticated = await isTeacher();

  if (!authenticated) {
    const errorMessage = error
      ? (ERROR_MESSAGES[error] ?? decodeURIComponent(error))
      : undefined;

    return (
      <AdminShell authenticated={false}>
        <div className="page-gutter">
          <LoginForm errorMessage={errorMessage} />
        </div>
      </AdminShell>
    );
  }

  const [
    equipment,
    reservations,
    spaceBookings,
    spaceBlocks,
    trainingSessions,
    itemRequests,
    areas,
  ] = await Promise.all([
    getEquipmentWithUnits(),
    getActiveReservations(),
    getAdminSpaceBookings(),
    getSpaceBlocks(),
    getAdminTrainingSessions(),
    getItemRequests(),
    getAreas(),
  ]);

  return (
    <AdminShell authenticated>
      <AdminDashboard
        equipment={equipment}
        reservations={reservations}
        spaceBookings={spaceBookings}
        spaceBlocks={spaceBlocks}
        trainingSessions={trainingSessions}
        itemRequests={itemRequests}
        areas={areas}
      />
    </AdminShell>
  );
}
