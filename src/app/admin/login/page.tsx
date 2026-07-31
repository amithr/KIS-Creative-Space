import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

/** Legacy route — login now lives at /admin. */
export default async function AdminLoginRedirect({ searchParams }: PageProps) {
  const { error } = await searchParams;
  redirect(error ? `/admin?error=${encodeURIComponent(error)}` : "/admin");
}
