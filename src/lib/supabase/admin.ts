import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Cliente Supabase com SERVICE ROLE — ignora RLS. Uso EXCLUSIVO no servidor
 * (ex.: webhooks que precisam atualizar dados sem sessão de usuário).
 * NUNCA importe em código que vá para o navegador.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }
  return createSupabaseClient<Database>(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
