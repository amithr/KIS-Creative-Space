import { createClient } from "@/lib/supabase/client";
import { PRINT_FILES_BUCKET, sanitizeFileName } from "@/lib/prints";

const MIME_BY_EXT: Record<string, string> = {
  stl: "model/stl",
  "3mf": "model/3mf",
  obj: "model/obj",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
};

function tokenFolder() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

/**
 * Browser → Supabase Storage upload. The server action then verifies the
 * object exists and is within the 50 MB cap before creating the row.
 * Returns the object path (`<token>/<file>`).
 */
export async function uploadPrintFile(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const path = `${tokenFolder()}/${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(PRINT_FILES_BUCKET)
    .upload(path, file, {
      contentType: MIME_BY_EXT[ext] ?? "application/octet-stream",
      upsert: false,
    });
  if (error) throw new Error(error.message);
  return path;
}
