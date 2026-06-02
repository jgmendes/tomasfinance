import type {
  BankAccount,
  Goal,
  Investment,
  Subscription,
  Transaction,
} from "@/lib/database.types";
import { monthLabel } from "@/lib/utils";

/** Soma o saldo consolidado das contas + efeito das transações pagas. */
export function computeAccountsBalance(
  accounts: BankAccount[],
  transactions: Transaction[]
) {
  const initial = accounts.reduce((s, a) => s + Number(a.initial_balance), 0);
  const movement = transactions
    .filter((t) => t.status === "pago" || t.status === "recebido")
    .reduce(
      (s, t) => s + (t.type === "receita" ? Number(t.amount) : -Number(t.amount)),
      0
    );
  return initial + movement;
}

export function sumByType(transactions: Transaction[], type: "receita" | "despesa") {
  return transactions
    .filter((t) => t.type === type)
    .reduce((s, t) => s + Number(t.amount), 0);
}

export function isInMonth(date: string, ref = new Date()) {
  const d = new Date(date + "T00:00:00");
  return (
    d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear()
  );
}

/** Pendências a pagar (despesas) e a receber (receitas) ainda não liquidadas. */
export function pendingTotals(transactions: Transaction[]) {
  const aPagar = transactions
    .filter((t) => t.type === "despesa" && ["pendente", "atrasado"].includes(t.status))
    .reduce((s, t) => s + Number(t.amount), 0);
  const aReceber = transactions
    .filter((t) => t.type === "receita" && ["pendente", "atrasado"].includes(t.status))
    .reduce((s, t) => s + Number(t.amount), 0);
  return { aPagar, aReceber };
}

/** Série dos últimos N meses com receita, despesa e saldo. */
export function monthlySeries(transactions: Transaction[], months = 6) {
  const now = new Date();
  const series: {
    month: string;
    receitas: number;
    despesas: number;
    saldo: number;
  }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const inMonth = transactions.filter((t) => isInMonth(t.date, ref));
    const receitas = sumByType(inMonth, "receita");
    const despesas = sumByType(inMonth, "despesa");
    series.push({
      month: `${monthLabel(ref.getMonth())}/${String(ref.getFullYear()).slice(2)}`,
      receitas,
      despesas,
      saldo: receitas - despesas,
    });
  }
  return series;
}

/** Agrupa despesas por categoria (nome). */
export function expensesByCategory(
  transactions: Transaction[],
  categoryNames: Record<string, string>
) {
  const map = new Map<string, number>();
  transactions
    .filter((t) => t.type === "despesa")
    .forEach((t) => {
      const name = t.category_id ? categoryNames[t.category_id] ?? "Outros" : "Outros";
      map.set(name, (map.get(name) ?? 0) + Number(t.amount));
    });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function investmentTotals(investments: Investment[]) {
  const invested = investments.reduce((s, i) => s + Number(i.invested_amount), 0);
  const current = investments.reduce((s, i) => s + Number(i.current_amount), 0);
  const profit = current - invested;
  const profitPct = invested > 0 ? (profit / invested) * 100 : 0;
  return { invested, current, profit, profitPct };
}

export function goalsProgress(goals: Goal[]) {
  return goals.map((g) => ({
    ...g,
    pct: g.target_amount > 0
      ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100)
      : 0,
  }));
}

/** Custo mensal e anual projetado das assinaturas ativas. */
export function subscriptionCosts(subs: Subscription[]) {
  const monthly = subs
    .filter((s) => s.active)
    .reduce((sum, s) => {
      const amt = Number(s.amount);
      switch (s.cycle) {
        case "anual": return sum + amt / 12;
        case "trimestral": return sum + amt / 3;
        case "semanal": return sum + amt * 4.33;
        default: return sum + amt;
      }
    }, 0);
  return { monthly, yearly: monthly * 12 };
}

/**
 * Patrimônio líquido = saldo das contas + investimentos atuais.
 */
export function netWorth(
  accountsBalance: number,
  investments: Investment[]
) {
  const inv = investments.reduce((s, i) => s + Number(i.current_amount), 0);
  return accountsBalance + inv;
}
