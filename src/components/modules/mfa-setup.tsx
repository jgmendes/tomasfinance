"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/app/confirm-provider";
import { Loader2, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";

interface EnrollData {
  factorId: string;
  qr: string;
  secret: string;
}

export function MfaSetup() {
  const supabase = createClient();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);

  const [enroll, setEnroll] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === "verified");
    setActive(!!verified);
    setActiveFactorId(verified?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setBusy(true);
    // Remove fatores não verificados pendentes
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) {
      if (f.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `App ${Date.now()}`,
    });
    setBusy(false);
    if (error || !data) {
      toast.error("Erro ao iniciar 2FA", { description: error?.message });
      return;
    }
    setEnroll({
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    if (code.length < 6) {
      toast.error("Digite o código de 6 dígitos");
      return;
    }
    setBusy(true);
    const { data: challenge, error: challengeErr } =
      await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
    if (challengeErr || !challenge) {
      setBusy(false);
      return toast.error("Erro", { description: challengeErr?.message });
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enroll.factorId,
      challengeId: challenge.id,
      code,
    });
    setBusy(false);
    if (error) {
      return toast.error("Código inválido", { description: error.message });
    }
    toast.success("2FA ativado com sucesso! 🔒");
    setEnroll(null);
    setCode("");
    refresh();
  }

  async function disable() {
    if (!activeFactorId) return;
    const ok = await confirm({
      title: "Desativar 2FA",
      description: "Sua conta ficará protegida apenas por senha. Continuar?",
      confirmText: "Desativar",
    });
    if (!ok) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: activeFactorId });
    if (error) return toast.error("Erro", { description: error.message });
    toast.success("2FA desativado.");
    refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando...
      </div>
    );
  }

  if (active) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-emerald-500/5 p-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="font-medium">Autenticação de 2 fatores ativa</p>
            <p className="text-xs text-muted-foreground">
              Sua conta exige um código do app autenticador ao entrar.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={disable}>
          <ShieldOff className="h-4 w-4" /> Desativar
        </Button>
      </div>
    );
  }

  if (enroll) {
    return (
      <form onSubmit={confirmEnroll} className="space-y-4 rounded-lg border p-4">
        <div className="flex items-start gap-2 text-sm">
          <Smartphone className="mt-0.5 h-4 w-4 text-primary" />
          <p>
            Abra seu app autenticador (Google Authenticator, Authy, 1Password...)
            e escaneie o QR Code. Depois digite o código gerado.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div
            className="rounded-lg bg-white p-2"
            // O Supabase retorna o QR como SVG
            dangerouslySetInnerHTML={{ __html: enroll.qr }}
          />
          <div className="text-xs text-muted-foreground">
            <p className="mb-1">Ou digite o código manualmente:</p>
            <code className="break-all rounded bg-muted px-2 py-1">{enroll.secret}</code>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Código de 6 dígitos</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            className="max-w-[160px] tracking-[0.3em]"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar e ativar
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEnroll(null)}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Badge variant="warning">Inativo</Badge>
        <div>
          <p className="font-medium">Autenticação de 2 fatores</p>
          <p className="text-xs text-muted-foreground">
            Adicione uma camada extra de segurança com um app autenticador.
          </p>
        </div>
      </div>
      <Button onClick={startEnroll} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Ativar 2FA
      </Button>
    </div>
  );
}
