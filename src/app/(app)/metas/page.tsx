"use client";

import { CrudModule, CardActions } from "@/components/modules/crud-module";
import { StatCard } from "@/components/app/stat-card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GoalContribute } from "@/components/modules/goal-contribute";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Target } from "lucide-react";
import type { Goal } from "@/lib/database.types";

export default function MetasPage() {
  return (
    <CrudModule<Goal>
      title="Metas Financeiras"
      description="Defina objetivos e acompanhe seu progresso"
      table="goals"
      icon={Target}
      newLabel="Nova meta"
      fields={[
        { name: "title", label: "Título", required: true, span2: true, placeholder: "Ex: Comprar carro, Viagem..." },
        { name: "target_amount", label: "Valor da meta (R$)", type: "currency", required: true },
        { name: "current_amount", label: "Valor acumulado (R$)", type: "currency" },
        { name: "deadline", label: "Prazo", type: "date" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "em_andamento", label: "Em andamento" },
            { value: "concluida", label: "Concluída" },
            { value: "pausada", label: "Pausada" },
          ],
        },
        { name: "description", label: "Descrição", type: "textarea", span2: true },
      ]}
      defaultValues={{ id: "", title: "", target_amount: "", current_amount: "0", deadline: "", status: "em_andamento", description: "", color: "#22c55e" }}
      cardFooter={(g, reload) => <GoalContribute goal={g} onDone={reload} />}
      renderStats={(items) => {
        const target = items.reduce((s, g) => s + Number(g.target_amount), 0);
        const saved = items.reduce((s, g) => s + Number(g.current_amount), 0);
        return (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard title="Total das metas" value={formatCurrency(target)} icon={Target} />
            <StatCard title="Acumulado" value={formatCurrency(saved)} icon={Target} accent="text-emerald-500" iconBg="bg-emerald-500/10" />
            <StatCard title="Progresso geral" value={`${target > 0 ? ((saved / target) * 100).toFixed(0) : 0}%`} icon={Target} accent="text-primary" />
          </div>
        );
      }}
      renderCard={(g, actions) => {
        const pct = Number(g.target_amount) > 0 ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
        return (
          <>
            <CardActions {...actions} />
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <p className="font-semibold">{g.title}</p>
            </div>
            {g.deadline && <p className="mt-1 text-xs text-muted-foreground">Prazo: {formatDate(g.deadline)}</p>}
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold">{pct.toFixed(0)}%</span>
                <span className="text-muted-foreground">{formatCurrency(Number(g.current_amount))} / {formatCurrency(Number(g.target_amount))}</span>
              </div>
              <Progress value={pct} indicatorClassName="bg-emerald-500" />
            </div>
            <Badge variant={g.status === "concluida" ? "success" : g.status === "pausada" ? "warning" : "secondary"} className="mt-3">
              {g.status.replace("_", " ")}
            </Badge>
          </>
        );
      }}
    />
  );
}
