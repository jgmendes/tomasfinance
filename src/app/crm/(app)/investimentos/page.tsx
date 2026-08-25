"use client";

import { CrudModule, CardActions } from "@/components/modules/crud-module";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { LineChart, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import type { Investment } from "@/lib/database.types";

const TYPES = [
  { value: "cdb", label: "CDB" },
  { value: "tesouro", label: "Tesouro" },
  { value: "acoes", label: "Ações" },
  { value: "fii", label: "Fundos Imobiliários" },
  { value: "cripto", label: "Criptomoedas" },
  { value: "fundo", label: "Fundos" },
  { value: "outros", label: "Outros" },
];

export default function InvestimentosPage() {
  return (
    <CrudModule<Investment>
      title="Centro de Investimentos"
      description="Acompanhe a rentabilidade da sua carteira"
      table="investments"
      icon={LineChart}
      newLabel="Novo investimento"
      fields={[
        { name: "name", label: "Nome", required: true, span2: true, placeholder: "Ex: Tesouro Selic 2029" },
        { name: "type", label: "Tipo", type: "select", options: TYPES },
        { name: "broker", label: "Corretora", placeholder: "Ex: XP, Binance" },
        { name: "invested_amount", label: "Valor investido (R$)", type: "currency" },
        { name: "current_amount", label: "Valor atual (R$)", type: "currency" },
        { name: "purchase_date", label: "Data da compra", type: "date" },
      ]}
      defaultValues={{ id: "", name: "", type: "cdb", broker: "", invested_amount: "", current_amount: "", purchase_date: "" }}
      renderStats={(items) => {
        const invested = items.reduce((s, i) => s + Number(i.invested_amount), 0);
        const current = items.reduce((s, i) => s + Number(i.current_amount), 0);
        const profit = current - invested;
        const pct = invested > 0 ? (profit / invested) * 100 : 0;
        return (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard title="Valor investido" value={formatCurrency(invested)} icon={Wallet} />
            <StatCard title="Valor atual" value={formatCurrency(current)} icon={LineChart} accent="text-primary" />
            <StatCard
              title="Rentabilidade"
              value={`${formatCurrency(profit)} (${formatPercent(pct)})`}
              icon={profit >= 0 ? TrendingUp : TrendingDown}
              accent={profit >= 0 ? "text-emerald-500" : "text-red-500"}
              iconBg={profit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
            />
          </div>
        );
      }}
      renderCard={(i, actions) => {
        const profit = Number(i.current_amount) - Number(i.invested_amount);
        const pct = Number(i.invested_amount) > 0 ? (profit / Number(i.invested_amount)) * 100 : 0;
        return (
          <>
            <CardActions {...actions} />
            <Badge variant="outline" className="uppercase">{i.type}</Badge>
            <p className="mt-2 font-semibold">{i.name}</p>
            <p className="text-xs text-muted-foreground">{i.broker}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Investido</p>
                <p className="font-medium">{formatCurrency(Number(i.invested_amount))}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atual</p>
                <p className="font-medium">{formatCurrency(Number(i.current_amount))}</p>
              </div>
            </div>
            <p className={`mt-3 text-sm font-semibold ${profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {profit >= 0 ? "▲" : "▼"} {formatCurrency(profit)} ({formatPercent(pct)})
            </p>
          </>
        );
      }}
    />
  );
}
