"use client";

import { CrudModule, CardActions } from "@/components/modules/crud-module";
import { StatCard } from "@/components/app/stat-card";
import { UserCheck } from "lucide-react";
import type { Beneficiary } from "@/lib/database.types";

export default function BeneficiariosPage() {
  return (
    <CrudModule<Beneficiary>
      title="Beneficiários"
      description="Cadastre as pessoas e empresas que recebem ou originam seus valores"
      table="beneficiaries"
      icon={UserCheck}
      newLabel="Novo beneficiário"
      orderBy="name"
      ascending
      fields={[
        { name: "name", label: "Nome", required: true, span2: true, placeholder: "Ex: João da Silva ou Fornecedor LTDA" },
        { name: "document", label: "CPF/CNPJ", placeholder: "000.000.000-00" },
        { name: "notes", label: "Observações", type: "textarea", span2: true },
      ]}
      defaultValues={{ id: "", name: "", document: "", notes: "" }}
      renderStats={(items) => (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <StatCard title="Total de beneficiários" value={String(items.length)} icon={UserCheck} />
        </div>
      )}
      renderCard={(b, actions) => (
        <>
          <CardActions {...actions} />
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
              {b.name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{b.name}</p>
              {b.document && <p className="text-xs text-muted-foreground">{b.document}</p>}
            </div>
          </div>
          {b.notes && <p className="mt-3 text-sm text-muted-foreground">{b.notes}</p>}
        </>
      )}
    />
  );
}
