"use client";

import { CrudModule, CardActions } from "@/components/modules/crud-module";
import { StatCard } from "@/components/app/stat-card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { CreditCard } from "lucide-react";
import type { CreditCard as CreditCardType } from "@/lib/database.types";

export default function CartoesPage() {
  return (
    <CrudModule<CreditCardType>
      title="Cartões de Crédito"
      description="Controle limites, faturas e datas importantes"
      table="credit_cards"
      icon={CreditCard}
      newLabel="Novo cartão"
      fields={[
        { name: "name", label: "Nome do cartão", required: true, span2: true, placeholder: "Ex: Nubank Ultravioleta" },
        { name: "brand", label: "Bandeira", placeholder: "Visa, Master..." },
        { name: "credit_limit", label: "Limite total (R$)", type: "currency" },
        { name: "used_limit", label: "Limite utilizado (R$)", type: "currency" },
        { name: "best_purchase_day", label: "Melhor dia de compra", type: "number", step: "1" },
        { name: "closing_day", label: "Dia de fechamento", type: "number", step: "1" },
        { name: "due_day", label: "Dia de vencimento", type: "number", step: "1" },
      ]}
      defaultValues={{ id: "", name: "", brand: "", credit_limit: "", used_limit: "", best_purchase_day: "", closing_day: "", due_day: "", color: "#1e293b" }}
      renderStats={(items) => {
        const limit = items.reduce((s, c) => s + Number(c.credit_limit), 0);
        const used = items.reduce((s, c) => s + Number(c.used_limit), 0);
        return (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard title="Limite total" value={formatCurrency(limit)} icon={CreditCard} />
            <StatCard title="Limite utilizado" value={formatCurrency(used)} icon={CreditCard} accent="text-red-500" iconBg="bg-red-500/10" />
            <StatCard title="Disponível" value={formatCurrency(limit - used)} icon={CreditCard} accent="text-emerald-500" iconBg="bg-emerald-500/10" />
          </div>
        );
      }}
      gridClass="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      renderCard={(c, actions) => {
        const pct = Number(c.credit_limit) > 0 ? (Number(c.used_limit) / Number(c.credit_limit)) * 100 : 0;
        return (
          <>
            <CardActions {...actions} />
            <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white">
              <div className="flex justify-between">
                <span className="text-sm opacity-80">{c.brand || "Cartão"}</span>
                <CreditCard className="h-5 w-5 opacity-80" />
              </div>
              <p className="mt-6 text-lg font-semibold">{c.name}</p>
              <p className="text-xs opacity-70">
                Fecha dia {c.closing_day ?? "—"} · Vence dia {c.due_day ?? "—"}
              </p>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Utilizado {pct.toFixed(0)}%</span>
                <span>{formatCurrency(Number(c.used_limit))} / {formatCurrency(Number(c.credit_limit))}</span>
              </div>
              <Progress value={pct} indicatorClassName={pct > 80 ? "bg-red-500" : "bg-primary"} />
            </div>
          </>
        );
      }}
    />
  );
}
