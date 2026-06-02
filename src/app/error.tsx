"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro na aplicação:", error);
  }, [error]);

  const isConfig = /supabase|api key|required/i.test(error.message);

  return (
    <div className="grid min-h-[60vh] place-items-center p-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isConfig
            ? "Parece um problema de configuração do Supabase (variáveis de ambiente). Verifique se NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão definidas e refaça o deploy."
            : "Ocorreu um erro inesperado. Tente novamente."}
        </p>
        {error.message && (
          <pre className="mt-4 overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        <Button className="mt-6" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
