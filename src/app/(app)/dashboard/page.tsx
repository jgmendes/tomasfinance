import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CashFlowChart,
  CategoryPieChart,
  BalanceBarChart,
} from "@/components/app/charts";
import { categoryLegend } from "@/lib/chart-colors";
import {
  computeAccountsBalance,
  expensesByCategory,
  monthlySeries,
  pendingTotals,
  sumByType,
  isInMonth,
} from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import type { Category, Transaction } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: txs }, { data: accounts }, { data: categories }] =
    await Promise.all([
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("bank_accounts").select("*"),
      supabase.from("categories").select("*"),
    ]);

  const transactions = (txs ?? []) as Transaction[];
  const accountsList = accounts ?? [];
  const cats = (categories ?? []) as Category[];
  const catNames = Object.fromEntries(cats.map((c) => [c.id, c.name]));

  const monthTxs = transactions.filter((t) => isInMonth(t.date));
  const receitasMes = sumByType(monthTxs, "receita");
  const despesasMes = sumByType(monthTxs, "despesa");
  const lucro = receitasMes - despesasMes;
  const saldoTotal = computeAccountsBalance(accountsList, transactions);
  const { aPagar, aReceber } = pendingTotals(transactions);

  const series = monthlySeries(transactions, 6);
  const pie = categoryLegend(expensesByCategory(monthTxs, catNames).slice(0, 8));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral das suas finanças neste mês"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Saldo Total"
          value={formatCurrency(saldoTotal)}
          icon={Wallet}
          accent="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Receitas do mês"
          value={formatCurrency(receitasMes)}
          icon={TrendingUp}
          accent="text-emerald-500"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          title="Despesas do mês"
          value={formatCurrency(despesasMes)}
          icon={TrendingDown}
          accent="text-red-500"
          iconBg="bg-red-500/10"
        />
        <StatCard
          title="Lucro líquido"
          value={formatCurrency(lucro)}
          icon={PiggyBank}
          accent={lucro >= 0 ? "text-emerald-500" : "text-red-500"}
          iconBg={lucro >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Contas a pagar (pendente)"
          value={formatCurrency(aPagar)}
          icon={ArrowDownCircle}
          accent="text-amber-500"
          iconBg="bg-amber-500/10"
        />
        <StatCard
          title="Contas a receber (pendente)"
          value={formatCurrency(aReceber)}
          icon={ArrowUpCircle}
          accent="text-sky-500"
          iconBg="bg-sky-500/10"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo de Caixa (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <CashFlowChart data={series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={pie} />
            <div className="mt-4 space-y-1.5">
              {pie.slice(0, 5).map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <span className="font-medium">{formatCurrency(c.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução do saldo mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceBarChart data={series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas movimentações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {catNames[t.category_id ?? ""] ?? "Sem categoria"}
                  </p>
                </div>
                <span
                  className={
                    t.type === "receita"
                      ? "text-sm font-semibold text-emerald-500"
                      : "text-sm font-semibold text-red-500"
                  }
                >
                  {t.type === "receita" ? "+" : "-"}
                  {formatCurrency(Number(t.amount))}
                </span>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma movimentação ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
