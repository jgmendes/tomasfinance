"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Check, Loader2, Sparkles, Copy, QrCode, RefreshCw } from "lucide-react";
import type { BillingSubscription, Charge, Plan, BillingStatus, BillingCycle } from "@/lib/database.types";

const STATUS: Record<BillingStatus, { label: string; variant: any }> = {
  trial: { label: "Período de teste", variant: "warning" },
  ativa: { label: "Ativa", variant: "success" },
  atrasada: { label: "Pagamento pendente", variant: "warning" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

export default function PlanoPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sub, setSub] = useState<BillingSubscription | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [cycle, setCycle] = useState<BillingCycle>("mensal");
  const [paying, setPaying] = useState(false);
  const [pix, setPix] = useState<{ code: string; qrcode: string; amount: number } | null>(null);

  async function load() {
    const [p, s, c] = await Promise.all([
      supabase.from("plans").select("*").eq("active", true).order("sort").limit(1).maybeSingle(),
      supabase.from("billing_subscriptions").select("*").maybeSingle(),
      supabase.from("charges").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    setPlan(p.data as Plan | null);
    setSub(s.data as BillingSubscription | null);
    setCharges((c.data ?? []) as Charge[]);
    const sc = (s.data as BillingSubscription | null)?.cycle;
    if (sc) setCycle(sc);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function subscribe() {
    if (!plan) return;
    setPaying(true);
    setPix(null);
    try {
      const res = await fetch("/api/billing/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, cycle }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Erro", { description: data.error ?? "Tente novamente" });
        return;
      }
      setPix({ code: data.code, qrcode: data.qrcode, amount: data.amount_cents });
    } catch {
      toast.error("Erro ao iniciar cobrança");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const status = sub ? STATUS[sub.status] : null;
  const price = plan ? (cycle === "anual" ? plan.price_annual_cents : plan.price_cents) : 0;
  const monthlyEquivalent = plan ? plan.price_annual_cents / 12 : 0;
  const annualSavings = plan ? plan.price_cents * 12 - plan.price_annual_cents : 0;

  let trialDays: number | null = null;
  if (sub?.status === "trial" && sub.current_period_end) {
    const end = new Date(sub.current_period_end + "T23:59:59");
    trialDays = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Meu Plano" description="Assine para continuar usando após o período grátis">
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Atualizar</Button>
      </PageHeader>

      {sub && status && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-semibold">{plan?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {sub.status === "trial" && trialDays !== null
                  ? `${trialDays} dia(s) de teste restantes`
                  : sub.current_period_end
                  ? `Válido até ${formatDate(sub.current_period_end)}`
                  : "—"}
              </p>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </CardContent>
        </Card>
      )}

      {plan && (
        <Card className="border-primary shadow-lg">
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">{plan.name}</h3>
              </div>
              <Tabs value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
                <TabsList>
                  <TabsTrigger value="mensal">Mensal</TabsTrigger>
                  <TabsTrigger value="anual">Anual</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="mb-1">
              <span className="text-4xl font-extrabold">{formatCurrency(price / 100)}</span>
              <span className="text-sm text-muted-foreground">/{cycle === "anual" ? "ano" : "mês"}</span>
              <span className="ml-1 text-sm text-muted-foreground">· por usuário</span>
            </div>
            {cycle === "anual" ? (
              <p className="mb-4 text-sm text-emerald-500">
                Equivale a {formatCurrency(monthlyEquivalent / 100)}/mês · economize {formatCurrency(annualSavings / 100)}/ano
              </p>
            ) : (
              <p className="mb-4 text-sm text-muted-foreground">No plano anual sai mais barato.</p>
            )}

            <ul className="mb-6 grid gap-2 text-sm sm:grid-cols-2">
              {(plan.features ?? []).map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {f}
                </li>
              ))}
            </ul>

            <Button size="lg" className="w-full" onClick={subscribe} disabled={paying}>
              {paying && <Loader2 className="h-4 w-4 animate-spin" />}
              Assinar {cycle === "anual" ? "anual" : "mensal"} · {formatCurrency(price / 100)}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Pagamento via PIX. Ativação automática após o pagamento.
            </p>
          </CardContent>
        </Card>
      )}

      {charges.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-5">
            <h3 className="mb-3 font-semibold">Histórico de cobranças</h3>
            <div className="space-y-2">
              {charges.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(c.created_at)} · {c.description}</span>
                  <span className="flex items-center gap-2">
                    {formatCurrency(c.amount_cents / 100)}
                    <Badge variant={c.status === "pago" ? "success" : c.status === "pendente" ? "warning" : "secondary"}>{c.status}</Badge>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!pix} onOpenChange={(o) => !o && setPix(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> Pague com PIX</DialogTitle>
          </DialogHeader>
          {pix && (
            <div className="space-y-4 text-center">
              <p className="text-2xl font-bold">{formatCurrency(pix.amount / 100)}</p>
              {pix.qrcode && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pix.qrcode.startsWith("data:") ? pix.qrcode : `data:image/png;base64,${pix.qrcode}`}
                  alt="QR Code PIX"
                  className="mx-auto h-56 w-56 rounded-lg border bg-white p-2"
                />
              )}
              <div className="rounded-lg bg-muted p-2 text-left text-xs">
                <p className="mb-1 font-medium">PIX copia e cola:</p>
                <p className="break-all font-mono text-muted-foreground">{pix.code}</p>
              </div>
              <Button variant="outline" className="w-full"
                onClick={() => { navigator.clipboard.writeText(pix.code); toast.success("Código copiado!"); }}>
                <Copy className="h-4 w-4" /> Copiar código PIX
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
