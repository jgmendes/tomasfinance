import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NegotiationTimeline } from "@/components/intermediacao/negotiation-timeline";
import { NegotiationActions } from "@/components/intermediacao/negotiation-actions";
import { STATUS_LABEL, STATUS_COLOR, negotiationNumber } from "@/lib/intermediacao/status";
import type { Negotiation, NegotiationEvent, NegotiationTerms } from "@/lib/database.types";

export const dynamic = "force-dynamic";

function TermsList({ terms }: { terms: NegotiationTerms | null }) {
  if (!terms) return <p className="text-sm text-muted-foreground">Não informado.</p>;
  const rows: [string, string][] = [];
  if (terms.taxa) rows.push(["Taxa", terms.taxa]);
  if (terms.volume) rows.push(["Volume mensal", `R$ ${Number(terms.volume).toLocaleString("pt-BR")}`]);
  if (terms.prazo_meses) rows.push(["Prazo", `${terms.prazo_meses} meses`]);
  if (terms.condicao_pagamento) rows.push(["Condição de pagamento", terms.condicao_pagamento]);
  if (terms.custo_estimado) rows.push(["Custo estimado", terms.custo_estimado]);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Não informado.</p>;
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function NegociacaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: negotiationData }, { data: eventsData }, { data: profileData }] = await Promise.all([
    supabase.from("negotiations").select("*").eq("id", id).single(),
    supabase
      .from("negotiation_events")
      .select("*")
      .eq("negotiation_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("role").eq("id", user?.id ?? "").single(),
  ]);

  if (!negotiationData) notFound();

  const negotiation = negotiationData as Negotiation;
  const events = (eventsData ?? []) as NegotiationEvent[];
  const isAdmin = (profileData as { role: string | null } | null)?.role === "admin";

  // Último evento com termos — é a "proposta na mesa" no momento.
  const latestTerms = [...events].reverse().find((e) => e.terms)?.terms ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`Negociação ${negotiationNumber(negotiation.number)}`}
        description={negotiation.client_company_name}
      >
        <Badge className={STATUS_COLOR[negotiation.status]}>{STATUS_LABEL[negotiation.status]}</Badge>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Condição atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-sm text-muted-foreground">{negotiation.necessidade}</p>
            <TermsList terms={negotiation.condicao_atual} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{negotiation.status === "aprovada" ? "Condição final" : "Proposta atual"}</CardTitle>
          </CardHeader>
          <CardContent>
            <TermsList terms={negotiation.status === "aprovada" ? negotiation.condicao_final : latestTerms} />
          </CardContent>
        </Card>
      </div>

      <NegotiationActions
        negotiationId={negotiation.id}
        status={negotiation.status}
        isAdmin={isAdmin}
        latestTerms={latestTerms}
      />

      <NegotiationTimeline events={events} />
    </div>
  );
}
