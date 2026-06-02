"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/app/confirm-provider";
import { Loader2, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Subscription } from "@/lib/database.types";

function advanceDate(dateStr: string, cycle: string) {
  const d = new Date(dateStr + "T00:00:00");
  switch (cycle) {
    case "anual": d.setFullYear(d.getFullYear() + 1); break;
    case "trimestral": d.setMonth(d.getMonth() + 3); break;
    case "semanal": d.setDate(d.getDate() + 7); break;
    default: d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

export function SubscriptionPay({
  sub,
  onDone,
}: {
  sub: Subscription;
  onDone: () => void;
}) {
  const supabase = createClient();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);

  async function pay() {
    const ok = await confirm({
      title: "Registrar cobrança",
      description: `Lançar ${formatCurrency(Number(sub.amount))} como despesa de "${sub.name}" e avançar a próxima cobrança?`,
      confirmText: "Lançar despesa",
      destructive: false,
    });
    if (!ok) return;

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return toast.error("Sessão expirada");
    }

    const { error: txErr } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "despesa",
      description: `${sub.name} (assinatura)`,
      amount: Number(sub.amount),
      date: sub.next_charge_date,
      status: "pago",
      company_id: sub.company_id,
      payment_method: "Assinatura",
      is_recurring: true,
    });

    if (txErr) {
      setLoading(false);
      return toast.error("Erro ao lançar despesa", { description: txErr.message });
    }

    await supabase
      .from("subscriptions")
      .update({ next_charge_date: advanceDate(sub.next_charge_date, sub.cycle) })
      .eq("id", sub.id);

    setLoading(false);
    toast.success("Despesa lançada e próxima cobrança atualizada!");
    onDone();
  }

  return (
    <Button variant="outline" size="sm" className="mt-3 w-full" onClick={pay} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      Registrar cobrança
    </Button>
  );
}
