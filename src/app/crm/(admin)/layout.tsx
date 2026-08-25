import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ConfirmProvider } from "@/components/app/confirm-provider";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/crm/admin-login");

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Somente administradores entram no painel
  if ((data as { role: string | null } | null)?.role !== "admin") {
    redirect("/crm/admin-login");
  }

  return (
    <ConfirmProvider>
      <div className="flex min-h-[100dvh] flex-col lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
        <AdminSidebar email={user.email ?? ""} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </ConfirmProvider>
  );
}
