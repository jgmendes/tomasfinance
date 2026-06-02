import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Charge } from "@/lib/database.types";

export const dynamic = "force-dynamic";

function addMonthISO(months = 1): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  // 1) Valida o segredo do webhook
  const secret = request.headers.get("x-webhook-secret");
  const expected = process.env.BRAVIVE_WEBHOOK_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload?.data?.id) return NextResponse.json({ ok: true });

  const { event, data } = payload;

  // Só tratamos pagamentos (PIX in) confirmados
  if (event !== "payment") return NextResponse.json({ ok: true });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "service role ausente" }, { status: 500 });
  }

  const braviveId = data.id as string;
  const status = data.status as string;

  const { data: chargeData } = await admin
    .from("charges")
    .select("*")
    .eq("bravive_id", braviveId)
    .maybeSingle();
  const charge = chargeData as Charge | null;
  if (!charge) return NextResponse.json({ ok: true }); // idempotente

  if (status === "paid" && charge.status !== "pago") {
    await admin
      .from("charges")
      .update({ status: "pago", paid_at: new Date().toISOString() })
      .eq("id", charge.id);

    if (charge.subscription_id) {
      const months = charge.cycle === "anual" ? 12 : 1;
      await admin
        .from("billing_subscriptions")
        .update({
          status: "ativa",
          plan_id: charge.plan_id,
          cycle: charge.cycle,
          current_period_end: addMonthISO(months),
          next_charge_date: addMonthISO(months),
        })
        .eq("id", charge.subscription_id);
    }
  } else if (["expired", "canceled", "failed", "reversed"].includes(status)) {
    await admin
      .from("charges")
      .update({ status: status === "expired" ? "expirado" : status === "failed" ? "falhou" : "cancelado" })
      .eq("id", charge.id);
  }

  return NextResponse.json({ ok: true });
}
