import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSummary, ruleBasedInsights } from "@/lib/insights";
import { formatCurrency } from "@/lib/utils";
import type {
  BankAccount,
  Category,
  Investment,
  Subscription,
  Transaction,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const [tx, acc, sub, inv, cat] = await Promise.all([
    supabase.from("transactions").select("*"),
    supabase.from("bank_accounts").select("*"),
    supabase.from("subscriptions").select("*"),
    supabase.from("investments").select("*"),
    supabase.from("categories").select("*"),
  ]);

  const transactions = (tx.data ?? []) as Transaction[];
  const accounts = (acc.data ?? []) as BankAccount[];
  const subscriptions = (sub.data ?? []) as Subscription[];
  const investments = (inv.data ?? []) as Investment[];
  const categories = (cat.data ?? []) as Category[];
  const catNames = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const summary = buildSummary(transactions, accounts, subscriptions, catNames);
  const insights = ruleBasedInsights(summary, investments);

  // Narrativa do CFO com IA (opcional)
  let aiNarrative: string | null = null;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      aiNarrative = await generateAINarrative(apiKey, summary);
    } catch {
      aiNarrative = null;
    }
  }

  return NextResponse.json({ summary, insights, aiNarrative });
}

async function generateAINarrative(
  apiKey: string,
  summary: ReturnType<typeof buildSummary>
): Promise<string> {
  const prompt = `Você é um CFO virtual experiente e direto. Analise os números financeiros do usuário (em BRL) e escreva um resumo executivo em português, com no máximo 6 frases, destacando saúde financeira, riscos e 2 ações práticas. Seja específico com os valores.

Dados:
- Saldo total: ${formatCurrency(summary.saldoTotal)}
- Receitas do mês: ${formatCurrency(summary.receitasMes)}
- Despesas do mês: ${formatCurrency(summary.despesasMes)}
- Lucro do mês: ${formatCurrency(summary.lucroMes)}
- Despesa média (6 meses): ${formatCurrency(summary.mediaDespesas6m)}
- Runway: ${summary.runwayMeses ? summary.runwayMeses.toFixed(1) + " meses" : "n/d"}
- Custo de assinaturas/mês: ${formatCurrency(summary.custoAssinaturasMensal)}
- Maiores despesas: ${summary.maioresDespesas.map((d) => `${d.name} (${formatCurrency(d.value)})`).join(", ") || "n/d"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error("AI request failed");
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}
