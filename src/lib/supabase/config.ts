// Configuração pública do Supabase.
//
// A URL e a "publishable/anon key" são valores PÚBLICOS por design — eles vão
// para o bundle do navegador e o acesso aos dados é protegido pelo RLS.
// Por isso é seguro mantê-los como fallback aqui, garantindo que o app funcione
// mesmo sem variáveis de ambiente configuradas no deploy.
//
// Para sobrescrever (ex.: outro projeto/ambiente), defina as env vars
// NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
//
// ⚠️ A chave secreta (sb_secret_...) NUNCA deve ficar no código/cliente.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://llfwqkjfktxisjheyfdz.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_c2PJW_z6WsYoUYEjd0EpbA_0UOZNGGI";
