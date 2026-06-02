"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Check, Loader2, Sparkles, Copy, QrCode, RefreshCw } from "lucide-react";
import type { BillingSubscription, Charge, Plan, BillingStatus } from "@/lib/database.types";

const STATUS: Record<BillingStatus, { label: string; variant: any }> = {
  trial: { label: "Período de teste", variant: "warning" },
  ativa: { label: "Ativa", variant: "success" },
  atrasada: { label: "Pagamento pendente", variant: "warning" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

export default function PlanoPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<BillingSubscription | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);

  const [paying, setPaying] = useState<string | null>(null);
  const [pix, setPix] = useState<{ code: string; qrcode: string; amount: number } | null>(null);

  async function load() {
    const [p, s, c] = await Promise.all([
      supabase.from("plans").select("*").eq("active", true).order("sort"),
      supabase.from("billing_subscriptions").select("*").maybeSingle(),
      supabase.from("charges").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    setPlans((p.data ?? []) as Plan[]);
    setSub(s.data as BillingSubscription | null);
    setCharges((c.data ?? []) as Charge[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function subscribe(plan: Plan) {
    setPaying(plan.id);
    setPix(null);
    try {
      const res = await fetch("/api/billing/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Erro", { description: data.error ?? "Tente novamente" });
        return;
      }
      if (data.free) {
        toast.success("Plano gratuito ativado!");
        await load();
        return;
      }
      setPix({ code: data.code, qrcode: data.qrcode, amount: data.amount_cents });
    } catch {
      toast.error("Erro ao iniciar cobrança");
    } finally {
      setPaying(null);
    }
  }

  const currentPlanId = sub?.plan_id;
  const status = sub ? STATUS[sub.status] : null;

  if (loading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <PageHeader title="Meu Plano" description="Gerencie sua assinatura do Tomaz Finanças">
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Atualizar</Button>
      </PageHeader>

      {sub && status && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">
                  {plans.find((p) => p.id === currentPlanId)?.name ?? "Sem plano"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sub.current_period_end ? `Válido até ${formatDate(sub.current_period_end)}` : "—"}
                </p>
              </div>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId && sub?.status === "ativa";
          const highlight = plan.code === "pro";
          return (
            <Card key={plan.id} className={highlight ? "border-primary shadow-lg" : ""}>
              <CardContent className="flex h-full flex-col p-6">
                {highlight && <Badge className="mb-2 w-fit">Mais popular</Badge>}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                <div className="my-4">
                  <span className="text-3xl font-extrabold">{formatCurrency(plan.price_cents / 100)}</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <ul className="mb-6 space-y-2 text-sm">
                  {(plan.features ?? []).map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-auto w-full"
                  variant={highlight ? "default" : "outline"}
                  disabled={isCurrent || paying === plan.id}
                  onClick={() => subscribe(plan)}
                >
                  {paying === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCurrent ? "Plano atual" : plan.price_cents === 0 ? "Usar grátis" : "Assinar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Histórico de cobranças */}
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
                    <Badge variant={c.status === "pago" ? "success" : c.status === "pendente" ? "warning" : "secondary"}>
                      {c.status}
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog do PIX */}
      <Dialog open={!!pix} onOpenChange={(o) => !o && setPix(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Pague com PIX
            </DialogTitle>
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
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { navigator.clipboard.writeText(pix.code); toast.success("Código copiado!"); }}
              >
                <Copy className="h-4 w-4" /> Copiar código PIX
              </Button>
              <p className="text-xs text-muted-foreground">
                Após o pagamento, sua assinatura é ativada automaticamente. Use &quot;Atualizar&quot; para conferir.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
