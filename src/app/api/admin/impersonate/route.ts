import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1) Confirma que quem chama é admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((prof as { role: string | null } | null)?.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email: string = body.email;
  if (!email) return NextResponse.json({ error: "email obrigatório" }, { status: 400 });

  // 2) Gera link mágico (service role) para entrar como o usuário
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Função indisponível: defina SUPABASE_SERVICE_ROLE_KEY no servidor." },
      { status: 503 }
    );
  }

  const origin = new URL(request.url).origin;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${origin}/crm/auth/callback?next=/crm/dashboard` },
  });

  if (error || !data?.properties?.action_link) {
    return NextResponse.json(
      { error: error?.message ?? "Não foi possível gerar o acesso" },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: data.properties.action_link });
}
