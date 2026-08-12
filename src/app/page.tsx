import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/app/logo";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { formatCurrency } from "@/lib/utils";
import type { Database, Plan } from "@/lib/database.types";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Check,
  CreditCard,
  FileCheck,
  Gem,
  Handshake,
  KeyRound,
  Lock,
  Percent,
  PiggyBank,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

// Dados públicos (plano ativo) — sem sessão de usuário, cacheável.
export const revalidate = 3600;

const features = [
  { icon: BarChart3, title: "Dashboard Completo", desc: "Saldo, receitas, despesas, lucro e fluxo de caixa em tempo real." },
  { icon: Bot, title: "CFO Virtual com IA", desc: "Insights diários, previsões de caixa e cálculo de runway." },
  { icon: CreditCard, title: "Cartões & Contas", desc: "Múltiplas contas, cartões, limites e parcelamentos." },
  { icon: PiggyBank, title: "Metas & Investimentos", desc: "Acompanhe metas e a rentabilidade da sua carteira." },
  { icon: TrendingUp, title: "Multi-empresas", desc: "Gerencie várias empresas, cada uma com seu próprio fluxo de caixa." },
  { icon: FileCheck, title: "Lançamentos rastreáveis", desc: "Motivo, nota fiscal e beneficiário em cada valor — histórico pronto para auditoria." },
];

const trust = [
  { icon: ShieldCheck, label: "Isolamento por usuário (RLS)" },
  { icon: FileCheck, label: "Trilha de auditoria jurídica" },
  { icon: Lock, label: "Cofre com criptografia" },
  { icon: KeyRound, label: "Autenticação em 2 fatores" },
];

const negocios = [
  { icon: Handshake, title: "Intermediação de negócios", desc: "Ajudamos você a comprar melhor e fechar negociações em condições mais vantajosas." },
  { icon: Percent, title: "Taxas de gateway", desc: "Intermediamos e negociamos as taxas de gateways de pagamento para reduzir o custo da sua empresa." },
  { icon: Building2, title: "Empresas & compradores", desc: "Ligamos empresas a compradores, e conectamos compradores a grandes empresas." },
  { icon: Users, title: "Network", desc: "Conectamos pessoas para gerar oportunidades reais de relacionamento e negócio." },
];

const faq = [
  {
    q: "Preciso de cartão de crédito para testar?",
    a: "Não. Você tem 14 dias grátis para usar o sistema por completo, sem precisar cadastrar cartão.",
  },
  {
    q: "Meus dados financeiros ficam seguros?",
    a: "Sim. Cada usuário só acessa os próprios dados (RLS no banco), há autenticação em 2 fatores opcional, cofre com criptografia para informações sensíveis e uma trilha de auditoria automática em todo lançamento.",
  },
  {
    q: "Posso usar para mais de uma empresa?",
    a: "Sim. Cadastre quantas empresas você for dono e acompanhe o fluxo de caixa, receitas e despesas de cada uma separadamente, além do seu financeiro pessoal.",
  },
  {
    q: "O que é a parte de intermediação de negócios e taxas?",
    a: "Além do sistema, também ajudamos a negociar taxas de gateways de pagamento e conectamos empresas, compradores e oportunidades de network.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem fidelidade. Você pode cancelar a assinatura quando quiser.",
  },
];

