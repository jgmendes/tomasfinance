import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo, LogoMark } from "@/components/app/logo";
import {
  ArrowRight,
  Building2,
  Check,
  ClipboardList,
  FileCheck,
  Gift,
  Handshake,
  KeyRound,
  Lock,
  MessagesSquare,
  Percent,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

const LANDING_TITLE = "Tomasin Intermediações de Negócios";
const LANDING_DESCRIPTION =
  "Negociamos as melhores condições pro seu negócio — taxas, fornecedores, gateways de pagamento e conexões comerciais. De bônus, acesso grátis ao Tomas Finance, nosso CRM financeiro.";

export const metadata: Metadata = {
  title: LANDING_TITLE,
  description: LANDING_DESCRIPTION,
  keywords: [
    "intermediação de negócios",
    "negociação de taxas",
    "redução de taxa de gateway",
    "consultoria empresarial",
    "CRM financeiro grátis",
    "network empresarial",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Tomasin Intermediações",
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
  },
};

const NAV = [
  { href: "#intermediacao", label: "Intermediação" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#crm", label: "CRM grátis" },
  { href: "#faq", label: "FAQ" },
];

const passos = [
  { icon: ClipboardList, title: "Solicitação", desc: "Você conta o que precisa negociar — taxas, fornecedores, condições comerciais." },
  { icon: Handshake, title: "Negociação", desc: "Negociamos com o parceiro/terceiro em seu nome, registrando cada lance." },
  { icon: ThumbsUp, title: "Aprovação", desc: "Você recebe a proposta final e decide: aceitar, contrapropor ou recusar." },
  { icon: TrendingUp, title: "Resultado", desc: "Condição fechada, documentada do início ao fim — sem letra miúda." },
];

const negocios = [
  { icon: Handshake, title: "Intermediação de negócios", desc: "Ajudamos você a comprar melhor e fechar negociações em condições mais vantajosas." },
  { icon: Percent, title: "Taxas de gateway", desc: "Intermediamos e negociamos as taxas de gateways de pagamento pra reduzir o custo da sua empresa." },
  { icon: Building2, title: "Empresas & compradores", desc: "Ligamos empresas a compradores, e conectamos compradores a grandes empresas." },
  { icon: Users, title: "Network", desc: "Conectamos pessoas pra gerar oportunidades reais de relacionamento e negócio." },
];

const trust = [
  { icon: ShieldCheck, label: "Isolamento por usuário (RLS)" },
  { icon: FileCheck, label: "Histórico completo de cada negociação" },
  { icon: Lock, label: "Cofre com criptografia" },
  { icon: KeyRound, label: "Autenticação em 2 fatores" },
];

const crmFeatures = [
  "Dashboard completo de receitas, despesas e patrimônio",
  "Multi-empresas, cada uma com seu próprio caixa",
  "CFO Virtual com IA pra tirar dúvidas financeiras",
  "Lançamentos com motivo, nota fiscal e beneficiário",
];

const faq = [
  {
    q: "Como funciona a remuneração da Tomasin na intermediação?",
    a: "Sem mensalidade fixa. Nossa remuneração é definida por negociação, combinada com você antes de fechar qualquer condição — e sempre separada do valor do negócio em si (a taxa que negociamos com o terceiro é uma coisa, o que você paga pelo nosso serviço é outra, documentado à parte).",
  },
  {
    q: "O CRM financeiro (Tomas Finance) é mesmo grátis?",
    a: "Sim. É nosso jeito de te dar controle financeiro de verdade enquanto cuidamos das suas negociações — sem custo.",
  },
  {
    q: "Preciso ter uma negociação em andamento pra usar o CRM?",
    a: "Não. Você pode criar conta e usar o Tomas Finance normalmente. Se quiser, pode solicitar uma intermediação a qualquer momento.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. Cada cliente só acessa os próprios dados e negociações (RLS no banco), há autenticação em 2 fatores opcional, cofre com criptografia e um histórico auditável de cada lançamento e cada lance de negociação.",
  },
  {
    q: "Posso usar para mais de uma empresa?",
    a: "Sim, tanto no CRM (cadastre quantas empresas for dono) quanto nas negociações (cada uma com seu próprio histórico).",
  },
];

function SectionEyebrow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 text-primary" /> {children}
    </div>
  );
}

