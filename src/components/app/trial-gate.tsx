"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Sparkles } from "lucide-react";

interface Props {
  blocked: boolean;
  trialDaysLeft: number | null;
}

export function TrialGate({ blocked, trialDaysLeft }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Telas sempre liberadas (para conseguir pagar / sair)
  const allowed = pathname.startsWith("/plano") || pathname.startsWith("/configuracoes");

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (blocked && !allowed) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm">
        <Card className="w-full max-w-md border-primary/30">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Seu período grátis acabou</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Para continuar usando o Tomas Finance, assine um plano. Leva menos de 1 minuto via PIX.
            </p>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link href="/plano">
                <Sparkles className="h-4 w-4" /> Ver planos e assinar
              </Link>
            </Button>
            <button onClick={logout} className="mt-4 text-xs text-muted-foreground hover:underline">
              Sair
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (trialDaysLeft !== null && trialDaysLeft >= 0 && !blocked) {
    return (
      <Link
        href="/plano"
        className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm transition-colors hover:bg-primary/10"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {trialDaysLeft === 0
            ? "Seu período grátis termina hoje."
            : `Você está no período grátis: ${trialDaysLeft} dia(s) restantes.`}
        </span>
        <span className="font-medium text-primary">Assinar agora →</span>
      </Link>
    );
  }

  return null;
}
