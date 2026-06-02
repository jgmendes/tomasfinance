"use client";

import { CrudModule, CardActions } from "@/components/modules/crud-module";
import { StatCard } from "@/components/app/stat-card";
import { Building2 } from "lucide-react";
import type { Company } from "@/lib/database.types";

export default function EmpresasPage() {
  return (
    <CrudModule<Company>
      title="Empresas"
      description="Cadastre e gerencie suas empresas e o fluxo de cada uma"
      table="companies"
      icon={Building2}
      newLabel="Nova empresa"
      orderBy="name"
      ascending
      fields={[
        { name: "name", label: "Nome", required: true, span2: true, placeholder: "Ex: Minha Empresa LTDA" },
        { name: "cnpj", label: "CNPJ", placeholder: "00.000.000/0001-00" },
        { name: "color", label: "Cor", placeholder: "#7c3aed" },
        { name: "description", label: "Descrição", type: "textarea", span2: true },
      ]}
      defaultValues={{ id: "", name: "", cnpj: "", color: "#7c3aed", description: "" }}
      renderStats={(items) => (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <StatCard title="Total de empresas" value={String(items.length)} icon={Building2} />
        </div>
      )}
      renderCard={(c, actions) => (
        <>
          <CardActions {...actions} />
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: c.color ?? "#7c3aed" }}>
              {c.name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{c.name}</p>
              {c.cnpj && <p className="text-xs text-muted-foreground">{c.cnpj}</p>}
            </div>
          </div>
          {c.description && <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>}
        </>
      )}
    />
  );
}
