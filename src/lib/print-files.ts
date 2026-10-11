import "server-only";
import { PRINT_FILES_BUCKET } from "@/lib/prints";
import { createServiceClient } from "@/lib/supabase/admin";

type Service = NonNullable<ReturnType<typeof createServiceClient>>;

/** READY prints keep their upload this long so an UNDO can still bring the job back. */
export const PURGE_GRACE_MS = 2 * 60_000;

/** Delete one object from the print-files bucket. Returns an error message or null. */
export async function removeStoredFile(db: Service, path: string): Promise<string | null> {
  const { error } = await db.storage.from(PRINT_FILES_BUCKET).remove([path]);
  return error ? error.message : null;
}

/**
 * Sweep: every print that has been READY for longer than the grace period and
 * still has an upload attached loses it. Covers READY marks made from the
 * Flutter app or made moments before the admin closed the tab.
 */
export async function purgeCompletedFiles(): Promise<number> {
  const db = createServiceClient();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - PURGE_GRACE_MS).toISOString();
  const { data, error } = await db
    .from("print_requests")
    .select("id, file_path")
    .eq("status", 3)
    .not("file_path", "is", null)
    .lt("ready_at", cutoff);
  if (error || !data) return 0;
  let purged = 0;
  for (const row of data as { id: string; file_path: string }[]) {
    const err = await removeStoredFile(db, row.file_path);
    if (err) {
      console.error("Could not delete print file", row.file_path, err);
      continue;
    }
    await db.from("print_requests").update({ file_path: null }).eq("id", row.id);
    purged++;
  }
  return purged;
}
