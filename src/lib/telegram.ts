import { getTelegramChannelUrl } from "@/lib/env";
import { PLACEHOLDER_TELEGRAM_POSTS } from "@/lib/constants";
import type { TelegramPost } from "@/lib/types";

export async function getTelegramPosts(): Promise<TelegramPost[]> {
  const channelUrl = getTelegramChannelUrl();
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

  // Feed integration placeholder — returns sample posts until Telegram API is wired.
  if (!channelUrl || !botToken) {
    return [...PLACEHOLDER_TELEGRAM_POSTS];
  }

  // Future: fetch channel posts via Telegram Bot API.
  return [...PLACEHOLDER_TELEGRAM_POSTS];
}
