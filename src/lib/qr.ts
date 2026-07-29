import QRCode from "qrcode";
import { getAppUrl } from "@/lib/env";

export function equipmentQrUrl(qrCode: string) {
  return `${getAppUrl()}/equipment/${encodeURIComponent(qrCode)}`;
}

export async function generateQrDataUrl(qrCode: string): Promise<string> {
  return QRCode.toDataURL(equipmentQrUrl(qrCode), {
    margin: 1,
    width: 256,
    color: { dark: "#141414", light: "#fcfbf8" },
  });
}

export function slugifyQrCode(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
