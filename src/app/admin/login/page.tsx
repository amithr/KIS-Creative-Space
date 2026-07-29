import { AdminShell } from "@/components/admin/AdminShell";
import { LoginForm } from "@/components/admin/LoginForm";

const ERROR_MESSAGES: Record<string, string> = {
  not_teacher:
    "This account is not registered as a teacher. Ask an administrator to add you to the teachers table.",
  auth_failed: "Authentication failed. Please try again.",
};

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? decodeURIComponent(error))
    : undefined;

  return (
    <AdminShell>
      <div className="page-gutter">
        <LoginForm errorMessage={errorMessage} />
      </div>
    </AdminShell>
  );
}
