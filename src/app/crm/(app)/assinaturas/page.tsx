"use client";

import { CrudModule, CardActions } from "@/components/modules/crud-module";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { SubscriptionPay } from "@/components/modules/subscription-pay";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RefreshCw, CalendarClock } from "lucide-react";
import type { Subscription } from "@/lib/database.types";

const CYCLES = [
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semanal", label: "Semanal" },
];

function monthlyValue(s: Subscription) {
  const a = Number(s.amount);
  switch (s.cycle) {
    case "anual": return a / 12;
    case "trimestral": return a / 3;
    case "semanal": return a * 4.33;
    default: return a;
  }
}

export default function AssinaturasPage() {
  return (
    <CrudModule<Subscription>
      title="Assinaturas Recorrentes"
      description="OpenAI, Claude, Vercel, AWS, Google Workspace..."
      table="subscriptions"
      icon={RefreshCw}
      newLabel="Nova assinatura"
      orderBy="next_charge_date"
      ascending
      fields={[
        { name: "name", label: "Nome", required: true, span2: true, placeholder: "Ex: OpenAI, Vercel..." },
        { name: "amount", label: "Valor (R$)", type: "currency", required: true },
        { name: "cycle", label: "Ciclo", type: "select", options: CYCLES },
        { name: "next_charge_date", label: "Próxima cobrança", type: "date", required: true },
        { name: "category", label: "Categoria", placeholder: "Ex: Software, Infra" },
      ]}
      defaultValues={{ id: "", name: "", amount: "", cycle: "mensal", next_charge_date: new Date().toISOString().slice(0, 10), category: "" }}
      cardFooter={(s, reload) => <SubscriptionPay sub={s} onDone={reload} />}
      renderStats={(items) => {
        const monthly = items.filter((s) => s.active).reduce((sum, s) => sum + monthlyValue(s), 0);
        return (
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <StatCard title="Custo mensal" value={formatCurrency(monthly)} icon={RefreshCw} accent="text-red-500" iconBg="bg-red-500/10" />
            <StatCard title="Projeção anual" value={formatCurrency(monthly * 12)} icon={CalendarClock} accent="text-amber-500" iconBg="bg-amber-500/10" />
          </div>
        );
      }}
      renderCard={(s, actions) => (
        <>
          <CardActions {...actions} />
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 font-bold text-primary">
              {s.name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.category || "Assinatura"}</p>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xl font-bold">{formatCurrency(Number(s.amount))}</p>
              <Badge variant="outline" className="mt-1 capitalize">{s.cycle}</Badge>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Próxima cobrança</p>
              <p className="text-sm font-medium">{formatDate(s.next_charge_date)}</p>
            </div>
          </div>
        </>
      )}
    />
  );
}
