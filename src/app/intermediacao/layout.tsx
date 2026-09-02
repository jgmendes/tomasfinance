import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { IntermediacaoTopbar } from "@/components/intermediacao/topbar";
import { IntermediacaoSidebar } from "@/components/intermediacao/sidebar";

// Produto interno (cliente + admin), nunca deve ser indexado.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function IntermediacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Mesmo login do Tomas Finance — sem sessão, volta pro login compartilhado.
  // (Fallback: o middleware já redireciona antes disso na maioria dos casos,
  // preservando o destino exato em ?next=.)
  if (!user) redirect("/crm/login");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = data as { full_name: string | null; role: string | null } | null;
  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <Link
          href="/intermediacao/negociacoes"
          className="flex h-16 shrink-0 items-center gap-2 border-b px-5 font-bold"
        >
          <Handshake className="h-6 w-6 text-primary" />
          Tomasin Intermediações
        </Link>
        <div className="flex-1 overflow-y-auto">
          <IntermediacaoSidebar isAdmin={isAdmin} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <IntermediacaoTopbar
          fullName={profile?.full_name ?? null}
          email={user.email ?? ""}
          isAdmin={isAdmin}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
