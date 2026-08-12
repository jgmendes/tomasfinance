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
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      aiNarrative = await generateAINarrative(apiKey, summary);
    } catch {
      aiNarrative = null;
    }
  }

  return NextResponse.json({ summary, insights, aiNarrative });
}

// Alias "latest" em vez de fixar uma versão — evita quebrar quando a Google
// aposenta modelos antigos (ex.: gemini-2.5-flash parou de aceitar chaves novas).
const GEMINI_MODEL = "gemini-flash-latest";

async function generateAINarrative(
  apiKey: string,
  summary: ReturnType<typeof buildSummary>
): Promise<string> {
  const systemInstruction =
    "Você é um CFO virtual: um agente financeiro experiente, direto e especializado em finanças pessoais e empresariais, que responde em português do Brasil.";

  const prompt = `Analise os números financeiros do usuário (em BRL) e escreva um resumo executivo em português, com no máximo 6 frases, destacando saúde financeira, riscos e 2 ações práticas. Seja específico com os valores.

Dados:
- Saldo total: ${formatCurrency(summary.saldoTotal)}
- Receitas do mês: ${formatCurrency(summary.receitasMes)}
- Despesas do mês: ${formatCurrency(summary.despesasMes)}
- Lucro do mês: ${formatCurrency(summary.lucroMes)}
- Despesa média (6 meses): ${formatCurrency(summary.mediaDespesas6m)}
- Runway: ${summary.runwayMeses ? summary.runwayMeses.toFixed(1) + " meses" : "n/d"}
- Custo de assinaturas/mês: ${formatCurrency(summary.custoAssinaturasMensal)}
- Maiores despesas: ${summary.maioresDespesas.map((d) => `${d.name} (${formatCurrency(d.value)})`).join(", ") || "n/d"}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        // maxOutputTokens generoso: modelos Gemini "thinking" consomem parte
        // do orçamento pensando antes de responder, então precisa de folga.
        generationConfig: { maxOutputTokens: 1500 },
      }),
    }
  );

  if (!res.ok) throw new Error("AI request failed");
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
