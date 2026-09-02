"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
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
import { EmptyState } from "@/components/app/empty-state";
import { negotiationSchema, firstError } from "@/lib/intermediacao/schemas";
import { Loader2, ShieldAlert } from "lucide-react";
import type { NegotiationTerms } from "@/lib/database.types";

interface ClienteOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function NovaNegociacaoPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientUserId, setClientUserId] = useState("");
  const [clientCompanyName, setClientCompanyName] = useState("");
  const [necessidade, setNecessidade] = useState("");
  const [taxaAtual, setTaxaAtual] = useState("");
  const [volumeAtual, setVolumeAtual] = useState("");
  const [custoAtual, setCustoAtual] = useState("");
  const [taxaInicial, setTaxaInicial] = useState("");
  const [custoInicial, setCustoInicial] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id ?? "")
        .single();
      const admin = (profile as { role: string | null } | null)?.role === "admin";
      setIsAdmin(admin);
      if (!admin) {
        setLoadingClientes(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .neq("role", "admin")
        .order("full_name");
      setClientes((data ?? []) as ClienteOption[]);
      setLoadingClientes(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const validationError = firstError(negotiationSchema, {
      client_user_id: clientUserId,
      client_company_name: clientCompanyName,
      necessidade,
      taxa_atual: taxaAtual,
      volume_atual: volumeAtual,
      custo_estimado_atual: custoAtual,
      taxa_inicial: taxaInicial,
      custo_estimado_inicial: custoInicial,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada");
      setSaving(false);
      return;
    }

    const condicaoAtual: NegotiationTerms = {};
    if (taxaAtual.trim()) condicaoAtual.taxa = taxaAtual.trim();
    if (volumeAtual.trim()) condicaoAtual.volume = Number(volumeAtual);
    if (custoAtual.trim()) condicaoAtual.custo_estimado = custoAtual.trim();

    const { data: negotiation, error } = await supabase
      .from("negotiations")
      .insert({
        user_id: clientUserId,
        client_company_name: clientCompanyName.trim(),
        necessidade: necessidade.trim(),
        condicao_atual: Object.keys(condicaoAtual).length > 0 ? condicaoAtual : null,
        status: "negociacao",
      })
      .select()
      .single();

    if (error || !negotiation) {
      setSaving(false);
      toast.error("Erro ao criar negociação", { description: error?.message });
      return;
    }

    const propostaInicial: NegotiationTerms = { taxa: taxaInicial.trim() };
    if (custoInicial.trim()) propostaInicial.custo_estimado = custoInicial.trim();

    const { error: eventError } = await supabase.from("negotiation_events").insert({
      negotiation_id: negotiation.id,
      author_role: "parceiro",
      event_type: "proposta_inicial",
      terms: propostaInicial,
      message: observacao.trim() || null,
      created_by: user.id,
    });

    setSaving(false);
    if (eventError) {
      toast.error("Negociação criada, mas a proposta inicial falhou", {
        description: eventError.message,
      });
    } else {
      toast.success("Negociação criada!");
    }
    router.push(`/intermediacao/negociacoes/${negotiation.id}`);
  }

  if (isAdmin === null) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Acesso restrito"
        description="Só administradores podem cadastrar novas negociações."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nova negociação" description="Cadastre a condição atual e a proposta inicial do parceiro" />

      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="font-semibold">Cliente</h3>
            <div className="grid gap-2">
              <Label>Cliente (usuário já cadastrado)</Label>
              <Select value={clientUserId} onValueChange={setClientUserId} disabled={loadingClientes}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingClientes ? "Carregando..." : "Selecione o cliente"} />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name || c.email || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Nome da empresa do cliente</Label>
              <Input
                value={clientCompanyName}
                onChange={(e) => setClientCompanyName(e.target.value)}
                placeholder="Ex: ABC LTDA"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Necessidade</Label>
              <Input
                value={necessidade}
                onChange={(e) => setNecessidade(e.target.value)}
                placeholder="Ex: Redução de taxa"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="font-semibold">Condição atual</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Taxa atual</Label>
                <Input value={taxaAtual} onChange={(e) => setTaxaAtual(e.target.value)} placeholder="Ex: 4,99%" />
              </div>
              <div className="grid gap-2">
                <Label>Volume mensal (R$)</Label>
                <Input
                  type="number"
                  value={volumeAtual}
                  onChange={(e) => setVolumeAtual(e.target.value)}
                  placeholder="500000"
                />
              </div>
              <div className="grid gap-2">
                <Label>Custo estimado</Label>
                <Input
                  value={custoAtual}
                  onChange={(e) => setCustoAtual(e.target.value)}
                  placeholder="Ex: R$ 24.950"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="font-semibold">Proposta inicial do parceiro</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Taxa/condição proposta</Label>
                <Input
                  value={taxaInicial}
                  onChange={(e) => setTaxaInicial(e.target.value)}
                  placeholder="Ex: 3,49%"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Custo estimado</Label>
                <Input
                  value={custoInicial}
                  onChange={(e) => setCustoInicial(e.target.value)}
                  placeholder="Ex: R$ 17.450"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Observação</Label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar negociação
        </Button>
      </form>
    </div>
  );
}
