export const dynamic = "force-dynamic";

import { ResourcesClient } from "@/components/ResourcesClient";
import { getActiveReservations, getEquipment, getSiteSettings } from "@/lib/data";
import { getTelegramChannelUrl } from "@/lib/env";
import { getTelegramPosts } from "@/lib/telegram";

export default async function HomePage() {
  const [equipment, settings, telegramPosts, reservations] = await Promise.all([
    getEquipment(),
    getSiteSettings(),
    getTelegramPosts(),
    getActiveReservations(),
  ]);

  const telegramUrl = getTelegramChannelUrl();
  const telegramHandle = telegramUrl
    ? `@${telegramUrl.replace(/^https?:\/\/t\.me\//, "")}`
    : "@kis_creativity";

  return (
    <ResourcesClient
      equipment={equipment}
      reservations={reservations}
      showTelegram={settings.show_telegram}
      telegramPosts={telegramPosts}
      telegramUrl={telegramUrl}
      telegramHandle={telegramHandle}
    />
  );
}
