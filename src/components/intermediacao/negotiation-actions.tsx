"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { proposalTermsSchema, firstError } from "@/lib/intermediacao/schemas";
import { Check, Loader2, X } from "lucide-react";
import type { NegotiationAuthorRole, NegotiationStatus, NegotiationTerms } from "@/lib/database.types";

interface Props {
  negotiationId: string;
  status: NegotiationStatus;
  isAdmin: boolean;
  latestTerms: NegotiationTerms | null;
}

const TERMINAL: NegotiationStatus[] = ["aprovada", "recusada", "cancelada"];

function emptyTermsForm() {
  return { taxa: "", volume: "", prazo_meses: "", condicao_pagamento: "", message: "" };
}

export function NegotiationActions({ negotiationId, status, isAdmin, latestTerms }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  const [lanceOpen, setLanceOpen] = useState(false);
  const [lanceAuthor, setLanceAuthor] = useState<NegotiationAuthorRole>("admin");
  const [lanceForm, setLanceForm] = useState(emptyTermsForm());

  const [contraOpen, setContraOpen] = useState(false);
  const [contraForm, setContraForm] = useState(emptyTermsForm());

  function buildTerms(form: ReturnType<typeof emptyTermsForm>): NegotiationTerms {
    const terms: NegotiationTerms = { taxa: form.taxa.trim() };
    if (form.volume.trim()) terms.volume = Number(form.volume);
    if (form.prazo_meses.trim()) terms.prazo_meses = Number(form.prazo_meses);
    if (form.condicao_pagamento.trim()) terms.condicao_pagamento = form.condicao_pagamento.trim();
    return terms;
  }

  async function addEvent(opts: {
    author_role: NegotiationAuthorRole;
    event_type: "contraproposta" | "mensagem" | "aprovacao" | "recusa" | "cancelamento";
    terms?: NegotiationTerms | null;
    message?: string | null;
    newStatus?: NegotiationStatus;
    condicaoFinal?: NegotiationTerms | null;
  }) {
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada");
      setBusy(false);
      return false;
    }
    const { error: eventError } = await supabase.from("negotiation_events").insert({
      negotiation_id: negotiationId,
      author_role: opts.author_role,
      event_type: opts.event_type,
      terms: opts.terms ?? null,
      message: opts.message ?? null,
      created_by: user.id,
    });
    if (eventError) {
      setBusy(false);
      toast.error("Erro ao registrar", { description: eventError.message });
      return false;
    }
    if (opts.newStatus) {
      const update: { status: NegotiationStatus; condicao_final?: NegotiationTerms } = {
        status: opts.newStatus,
      };
      if (opts.condicaoFinal) update.condicao_final = opts.condicaoFinal;
      const { error: statusError } = await supabase
        .from("negotiations")
        .update(update)
        .eq("id", negotiationId);
      if (statusError) {
        setBusy(false);
        toast.error("Registrado, mas o status não atualizou", { description: statusError.message });
        return false;
      }
    }
    setBusy(false);
    router.refresh();
    return true;
  }

  async function submitLance(e: React.FormEvent) {
    e.preventDefault();
    const validationError = firstError(proposalTermsSchema, lanceForm);
    if (validationError) return toast.error(validationError);
    const ok = await addEvent({
      author_role: lanceAuthor,
      event_type: "contraproposta",
      terms: buildTerms(lanceForm),
      message: lanceForm.message.trim() || null,
      // Lance do parceiro é negociação interna; lance da Tomasin é o que vai pro cliente decidir.
      newStatus: lanceAuthor === "admin" ? "contraproposta_enviada" : "negociacao",
    });
    if (ok) {
      toast.success("Lance registrado!");
      setLanceForm(emptyTermsForm());
      setLanceOpen(false);
    }
  }

  async function submitContraCliente(e: React.FormEvent) {
    e.preventDefault();
    const validationError = firstError(proposalTermsSchema, contraForm);
    if (validationError) return toast.error(validationError);
    const ok = await addEvent({
      author_role: "cliente",
      event_type: "contraproposta",
      terms: buildTerms(contraForm),
      message: contraForm.message.trim() || null,
      newStatus: "contraproposta_recebida",
    });
    if (ok) {
      toast.success("Contraproposta enviada!");
      setContraForm(emptyTermsForm());
      setContraOpen(false);
    }
  }

  async function aceitar() {
    const ok = await addEvent({
      author_role: "cliente",
      event_type: "aprovacao",
      terms: latestTerms,
      newStatus: "aprovada",
      condicaoFinal: latestTerms,
    });
    if (ok) toast.success("Condição aceita!");
  }

  async function recusar(authorRole: NegotiationAuthorRole) {
    const ok = await addEvent({
      author_role: authorRole,
      event_type: "recusa",
      newStatus: "recusada",
    });
    if (ok) toast.success("Negociação marcada como recusada.");
  }

  async function aprovarComoAdmin() {
    const ok = await addEvent({
      author_role: "admin",
      event_type: "aprovacao",
      terms: latestTerms,
      newStatus: "aprovada",
      condicaoFinal: latestTerms,
    });
    if (ok) toast.success("Condição final aprovada!");
  }

  if (TERMINAL.includes(status)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Cliente: só age quando é a vez dele responder a uma proposta da Tomasin */}
      {!isAdmin && status === "contraproposta_enviada" && (
        <Card>
          <CardHeader>
            <CardTitle>Proposta recebida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestTerms && (
              <p className="text-sm text-muted-foreground">
                Taxa: {latestTerms.taxa ?? "—"}
                {latestTerms.volume ? ` · Volume: R$ ${Number(latestTerms.volume).toLocaleString("pt-BR")}` : ""}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={aceitar} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aceitar
              </Button>
              <Button variant="outline" onClick={() => setContraOpen(!contraOpen)} disabled={busy}>
                Fazer contraproposta
              </Button>
              <Button variant="ghost" className="text-destructive" onClick={() => recusar("cliente")} disabled={busy}>
                <X className="h-4 w-4" /> Recusar
              </Button>
            </div>

            {contraOpen && (
              <form onSubmit={submitContraCliente} className="space-y-3 border-t pt-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Taxa desejada</Label>
                    <Input
                      value={contraForm.taxa}
                      onChange={(e) => setContraForm({ ...contraForm, taxa: e.target.value })}
                      placeholder="Ex: 3,00%"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Volume (R$)</Label>
                    <Input
                      type="number"
                      value={contraForm.volume}
                      onChange={(e) => setContraForm({ ...contraForm, volume: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Prazo (meses)</Label>
                    <Input
                      type="number"
                      value={contraForm.prazo_meses}
                      onChange={(e) => setContraForm({ ...contraForm, prazo_meses: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Condição de pagamento</Label>
                    <Input
                      value={contraForm.condicao_pagamento}
                      onChange={(e) => setContraForm({ ...contraForm, condicao_pagamento: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={contraForm.message}
                    onChange={(e) => setContraForm({ ...contraForm, message: e.target.value })}
                    placeholder="Ex: Consigo fechar se a taxa chegar a 3%."
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar contraproposta
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {!isAdmin && status !== "contraproposta_enviada" && (
        <p className="text-sm text-muted-foreground">Aguardando retorno da Tomasin.</p>
      )}

      {/* Admin: registra lances (próprios ou do parceiro) e decide aprovar/recusar */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setLanceOpen(!lanceOpen)} disabled={busy}>
                + Registrar lance
              </Button>
              <Button onClick={aprovarComoAdmin} disabled={busy || !latestTerms}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprovar condição final
              </Button>
              <Button variant="ghost" className="text-destructive" onClick={() => recusar("admin")} disabled={busy}>
                <X className="h-4 w-4" /> Recusar
              </Button>
            </div>

            {lanceOpen && (
              <form onSubmit={submitLance} className="space-y-3 border-t pt-4">
                <div className="grid gap-2">
                  <Label>Quem está propondo?</Label>
                  <Select value={lanceAuthor} onValueChange={(v) => setLanceAuthor(v as NegotiationAuthorRole)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Tomasin (pra cliente decidir)</SelectItem>
                      <SelectItem value="parceiro">Parceiro (negociação interna)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Taxa/condição</Label>
                    <Input
                      value={lanceForm.taxa}
                      onChange={(e) => setLanceForm({ ...lanceForm, taxa: e.target.value })}
                      placeholder="Ex: 3,15%"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Volume (R$)</Label>
                    <Input
                      type="number"
                      value={lanceForm.volume}
                      onChange={(e) => setLanceForm({ ...lanceForm, volume: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Prazo (meses)</Label>
                    <Input
                      type="number"
                      value={lanceForm.prazo_meses}
                      onChange={(e) => setLanceForm({ ...lanceForm, prazo_meses: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Condição de pagamento</Label>
                    <Input
                      value={lanceForm.condicao_pagamento}
                      onChange={(e) => setLanceForm({ ...lanceForm, condicao_pagamento: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Observação</Label>
                  <Textarea
                    value={lanceForm.message}
                    onChange={(e) => setLanceForm({ ...lanceForm, message: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Registrar
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
