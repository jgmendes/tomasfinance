import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { MobileNav } from "@/components/app/mobile-nav";
import { ConfirmProvider } from "@/components/app/confirm-provider";
import { Logo } from "@/components/app/logo";
import { TrialGate } from "@/components/app/trial-gate";
import { ReminderWatcher } from "@/components/app/reminder-watcher";
import type { BillingSubscription } from "@/lib/database.types";

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

  // Estado da assinatura (trial 14 dias → bloqueia se vencer e não pagar)
  const { data: subData } = await supabase
    .from("billing_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  const sub = subData as Pick<BillingSubscription, "status" | "current_period_end"> | null;
  let blocked = false;
  let trialDaysLeft: number | null = null;
  if (sub) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = sub.current_period_end ? new Date(sub.current_period_end + "T23:59:59") : null;
    const expired = end ? end.getTime() < Date.now() : false;
    if (sub.status === "ativa" && !expired) {
      blocked = false;
    } else if (expired || sub.status === "cancelada" || sub.status === "atrasada") {
      blocked = true;
    } else if (sub.status === "trial" && end) {
      trialDaysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
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
            <TrialGate blocked={blocked} trialDaysLeft={trialDaysLeft} />
            {children}
          </main>
        </div>

        {/* Navegação inferior (somente mobile) */}
        <MobileNav />
        <ReminderWatcher />
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
