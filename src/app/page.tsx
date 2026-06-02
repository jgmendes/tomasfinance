import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/logo";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CreditCard,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const features = [
  { icon: BarChart3, title: "Dashboard Completo", desc: "Saldo, receitas, despesas, lucro e fluxo de caixa em tempo real." },
  { icon: Bot, title: "CFO Virtual com IA", desc: "Insights diários, previsões de caixa e cálculo de runway." },
  { icon: CreditCard, title: "Cartões & Contas", desc: "Múltiplas contas, cartões, limites e parcelamentos." },
  { icon: PiggyBank, title: "Metas & Investimentos", desc: "Acompanhe metas e a rentabilidade da sua carteira." },
  { icon: TrendingUp, title: "Multi-empresas", desc: "Gerencie várias empresas, cada uma com seu próprio fluxo de caixa." },
  { icon: ShieldCheck, title: "Seguro por padrão", desc: "RLS no Supabase: seus dados isolados e protegidos." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <header className="container flex items-center justify-between py-6">
        <Logo className="text-lg" />
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/cadastro">Criar conta</Link>
          </Button>
        </div>
      </header>

      <main className="container">
        <section className="mx-auto max-w-3xl py-20 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Bot className="h-4 w-4 text-primary" /> Seu CFO Virtual com Inteligência Artificial
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Controle financeiro <span className="text-primary">inteligente</span> para você e suas empresas.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Receitas, despesas, contas, cartões, metas, investimentos e relatórios — tudo em um só lugar, com insights automáticos de IA.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/cadastro">
                Começar grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Já tenho conta</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm">
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Tomaz Finanças. Feito com Next.js + Supabase.
      </footer>
    </div>
  );
}
