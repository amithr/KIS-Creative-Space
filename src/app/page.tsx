export const dynamic = "force-dynamic";

import { ResourcesClient } from "@/components/ResourcesClient";
import { getActiveReservations, getEquipment } from "@/lib/data";

export default async function HomePage() {
  const [equipment, reservations] = await Promise.all([
    getEquipment(),
    getActiveReservations(),
  ]);

  return (
    <ResourcesClient equipment={equipment} reservations={reservations} />
  );
}
