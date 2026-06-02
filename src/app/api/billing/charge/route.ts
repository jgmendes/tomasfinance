import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPixCharge, isBraviveConfigured } from "@/lib/bravive";
import type { BillingSubscription, Plan } from "@/lib/database.types";

export const dynamic = "force-dynamic";

function addMonthISO(months = 1): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const planId: string = body.planId;
  if (!planId) return NextResponse.json({ error: "planId obrigatório" }, { status: 400 });

  const { data: planData } = await supabase.from("plans").select("*").eq("id", planId).single();
  const plan = planData as Plan | null;
  if (!plan) return NextResponse.json({ error: "Plano inválido" }, { status: 404 });

  // Garante que existe assinatura para o usuário
  let { data: subData } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  let sub = subData as BillingSubscription | null;

  if (!sub) {
    const { data: created } = await supabase
      .from("billing_subscriptions")
      .insert({ user_id: user.id, plan_id: planId, status: "trial", billing_enabled: true })
      .select("*")
      .single();
    sub = created as BillingSubscription;
  } else {
    await supabase.from("billing_subscriptions").update({ plan_id: planId }).eq("id", sub.id);
  }

  // Plano gratuito: ativa direto, sem cobrança
  if (plan.price_cents <= 0) {
    await supabase
      .from("billing_subscriptions")
      .update({
        plan_id: planId,
        status: "ativa",
        current_period_end: addMonthISO(1),
        next_charge_date: addMonthISO(1),
      })
      .eq("id", sub!.id);
    return NextResponse.json({ free: true });
  }

  if (!isBraviveConfigured()) {
    return NextResponse.json(
      { error: "Pagamento não configurado. Defina as variáveis BRAVIVE_* no servidor." },
      { status: 503 }
    );
  }

  // Gera PIX na Bravive
  const origin = new URL(request.url).origin;
  try {
    const pix = await createPixCharge(
      plan.price_cents,
      `Assinatura ${plan.name} — Tomaz Finanças`,
      `${origin}/api/webhooks/bravive`
    );

    await supabase.from("charges").insert({
      user_id: user.id,
      subscription_id: sub!.id,
      plan_id: planId,
      amount_cents: plan.price_cents,
      method: "pix",
      status: "pendente",
      bravive_id: pix.id,
      pix_code: pix.code,
      pix_qrcode: pix.qrcode,
      description: `Assinatura ${plan.name}`,
    });

    return NextResponse.json({
      free: false,
      amount_cents: plan.price_cents,
      code: pix.code,
      qrcode: pix.qrcode,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao gerar PIX" },
      { status: 502 }
    );
  }
}
