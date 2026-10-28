import { createClient } from "@/lib/supabase/server";
import { toLiveJobs, type LiveJob } from "@/lib/board";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import type { FilamentColor, PrintRequest } from "@/lib/types";
import {
  DEFAULT_COLORS,
  normalizeFilamentColor,
  normalizePrintRequest,
} from "@/lib/prints";

function hasSupabaseEnv() {
  return hasSupabasePublicEnv();
}

/** Every print request — Studio Admin queue and the live board. */
export async function getAllPrintRequests(): Promise<PrintRequest[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("print_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load print requests:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    normalizePrintRequest(row as Record<string, unknown>),
  );
}

/** ON THE PRINTERS: names-only live rows plus the server clock they were cut at. */
export async function getLiveBoard(): Promise<{ jobs: LiveJob[]; now: number }> {
  const now = Date.now();
  return { jobs: toLiveJobs(await getAllPrintRequests(), now), now };
}

/** Filament colours, admin order. Falls back to the default palette offline. */
export async function getFilamentColors(): Promise<FilamentColor[]> {
  if (!hasSupabaseEnv()) return DEFAULT_COLORS;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("filament_colors")
    .select("*")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load filament colours:", error.message);
    return DEFAULT_COLORS;
  }
  const list = (data ?? []).map((row) =>
    normalizeFilamentColor(row as Record<string, unknown>),
  );
  return list.length ? list : DEFAULT_COLORS;
}

export async function getPrintRequestById(
  id: string,
): Promise<PrintRequest | null> {
  if (!hasSupabaseEnv() || !id) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("print_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalizePrintRequest(data as Record<string, unknown>);
}

export { hasSupabaseEnv };
