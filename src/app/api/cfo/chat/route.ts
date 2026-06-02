import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSummary } from "@/lib/insights";
import { formatCurrency } from "@/lib/utils";
import type {
  BankAccount,
  Category,
  Subscription,
  Transaction,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const message: string = body.message ?? "";
  const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];
  if (!message.trim()) {
    return NextResponse.json({ error: "mensagem vazia" }, { status: 400 });
  }

  const [tx, acc, sub, cat] = await Promise.all([
    supabase.from("transactions").select("*"),
    supabase.from("bank_accounts").select("*"),
    supabase.from("subscriptions").select("*"),
    supabase.from("categories").select("*"),
  ]);
  const transactions = (tx.data ?? []) as Transaction[];
  const accounts = (acc.data ?? []) as BankAccount[];
  const subscriptions = (sub.data ?? []) as Subscription[];
  const categories = (cat.data ?? []) as Category[];
  const catNames = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const summary = buildSummary(transactions, accounts, subscriptions, catNames);

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const reply = await askClaude(apiKey, summary, history, message);
      return NextResponse.json({ reply });
    } catch {
      // cai no fallback
    }
  }

  return NextResponse.json({ reply: fallbackAnswer(summary, message) });
}

async function askClaude(
  apiKey: string,
  summary: ReturnType<typeof buildSummary>,
  history: ChatMessage[],
  message: string
) {
  const system = `Você é o CFO Virtual do usuário, um consultor financeiro objetivo e amigável que responde em português do Brasil. Use SEMPRE os dados financeiros abaixo para embasar respostas. Seja direto, cite valores e dê recomendações práticas. Se perguntarem se podem gastar algo, compare com saldo, lucro do mês e runway.

DADOS FINANCEIROS ATUAIS:
- Saldo total: ${formatCurrency(summary.saldoTotal)}
- Receitas do mês: ${formatCurrency(summary.receitasMes)}
- Despesas do mês: ${formatCurrency(summary.despesasMes)}
- Lucro do mês: ${formatCurrency(summary.lucroMes)}
- Despesa média (6 meses): ${formatCurrency(summary.mediaDespesas6m)}
- Runway: ${summary.runwayMeses ? summary.runwayMeses.toFixed(1) + " meses" : "n/d"}
- Custo de assinaturas/mês: ${formatCurrency(summary.custoAssinaturasMensal)}
- Maiores despesas: ${summary.maioresDespesas.map((d) => `${d.name} (${formatCurrency(d.value)})`).join(", ") || "n/d"}`;

  const messages = [
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system,
      messages,
    }),
  });
  if (!res.ok) throw new Error("AI failed");
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

/** Resposta sem IA: cobre perguntas comuns usando regras. */
function fallbackAnswer(
  summary: ReturnType<typeof buildSummary>,
  message: string
): string {
  const lower = message.toLowerCase();
  const numMatch = message.replace(/\./g, "").match(/(\d+[,]?\d*)/);
  const valor = numMatch ? Number(numMatch[1].replace(",", ".")) : null;

  if ((lower.includes("posso gastar") || lower.includes("posso comprar")) && valor) {
    const sobra = summary.saldoTotal - valor;
    if (valor > summary.saldoTotal) {
      return `Não recomendo. Gastar ${formatCurrency(valor)} excede seu saldo total de ${formatCurrency(summary.saldoTotal)}. Você ficaria negativo.`;
    }
    if (summary.lucroMes < 0) {
      return `Cuidado: seu mês está no vermelho (lucro de ${formatCurrency(summary.lucroMes)}). Gastar ${formatCurrency(valor)} deixaria seu saldo em ${formatCurrency(sobra)}. Só faça se for essencial.`;
    }
    return `Pode caber: após gastar ${formatCurrency(valor)}, seu saldo ficaria em ${formatCurrency(sobra)}. Como seu lucro do mês é ${formatCurrency(summary.lucroMes)}, está dentro do razoável — mas evite comprometer a reserva.`;
  }

  if (lower.includes("runway") || lower.includes("quanto tempo") || lower.includes("dura")) {
    return summary.runwayMeses
      ? `Com a sua queima média de ${formatCurrency(summary.mediaDespesas6m)}/mês, seu caixa de ${formatCurrency(summary.saldoTotal)} dura cerca de ${summary.runwayMeses.toFixed(1)} meses.`
      : `Ainda não tenho despesas suficientes para calcular seu runway.`;
  }

  if (lower.includes("economiz") || lower.includes("cortar") || lower.includes("reduzir")) {
    const top = summary.maioresDespesas[0];
    return top
      ? `Sua maior despesa é "${top.name}" (${formatCurrency(top.value)} no mês). Cortar 15% aí já economizaria ${formatCurrency(top.value * 0.15)}/mês. Suas assinaturas custam ${formatCurrency(summary.custoAssinaturasMensal)}/mês — vale revisar as menos usadas.`
      : `Cadastre suas despesas para eu sugerir onde economizar.`;
  }

  return `Resumo rápido: saldo ${formatCurrency(summary.saldoTotal)}, lucro do mês ${formatCurrency(summary.lucroMes)}, despesa média ${formatCurrency(summary.mediaDespesas6m)}/mês${summary.runwayMeses ? `, runway ~${summary.runwayMeses.toFixed(1)} meses` : ""}. Pergunte coisas como "posso gastar R$ 2.000?", "como economizar?" ou "qual meu runway?". (Para respostas mais inteligentes, configure a ANTHROPIC_API_KEY.)`;
}
