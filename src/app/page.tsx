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

const NAV = [
  { href: "#produto", label: "Produto" },
  { href: "#negocios", label: "Negócios" },
  { href: "#preco", label: "Preço" },
  { href: "#faq", label: "FAQ" },
];

const features = [
  { icon: BarChart3, title: "Dashboard completo", desc: "Saldo, receitas, despesas, lucro e fluxo de caixa em tempo real, num só painel." },
  { icon: Bot, title: "CFO Virtual com IA", desc: "Insights diários, previsões de caixa e cálculo de runway — pergunte em português." },
  { icon: CreditCard, title: "Cartões & contas", desc: "Múltiplas contas, cartões, limites de crédito e parcelamentos sob controle." },
  { icon: PiggyBank, title: "Metas & investimentos", desc: "Acompanhe metas financeiras e a rentabilidade real da sua carteira." },
  { icon: TrendingUp, title: "Multi-empresas", desc: "Cadastre as empresas das quais você é dono, cada uma com seu próprio caixa." },
  { icon: FileCheck, title: "Lançamentos rastreáveis", desc: "Motivo, nota fiscal e beneficiário em cada valor — histórico pronto pra auditoria." },
];

const trust = [
  { icon: ShieldCheck, label: "Isolamento por usuário (RLS)" },
  { icon: FileCheck, label: "Trilha de auditoria jurídica" },
  { icon: Lock, label: "Cofre com criptografia" },
  { icon: KeyRound, label: "Autenticação em 2 fatores" },
];

const negocios = [
  { icon: Handshake, title: "Intermediação de negócios", desc: "Ajudamos você a comprar melhor e fechar negociações em condições mais vantajosas." },
  { icon: Percent, title: "Taxas de gateway", desc: "Intermediamos e negociamos as taxas de gateways de pagamento pra reduzir o custo da sua empresa." },
  { icon: Building2, title: "Empresas & compradores", desc: "Ligamos empresas a compradores, e conectamos compradores a grandes empresas." },
  { icon: Users, title: "Network", desc: "Conectamos pessoas pra gerar oportunidades reais de relacionamento e negócio." },
];

const faq = [
  {
    q: "Preciso de cartão de crédito para testar?",
    a: "Não. Você tem 14 dias grátis pra usar o sistema por completo, sem precisar cadastrar cartão.",
  },
  {
    q: "Meus dados financeiros ficam seguros?",
    a: "Sim. Cada usuário só acessa os próprios dados (RLS no banco), há autenticação em 2 fatores opcional, cofre com criptografia pra informações sensíveis e uma trilha de auditoria automática em todo lançamento.",
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

function SectionEyebrow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 text-primary" /> {children}
    </div>
  );
}

