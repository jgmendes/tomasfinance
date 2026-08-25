"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldCheck, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { Kyc, KycStatus } from "@/lib/database.types";

const DOC_TYPES = [
  { value: "RG", label: "RG" },
  { value: "CNH", label: "CNH" },
  { value: "Passaporte", label: "Passaporte" },
];

const STATUS_INFO: Record<KycStatus, { label: string; variant: any; icon: any }> = {
  nao_enviado: { label: "Não enviado", variant: "secondary", icon: Clock },
  pendente: { label: "Em análise", variant: "warning", icon: Clock },
  aprovado: { label: "Aprovado", variant: "success", icon: CheckCircle2 },
  rejeitado: { label: "Rejeitado", variant: "destructive", icon: XCircle },
};

const empty = {
  full_name: "", cpf: "", birth_date: "", phone: "",
  cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  occupation: "", monthly_income: "",
  document_type: "RG", document_number: "",
};

export default function KycPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<KycStatus>("nao_enviado");
  const [rejection, setRejection] = useState<string | null>(null);
  const [existing, setExisting] = useState<Kyc | null>(null);
  const [form, setForm] = useState(empty);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("kyc").select("*").eq("user_id", user.id).maybeSingle();
      const kyc = data as Kyc | null;
      if (kyc) {
        setExisting(kyc);
        setStatus(kyc.status);
        setRejection(kyc.rejection_reason);
        setForm({
          full_name: kyc.full_name ?? "", cpf: kyc.cpf ?? "", birth_date: kyc.birth_date ?? "", phone: kyc.phone ?? "",
          cep: kyc.cep ?? "", street: kyc.street ?? "", number: kyc.number ?? "", complement: kyc.complement ?? "",
          neighborhood: kyc.neighborhood ?? "", city: kyc.city ?? "", state: kyc.state ?? "",
          occupation: kyc.occupation ?? "", monthly_income: kyc.monthly_income ? String(kyc.monthly_income) : "",
          document_type: kyc.document_type ?? "RG", document_number: kyc.document_number ?? "",
        });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadDoc(file: File, slot: string): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `${userId}/${slot}.${ext}`;
    const { error } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error(`Erro ao enviar ${slot}`, { description: error.message });
      return null;
    }
    return path;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.cpf) {
      toast.error("Preencha ao menos nome completo e CPF");
      return;
    }
    setSaving(true);

    const front = frontRef.current?.files?.[0];
    const back = backRef.current?.files?.[0];
    const selfie = selfieRef.current?.files?.[0];

    const document_front_url = front ? await uploadDoc(front, "document_front") : existing?.document_front_url ?? null;
    const document_back_url = back ? await uploadDoc(back, "document_back") : existing?.document_back_url ?? null;
    const selfie_url = selfie ? await uploadDoc(selfie, "selfie") : existing?.selfie_url ?? null;

    const payload = {
      user_id: userId,
      ...form,
      monthly_income: form.monthly_income ? Number(form.monthly_income) : null,
      birth_date: form.birth_date || null,
      document_front_url,
      document_back_url,
      selfie_url,
      status: "pendente" as KycStatus,
      rejection_reason: null,
      submitted_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("kyc").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao enviar KYC", { description: error.message });
      return;
    }
    toast.success("Documentos enviados! Sua verificação está em análise.");
    setStatus("pendente");
    setRejection(null);
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const info = STATUS_INFO[status];
  const locked = status === "aprovado" || status === "pendente";

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Verificação de Identidade (KYC)"
        description="Confirme seus dados e envie seus documentos para verificar a conta."
      >
        <Badge variant={info.variant} className="gap-1">
          <info.icon className="h-3.5 w-3.5" /> {info.label}
        </Badge>
      </PageHeader>

      {status === "aprovado" && (
        <Card className="mb-6 border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 p-5">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="font-medium">Identidade verificada ✓</p>
              <p className="text-sm text-muted-foreground">Sua conta está totalmente verificada.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "pendente" && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-5">
            <Clock className="h-6 w-6 text-amber-500" />
            <div>
              <p className="font-medium">Verificação em análise</p>
              <p className="text-sm text-muted-foreground">Avisaremos quando for concluída.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "rejeitado" && rejection && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-5">
            <XCircle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-medium">Verificação rejeitada</p>
              <p className="text-sm text-muted-foreground">Motivo: {rejection}. Corrija e reenvie.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" span2>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} disabled={locked} required />
            </Field>
            <Field label="CPF">
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" disabled={locked} required />
            </Field>
            <Field label="Data de nascimento">
              <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} disabled={locked} />
            </Field>
            <Field label="Telefone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" disabled={locked} />
            </Field>
            <Field label="Profissão">
              <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} disabled={locked} />
            </Field>
            <Field label="Renda mensal">
              <CurrencyInput value={form.monthly_income} onValueChange={(v) => setForm({ ...form, monthly_income: v })} disabled={locked} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="CEP"><Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} disabled={locked} /></Field>
            <Field label="Rua"><Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} disabled={locked} /></Field>
            <Field label="Número"><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} disabled={locked} /></Field>
            <Field label="Complemento"><Input value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} disabled={locked} /></Field>
            <Field label="Bairro"><Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} disabled={locked} /></Field>
            <Field label="Cidade"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} disabled={locked} /></Field>
            <Field label="Estado (UF)"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} disabled={locked} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Documento</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de documento">
              <Select value={form.document_type} onValueChange={(v) => !locked && setForm({ ...form, document_type: v })}>
                <SelectTrigger disabled={locked}><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Número do documento">
              <Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} disabled={locked} />
            </Field>
            <FileField label="Frente do documento" inputRef={frontRef} done={!!existing?.document_front_url} disabled={locked} />
            <FileField label="Verso do documento" inputRef={backRef} done={!!existing?.document_back_url} disabled={locked} />
            <FileField label="Selfie segurando o documento" inputRef={selfieRef} done={!!existing?.selfie_url} disabled={locked} />
          </CardContent>
        </Card>

        {!locked && (
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {status === "rejeitado" ? "Reenviar verificação" : "Enviar verificação"}
          </Button>
        )}
      </form>
    </div>
  );
}

function Field({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid gap-2 ${span2 ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FileField({
  label, inputRef, done, disabled,
}: {
  label: string;
  inputRef: React.RefObject<HTMLInputElement>;
  done: boolean;
  disabled: boolean;
}) {
  const [name, setName] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={(e) => setName(e.target.files?.[0]?.name ?? null)} disabled={disabled} />
      <Button type="button" variant="outline" disabled={disabled}
        onClick={() => inputRef.current?.click()} className="justify-start font-normal">
        {done || name ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Upload className="h-4 w-4" />}
        {name ?? (done ? "Documento enviado" : "Selecionar arquivo")}
      </Button>
    </div>
  );
}
