"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  checkStudioPassword,
  clearStudioSession,
  isStudioAdmin,
  setStudioSession,
  studioConfigured,
} from "@/lib/studio-session";
import {
  isPrintOrigin,
  normalizeFilamentColor,
  normalizePrintRequest,
  printRequestInsertRow,
  slugifyColor,
} from "@/lib/prints";
import type { FilamentColor, PrintRequest } from "@/lib/types";

export type StudioResult<T = undefined> =
  | { ok: true; value?: T }
  | { ok: false; error: string };

type Service = NonNullable<ReturnType<typeof createServiceClient>>;

function revalidateStudio() {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/print");
  revalidatePath("/requests");
}

/** Studio session + service-role client, or a user-facing error. */
async function requireStudio(): Promise<
  { ok: true; db: Service } | { ok: false; error: string }
> {
  if (!(await isStudioAdmin())) {
    return { ok: false, error: "Signed out — open the queue again." };
  }
  const db = createServiceClient();
  if (!db) {
    return {
      ok: false,
      error:
        "Set SUPABASE_SECRET_KEY so the Studio Admin can write to the database.",
    };
  }
  return { ok: true, db };
}

export async function studioSignIn(password: string): Promise<StudioResult> {
  if (!studioConfigured()) {
    return { ok: false, error: "STUDIO_ADMIN_PW is not configured on the server." };
  }
  if (!checkStudioPassword(password)) return { ok: false, error: "wrong" };
  await setStudioSession();
  revalidatePath("/admin");
  return { ok: true };
}

export async function studioSignOut(): Promise<StudioResult> {
  await clearStudioSession();
  revalidatePath("/admin");
  return { ok: true };
}

async function loadRequest(db: Service, id: string) {
  const { data, error } = await db
    .from("print_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: error.message, request: null as PrintRequest | null };
  if (!data) return { error: "Request not found.", request: null };
  return { error: null, request: normalizePrintRequest(data as Record<string, unknown>) };
}

async function patchRequest(
  id: string,
  patch: Record<string, unknown>,
): Promise<StudioResult<PrintRequest>> {
  const auth = await requireStudio();
  if (!auth.ok) return auth;
  if (!id) return { ok: false, error: "Missing request." };
  const { data, error } = await auth.db
    .from("print_requests")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidateStudio();
  return { ok: true, value: normalizePrintRequest(data as Record<string, unknown>) };
}

export async function studioSetStatus(id: string, status: number) {
  if (![0, 1, 2, 3].includes(status)) return { ok: false, error: "Unknown stage." } as const;
  return patchRequest(id, { status });
}

export async function studioSetOrigin(id: string, origin: string) {
  if (!isPrintOrigin(origin)) return { ok: false, error: "Unknown origin." } as const;
  return patchRequest(id, { origin });
}

export async function studioSetQuality(id: string, quality: number) {
  if (![1, 2, 3].includes(quality)) return { ok: false, error: "Rating is 1–3." } as const;
  return patchRequest(id, { quality });
}

/** Adds `delta` to the request's adjust (+10 top-up; −10 reverses it). */
export async function studioAdjust(
  id: string,
  delta: number,
): Promise<StudioResult<PrintRequest>> {
  const auth = await requireStudio();
  if (!auth.ok) return auth;
  const { error, request } = await loadRequest(auth.db, id);
  if (error || !request) return { ok: false, error: error ?? "Request not found." };
  return patchRequest(id, { adjust: request.adjust + Math.round(delta) });
}

export async function studioRemove(id: string): Promise<StudioResult<PrintRequest>> {
  const auth = await requireStudio();
  if (!auth.ok) return auth;
  const { error, request } = await loadRequest(auth.db, id);
  if (error || !request) return { ok: false, error: error ?? "Request not found." };
  const del = await auth.db.from("print_requests").delete().eq("id", id);
  if (del.error) return { ok: false, error: del.error.message };
  revalidateStudio();
  return { ok: true, value: request };
}

/** Undo for a removal — re-inserts the snapshot (same id, same stage). */
export async function studioRestore(
  snapshot: PrintRequest,
): Promise<StudioResult<PrintRequest>> {
  const auth = await requireStudio();
  if (!auth.ok) return auth;
  const { data, error } = await auth.db
    .from("print_requests")
    .insert(printRequestInsertRow(snapshot))
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidateStudio();
  return { ok: true, value: normalizePrintRequest(data as Record<string, unknown>) };
}

// --------------------------------------------------------------------------
// Filament colours

export async function studioUpsertColor(
  color: FilamentColor,
): Promise<StudioResult<FilamentColor>> {
  const auth = await requireStudio();
  if (!auth.ok) return auth;
  const v = slugifyColor(color.v || color.label);
  const label = color.label.trim().toUpperCase();
  if (!v || !label) return { ok: false, error: "Give the colour a name first." };
  if (!/^#[0-9a-f]{6}$/i.test(color.hex)) return { ok: false, error: "Pick a swatch colour." };
  const { data, error } = await auth.db
    .from("filament_colors")
    .upsert(
      { v, label, hex: color.hex.toLowerCase(), on: color.on, sort: color.sort },
      { onConflict: "v" },
    )
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidateStudio();
  return { ok: true, value: normalizeFilamentColor(data as Record<string, unknown>) };
}

export async function studioAddColor(
  name: string,
  hex: string,
  existing: number,
): Promise<StudioResult<FilamentColor>> {
  const auth = await requireStudio();
  if (!auth.ok) return auth;
  const v = slugifyColor(name);
  if (!v) return { ok: false, error: "Give the colour a name first." };
  const dup = await auth.db.from("filament_colors").select("v").eq("v", v).maybeSingle();
  if (dup.data) return { ok: false, error: "duplicate" };
  return studioUpsertColor({
    v,
    label: name.trim().toUpperCase(),
    hex,
    on: true,
    sort: existing,
  });
}

export async function studioSetColorOn(
  v: string,
  on: boolean,
): Promise<StudioResult<FilamentColor>> {
  const auth = await requireStudio();
  if (!auth.ok) return auth;
  const { data, error } = await auth.db
    .from("filament_colors")
    .update({ on })
    .eq("v", v)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidateStudio();
  return { ok: true, value: normalizeFilamentColor(data as Record<string, unknown>) };
}

export async function studioRemoveColor(v: string): Promise<StudioResult> {
  const auth = await requireStudio();
  if (!auth.ok) return auth;
  const { error } = await auth.db.from("filament_colors").delete().eq("v", v);
  if (error) return { ok: false, error: error.message };
  revalidateStudio();
  return { ok: true };
}
