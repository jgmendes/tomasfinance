# Tomaz Finanças 💜

Sistema financeiro completo (pessoal + multi-empresas) com **CFO Virtual com IA**.

Construído com **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Shadcn/UI · Supabase (Auth + PostgreSQL + Storage + RLS)**.

## ✨ Funcionalidades

- **Autenticação completa**: cadastro, login, recuperação e redefinição de senha, perfil com foto.
- **Dashboard**: saldo total, receitas/despesas do mês, lucro, contas a pagar/receber, fluxo de caixa e gráficos.
- **Receitas e Despesas**: CRUD com categorias, contas, status, formas de pagamento e observações.
- **Contas bancárias**: banco, carteira, dinheiro, PIX, cartão — saldo individual e consolidado.
- **Cartões de crédito**: limite, utilização, melhor dia de compra, fechamento e vencimento.
- **Metas financeiras**: valor da meta, acumulado e percentual concluído.
- **Centro de investimentos**: CDB, Tesouro, Ações, FIIs, Cripto — investido x atual x rentabilidade.
- **Empresas**: múltiplas empresas, cada uma com seu próprio fluxo de caixa.
- **Funcionários**: cargo, salário, comissão e dia de pagamento.
- **Assinaturas recorrentes**: OpenAI, Claude, Vercel, AWS… com custo mensal e projeção anual.
- **Relatórios**: DRE simplificado, demonstrativos e exportação **CSV / Excel / PDF (impressão)**.
- **CFO Virtual (IA)**: análise de gastos, detecção de desperdícios, runway financeiro, previsões e sugestões. Funciona offline (regras) e com **Claude** se você configurar a chave.
- **Dashboard Executivo**: patrimônio, receita/despesa anual, lucro acumulado, crescimento, empresas mais lucrativas e projeção de 12 meses.
- **Segurança**: Row Level Security (RLS) em todas as tabelas — cada usuário só vê os próprios dados.

## 🚀 Como rodar localmente

```bash
npm install
cp .env.local.example .env.local   # depois preencha com seus dados do Supabase
npm run dev
```

Acesse http://localhost:3000

---

# 🔌 Passo a passo: conectar ao Supabase

### 1) Criar o projeto no Supabase
1. Acesse https://supabase.com e faça login (pode usar o GitHub).
2. Clique em **New project**.
3. Defina **Name** (ex: `tomaz-financas`), uma **Database Password** forte (guarde-a) e a **Region** mais próxima (ex: *South America (São Paulo)*).
4. Clique em **Create new project** e aguarde ~2 minutos até provisionar.

### 2) Criar as tabelas (rodar o schema)
1. No menu lateral do Supabase, abra **SQL Editor**.
2. Clique em **+ New query**.
3. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql) deste projeto, **copie todo o conteúdo** e cole no editor.
4. Clique em **Run** (ou `Ctrl+Enter`).
   - Isso cria **todas as tabelas** (`profiles`, `companies`, `bank_accounts`, `transactions`, `categories`, `credit_cards`, `installments`, `goals`, `investments`, `subscriptions`, `employees`, `reports`, `notifications`, `audit_logs`), os **enums**, **índices**, **triggers**, as **políticas de RLS** e o **bucket de avatares**.

### 3) Pegar as chaves de API
1. No menu, vá em **Project Settings** (engrenagem) → **API**.
2. Copie os dois valores:
   - **Project URL** → vai em `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (em *Project API keys*) → vai em `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4) Configurar as variáveis de ambiente
1. Na raiz do projeto, crie o arquivo **`.env.local`** (copie de `.env.local.example`).
2. Preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui

# (Opcional) CFO Virtual com IA real:
ANTHROPIC_API_KEY=sua-chave-anthropic
```

> ⚠️ Nunca exponha a `service_role` no frontend. Este app não precisa dela.

### 5) Configurar autenticação por e-mail
1. No Supabase, vá em **Authentication → Providers → Email** e mantenha habilitado.
2. **Para testar rápido sem confirmar e-mail**: em **Authentication → Sign In / Providers → Email**, **desative** *"Confirm email"*. Assim o cadastro já loga direto.
   - Se preferir manter a confirmação ligada, o usuário recebe um e-mail e o link cai em `/auth/callback`.
3. Em **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (em produção, a URL do seu domínio).
   - **Redirect URLs**: adicione `http://localhost:3000/**` (e a URL de produção, ex: `https://seu-app.vercel.app/**`).

### 6) Rodar e testar
```bash
npm run dev
```
1. Acesse `/cadastro` e crie sua conta.
2. Você será levado ao **Dashboard**. As categorias padrão são criadas automaticamente.
3. Cadastre uma conta bancária, depois receitas/despesas e veja os gráficos e o CFO Virtual reagirem.

---

## 🤖 Ativar o CFO Virtual com IA (opcional)
Sem a chave, o CFO já funciona com análise local por regras. Para ter um **resumo executivo narrativo** gerado pela IA:
1. Gere uma chave em https://console.anthropic.com → **API Keys**.
2. Coloque em `ANTHROPIC_API_KEY` no `.env.local`.
3. Reinicie o `npm run dev`. O resumo aparece no topo da página **CFO Virtual**.

## ☁️ Deploy (Vercel)
1. Suba o projeto para o GitHub.
2. Importe no https://vercel.com.
3. Em **Settings → Environment Variables**, adicione as mesmas variáveis do `.env.local`.
4. No Supabase, adicione a URL da Vercel em **Authentication → URL Configuration**.
5. Deploy. ✅

## 🗂️ Estrutura

```
src/
  app/
    (auth)/        → login, cadastro, recuperar/redefinir senha
    (app)/         → dashboard, receitas, despesas, contas, cartões, metas,
                     investimentos, empresas, funcionários, assinaturas,
                     relatórios, cfo, executivo, configurações
    api/cfo/       → endpoint do CFO Virtual (IA opcional)
    auth/callback/ → troca de código por sessão (e-mail/reset)
  components/      → ui (shadcn), app (layout), modules (CRUD)
  lib/             → supabase clients, finance, insights, utils, types
supabase/
  schema.sql       → schema completo + RLS (rodar no SQL Editor)
```

## 🔐 Segurança
- **RLS** ativado em todas as tabelas com políticas `auth.uid() = user_id`.
- Storage de avatares com política por pasta do usuário.
- Sessão renovada via middleware; rotas privadas protegidas.
