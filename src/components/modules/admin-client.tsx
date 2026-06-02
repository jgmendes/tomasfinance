"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Users, ShieldCheck, Clock, Search, FileText } from "lucide-react";
import type { KycStatus, Profile, Kyc } from "@/lib/database.types";

const STATUS: Record<KycStatus, { label: string; variant: any }> = {
  nao_enviado: { label: "Não enviado", variant: "secondary" },
  pendente: { label: "Em análise", variant: "warning" },
  aprovado: { label: "Aprovado", variant: "success" },
  rejeitado: { label: "Rejeitado", variant: "destructive" },
};

export function AdminClient() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [kycs, setKycs] = useState<Kyc[]>([]);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Kyc | null>(null);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminId, setAdminId] = useState("");

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setAdminId(user?.id ?? "");
    const [p, k] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("kyc").select("*"),
    ]);
    setProfiles((p.data ?? []) as Profile[]);
    setKycs((k.data ?? []) as Kyc[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kycByUser = useMemo(
    () => Object.fromEntries(kycs.map((k) => [k.user_id, k])),
    [kycs]
  );

  const stats = useMemo(() => {
    return {
      total: profiles.length,
      pendentes: kycs.filter((k) => k.status === "pendente").length,
      aprovados: kycs.filter((k) => k.status === "aprovado").length,
      admins: profiles.filter((p) => p.role === "admin").length,
    };
  }, [profiles, kycs]);

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (p.full_name ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q)
    );
  });

  async function openReview(kyc: Kyc) {
    setSelected(kyc);
    setReason(kyc.rejection_reason ?? "");
    setDocs({});
    // gera URLs assinadas (bucket privado)
    const paths = {
      front: kyc.document_front_url,
      back: kyc.document_back_url,
      selfie: kyc.selfie_url,
    };
    const result: Record<string, string> = {};
    for (const [key, path] of Object.entries(paths)) {
      if (!path) continue;
      const { data } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(path, 300);
      if (data?.signedUrl) result[key] = data.signedUrl;
    }
    setDocs(result);
  }

  async function review(status: KycStatus) {
    if (!selected) return;
    if (status === "rejeitado" && !reason.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("kyc")
      .update({
        status,
        rejection_reason: status === "rejeitado" ? reason : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
      })
      .eq("id", selected.id);
    setBusy(false);
    if (error) {
      toast.error("Erro ao revisar", { description: error.message });
      return;
    }
    toast.success(status === "aprovado" ? "KYC aprovado!" : "KYC rejeitado.");
    setSelected(null);
    load();
  }

  async function toggleAdmin(p: Profile) {
    const newRole = p.role === "admin" ? "user" : "admin";
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", p.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success(`Usuário agora é ${newRole}.`);
    load();
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Painel Admin" description="Gerencie usuários e verificações (KYC)" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Usuários" value={String(stats.total)} icon={Users} />
        <StatCard title="KYC em análise" value={String(stats.pendentes)} icon={Clock} accent="text-amber-500" iconBg="bg-amber-500/10" />
        <StatCard title="KYC aprovados" value={String(stats.aprovados)} icon={ShieldCheck} accent="text-emerald-500" iconBg="bg-emerald-500/10" />
        <StatCard title="Administradores" value={String(stats.admins)} icon={ShieldCheck} accent="text-primary" />
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const kyc = kycByUser[p.id];
                const st = STATUS[kyc?.status ?? "nao_enviado"];
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                          <AvatarFallback>{(p.full_name ?? p.email ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.full_name ?? "—"}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.role === "admin" ? "default" : "outline"}>{p.role}</Badge>
                    </TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {kyc && (
                          <Button size="sm" variant="outline" onClick={() => openReview(kyc)}>
                            <FileText className="h-3.5 w-3.5" /> Revisar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => toggleAdmin(p)}>
                          {p.role === "admin" ? "Remover admin" : "Tornar admin"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de revisão de KYC */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar KYC — {selected?.full_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="CPF" value={selected.cpf} />
                <Info label="Nascimento" value={selected.birth_date ? formatDate(selected.birth_date) : "—"} />
                <Info label="Telefone" value={selected.phone} />
                <Info label="Profissão" value={selected.occupation} />
                <Info label="Renda mensal" value={selected.monthly_income ? formatCurrency(Number(selected.monthly_income)) : "—"} />
                <Info label="Documento" value={`${selected.document_type ?? "—"} ${selected.document_number ?? ""}`} />
                <Info label="Endereço" value={[selected.street, selected.number, selected.neighborhood, selected.city, selected.state].filter(Boolean).join(", ")} span2 />
              </div>

              <div>
                <Label className="mb-2 block">Documentos enviados</Label>
                <div className="flex flex-wrap gap-3">
                  {(["front", "back", "selfie"] as const).map((k) =>
                    docs[k] ? (
                      <a key={k} href={docs[k]} target="_blank" rel="noopener noreferrer"
                        className="rounded-lg border p-2 text-xs hover:bg-accent">
                        <img src={docs[k]} alt={k} className="h-24 w-32 rounded object-cover" />
                        <span className="mt-1 block text-center capitalize">{k}</span>
                      </a>
                    ) : null
                  )}
                  {Object.keys(docs).length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum documento ou ainda carregando…</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Motivo (se rejeitar)</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: documento ilegível" />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="destructive" onClick={() => review("rejeitado")} disabled={busy}>
                  Rejeitar
                </Button>
                <Button onClick={() => review("aprovado")} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Aprovar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, span2 }: { label: string; value: string | null; span2?: boolean }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
