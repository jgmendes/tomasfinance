"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, ShieldCheck, Clock, FileText } from "lucide-react";
import type { Kyc, KycStatus, Profile } from "@/lib/database.types";

const STATUS: Record<KycStatus, { label: string; variant: any }> = {
  nao_enviado: { label: "Não enviado", variant: "secondary" },
  pendente: { label: "Em análise", variant: "warning" },
  aprovado: { label: "Aprovado", variant: "success" },
  rejeitado: { label: "Rejeitado", variant: "destructive" },
};

export function AdminKycClient() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [kycs, setKycs] = useState<Kyc[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminId, setAdminId] = useState("");

  const [selected, setSelected] = useState<Kyc | null>(null);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    setAdminId(user?.id ?? "");
    const [k, p] = await Promise.all([
      supabase.from("kyc").select("*").order("submitted_at", { ascending: false }),
      supabase.from("profiles").select("*"),
    ]);
    setKycs((k.data ?? []) as Kyc[]);
    setProfiles((p.data ?? []) as Profile[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profById = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])), [profiles]);

  // Pendentes primeiro
  const ordered = useMemo(() => {
    const rank: Record<KycStatus, number> = { pendente: 0, rejeitado: 1, aprovado: 2, nao_enviado: 3 };
    return [...kycs].sort((a, b) => rank[a.status] - rank[b.status]);
  }, [kycs]);

  const stats = {
    pendentes: kycs.filter((k) => k.status === "pendente").length,
    aprovados: kycs.filter((k) => k.status === "aprovado").length,
    total: kycs.length,
  };

  async function openReview(kyc: Kyc) {
    setSelected(kyc);
    setReason(kyc.rejection_reason ?? "");
    setDocs({});
    const paths = { front: kyc.document_front_url, back: kyc.document_back_url, selfie: kyc.selfie_url };
    const result: Record<string, string> = {};
    for (const [key, path] of Object.entries(paths)) {
      if (!path) continue;
      const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 300);
      if (data?.signedUrl) result[key] = data.signedUrl;
    }
    setDocs(result);
  }

  async function review(status: KycStatus) {
    if (!selected) return;
    if (status === "rejeitado" && !reason.trim()) return toast.error("Informe o motivo");
    setBusy(true);
    const { error } = await supabase.from("kyc").update({
      status,
      rejection_reason: status === "rejeitado" ? reason : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    }).eq("id", selected.id);
    setBusy(false);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success(status === "aprovado" ? "KYC aprovado!" : "KYC rejeitado.");
    setSelected(null);
    load();
  }

  if (loading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold">Verificações (KYC)</h1>
      <p className="mb-6 text-sm text-muted-foreground">Aprove ou rejeite as verificações de identidade</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Em análise" value={String(stats.pendentes)} icon={Clock} accent="text-amber-500" iconBg="bg-amber-500/10" />
        <StatCard title="Aprovados" value={String(stats.aprovados)} icon={ShieldCheck} accent="text-emerald-500" iconBg="bg-emerald-500/10" />
        <StatCard title="Total enviado" value={String(stats.total)} icon={FileText} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordered.map((k) => {
                const prof = profById[k.user_id];
                const st = STATUS[k.status];
                return (
                  <TableRow key={k.id}>
                    <TableCell>
                      <p className="font-medium">{k.full_name || prof?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{prof?.email}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{k.cpf || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{k.submitted_at ? formatDate(k.submitted_at) : "—"}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openReview(k)}>
                        <FileText className="h-3.5 w-3.5" /> Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {ordered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhuma verificação enviada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Revisar KYC — {selected?.full_name}</DialogTitle></DialogHeader>
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
                <Label className="mb-2 block">Documentos</Label>
                <div className="flex flex-wrap gap-3">
                  {(["front", "back", "selfie"] as const).map((key) =>
                    docs[key] ? (
                      <a key={key} href={docs[key]} target="_blank" rel="noopener noreferrer" className="rounded-lg border p-2 text-xs hover:bg-accent">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={docs[key]} alt={key} className="h-24 w-32 rounded object-cover" />
                        <span className="mt-1 block text-center capitalize">{key}</span>
                      </a>
                    ) : null
                  )}
                  {Object.keys(docs).length === 0 && <p className="text-sm text-muted-foreground">Carregando documentos…</p>}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Motivo (se rejeitar)</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: documento ilegível" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="destructive" onClick={() => review("rejeitado")} disabled={busy}>Rejeitar</Button>
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
