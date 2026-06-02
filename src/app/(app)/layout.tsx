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
    .select("full_name, avatar_url, role, mfa_enabled")
    .eq("id", user.id)
    .single();
  const profile = data as {
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    mfa_enabled: boolean | null;
  } | null;
  const isAdmin = profile?.role === "admin";

  // 2FA obrigatório: se o usuário tem 2FA ativo e a sessão ainda não está
  // em aal2 (não passou pelo desafio neste login), exige a verificação.
  if (profile?.mfa_enabled) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const aal = decodeAal(session?.access_token);
    if (aal && aal !== "aal2") {
      redirect("/verificar-2fa");
    }
  }

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

/** Lê o claim `aal` do JWT da sessão (sem chamada de rede). */
function decodeAal(token?: string): string | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(json).aal ?? null;
  } catch {
    return null;
  }
}