export default async function Home() {
  const plan = await getActivePlan();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Logo className="text-lg" />
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="transition-colors hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/cadastro">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="produto" className="bg-grid-fade scroll-mt-16">
        <div className="container grid gap-14 py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-28">
          <div>
            <SectionEyebrow icon={Bot}>Seu CFO Virtual com Inteligência Artificial</SectionEyebrow>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Controle financeiro{" "}
              <span className="relative inline-block text-primary">
                inteligente
                <svg
                  viewBox="0 0 200 12"
                  className="absolute -bottom-2 left-0 h-3 w-full text-primary/50"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M2 9 C 50 2, 150 2, 198 9" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                </svg>
              </span>{" "}
              pra você e suas empresas.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Receitas, despesas, contas, cartões, metas, investimentos e patrimônio — tudo em um só lugar, com insights automáticos de IA.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/cadastro">
                  Começar grátis <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> 14 dias grátis</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Sem cartão de crédito</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Cancele quando quiser</span>
            </div>
          </div>

          {/* Mockup visual do produto */}
          <div className="relative">
            <div className="rounded-2xl border border-primary/20 bg-secondary p-2 shadow-2xl shadow-primary/20 sm:p-3">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LogoMark className="h-3.5 w-3.5" /> app.tomasfinance.com/dashboard
                </span>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <Wallet className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">Saldo total</p>
                  <p className="text-lg font-bold">R$ 84.320</p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <p className="mt-2 text-xs text-muted-foreground">Receitas do mês</p>
                  <p className="text-lg font-bold text-emerald-500">R$ 32.150</p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <p className="mt-2 text-xs text-muted-foreground">Despesas do mês</p>
                  <p className="text-lg font-bold text-red-500">R$ 18.940</p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <Gem className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">Patrimônio</p>
                  <p className="text-lg font-bold">R$ 212.780</p>
                </div>
                <div className="flex items-end gap-1.5 rounded-xl border bg-card p-4 shadow-sm sm:col-span-2">
                  {[38, 52, 44, 61, 49, 70, 58, 76, 64, 82, 71, 90].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/50 to-primary" style={{ height: `${h}px` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Chip flutuante */}
            <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-xl border border-primary/20 bg-card px-4 py-3 shadow-xl sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10">
                <FileCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-xs">
                <p className="font-semibold">Lançamento auditado</p>
                <p className="text-muted-foreground">Motivo · NF · beneficiário</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Faixa de confiança */}
      <section className="border-y">
        <div className="container flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-6 text-sm text-muted-foreground">
          {trust.map((t) => (
            <span key={t.label} className="flex items-center gap-2">
              <t.icon className="h-4 w-4 text-primary" /> {t.label}
            </span>
          ))}
        </div>
      </section>

      {/* Features — lista numerada */}
      <section className="container py-20">
        <div className="max-w-lg">
          <SectionEyebrow icon={BarChart3}>O produto</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Tudo que você precisa, em um só lugar
          </h2>
          <p className="mt-3 text-muted-foreground">
            Da conta pessoal ao caixa de várias empresas, com dados sempre isolados e rastreáveis.
          </p>
        </div>

        <div className="mt-12 divide-y divide-border border-y">
          {features.map((f, i) => (
            <div key={f.title} className="grid gap-4 py-8 sm:grid-cols-[3rem_1fr] sm:items-start sm:gap-8">
              <span className="font-display text-3xl font-bold text-muted-foreground/25">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Negócios & Network — faixa com fundo diferenciado */}
      <section id="negocios" className="scroll-mt-16 border-y bg-card/40">
        <div className="container py-20">
          <div className="max-w-lg">
            <SectionEyebrow icon={Handshake}>Mais que um sistema</SectionEyebrow>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Também cuidamos dos seus negócios
            </h2>
            <p className="mt-3 text-muted-foreground">
              Ajudamos nossos clientes a comprar melhor e conseguir as melhores taxas — e a fazer as conexões certas.
            </p>
          </div>

          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {negocios.map((n) => (
              <div key={n.title}>
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10">
                  <n.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{n.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{n.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preço */}
      {plan && (
        <section id="preco" className="scroll-mt-16 container py-20">
          <div className="grid gap-10 rounded-2xl border bg-card p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionEyebrow icon={Gem}>Preço</SectionEyebrow>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Um plano simples, sem pegadinha
              </h2>
              <p className="mt-3 max-w-sm text-muted-foreground">
                Comece grátis por 14 dias. Depois, um único plano com tudo incluso — sem letra miúda.
              </p>
              {plan.features && plan.features.length > 0 && (
                <ul className="mt-6 grid gap-2.5 text-sm sm:grid-cols-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border bg-background p-8 text-center">
              <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
              <div className="mt-2">
                <span className="font-display text-5xl font-bold">{formatCurrency(plan.price_cents / 100)}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              {plan.price_annual_cents > 0 && (
                <p className="mt-2 text-sm text-emerald-500">
                  ou {formatCurrency(plan.price_annual_cents / 100)}/ano — equivale a{" "}
                  {formatCurrency(plan.price_annual_cents / 12 / 100)}/mês
                </p>
              )}
              <Button size="lg" className="mt-6 w-full" asChild>
                <Link href="/cadastro">
                  Começar grátis <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">14 dias grátis · cancele quando quiser</p>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 border-t">
        <div className="container max-w-2xl py-20">
          <div className="text-center">
            <SectionEyebrow icon={FileCheck}>Dúvidas</SectionEyebrow>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
          </div>
          <div className="mt-10 space-y-3">
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
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-primary">
        <div className="container flex flex-col items-center gap-6 py-20 text-center text-primary-foreground">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Pronto para organizar suas finanças?
          </h2>
          <p className="max-w-md text-primary-foreground/80">
            Crie sua conta em menos de um minuto e comece com 14 dias grátis.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/cadastro">
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="container flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Logo className="text-sm" />
          <span className="text-center">
            © {new Date().getFullYear()} Tomas Finance · CNPJ 682487171000190
          </span>
        </div>
      </footer>
    </div>
  );
}
