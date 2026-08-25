import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  netWorth,
  pendingTotals,
  sumByType,
  isInMonth,
} from "@/lib/finance";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowDownCircle,
  ArrowUpCircle,
  Gem,
  CreditCard,
  AlarmClock,
  Receipt,
} from "lucide-react";
import type {
  Category,
  Company,
  CreditCard as CreditCardType,
  Investment,
  Reminder,
  TaxSetting,
  Transaction,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: txs },
    { data: accounts },
    { data: categories },
    { data: investmentsData },
    { data: creditCardsData },
    { data: companiesData },
    { data: taxSettingsData },
    { data: remindersData },
  ] = await Promise.all([
    supabase.from("transactions").select("*").order("date", { ascending: false }),
    supabase.from("bank_accounts").select("*"),
    supabase.from("categories").select("*"),
    supabase.from("investments").select("*"),
    supabase.from("credit_cards").select("*"),
    supabase.from("companies").select("*"),
    supabase.from("tax_settings").select("*"),
    supabase
      .from("reminders")
      .select("*")
      .eq("status", "pendente")
      .order("remind_at", { ascending: true })
      .limit(5),
  ]);

  const transactions = (txs ?? []) as Transaction[];
  const accountsList = accounts ?? [];
  const cats = (categories ?? []) as Category[];
  const catNames = Object.fromEntries(cats.map((c) => [c.id, c.name]));
  const investments = (investmentsData ?? []) as Investment[];
  const creditCards = (creditCardsData ?? []) as CreditCardType[];
  const companies = (companiesData ?? []) as Company[];
  const taxSettings = (taxSettingsData ?? []) as TaxSetting[];
  const proximosLembretes = (remindersData ?? []) as Reminder[];

  const monthTxs = transactions.filter((t) => isInMonth(t.date));
  const receitasMes = sumByType(monthTxs, "receita");
  const despesasMes = sumByType(monthTxs, "despesa");
  const saldoTotal = computeAccountsBalance(accountsList, transactions);
  const { aPagar, aReceber } = pendingTotals(transactions);
  const patrimonio = netWorth(saldoTotal, investments);

  const limiteTotal = creditCards.reduce((s, c) => s + Number(c.credit_limit), 0);
  const limiteUsado = creditCards.reduce((s, c) => s + Number(c.used_limit), 0);
  const limiteDisponivel = limiteTotal - limiteUsado;

  // Imposto estimado do mês: alíquota configurada (Pessoal + cada empresa) sobre a receita do mês daquele escopo.
  const entidadesFiscais = [null as string | null, ...companies.map((c) => c.id)];
  const impostoMes = entidadesFiscais.reduce((sum, companyId) => {
    const setting = taxSettings.find((t) => t.company_id === companyId);
    if (!setting || Number(setting.rate) <= 0) return sum;
    const receita = monthTxs
      .filter((t) => t.type === "receita" && t.company_id === companyId)
      .reduce((s, t) => s + Number(t.amount), 0);
    return sum + receita * (Number(setting.rate) / 100);
  }, 0);

  // Lucro líquido = receitas - despesas - imposto estimado do mês.
  const lucro = receitasMes - despesasMes - impostoMes;

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
          hint="Receitas − despesas − imposto estimado"
          icon={PiggyBank}
          accent={lucro >= 0 ? "text-emerald-500" : "text-red-500"}
          iconBg={lucro >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <StatCard
          title="Patrimônio"
          value={formatCurrency(patrimonio)}
          icon={Gem}
          accent="text-primary"
          iconBg="bg-primary/10"
        />
        {creditCards.length > 0 && (
          <StatCard
            title="Limite disponível (cartões)"
            value={formatCurrency(limiteDisponivel)}
            icon={CreditCard}
            accent="text-muted-foreground"
            iconBg="bg-muted"
          />
        )}
        <StatCard
          title="Imposto estimado (mês)"
          value={formatCurrency(impostoMes)}
          icon={Receipt}
          accent="text-amber-500"
          iconBg="bg-amber-500/10"
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

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <AlarmClock className="h-4 w-4 text-primary" /> Próximos lembretes
            </CardTitle>
            <Link href="/crm/lembretes" className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            {proximosLembretes.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum lembrete pendente.{" "}
                <Link href="/crm/lembretes" className="text-primary hover:underline">
                  Criar um
                </Link>
                .
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {proximosLembretes.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <Badge variant="warning" className="mt-2 text-[10px]">
                      {formatDateTime(r.remind_at)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
