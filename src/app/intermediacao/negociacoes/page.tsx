import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { STATUS_LABEL, STATUS_COLOR, negotiationNumber } from "@/lib/intermediacao/status";
import { Handshake, Plus } from "lucide-react";
import type { Negotiation } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function NegociacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { data: profileData }] = await Promise.all([
    // RLS já filtra: admin vê todas, cliente vê só as próprias.
    supabase.from("negotiations").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("role").eq("id", user?.id ?? "").single(),
  ]);
  const negotiations = (data ?? []) as Negotiation[];
  const isAdmin = (profileData as { role: string | null } | null)?.role === "admin";

  return (
    <div>
      <PageHeader
        title="Negociações"
        description={
          isAdmin
            ? "Todas as negociações em andamento com clientes"
            : "Acompanhe suas negociações e propostas"
        }
      >
        {isAdmin && (
          <Button asChild>
            <Link href="/intermediacao/negociacoes/novo">
              <Plus className="h-4 w-4" /> Nova negociação
            </Link>
          </Button>
        )}
      </PageHeader>

      {negotiations.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Nenhuma negociação ainda"
          description={
            isAdmin
              ? "Clique em \"Nova negociação\" para cadastrar a primeira."
              : "Assim que uma negociação for aberta com você, ela aparece aqui."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {negotiations.map((n) => (
            <Link key={n.id} href={`/intermediacao/negociacoes/${n.id}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{negotiationNumber(n.number)}</p>
                    <Badge className={STATUS_COLOR[n.status]}>
                      {STATUS_LABEL[n.status]}
                    </Badge>
                  </div>
                  <p className="mt-2 font-semibold">{n.client_company_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{n.necessidade}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Atualizado em {formatDate(n.updated_at ?? n.created_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
