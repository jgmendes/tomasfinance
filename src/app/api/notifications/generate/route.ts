import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  computeAccountsBalance,
  monthlySeries,
} from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  BankAccount,
  CreditCard,
  Goal,
  Subscription,
  Transaction,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

interface Candidate {
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "danger";
  link?: string;
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function nextDayOfMonthDiff(day: number) {
  const today = new Date();
  const cur = today.getDate();
  if (day >= cur) return day - cur;
  // próximo mês
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return daysInMonth - cur + day;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const [tx, acc, goals, subs, cards, existing] = await Promise.all([
    supabase.from("transactions").select("*"),
    supabase.from("bank_accounts").select("*"),
    supabase.from("goals").select("*"),
    supabase.from("subscriptions").select("*"),
    supabase.from("credit_cards").select("*"),
    supabase.from("notifications").select("title"),
  ]);

  const transactions = (tx.data ?? []) as Transaction[];
  const accounts = (acc.data ?? []) as BankAccount[];
  const goalsList = (goals.data ?? []) as Goal[];
  const subsList = (subs.data ?? []) as Subscription[];
  const cardsList = (cards.data ?? []) as CreditCard[];
  const existingTitles = new Set(
    ((existing.data ?? []) as { title: string }[]).map((n) => n.title)
  );

  const candidates: Candidate[] = [];

  // 1) Contas a pagar vencendo (próximos 7 dias)
  for (const t of transactions) {
    if (t.type !== "despesa") continue;
    if (t.status !== "pendente" && t.status !== "atrasado") continue;
    const ref = t.due_date ?? t.date;
    const d = daysUntil(ref);
    if (d >= 0 && d <= 7) {
      candidates.push({
        title: `Conta a vencer: ${t.description}`,
        message: `${formatCurrency(Number(t.amount))} vence em ${formatDate(ref)} (${d === 0 ? "hoje" : `${d} dia(s)`}).`,
        type: d <= 2 ? "danger" : "warning",
        link: "/crm/despesas",
      });
    }
  }

  // 2) Faturas de cartão próximas do vencimento (próximos 5 dias)
  for (const c of cardsList) {
    if (!c.due_day) continue;
    const diff = nextDayOfMonthDiff(c.due_day);
    if (diff <= 5 && Number(c.used_limit) > 0) {
      candidates.push({
        title: `Fatura próxima: ${c.name}`,
        message: `Vencimento dia ${c.due_day} (em ${diff} dia(s)). Utilizado: ${formatCurrency(Number(c.used_limit))}.`,
        type: "warning",
        link: "/crm/cartoes",
      });
    }
  }

  // 3) Assinaturas com cobrança próxima (próximos 3 dias)
  for (const s of subsList) {
    if (!s.active) continue;
    const d = daysUntil(s.next_charge_date);
    if (d >= 0 && d <= 3) {
      candidates.push({
        title: `Cobrança próxima: ${s.name}`,
        message: `${formatCurrency(Number(s.amount))} será cobrado em ${formatDate(s.next_charge_date)}.`,
        type: "info",
        link: "/crm/assinaturas",
      });
    }
  }

  // 4) Metas atingidas
  for (const g of goalsList) {
    if (g.status === "concluida") continue;
    if (Number(g.current_amount) >= Number(g.target_amount) && Number(g.target_amount) > 0) {
      candidates.push({
        title: `Meta atingida: ${g.title}`,
        message: `Parabéns! Você alcançou ${formatCurrency(Number(g.target_amount))}. 🎉`,
        type: "success",
        link: "/crm/metas",
      });
    }
  }

  // 5) Saldo baixo
  const saldo = computeAccountsBalance(accounts, transactions);
  const series = monthlySeries(transactions, 6);
  const mediaDespesas = series.reduce((s, m) => s + m.despesas, 0) / (series.length || 1);
  if (accounts.length > 0 && mediaDespesas > 0 && saldo < mediaDespesas) {
    candidates.push({
      title: "Saldo baixo",
      message: `Seu saldo (${formatCurrency(saldo)}) está abaixo da sua despesa média mensal (${formatCurrency(mediaDespesas)}).`,
      type: "danger",
      link: "/crm/contas",
    });
  }

  // Insere apenas os que ainda não existem (dedup por título)
  const toInsert = candidates
    .filter((c) => !existingTitles.has(c.title))
    .map((c) => ({
      user_id: user.id,
      title: c.title,
      message: c.message,
      type: c.type,
      link: c.link ?? null,
      read: false,
    }));

  if (toInsert.length > 0) {
    await supabase.from("notifications").insert(toInsert);
  }

  return NextResponse.json({ created: toInsert.length });
}
