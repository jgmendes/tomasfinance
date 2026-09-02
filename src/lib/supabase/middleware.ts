import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

/**
 * Renova a sessão do usuário e protege rotas privadas.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (e) {
    console.error("[middleware] Falha ao obter usuário:", e);
    return supabaseResponse;
  }

  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/crm/login") ||
    pathname.startsWith("/crm/cadastro") ||
    pathname.startsWith("/crm/recuperar-senha") ||
    pathname.startsWith("/crm/redefinir-senha") ||
    pathname.startsWith("/crm/auth");

  const isPublicAsset =
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") || // rotas de API cuidam da própria auth
    pathname.startsWith("/crm/admin-login") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icon-");

  // Rotas privadas protegidas por este middleware: o app financeiro (/crm) e o
  // produto de intermediação (/intermediacao) — ambos usam o mesmo login.
  const isProtectedNamespace =
    pathname.startsWith("/crm") || pathname.startsWith("/intermediacao");

  // Não autenticado tentando acessar rota privada -> login (preserva destino em ?next=)
  if (!user && isProtectedNamespace && !isAuthRoute && !isPublicAsset) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/crm/login";
    redirectUrl.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(redirectUrl);
  }

  // Autenticado tentando acessar páginas de auth -> dashboard
  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/crm/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
