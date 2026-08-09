export async function AdminShell({
  children,
}: {
  children: React.ReactNode;
  authenticated?: boolean;
}) {
  return (
    <div className="min-h-screen bg-white text-[#141414]">
      <main>{children}</main>
    </div>
  );
}
