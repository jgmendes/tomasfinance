import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { MobileNav } from "@/components/app/mobile-nav";
import { ConfirmProvider } from "@/components/app/confirm-provider";
import { Logo } from "@/components/app/logo";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .single();
  const profile = data as {
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  } | null;
  const isAdmin = profile?.role === "admin";

  return (
    <ConfirmProvider>
      {/* h-[100dvh] + overflow-hidden: a sidebar fica fixa e SÓ o conteúdo rola */}
      <div className="flex h-[100dvh] overflow-hidden">
        {/* Sidebar desktop (fixa) */}
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
          <Link
            href="/dashboard"
            className="flex h-16 shrink-0 items-center border-b px-5 text-[15px]"
          >
            <Logo />
          </Link>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav isAdmin={isAdmin} />
          </div>
        </aside>

        {/* Conteúdo */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            email={user.email ?? ""}
            fullName={profile?.full_name ?? null}
            avatarUrl={profile?.avatar_url ?? null}
            isAdmin={isAdmin}
          />
          {/* única área rolável; padding-bottom no mobile por causa da nav inferior */}
          <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-6 lg:pb-6">
            {children}
          </main>
        </div>

        {/* Navegação inferior (somente mobile) */}
        <MobileNav />
      </div>
    </ConfirmProvider>
  );
}
