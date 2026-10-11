"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPrintRequestsByEmail, hasSupabaseEnv } from "@/lib/data";
import {
  MAX_PRINT_FILE_BYTES,
  PRINT_FILES_BUCKET,
  fileMatchesKind,
  isPrintColor,
  isPrintCut,
  isPrintGrade,
  isPrintKind,
  isValidEmail,
  isValidSize,
  normalizePrintRequest,
} from "@/lib/prints";
import type { PrintRequest } from "@/lib/types";

export type PrintActionResult =
  | { ok: true; request?: PrintRequest; id?: string }
  | { ok: false; error: string };

export type CreatePrintRequestInput = {
  kind: string;
  name: string;
  email: string;
  grade: string;
  fileName: string;
  /** Object path returned by the browser upload (`<token>/<file>`). */
  filePath: string;
  color: string;
  size: string;
  qty: number;
  cut: string | null;
  due: string | null;
  notes: string;
};

function revalidatePrints() {
  revalidatePath("/print");
  revalidatePath("/requests");
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
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { ok: false, error: "Add your name." };
  if (!isValidEmail(email)) return { ok: false, error: "Add your KIS email." };
  if (!isPrintGrade(input.grade)) return { ok: false, error: "Pick your grade." };

  const fileName = input.fileName.trim();
  if (!fileName || !fileMatchesKind(kind, fileName)) {
    return {
      ok: false,
      error:
        kind === "3d"
          ? "That isn't a 3D file — export as .STL or .3MF."
          : "That file type won't print — use PDF, PNG or SVG.",
    };
  }
  if (!isValidSize(kind, input.size)) return { ok: false, error: "Pick a size." };

  const is3d = kind === "3d";
  const color = is3d ? input.color : "vinyl";
  if (!isPrintColor(color) || (is3d && color === "vinyl")) {
    return { ok: false, error: "Pick a filament colour." };
  }
  const qty = is3d ? 1 : Math.round(Number(input.qty) || 1);
  if (qty < 1 || qty > 50) return { ok: false, error: "Quantity must be 1–50." };
  const cut = is3d ? null : input.cut;
  if (!is3d && !isPrintCut(cut)) return { ok: false, error: "Pick a cut style." };
  const due = input.due && /^\d{4}-\d{2}-\d{2}$/.test(input.due) ? input.due : null;
  const notes = input.notes.trim().slice(0, 500);

  const supabase = await createClient();
  const upload = await verifyUpload(supabase, input.filePath.trim());
  if (!upload.ok) return upload;

  const { data, error } = await supabase
    .from("print_requests")
    .insert({
      kind,
      name,
      email,
      grade: input.grade,
      file_name: fileName,
      file_path: input.filePath.trim(),
      file_size: upload.size,
      color,
      size: input.size,
      qty,
      cut,
      due,
      notes,
      status: 0,
    })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePrints();
  return {
    ok: true,
    request: normalizePrintRequest(data as Record<string, unknown>),
  };
}

/** Students may cancel only their own job and only while it is RECEIVED. */
export async function cancelPrintRequest(
  id: string,
  email: string,
): Promise<PrintActionResult> {
  if (!hasSupabaseEnv()) return { ok: false, error: "Database not configured." };
  const needle = email.trim().toLowerCase();
  if (!id || !needle) return { ok: false, error: "Missing request." };

  const supabase = await createClient();
  const { data, error: loadError } = await supabase
    .from("print_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return { ok: false, error: loadError.message };
  if (!data) return { ok: false, error: "That request is gone already." };

  const r = normalizePrintRequest(data as Record<string, unknown>);
  if (r.email !== needle) {
    return { ok: false, error: "That request belongs to a different email." };
  }
  if (r.status !== 0) {
    return {
      ok: false,
      error: "It's already on the machine — ask at the Creativity Space.",
    };
  }

  const { error } = await supabase
    .from("print_requests")
    .delete()
    .eq("id", id)
    .eq("status", 0);
  if (error) return { ok: false, error: error.message };

  revalidatePrints();
  return { ok: true, id, request: r };
}

/** Live list for the tracker — filters as the student types their email. */
export async function listPrintRequests(
  email: string,
): Promise<PrintRequest[]> {
  return getPrintRequestsByEmail(email);
}
