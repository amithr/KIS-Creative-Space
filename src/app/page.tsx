export const dynamic = "force-dynamic";

import { ResourcesClient } from "@/components/ResourcesClient";
import { getEquipment, getSiteSettings } from "@/lib/data";
import { getTelegramChannelUrl } from "@/lib/env";
import { getTelegramPosts } from "@/lib/telegram";

export default async function HomePage() {
  const [equipment, settings, telegramPosts] = await Promise.all([
    getEquipment(),
    getSiteSettings(),
    getTelegramPosts(),
  ]);

  const telegramUrl = getTelegramChannelUrl();
  const telegramHandle = telegramUrl
    ? `@${telegramUrl.replace(/^https?:\/\/t\.me\//, "")}`
    : "@kis_creativity";

  return (
    <ResourcesClient
      equipment={equipment}
      showTelegram={settings.show_telegram}
      telegramPosts={telegramPosts}
      telegramUrl={telegramUrl}
      telegramHandle={telegramHandle}
    />
  );
}
