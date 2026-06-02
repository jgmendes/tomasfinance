import Link from "next/link";
import { LogoMark } from "@/components/app/logo";

// Evita pré-renderização estática: o cliente Supabase precisa das env vars.
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Lado visual */}
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <div className="rounded-xl bg-white/15 p-1">
            <LogoMark className="h-8 w-8" />
          </div>
          Tomaz Finanças
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Seu dinheiro, suas empresas e seus investimentos sob controle.
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Tenha um CFO virtual que acompanha cada movimentação e entrega
            insights todos os dias.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} Tomaz Finanças
        </p>
      </div>

      {/* Lado do formulário */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
