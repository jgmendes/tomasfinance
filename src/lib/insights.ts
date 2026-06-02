import type {
  BankAccount,
  Investment,
  Subscription,
  Transaction,
} from "@/lib/database.types";
import {
  computeAccountsBalance,
  expensesByCategory,
  monthlySeries,
  subscriptionCosts,
  sumByType,
  isInMonth,
} from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";

export interface Insight {
  level: "info" | "success" | "warning" | "danger";
  title: string;
  message: string;
}

export interface FinancialSummary {
  saldoTotal: number;
  receitasMes: number;
  despesasMes: number;
  lucroMes: number;
  mediaDespesas6m: number;
  runwayMeses: number | null;
  custoAssinaturasMensal: number;
  maioresDespesas: { name: string; value: number }[];
}

export function buildSummary(
  transactions: Transaction[],
  accounts: BankAccount[],
  subscriptions: Subscription[],
  categoryNames: Record<string, string>
): FinancialSummary {
  const monthTxs = transactions.filter((t) => isInMonth(t.date));
  const receitasMes = sumByType(monthTxs, "receita");
  const despesasMes = sumByType(monthTxs, "despesa");
  const saldoTotal = computeAccountsBalance(accounts, transactions);

  const series = monthlySeries(transactions, 6);
  const mediaDespesas6m =
    series.reduce((s, m) => s + m.despesas, 0) / (series.length || 1);

  // Runway = saldo atual / queima média mensal (quando despesas > receitas)
  const queima = mediaDespesas6m;
  const runwayMeses = queima > 0 ? saldoTotal / queima : null;

  const { monthly: custoAssinaturasMensal } = subscriptionCosts(subscriptions);
  const maioresDespesas = expensesByCategory(monthTxs, categoryNames).slice(0, 5);

  return {
    saldoTotal,
    receitasMes,
    despesasMes,
    lucroMes: receitasMes - despesasMes,
    mediaDespesas6m,
    runwayMeses,
    custoAssinaturasMensal,
    maioresDespesas,
  };
}

/** Insights por regras (sempre disponível, sem IA externa). */
export function ruleBasedInsights(
  s: FinancialSummary,
  investments: Investment[]
): Insight[] {
  const out: Insight[] = [];

  // Lucro / prejuízo do mês
  if (s.lucroMes >= 0) {
    out.push({
      level: "success",
      title: "Mês no azul",
      message: `Você teve lucro de ${formatCurrency(s.lucroMes)} este mês. Considere direcionar parte para investimentos ou reserva.`,
    });
  } else {
    out.push({
      level: "danger",
      title: "Atenção: mês no vermelho",
      message: `Suas despesas superaram as receitas em ${formatCurrency(Math.abs(s.lucroMes))}. Reveja os maiores gastos abaixo.`,
    });
  }

  // Runway
  if (s.runwayMeses !== null) {
    if (s.runwayMeses < 3) {
      out.push({
        level: "danger",
        title: "Runway curto",
        message: `Com a queima média atual (${formatCurrency(s.mediaDespesas6m)}/mês), seu caixa dura ~${s.runwayMeses.toFixed(1)} meses. Reduza despesas ou aumente a entrada de caixa.`,
      });
    } else {
      out.push({
        level: "info",
        title: "Runway financeiro",
        message: `Seu caixa atual cobre aproximadamente ${s.runwayMeses.toFixed(1)} meses de despesas no ritmo atual.`,
      });
    }
  }

  // Saldo baixo
  if (s.saldoTotal < s.mediaDespesas6m) {
    out.push({
      level: "warning",
      title: "Saldo abaixo de 1 mês de despesas",
      message: `Seu saldo (${formatCurrency(s.saldoTotal)}) está menor que sua despesa média mensal. Vale reforçar a reserva de emergência.`,
    });
  }

  // Assinaturas
  if (s.custoAssinaturasMensal > 0) {
    const pct = s.despesasMes > 0 ? (s.custoAssinaturasMensal / s.despesasMes) * 100 : 0;
    out.push({
      level: pct > 25 ? "warning" : "info",
      title: "Gasto com assinaturas",
      message: `Assinaturas recorrentes somam ${formatCurrency(s.custoAssinaturasMensal)}/mês (${formatCurrency(s.custoAssinaturasMensal * 12)}/ano). ${pct > 25 ? "Isso é uma fatia alta das despesas — revise serviços pouco usados." : ""}`,
    });
  }

  // Maior categoria de despesa
  if (s.maioresDespesas[0]) {
    const top = s.maioresDespesas[0];
    out.push({
      level: "info",
      title: `Maior gasto: ${top.name}`,
      message: `${top.name} é sua maior despesa do mês (${formatCurrency(top.value)}). Reduzir 10% aqui economizaria ${formatCurrency(top.value * 0.1)}/mês.`,
    });
  }

  // Investimentos
  const investedNow = investments.reduce((sum, i) => sum + Number(i.current_amount), 0);
  if (investedNow === 0 && s.lucroMes > 0) {
    out.push({
      level: "info",
      title: "Sugestão de investimento",
      message: `Você está sem investimentos cadastrados. Com sobra de caixa, considere começar por algo de baixa volatilidade (CDB/Tesouro) para a reserva.`,
    });
  }

  return out;
}
