export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getTelegramChannelUrl() {
  const direct = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL?.trim();
  if (direct) return direct;

  const username = process.env.TELEGRAM_CHANNEL_USERNAME?.trim().replace(/^@/, "");
  if (username) return `https://t.me/${username}`;

  return null;
}

export function getTelegramChannelUsername() {
  const fromEnv = process.env.TELEGRAM_CHANNEL_USERNAME?.trim().replace(/^@/, "");
  if (fromEnv) return fromEnv;

  const url = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL?.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.replace(/^\//, "").split("/")[0];
    return segment || null;
  } catch {
    return null;
  }
}

export function isTelegramConfigured() {
  return Boolean(getTelegramChannelUrl());
}
