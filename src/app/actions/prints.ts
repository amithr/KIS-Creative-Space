"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getAllPrintRequests,
  getFilamentColors,
  hasSupabaseEnv,
} from "@/lib/data";
import { toLiveJobs, type LiveJob } from "@/lib/board";
import {
  MAX_PRINT_FILE_BYTES,
  PRINT_FILES_BUCKET,
  fileMatchesKind,
  isPrintCut,
  isPrintKind,
  isValidName,
  normalizeName,
  normalizePrintRequest,
} from "@/lib/prints";
import type { FilamentColor, PrintRequest } from "@/lib/types";

export type PrintActionResult =
  | { ok: true; request?: PrintRequest; id?: string }
  | { ok: false; error: string };

export type CreatePrintRequestInput = {
  kind: string;
  name: string;
  fileName: string;
  /** Object path returned by the browser upload (`<token>/<file>`). */
  filePath: string;
  color: string;
  qty: number;
  cut: string | null;
};

function revalidatePrints() {
  revalidatePath("/");
  revalidatePath("/print");
  revalidatePath("/board");
  revalidatePath("/admin");
}

/** Confirms the browser upload landed in the bucket and is within the cap. */
async function verifyUpload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string,
): Promise<{ ok: true; size: number } | { ok: false; error: string }> {
  const parts = filePath.split("/");
  if (parts.length !== 2 || !/^[a-z0-9-]{8,}$/i.test(parts[0]) || !parts[1]) {
    return { ok: false, error: "Upload didn't finish — attach the file again." };
  }
  const [folder, objectName] = parts;
  const { data, error } = await supabase.storage
    .from(PRINT_FILES_BUCKET)
    .list(folder, { limit: 10, search: objectName });
  if (error) return { ok: false, error: error.message };
  const obj = (data ?? []).find((o) => o.name === objectName);
  if (!obj) {
    return { ok: false, error: "Upload didn't finish — attach the file again." };
  }
  const size = Number(
    (obj.metadata as Record<string, unknown> | null)?.size ?? 0,
  );
  if (size > MAX_PRINT_FILE_BYTES) {
    await supabase.storage.from(PRINT_FILES_BUCKET).remove([filePath]);
    return { ok: false, error: "That file is over 50 MB — export a smaller one." };
  }
  return { ok: true, size };
}

export async function createPrintRequest(
  input: CreatePrintRequestInput,
): Promise<PrintActionResult> {
  if (!hasSupabaseEnv()) return { ok: false, error: "Database not configured." };

  const kind = input.kind;
  if (!isPrintKind(kind)) return { ok: false, error: "Pick what we're making." };
  const name = normalizeName(input.name);
  if (!isValidName(name)) return { ok: false, error: "Add your name." };

  const fileName = input.fileName.trim();
  if (!fileName || !fileMatchesKind(kind, fileName)) {
    return {
      ok: false,
      error:
        kind === "3d"
          ? "That isn't a 3D file — export as .STL or .3MF."
          : "That file type won't print — use PDF, PNG, JPG or SVG.",
    };
  }

  const is3d = kind === "3d";
  let color = "vinyl";
  if (is3d) {
    const colors = await getFilamentColors();
    const chosen = colors.find((c) => c.v === input.color && c.on);
    if (!chosen) return { ok: false, error: "Pick a filament colour that's in stock." };
    color = chosen.v;
  }
  const qty = is3d ? 1 : Math.round(Number(input.qty) || 1);
  if (qty < 1 || qty > 50) return { ok: false, error: "Quantity must be 1–50." };
  const cut = is3d ? null : input.cut;
  if (!is3d && !isPrintCut(cut)) return { ok: false, error: "Pick a cut style." };

  const supabase = await createClient();
  const upload = await verifyUpload(supabase, input.filePath.trim());
  if (!upload.ok) return upload;

  const { data, error } = await supabase
    .from("print_requests")
    .insert({
      kind,
      name,
      file_name: fileName,
      file_path: input.filePath.trim(),
      file_size: upload.size,
      color,
      qty,
      cut,
      status: 0,
    })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  const request = normalizePrintRequest(data as Record<string, unknown>);
  revalidatePrints();
  return { ok: true, request };
}

export async function listFilamentColors(): Promise<FilamentColor[]> {
  return getFilamentColors();
}

/** ON THE PRINTERS poll: open jobs + recent READY ones, first name + initial only. */
export async function listLiveBoard(): Promise<LiveJob[]> {
  return toLiveJobs(await getAllPrintRequests());
}
