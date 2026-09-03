"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

function Verificar2faForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const next =
    searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/intermediacao/negociacoes";

  useEffect(() => {
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      // Já está em aal2 (verificado) → vai direto pro destino
      if (aal?.currentLevel === "aal2") {
        router.replace(next);
        return;
      }
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = data?.totp?.find((f) => f.status === "verified");
      if (!totp) {
        // Não tem 2FA — não deveria estar aqui
        router.replace(next);
        return;
      }
      setFactorId(totp.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || code.length < 6) return;
    setBusy(true);
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
    if (cErr || !challenge) {
      setBusy(false);
      return toast.error("Erro", { description: cErr?.message });
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setBusy(false);
    if (error) {
      return toast.error("Código inválido", { description: error.message });
    }
    toast.success("Verificado!");
    router.replace(next);
    router.refresh();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/crm/login");
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-background to-primary/5 p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <div className="mb-4 grid place-items-center gap-3 text-center">
            <div className="rounded-xl bg-primary/10 p-2">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Verificação em 2 fatores</h1>
              <p className="text-sm text-muted-foreground">
                Digite o código do seu app autenticador
              </p>
            </div>
          </div>
          <form onSubmit={verify} className="space-y-4">
            <div className="grid gap-2">
              <Label>Código de 6 dígitos</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoFocus
                className="text-center text-lg tracking-[0.4em]"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Verificar
            </Button>
          </form>
          <button onClick={logout} className="mt-4 w-full text-center text-xs text-muted-foreground hover:underline">
            Sair
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Verificar2faPage() {
  return (
    <Suspense fallback={null}>
      <Verificar2faForm />
    </Suspense>
  );
}
