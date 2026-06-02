import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatrimonyChart } from "@/components/app/charts";
import {
  computeAccountsBalance,
  investmentTotals,
  monthlySeries,
  netWorth,
  sumByType,
} from "@/lib/finance";
import { formatCurrency, formatPercent, monthLabel } from "@/lib/utils";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Gem,
  Building2,
} from "lucide-react";
import type {
  BankAccount,
  Company,
  Investment,
  Transaction,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function ExecutivoPage() {
  const supabase = await createClient();
  const year = new Date().getFullYear();

  const [tx, acc, inv, comp] = await Promise.all([
    supabase.from("transactions").select("*"),
    supabase.from("bank_accounts").select("*"),
    supabase.from("investments").select("*"),
    supabase.from("companies").select("*"),
  ]);

  const transactions = (tx.data ?? []) as Transaction[];
  const accounts = (acc.data ?? []) as BankAccount[];
  const investments = (inv.data ?? []) as Investment[];
  const companies = (comp.data ?? []) as Company[];

  const yearTxs = transactions.filter(
    (t) => new Date(t.date).getFullYear() === year
  );
  const receitaAnual = sumByType(yearTxs, "receita");
  const despesaAnual = sumByType(yearTxs, "despesa");
  const lucroAcumulado = receitaAnual - despesaAnual;

  const saldo = computeAccountsBalance(accounts, transactions);
  const { current: invAtual, profit: invProfit, profitPct } = investmentTotals(investments);
  const patrimonio = netWorth(saldo, investments);

  // Crescimento: lucro deste mês vs mês anterior
  const series = monthlySeries(transactions, 12);
  const last = series[series.length - 1]?.saldo ?? 0;
  const prev = series[series.length - 2]?.saldo ?? 0;
  const growth = prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : 0;

  // Empresas mais lucrativas (receita - despesa por company_id no ano)
  const byCompany = companies
    .map((c) => {
      const rows = yearTxs.filter((t) => t.company_id === c.id);
      const rec = sumByType(rows, "receita");
      const desp = sumByType(rows, "despesa");
      return { name: c.name, color: c.color, lucro: rec - desp, receita: rec };
    })
    .sort((a, b) => b.lucro - a.lucro);

  // Patrimônio acumulado mês a mês (saldo acumulado + investimentos atuais como base)
  let acc2 = 0;
  const patSeries = series.map((m) => {
    acc2 += m.saldo;
    return { month: m.month, valor: acc2 + invAtual };
  });

  // Projeção 12 meses: média de lucro mensal aplicada sobre patrimônio atual
  const lucroMedioMensal =
    series.reduce((s, m) => s + m.saldo, 0) / (series.length || 1);
  const projecao = Array.from({ length: 12 }, (_, i) => {
    const ref = new Date(year, new Date().getMonth() + i + 1, 1);
    return {
      month: `${monthLabel(ref.getMonth())}/${String(ref.getFullYear()).slice(2)}`,
      valor: patrimonio + lucroMedioMensal * (i + 1),
    };
  });

  return (
    <div>
      <PageHeader
        title="Dashboard Executivo"
        description={`Visão consolidada do ano ${year}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Patrimônio total" value={formatCurrency(patrimonio)} icon={Gem} accent="text-primary" />
        <StatCard title="Receita anual" value={formatCurrency(receitaAnual)} icon={TrendingUp} accent="text-emerald-500" iconBg="bg-emerald-500/10" />
        <StatCard title="Despesa anual" value={formatCurrency(despesaAnual)} icon={TrendingDown} accent="text-red-500" iconBg="bg-red-500/10" />
        <StatCard
          title="Lucro acumulado"
          value={formatCurrency(lucroAcumulado)}
          icon={PiggyBank}
          accent={lucroAcumulado >= 0 ? "text-emerald-500" : "text-red-500"}
          iconBg={lucroAcumulado >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
        />
        <StatCard
          title="Crescimento (mês)"
          value={formatPercent(growth)}
          icon={TrendingUp}
          accent={growth >= 0 ? "text-emerald-500" : "text-red-500"}
          iconBg={growth >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
        />
        <StatCard
          title="Rentabilidade investimentos"
          value={`${formatCurrency(invProfit)} (${formatPercent(profitPct)})`}
          icon={Briefcase}
          accent={invProfit >= 0 ? "text-emerald-500" : "text-red-500"}
          iconBg={invProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução patrimonial (12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <PatrimonyChart data={patSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Projeção para os próximos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <PatrimonyChart data={projecao} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Empresas mais lucrativas ({year})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {byCompany.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma empresa cadastrada. Cadastre em &quot;Empresas&quot; e vincule receitas/despesas.
            </p>
          )}
          {byCompany.map((c) => (
            <div key={c.name} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" style={{ color: c.color ?? undefined }} />
                <span className="font-medium">{c.name}</span>
              </span>
              <span className={c.lucro >= 0 ? "font-semibold text-emerald-500" : "font-semibold text-red-500"}>
                {formatCurrency(c.lucro)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
