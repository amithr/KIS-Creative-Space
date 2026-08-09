import type { StockStatus } from "@/lib/types";

const AREA_PILLS: Record<string, { bg: string; fg: string }> = {
  "LEGO Play": { bg: "#f9efe7", fg: "#b3532c" },
  Robotics: { bg: "#edf3f7", fg: "#2f6b8f" },
  "Art & Design": { bg: "#f3eff8", fg: "#7a5ea8" },
  "VR Lab": { bg: "#eef7f0", fg: "#2f7d3e" },
  "3D Printing": { bg: "#f8f3e3", fg: "#9a7a1e" },
};

const FALLBACK = { bg: "#f2f0ea", fg: "#6d6759" };

export function areaPillColors(area: string) {
  return AREA_PILLS[area] ?? FALLBACK;
}

export function stockBarColor(status: StockStatus) {
  if (status === "Unavailable") return "#c8102e";
  if (status === "Low stock") return "#e0a010";
  return "#2f9e44";
}
