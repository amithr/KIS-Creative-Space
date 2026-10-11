import { PrintRequestClient } from "@/components/students/PrintRequestClient";
import { isPrintKind } from "@/lib/prints";

type PageProps = { searchParams: Promise<{ kind?: string }> };

export default async function StudentPrintPage({ searchParams }: PageProps) {
  const { kind } = await searchParams;
  return <PrintRequestClient initialKind={isPrintKind(kind) ? kind : "3d"} />;
}
