"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CfoChat } from "@/components/modules/cfo-chat";
import { formatCurrency } from "@/lib/utils";
import type { FinancialSummary, Insight } from "@/lib/insights";
import {
  Bot,
  Loader2,
  RefreshCw,
  Wallet,
  Timer,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";

const ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
};
const COLORS = {
  success: "text-emerald-500 bg-emerald-500/10",
  info: "text-sky-500 bg-sky-500/10",
  warning: "text-amber-500 bg-amber-500/10",
  danger: "text-red-500 bg-red-500/10",
};

export default function CfoPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/cfo");
    const data = await res.json();
    setSummary(data.summary);
    setInsights(data.insights ?? []);
    setAiNarrative(data.aiNarrative ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="CFO Virtual"
        description="Inteligência financeira que acompanha suas movimentações e gera insights diários"
      >
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar análise
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Resumo do CFO */}
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="flex gap-4 p-6">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Resumo do seu CFO</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {aiNarrative ??
                    "Análise gerada localmente com base nas suas movimentações. Para um resumo narrativo com IA, configure a variável ANTHROPIC_API_KEY."}
                </p>
              </div>
            </CardContent>
          </Card>

          {summary && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Saldo total" value={formatCurrency(summary.saldoTotal)} icon={Wallet} />
              <StatCard
                title="Runway financeiro"
                value={summary.runwayMeses ? `${summary.runwayMeses.toFixed(1)} meses` : "—"}
                icon={Timer}
                accent={summary.runwayMeses && summary.runwayMeses < 3 ? "text-red-500" : "text-emerald-500"}
                iconBg={summary.runwayMeses && summary.runwayMeses < 3 ? "bg-red-500/10" : "bg-emerald-500/10"}
              />
              <StatCard
                title="Lucro do mês"
                value={formatCurrency(summary.lucroMes)}
                icon={TrendingDown}
                accent={summary.lucroMes >= 0 ? "text-emerald-500" : "text-red-500"}
                iconBg={summary.lucroMes >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
              />
              <StatCard
                title="Despesa média (6m)"
                value={formatCurrency(summary.mediaDespesas6m)}
                icon={TrendingDown}
                accent="text-amber-500"
                iconBg="bg-amber-500/10"
              />
            </div>
          )}

          {/* Chat com o CFO */}
          <div className="mb-6">
            <CfoChat />
          </div>

          {/* Insights */}
          <h2 className="mb-3 text-lg font-semibold">Insights automáticos</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {insights.map((ins, i) => {
              const Icon = ICONS[ins.level];
              return (
                <Card key={i}>
                  <CardContent className="flex gap-3 p-5">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${COLORS[ins.level]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{ins.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{ins.message}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {insights.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Cadastre receitas e despesas para receber insights personalizados.
              </p>
            )}
          </div>

          {summary && summary.maioresDespesas.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Onde seu dinheiro está indo (este mês)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.maioresDespesas.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span>{d.name}</span>
                    <span className="font-medium">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
