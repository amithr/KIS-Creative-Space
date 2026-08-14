export const dynamic = "force-dynamic";

import { ResourcesClient } from "@/components/ResourcesClient";
import {
  getActiveReservations,
  getEffectiveAreaNames,
  getEquipment,
  getItemRequests,
} from "@/lib/data";

export default async function HomePage() {
  const [equipment, reservations, itemRequests, areaNames] = await Promise.all([
    getEquipment(),
    getActiveReservations(),
    getItemRequests(),
    getEffectiveAreaNames(),
  ]);

  return (
    <ResourcesClient
      equipment={equipment}
      reservations={reservations}
      itemRequests={itemRequests}
      areaNames={areaNames}
    />
  );
}
