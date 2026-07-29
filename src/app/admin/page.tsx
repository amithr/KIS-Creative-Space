export const dynamic = "force-dynamic";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminShell, requireTeacherPage } from "@/components/admin/AdminShell";
import { getEquipmentWithUnits } from "@/lib/data";

export default async function AdminPage() {
  await requireTeacherPage();
  const equipment = await getEquipmentWithUnits();

  return (
    <AdminShell>
      <AdminDashboard equipment={equipment} />
    </AdminShell>
  );
}
