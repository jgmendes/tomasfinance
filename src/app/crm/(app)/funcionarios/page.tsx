"use client";

import { CrudModule, CardActions } from "@/components/modules/crud-module";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Users } from "lucide-react";
import type { Employee } from "@/lib/database.types";

export default function FuncionariosPage() {
  return (
    <CrudModule<Employee>
      title="Funcionários"
      description="Cadastro de equipe, salários e comissões"
      table="employees"
      icon={Users}
      newLabel="Novo funcionário"
      orderBy="name"
      ascending
      selectSources={{ company_id: { table: "companies", labelField: "name" } }}
      fields={[
        { name: "name", label: "Nome", required: true, span2: true, placeholder: "Nome completo" },
        { name: "role", label: "Cargo", placeholder: "Ex: Desenvolvedor" },
        { name: "company_id", label: "Empresa", type: "select", placeholder: "Selecione" },
        { name: "salary", label: "Salário (R$)", type: "currency" },
        { name: "commission", label: "Comissão (R$)", type: "currency" },
        { name: "payment_day", label: "Dia de pagamento", type: "number", step: "1" },
      ]}
      defaultValues={{ id: "", name: "", role: "", company_id: "", salary: "", commission: "0", payment_day: "5" }}
      renderStats={(items) => {
        const folha = items.reduce((s, e) => s + Number(e.salary) + Number(e.commission ?? 0), 0);
        return (
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <StatCard title="Folha mensal" value={formatCurrency(folha)} icon={Users} accent="text-red-500" iconBg="bg-red-500/10" />
            <StatCard title="Funcionários" value={String(items.length)} icon={Users} />
          </div>
        );
      }}
      renderCard={(e, actions) => (
        <>
          <CardActions {...actions} />
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
              {e.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{e.name}</p>
              <p className="text-xs text-muted-foreground">{e.role || "—"}</p>
            </div>
          </div>
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Salário</span>
              <span className="font-medium">{formatCurrency(Number(e.salary))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Comissão</span>
              <span className="font-medium">{formatCurrency(Number(e.commission ?? 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pagamento</span>
              <span className="font-medium">Dia {e.payment_day ?? "—"}</span>
            </div>
          </div>
          <Badge variant={e.active ? "success" : "secondary"} className="mt-3">
            {e.active ? "Ativo" : "Inativo"}
          </Badge>
        </>
      )}
    />
  );
}
