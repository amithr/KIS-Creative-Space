const SERIAL_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSerialNumber(prefix = "KIS"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += SERIAL_CHARS[bytes[i] % SERIAL_CHARS.length];
  }
  return `${prefix}-${suffix}`;
}

export async function generateUniqueSerialNumber(
  exists: (serial: string) => Promise<boolean>,
  maxAttempts = 10,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const serial = generateSerialNumber();
    if (!(await exists(serial))) return serial;
  }
  throw new Error("Could not generate a unique serial number.");
}
