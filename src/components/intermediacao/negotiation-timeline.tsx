import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { NegotiationEvent } from "@/lib/database.types";

const AUTHOR_LABEL: Record<string, string> = {
  admin: "Tomasin",
  parceiro: "Parceiro",
  cliente: "Cliente",
};

const EVENT_LABEL: Record<string, string> = {
  proposta_inicial: "Proposta inicial",
  contraproposta: "Contraproposta",
  mensagem: "Mensagem",
  aprovacao: "Aprovação",
  recusa: "Recusa",
  cancelamento: "Cancelamento",
};

function formatTerms(terms: NegotiationEvent["terms"]) {
  if (!terms) return null;
  const parts: string[] = [];
  if (terms.taxa) parts.push(`Taxa: ${terms.taxa}`);
  if (terms.volume) parts.push(`Volume: R$ ${Number(terms.volume).toLocaleString("pt-BR")}`);
  if (terms.prazo_meses) parts.push(`Prazo: ${terms.prazo_meses} meses`);
  if (terms.condicao_pagamento) parts.push(`Pagamento: ${terms.condicao_pagamento}`);
  if (terms.custo_estimado) parts.push(`Custo estimado: ${terms.custo_estimado}`);
  return parts.join(" · ");
}

export function NegotiationTimeline({ events }: { events: NegotiationEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico da negociação</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
        ) : (
          <ol className="space-y-4">
            {events.map((ev) => (
              <li key={ev.id} className="border-l-2 pl-4">
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(ev.created_at)} — <span className="font-medium text-foreground">{AUTHOR_LABEL[ev.author_role] ?? ev.author_role}</span>
                  {" · "}
                  {EVENT_LABEL[ev.event_type] ?? ev.event_type}
                </p>
                {formatTerms(ev.terms) && <p className="text-sm">{formatTerms(ev.terms)}</p>}
                {ev.message && <p className="mt-0.5 text-sm text-muted-foreground">{ev.message}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
