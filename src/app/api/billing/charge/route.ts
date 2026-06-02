import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPixCharge, isBraviveConfigured } from "@/lib/bravive";
import type { BillingSubscription, Plan } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const planId: string = body.planId;
  const cycle: "mensal" | "anual" = body.cycle === "anual" ? "anual" : "mensal";
  if (!planId) return NextResponse.json({ error: "planId obrigatório" }, { status: 400 });

  const { data: planData } = await supabase.from("plans").select("*").eq("id", planId).single();
  const plan = planData as Plan | null;
  if (!plan) return NextResponse.json({ error: "Plano inválido" }, { status: 404 });

  const amount = cycle === "anual" ? plan.price_annual_cents : plan.price_cents;

  // Garante que existe assinatura para o usuário
  const { data: subData } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  let sub = subData as BillingSubscription | null;

  if (!sub) {
    const { data: created } = await supabase
      .from("billing_subscriptions")
      .insert({ user_id: user.id, plan_id: planId, status: "trial", billing_enabled: true, cycle })
      .select("*")
      .single();
    sub = created as BillingSubscription;
  } else {
    await supabase.from("billing_subscriptions").update({ plan_id: planId, cycle }).eq("id", sub.id);
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "Plano sem valor para cobrança." }, { status: 400 });
  }

  if (!isBraviveConfigured()) {
    return NextResponse.json(
      { error: "Pagamento ainda não configurado pelo administrador. Tente novamente em breve." },
      { status: 503 }
    );
  }

  // Gera PIX na Bravive
  const origin = new URL(request.url).origin;
  try {
    const pix = await createPixCharge(
      amount,
      `Assinatura ${plan.name} (${cycle}) — Tomaz Finanças`,
      `${origin}/api/webhooks/bravive`
    );

    await supabase.from("charges").insert({
      user_id: user.id,
      subscription_id: sub!.id,
      plan_id: planId,
      amount_cents: amount,
      method: "pix",
      status: "pendente",
      cycle,
      bravive_id: pix.id,
      pix_code: pix.code,
      pix_qrcode: pix.qrcode,
      description: `Assinatura ${plan.name} (${cycle})`,
    });

    return NextResponse.json({ free: false, amount_cents: amount, code: pix.code, qrcode: pix.qrcode });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao gerar PIX" },
      { status: 502 }
    );
  }
}
