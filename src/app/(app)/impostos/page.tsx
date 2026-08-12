"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { taxSettingSchema, firstError } from "@/lib/schemas";
import { formatCurrency, currentMonthRange } from "@/lib/utils";
import { Loader2, Receipt, Save, User } from "lucide-react";
import type { Company, TaxRegime, TaxSetting, Transaction } from "@/lib/database.types";

const REGIME_OPTIONS: { value: TaxRegime; label: string }[] = [
  { value: "mei", label: "MEI" },
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
  { value: "pessoa_fisica", label: "Pessoa Física / Autônomo" },
];

interface EntityForm {
  regime: TaxRegime;
  rate: string;
}

export default function ImpostosPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSetting[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [forms, setForms] = useState<Record<string, EntityForm>>({});

  async function load() {
    setLoading(true);
    const year = new Date().getFullYear();
    const [comp, tax, tx] = await Promise.all([
      supabase.from("companies").select("*").order("name"),
      supabase.from("tax_settings").select("*"),
      supabase
        .from("transactions")
        .select("*")
        .eq("type", "receita")
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`),
    ]);
    const companiesList = (comp.data ?? []) as Company[];
    const taxList = (tax.data ?? []) as TaxSetting[];
    setCompanies(companiesList);
    setTaxSettings(taxList);
    setTransactions((tx.data ?? []) as Transaction[]);

    const nextForms: Record<string, EntityForm> = {};
    const pessoalSetting = taxList.find((t) => t.company_id === null);
    nextForms.pessoal = {
      regime: pessoalSetting?.regime ?? "pessoa_fisica",
      rate: pessoalSetting ? String(pessoalSetting.rate) : "0",
    };
    for (const c of companiesList) {
      const setting = taxList.find((t) => t.company_id === c.id);
      nextForms[c.id] = {
        regime: setting?.regime ?? "simples_nacional",
        rate: setting ? String(setting.rate) : "0",
      };
    }
    setForms(nextForms);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { start: monthStart, end: monthEnd } = currentMonthRange();
  const year = new Date().getFullYear();

  const entities = useMemo(
    () => [
      { key: "pessoal", label: "Pessoal", companyId: null as string | null, color: "#7c3aed" },
      ...companies.map((c) => ({ key: c.id, label: c.name, companyId: c.id, color: c.color ?? "#7c3aed" })),
    ],
    [companies]
  );

  function revenueFor(companyId: string | null, from: string, to: string) {
    return transactions
      .filter((t) => t.company_id === companyId && t.date >= from && t.date <= to)
      .reduce((s, t) => s + Number(t.amount), 0);
  }

  async function save(entityKey: string, companyId: string | null) {
    const form = forms[entityKey];
    const validationError = firstError(taxSettingSchema, form);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSavingKey(entityKey);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada");
      setSavingKey(null);
      return;
    }

    const existing = taxSettings.find((t) => t.company_id === companyId);
    const payload = {
      user_id: user.id,
      company_id: companyId,
      regime: form.regime,
      rate: Number(form.rate),
    };
    const res = existing
      ? await supabase.from("tax_settings").update(payload).eq("id", existing.id)
      : await supabase.from("tax_settings").insert(payload);

    setSavingKey(null);
    if (res.error) {
      toast.error("Erro ao salvar", { description: res.error.message });
      return;
    }
    toast.success("Configuração de imposto salva!");
    load();
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Impostos"
        description="Configure o regime tributário e a alíquota de cada empresa (ou pessoal) para estimar o imposto sobre a receita"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {entities.map((entity) => {
          const form = forms[entity.key] ?? { regime: "simples_nacional" as TaxRegime, rate: "0" };
          const monthRevenue = revenueFor(entity.companyId, monthStart, monthEnd);
          const yearRevenue = revenueFor(entity.companyId, `${year}-01-01`, `${year}-12-31`);
          const rateNum = Number(form.rate) || 0;
          const monthTax = monthRevenue * (rateNum / 100);
          const yearTax = yearRevenue * (rateNum / 100);

          return (
            <Card key={entity.key}>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <div
                  className="grid h-10 w-10 place-items-center rounded-lg text-white"
                  style={{ background: entity.color }}
                >
                  {entity.companyId ? entity.label[0]?.toUpperCase() : <User className="h-4 w-4" />}
                </div>
                <CardTitle className="text-base">{entity.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Regime tributário</Label>
                    <Select
                      value={form.regime}
                      onValueChange={(v) =>
                        setForms((prev) => ({ ...prev, [entity.key]: { ...prev[entity.key], regime: v as TaxRegime } }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIME_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Alíquota que você paga (%)</Label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={form.rate}
                        onChange={(e) =>
                          setForms((prev) => ({ ...prev, [entity.key]: { ...prev[entity.key], rate: e.target.value } }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Receita do mês</p>
                    <p className="font-semibold">{formatCurrency(monthRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Imposto est. mês</p>
                    <p className="font-semibold text-amber-500">{formatCurrency(monthTax)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Receita do ano</p>
                    <p className="font-semibold">{formatCurrency(yearRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Imposto est. ano</p>
                    <p className="font-semibold text-amber-500">{formatCurrency(yearTax)}</p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingKey === entity.key}
                  onClick={() => save(entity.key, entity.companyId)}
                >
                  {savingKey === entity.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
        <Receipt className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        O imposto estimado é calculado aplicando a alíquota informada sobre a receita do período. É uma estimativa
        baseada no valor que você mesmo informa — não substitui o cálculo oficial do seu contador.
      </p>
    </div>
  );
}
