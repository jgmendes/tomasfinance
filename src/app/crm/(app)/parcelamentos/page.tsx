"use client";

import { CrudModule, CardActions } from "@/components/modules/crud-module";
import { StatCard } from "@/components/app/stat-card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Layers } from "lucide-react";
import type { Installment } from "@/lib/database.types";

export default function ParcelamentosPage() {
  return (
    <CrudModule<Installment>
      title="Parcelamentos"
      description="Compras parceladas no cartão de crédito"
      table="installments"
      icon={Layers}
      newLabel="Novo parcelamento"
      selectSources={{ credit_card_id: { table: "credit_cards", labelField: "name" } }}
      fields={[
        { name: "description", label: "Descrição", required: true, span2: true, placeholder: "Ex: Notebook" },
        { name: "credit_card_id", label: "Cartão", type: "select", placeholder: "Selecione o cartão" },
        { name: "total_amount", label: "Valor total", type: "currency", required: true },
        { name: "installments_count", label: "Nº de parcelas", type: "number", step: "1", required: true },
        { name: "installments_paid", label: "Parcelas pagas", type: "number", step: "1" },
        { name: "first_due_date", label: "1º vencimento", type: "date", required: true },
      ]}
      defaultValues={{ id: "", description: "", credit_card_id: "", total_amount: "", installments_count: "", installments_paid: "0", first_due_date: new Date().toISOString().slice(0, 10) }}
      renderStats={(items) => {
        const totalAberto = items.reduce((s, i) => {
          const perInstallment = Number(i.total_amount) / (i.installments_count || 1);
          const remaining = (i.installments_count - i.installments_paid) * perInstallment;
          return s + remaining;
        }, 0);
        return (
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <StatCard title="Saldo devedor (parcelas restantes)" value={formatCurrency(totalAberto)} icon={Layers} accent="text-red-500" iconBg="bg-red-500/10" />
            <StatCard title="Parcelamentos ativos" value={String(items.length)} icon={Layers} />
          </div>
        );
      }}
      renderCard={(i, actions) => {
        const per = Number(i.total_amount) / (i.installments_count || 1);
        const pct = i.installments_count > 0 ? (i.installments_paid / i.installments_count) * 100 : 0;
        return (
          <>
            <CardActions {...actions} />
            <p className="font-semibold">{i.description}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(per)} × {i.installments_count} · 1º venc. {formatDate(i.first_due_date)}
            </p>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold">
                  {i.installments_paid}/{i.installments_count} pagas
                </span>
                <span className="text-muted-foreground">{formatCurrency(Number(i.total_amount))}</span>
              </div>
              <Progress value={pct} />
            </div>
          </>
        );
      }}
    />
  );
}