async function getActivePlan(): Promise<Plan | null> {
  try {
    const supabase = createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await supabase
      .from("plans")
      .select("*")
      .eq("active", true)
      .order("sort")
      .limit(1)
      .maybeSingle();
    return data as Plan | null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const plan = await getActivePlan();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Blobs decorativos */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative">
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
          <section className="mx-auto max-w-3xl pt-16 pb-6 text-center sm:pt-20">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Bot className="h-4 w-4 text-primary" /> Seu CFO Virtual com Inteligência Artificial
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
              Controle financeiro{" "}
              <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                inteligente
              </span>{" "}
              para você e suas empresas.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Receitas, despesas, contas, cartões, metas, investimentos e patrimônio — tudo em um só lugar, com insights automáticos de IA.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/cadastro">
                  Começar grátis <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              14 dias grátis · sem necessidade de cartão de crédito
            </p>
          </section>

          {/* Mockup visual do produto */}
          <section className="mx-auto max-w-4xl py-12 sm:py-16">
            <div className="rounded-2xl border bg-card p-2 shadow-2xl shadow-primary/10 sm:p-3">
              <div className="flex items-center gap-1.5 border-b px-3 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LogoMark className="h-3.5 w-3.5" /> app.tomazfinancas.com/dashboard
                </span>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-4">
                <div className="rounded-xl border bg-background p-4 sm:col-span-1">
                  <Wallet className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">Saldo total</p>
                  <p className="text-lg font-bold">R$ 84.320</p>
                </div>
                <div className="rounded-xl border bg-background p-4 sm:col-span-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <p className="mt-2 text-xs text-muted-foreground">Receitas do mês</p>
                  <p className="text-lg font-bold text-emerald-500">R$ 32.150</p>
                </div>
                <div className="rounded-xl border bg-background p-4 sm:col-span-1">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <p className="mt-2 text-xs text-muted-foreground">Despesas do mês</p>
                  <p className="text-lg font-bold text-red-500">R$ 18.940</p>
                </div>
                <div className="rounded-xl border bg-background p-4 sm:col-span-1">
                  <Gem className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">Patrimônio</p>
                  <p className="text-lg font-bold">R$ 212.780</p>
                </div>
                <div className="flex items-end gap-2 rounded-xl border bg-background p-4 sm:col-span-4">
                  {[38, 52, 44, 61, 49, 70, 58, 76, 64, 82, 71, 90].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/40 to-primary" style={{ height: `${h}px` }} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Faixa de confiança */}
          <section className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-y py-6 text-sm text-muted-foreground">
            {trust.map((t) => (
              <span key={t.label} className="flex items-center gap-2">
                <t.icon className="h-4 w-4 text-primary" /> {t.label}
              </span>
            ))}
          </section>

          <section className="pt-16 pb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Tudo que você precisa, em um só lugar</h2>
            <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
              Da conta pessoal ao caixa de várias empresas, com dados sempre isolados e rastreáveis.
            </p>
          </section>

          <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border bg-card p-6 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </section>

          {/* Negócios & Network */}
          <section className="pb-8 text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Handshake className="h-4 w-4 text-primary" /> Mais que um sistema
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Também cuidamos dos seus negócios</h2>
            <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
              Ajudamos nossos clientes a comprar melhor e conseguir as melhores taxas — e a fazer as conexões certas.
            </p>
          </section>

          <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
            {negocios.map((n) => (
              <div key={n.title} className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10">
                  <n.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{n.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{n.desc}</p>
              </div>
            ))}
          </section>

          {/* Preço */}
          {plan && (
            <section className="pb-20">
              <div className="mx-auto max-w-lg text-center">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Um plano simples, sem pegadinha</h2>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                  Comece grátis por 14 dias. Depois, um único plano com tudo incluso.
                </p>
              </div>

              <div className="mx-auto mt-8 max-w-md rounded-2xl border border-primary bg-card p-8 shadow-lg shadow-primary/10">
                <p className="font-semibold text-primary">{plan.name}</p>
                <div className="mt-2">
                  <span className="text-4xl font-extrabold">{formatCurrency(plan.price_cents / 100)}</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                {plan.price_annual_cents > 0 && (
                  <p className="mt-1 text-sm text-emerald-500">
                    ou {formatCurrency(plan.price_annual_cents / 100)}/ano — equivale a{" "}
                    {formatCurrency(plan.price_annual_cents / 12 / 100)}/mês
                  </p>
                )}
                {plan.features && plan.features.length > 0 && (
                  <ul className="mt-6 grid gap-2 text-left text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
                <Button size="lg" className="mt-6 w-full" asChild>
                  <Link href="/cadastro">
                    Começar grátis <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  14 dias grátis · cancele quando quiser
                </p>
              </div>
            </section>
          )}

          {/* FAQ */}
          <section className="mx-auto max-w-2xl pb-20">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Perguntas frequentes</h2>
            <div className="mt-8 space-y-3">
              {faq.map((item) => (
                <details key={item.q} className="group rounded-xl border bg-card p-5 open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                    {item.q}
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA final */}
          <section className="mb-20 rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-10 text-center sm:p-14">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Pronto para organizar suas finanças?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Crie sua conta em menos de um minuto e comece com 14 dias grátis.
            </p>
            <Button size="lg" className="mt-6" asChild>
              <Link href="/cadastro">
                Começar agora <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </section>
        </main>

        <footer className="border-t py-8">
          <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <span>© {new Date().getFullYear()} Tomaz Finanças. Feito com Next.js + Supabase.</span>
            <div className="flex items-center gap-4">
              <Link href="/login" className="hover:text-foreground">Entrar</Link>
              <Link href="/cadastro" className="hover:text-foreground">Criar conta</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
