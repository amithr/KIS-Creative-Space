import { StudentShell } from "@/components/students/StudentShell";

/** The public site: landing, print request form, job tracker. */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="kis-students">
      <StudentShell>{children}</StudentShell>
    </div>
  );
}
