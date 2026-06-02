-- =============================================================================
-- TOMAZ FINANÇAS — Migration 04: SaaS / Cobrança (planos + assinaturas + PIX)
-- Execute no SQL Editor do Supabase (após schema.sql, 02 e 03).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) PLANOS
-- -----------------------------------------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  price_cents integer not null default 0,   -- valor mensal em centavos
  features jsonb,
  active boolean not null default true,
  sort int default 0,
  created_at timestamptz default now()
);

-- Seed dos planos padrão (idempotente por code)
insert into public.plans (code, name, description, price_cents, sort, features) values
  ('free',   'Gratuito',    'Para começar a organizar suas finanças', 0,    0, '["Dashboard","Receitas e despesas","1 empresa"]'),
  ('pro',    'Pro',         'Para quem leva a sério',                 2990, 1, '["Tudo do Gratuito","Empresas ilimitadas","CFO Virtual com IA","Cofre de senhas","Relatórios em PDF"]'),
  ('business','Empresarial','Para múltiplas empresas e equipe',       7990, 2, '["Tudo do Pro","Multiusuário","Suporte prioritário","KYC e auditoria"]')
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 2) ASSINATURAS DE COBRANÇA (uma por usuário)
-- -----------------------------------------------------------------------------
do $$ begin
  create type billing_status as enum ('trial', 'ativa', 'atrasada', 'cancelada');
exception when duplicate_object then null; end $$;

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id),
  status billing_status not null default 'trial',
  -- Admin controla se o usuário continua sendo cobrado (true = cobrança ativa)
  billing_enabled boolean not null default true,
  current_period_end date,
  next_charge_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_updated_at on public.billing_subscriptions;
create trigger set_updated_at before update on public.billing_subscriptions
  for each row execute function public.set_updated_at();

create index if not exists idx_billing_sub_user on public.billing_subscriptions(user_id);

-- -----------------------------------------------------------------------------
-- 3) COBRANÇAS (charges) — cada PIX gerado
-- -----------------------------------------------------------------------------
do $$ begin
  create type charge_status as enum ('pendente', 'pago', 'expirado', 'falhou', 'cancelado');
exception when duplicate_object then null; end $$;

create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.billing_subscriptions(id) on delete set null,
  plan_id uuid references public.plans(id),
  amount_cents integer not null,
  method text not null default 'pix',
  status charge_status not null default 'pendente',
  bravive_id text,            -- id do pagamento na Bravive
  pix_code text,              -- EMV copia e cola
  pix_qrcode text,            -- PNG base64
  description text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_charges_user on public.charges(user_id);
create index if not exists idx_charges_bravive on public.charges(bravive_id);

-- -----------------------------------------------------------------------------
-- 4) RLS
-- -----------------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.charges enable row level security;

-- Planos: todos podem LER (catálogo); ninguém escreve pelo client
drop policy if exists "plans_read" on public.plans;
create policy "plans_read" on public.plans for select using (true);

-- Assinaturas: dono lê/cria/atualiza a própria; admin lê e atualiza todas
drop policy if exists "bsub_own_select" on public.billing_subscriptions;
drop policy if exists "bsub_own_insert" on public.billing_subscriptions;
drop policy if exists "bsub_own_update" on public.billing_subscriptions;
drop policy if exists "bsub_admin_select" on public.billing_subscriptions;
drop policy if exists "bsub_admin_update" on public.billing_subscriptions;
create policy "bsub_own_select" on public.billing_subscriptions for select using (auth.uid() = user_id);
create policy "bsub_own_insert" on public.billing_subscriptions for insert with check (auth.uid() = user_id);
create policy "bsub_own_update" on public.billing_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bsub_admin_select" on public.billing_subscriptions for select using (public.is_admin());
create policy "bsub_admin_update" on public.billing_subscriptions for update using (public.is_admin()) with check (public.is_admin());

-- Cobranças: dono lê/cria as próprias; admin lê todas
drop policy if exists "charges_own_select" on public.charges;
drop policy if exists "charges_own_insert" on public.charges;
drop policy if exists "charges_admin_select" on public.charges;
create policy "charges_own_select" on public.charges for select using (auth.uid() = user_id);
create policy "charges_own_insert" on public.charges for insert with check (auth.uid() = user_id);
create policy "charges_admin_select" on public.charges for select using (public.is_admin());

-- Obs.: a atualização de cobranças (marcar como paga) e a extensão do período
-- são feitas pelo WEBHOOK usando a SERVICE ROLE KEY (ignora RLS) no servidor.
