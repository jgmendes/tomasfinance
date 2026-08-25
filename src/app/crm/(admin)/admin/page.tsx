import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Users, ShieldCheck, Sparkles, DollarSign, ArrowRight } from "lucide-react";
import type { BillingSubscription, Plan } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [profilesRes, kycRes, subsRes, plansRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("kyc").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("billing_subscriptions").select("*"),
    supabase.from("plans").select("*"),
  ]);

  const subs = (subsRes.data ?? []) as BillingSubscription[];
  const plans = (plansRes.data ?? []) as Plan[];
  const planById = Object.fromEntries(plans.map((p) => [p.id, p]));

  const ativos = subs.filter((s) => s.status === "ativa");
  const mrr = ativos
    .filter((s) => s.billing_enabled)
    .reduce((sum, s) => {
      const plan = planById[s.plan_id ?? ""];
      if (!plan) return sum;
      return sum + (s.cycle === "anual" ? Math.round(plan.price_annual_cents / 12) : plan.price_cents);
    }, 0);

  const cards = [
    { label: "Usuários", href: "/crm/admin/usuarios", icon: Users, desc: "Ver e gerenciar contas" },
    { label: "KYC", href: "/crm/admin/kyc", icon: ShieldCheck, desc: "Aprovar verificações" },
    { label: "Assinaturas", href: "/crm/admin/assinaturas", icon: Sparkles, desc: "Cobrança e planos" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold">Visão Geral</h1>
      <p className="mb-6 text-sm text-muted-foreground">Resumo da plataforma</p>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Usuários" value={String(profilesRes.count ?? 0)} icon={Users} />
        <StatCard title="KYC pendentes" value={String(kycRes.count ?? 0)} icon={ShieldCheck} accent="text-amber-500" iconBg="bg-amber-500/10" />
        <StatCard title="Assinaturas ativas" value={String(ativos.length)} icon={Sparkles} accent="text-emerald-500" iconBg="bg-emerald-500/10" />
        <StatCard title="Receita mensal (MRR)" value={formatCurrency(mrr / 100)} icon={DollarSign} accent="text-primary" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
