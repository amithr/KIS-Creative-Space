export const dynamic = "force-dynamic";

import { MyRequestsClient } from "@/components/students/MyRequestsClient";
import { getFilamentColors } from "@/lib/data";

export default async function StudentRequestsPage() {
  const colors = await getFilamentColors();
  return <MyRequestsClient colors={colors} />;
}
