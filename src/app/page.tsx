export const dynamic = "force-dynamic";

import { ResourcesClient } from "@/components/ResourcesClient";
import { getActiveReservations, getEquipment, getItemRequests } from "@/lib/data";

export default async function HomePage() {
  const [equipment, reservations, itemRequests] = await Promise.all([
    getEquipment(),
    getActiveReservations(),
    getItemRequests(),
  ]);

  return (
    <ResourcesClient
      equipment={equipment}
      reservations={reservations}
      itemRequests={itemRequests}
    />
  );
}