export default function Home() {
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
              <Link href="/crm/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/crm/cadastro">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — Intermediação */}
      <section id="intermediacao" className="bg-grid-fade scroll-mt-16">
        <div className="container grid gap-14 py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-28">
          <div>
            <SectionEyebrow icon={Handshake}>Tomasin Intermediações de Negócios</SectionEyebrow>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Negociamos as{" "}
              <span className="relative inline-block text-primary">
                melhores condições
                <svg
                  viewBox="0 0 200 12"
                  className="absolute -bottom-2 left-0 h-3 w-full text-primary/50"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M2 9 C 50 2, 150 2, 198 9" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                </svg>
              </span>{" "}
              pro seu negócio.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Taxas, fornecedores, gateways de pagamento, conexões comerciais — negociamos por você, com histórico
              completo de cada etapa. E de bônus, você ganha acesso grátis ao nosso CRM financeiro.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/crm/cadastro">
                  Solicitar negociação <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/crm/login">Já tenho conta</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Sem mensalidade fixa</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Atendimento personalizado</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> CRM financeiro incluso, grátis</span>
            </div>
          </div>

          {/* Mockup visual: negociação real */}
          <div className="relative">
            <div className="rounded-2xl border border-primary/20 bg-secondary p-2 shadow-2xl shadow-primary/20 sm:p-3">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LogoMark className="h-3.5 w-3.5" /> tomasin.com/intermediacao/negociacoes/000152
                </span>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">#000152 · ABC LTDA</p>
                    <p className="text-sm font-semibold">Redução de taxa</p>
                  </div>
                  <Badge className="bg-violet-500/15 text-violet-600 dark:text-violet-400">Contraproposta enviada</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Condição atual</p>
                    <p className="mt-1 text-base font-bold">4,99%</p>
                  </div>
                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Proposta atual</p>
                    <p className="mt-1 text-base font-bold text-emerald-500">3,15%</p>
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-3 text-xs">
                  <p className="text-muted-foreground">14:20 — <span className="font-medium text-foreground">Parceiro</span>: Proposta inicial 3,49%.</p>
                  <p className="mt-1 text-muted-foreground">15:25 — <span className="font-medium text-foreground">Tomasin</span>: Contraproposta 3,15%.</p>
                </div>
              </div>
            </div>

            {/* Chip flutuante */}
            <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-xl border border-primary/20 bg-card px-4 py-3 shadow-xl sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10">
                <Gift className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-xs">
                <p className="font-semibold">CRM financeiro incluso</p>
                <p className="text-muted-foreground">Grátis pra todo cliente Tomasin</p>
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

      {/* Como funciona */}
      <section id="como-funciona" className="scroll-mt-16 container py-20">
        <div className="max-w-lg">
          <SectionEyebrow icon={MessagesSquare}>O processo</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Como funciona uma negociação
          </h2>
          <p className="mt-3 text-muted-foreground">
            Do pedido até o resultado, tudo documentado — sem depender de e-mail perdido ou ligação sem registro.
          </p>
        </div>

        <div className="mt-12 divide-y divide-border border-y">
          {passos.map((p, i) => (
            <div key={p.title} className="grid gap-4 py-8 sm:grid-cols-[3rem_1fr] sm:items-start sm:gap-8">
              <span className="font-display text-3xl font-bold text-muted-foreground/25">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <p.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* O que negociamos */}
      <section className="border-y bg-card/40">
        <div className="container py-20">
          <div className="max-w-lg">
            <SectionEyebrow icon={Handshake}>O que negociamos</SectionEyebrow>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Sua rede de negócios, mais forte
            </h2>
            <p className="mt-3 text-muted-foreground">
              Ajudamos nossos clientes a comprar melhor e conseguir as melhores condições — e a fazer as conexões certas.
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

      {/* CRM grátis — Tomas Finance */}
      <section id="crm" className="scroll-mt-16 container py-20">
        <div className="grid gap-10 rounded-2xl border bg-card p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Gift className="h-3.5 w-3.5" /> Grátis para todo cliente Tomasin
            </Badge>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Tomas Finance: seu CRM financeiro, de graça
            </h2>
            <p className="mt-3 max-w-sm text-muted-foreground">
              Enquanto negociamos por você, use o Tomas Finance pra ter controle total das suas finanças pessoais e
              das suas empresas — sem pagar nada por isso.
            </p>
            <ul className="mt-6 grid gap-2.5 text-sm">
              {crmFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {f}
                </li>
              ))}
            </ul>
            <Button size="lg" className="mt-6" asChild>
              <Link href="/crm/cadastro">
                Criar conta grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Mockup visual do CRM */}
          <div className="rounded-xl border bg-background p-2 shadow-lg">
            <div className="flex items-center gap-1.5 border-b px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <LogoMark className="h-3.5 w-3.5" /> tomasin.com/crm/dashboard
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="rounded-xl border bg-card p-3">
                <Wallet className="h-4 w-4 text-primary" />
                <p className="mt-2 text-xs text-muted-foreground">Saldo total</p>
                <p className="text-base font-bold">R$ 84.320</p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <p className="mt-2 text-xs text-muted-foreground">Receitas do mês</p>
                <p className="text-base font-bold text-emerald-500">R$ 32.150</p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <p className="mt-2 text-xs text-muted-foreground">Despesas do mês</p>
                <p className="text-base font-bold text-red-500">R$ 18.940</p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="mt-2 text-xs text-muted-foreground">CFO Virtual</p>
                <p className="text-base font-bold">Sempre online</p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
            Pronto para negociar melhor?
          </h2>
          <p className="max-w-md text-primary-foreground/80">
            Crie sua conta em menos de um minuto, solicite uma negociação e ganhe acesso grátis ao Tomas Finance.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/crm/cadastro">
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="container flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Logo className="text-sm" />
          <span className="text-center">
            © {new Date().getFullYear()} Tomasin Intermediações de Negócios LTDA · CNPJ 68.248.717/0001-90
          </span>
          <span className="text-xs text-muted-foreground/70">Tomas Finance é um produto Tomasin.</span>
        </div>
      </footer>
    </div>
  );
}
