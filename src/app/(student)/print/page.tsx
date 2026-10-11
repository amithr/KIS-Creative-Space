export const dynamic = "force-dynamic";

import { PrintRequestClient } from "@/components/students/PrintRequestClient";
import { getFilamentColors } from "@/lib/data";
import { isPrintKind } from "@/lib/prints";

type PageProps = { searchParams: Promise<{ kind?: string }> };

export default async function StudentPrintPage({ searchParams }: PageProps) {
  const [{ kind }, colors] = await Promise.all([searchParams, getFilamentColors()]);
  return (
    <PrintRequestClient initialKind={isPrintKind(kind) ? kind : "3d"} colors={colors} />
  );
}
