"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Users, DollarSign, CheckCircle2, Power } from "lucide-react";
import type { BillingSubscription, BillingStatus, Plan, Profile } from "@/lib/database.types";

const STATUS: Record<BillingStatus, { label: string; variant: any }> = {
  trial: { label: "Teste", variant: "warning" },
  ativa: { label: "Ativa", variant: "success" },
  atrasada: { label: "Pendente", variant: "warning" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

export function AdminBillingClient() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<BillingSubscription[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  async function load() {
    const [s, p, pl] = await Promise.all([
      supabase.from("billing_subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("plans").select("*"),
    ]);
    setSubs((s.data ?? []) as BillingSubscription[]);
    setProfiles((p.data ?? []) as Profile[]);
    setPlans((pl.data ?? []) as Plan[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profById = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])), [profiles]);
  const planById = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);

  const stats = useMemo(() => {
    const ativos = subs.filter((s) => s.status === "ativa");
    const mrr = ativos
      .filter((s) => s.billing_enabled)
      .reduce((sum, s) => sum + (planById[s.plan_id ?? ""]?.price_cents ?? 0), 0);
    return { total: subs.length, ativos: ativos.length, mrr };
  }, [subs, planById]);

  async function toggleBilling(s: BillingSubscription) {
    const { error } = await supabase
      .from("billing_subscriptions")
      .update({ billing_enabled: !s.billing_enabled })
      .eq("id", s.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success(s.billing_enabled ? "Cobrança pausada" : "Cobrança reativada");
    load();
  }

  async function changeStatus(s: BillingSubscription, status: BillingStatus) {
    const { error } = await supabase
      .from("billing_subscriptions")
      .update({ status })
      .eq("id", s.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success("Status atualizado");
    load();
  }

  if (loading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <PageHeader title="Assinaturas" description="Administre os assinantes e a cobrança" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Assinantes" value={String(stats.total)} icon={Users} />
        <StatCard title="Ativos" value={String(stats.ativos)} icon={CheckCircle2} accent="text-emerald-500" iconBg="bg-emerald-500/10" />
        <StatCard title="Receita recorrente (MRR)" value={formatCurrency(stats.mrr / 100)} icon={DollarSign} accent="text-primary" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Próx. cobrança</TableHead>
                <TableHead>Cobrança</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((s) => {
                const prof = profById[s.user_id];
                const plan = planById[s.plan_id ?? ""];
                const st = STATUS[s.status];
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium">{prof?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{prof?.email}</p>
                    </TableCell>
                    <TableCell>{plan ? `${plan.name} (${formatCurrency(plan.price_cents / 100)})` : "—"}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.next_charge_date ? formatDate(s.next_charge_date) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.billing_enabled ? "success" : "secondary"}>
                        {s.billing_enabled ? "Ativa" : "Pausada"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleBilling(s)}>
                          <Power className="h-3.5 w-3.5" />
                          {s.billing_enabled ? "Parar de cobrar" : "Voltar a cobrar"}
                        </Button>
                        <Select value={s.status} onValueChange={(v) => changeStatus(s, v as BillingStatus)}>
                          <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Teste</SelectItem>
                            <SelectItem value="ativa">Ativa</SelectItem>
                            <SelectItem value="atrasada">Pendente</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {subs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhuma assinatura ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
