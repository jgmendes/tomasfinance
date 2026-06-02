-- =============================================================================
-- TOMAZ FINANÇAS — Schema completo do banco de dados (PostgreSQL / Supabase)
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- Cria todas as tabelas, índices, triggers, RLS (Row Level Security) e seeds.
-- =============================================================================

-- Extensões
create extension if not exists "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================
do $$ begin
  create type account_type as enum ('banco', 'carteira', 'dinheiro', 'pix', 'cartao');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_type as enum ('receita', 'despesa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_status as enum ('pendente', 'pago', 'recebido', 'atrasado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type investment_type as enum ('cdb', 'tesouro', 'acoes', 'fii', 'cripto', 'fundo', 'outros');
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_status as enum ('em_andamento', 'concluida', 'pausada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_cycle as enum ('mensal', 'anual', 'trimestral', 'semanal');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- FUNÇÃO: updated_at automático
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- =============================================================================
-- 1. PROFILES (estende auth.users)
-- =============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  currency text default 'BRL',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Cria profile automaticamente quando um usuário se registra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 2. COMPANIES (empresas)
-- =============================================================================
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cnpj text,
  description text,
  color text default '#7c3aed',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- 3. CATEGORIES (categorias de receita/despesa)
-- =============================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type transaction_type not null,
  icon text,
  color text default '#64748b',
  created_at timestamptz default now()
);

-- =============================================================================
-- 4. BANK ACCOUNTS (contas bancárias)
-- =============================================================================
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  type account_type not null default 'banco',
  bank_name text,
  initial_balance numeric(14,2) not null default 0,
  color text default '#0ea5e9',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- 5. CREDIT CARDS (cartões de crédito)
-- =============================================================================
create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  brand text,
  credit_limit numeric(14,2) not null default 0,
  used_limit numeric(14,2) not null default 0,
  best_purchase_day int check (best_purchase_day between 1 and 31),
  closing_day int check (closing_day between 1 and 31),
  due_day int check (due_day between 1 and 31),
  color text default '#1e293b',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- 6. TRANSACTIONS (receitas e despesas)
-- =============================================================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  account_id uuid references public.bank_accounts(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  type transaction_type not null,
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  date date not null default current_date,
  due_date date,
  status transaction_status not null default 'pago',
  payment_method text,
  notes text,
  is_recurring boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- 7. INSTALLMENTS (parcelamentos de cartão)
-- =============================================================================
create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  description text not null,
  total_amount numeric(14,2) not null,
  installments_count int not null check (installments_count > 0),
  installments_paid int not null default 0,
  first_due_date date not null,
  created_at timestamptz default now()
);

-- =============================================================================
-- 8. GOALS (metas financeiras)
-- =============================================================================
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0,
  deadline date,
  status goal_status not null default 'em_andamento',
  icon text,
  color text default '#22c55e',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- 9. INVESTMENTS (centro de investimentos)
-- =============================================================================
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type investment_type not null,
  invested_amount numeric(14,2) not null default 0,
  current_amount numeric(14,2) not null default 0,
  quantity numeric(18,8),
  broker text,
  purchase_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- 10. EMPLOYEES (funcionários)
-- =============================================================================
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  role text,
  salary numeric(14,2) not null default 0,
  commission numeric(14,2) default 0,
  payment_day int check (payment_day between 1 and 31),
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- 11. SUBSCRIPTIONS (assinaturas recorrentes)
-- =============================================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  amount numeric(14,2) not null,
  cycle subscription_cycle not null default 'mensal',
  next_charge_date date not null,
  category text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- 12. REPORTS (relatórios salvos)
-- =============================================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null,
  period_start date,
  period_end date,
  data jsonb,
  created_at timestamptz default now()
);

-- =============================================================================
-- 13. NOTIFICATIONS (notificações / alertas)
-- =============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  type text default 'info',
  read boolean default false,
  link text,
  created_at timestamptz default now()
);

-- =============================================================================
-- 14. AUDIT LOGS (logs de auditoria)
-- =============================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

-- =============================================================================
-- TRIGGERS updated_at
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','companies','bank_accounts','credit_cards','transactions',
    'goals','investments','employees','subscriptions'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- =============================================================================
-- ÍNDICES
-- =============================================================================
create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_transactions_date on public.transactions(date);
create index if not exists idx_transactions_company on public.transactions(company_id);
create index if not exists idx_bank_accounts_user on public.bank_accounts(user_id);
create index if not exists idx_credit_cards_user on public.credit_cards(user_id);
create index if not exists idx_goals_user on public.goals(user_id);
create index if not exists idx_investments_user on public.investments(user_id);
create index if not exists idx_employees_user on public.employees(user_id);
create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_notifications_user on public.notifications(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY — cada usuário só acessa os próprios dados
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','companies','categories','bank_accounts','credit_cards',
    'transactions','installments','goals','investments','employees',
    'subscriptions','reports','notifications','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- Política genérica para tabelas com coluna user_id
do $$
declare t text;
begin
  foreach t in array array[
    'companies','categories','bank_accounts','credit_cards','transactions',
    'installments','goals','investments','employees','subscriptions',
    'reports','notifications','audit_logs'
  ] loop
    execute format('drop policy if exists "own_select" on public.%I;', t);
    execute format('drop policy if exists "own_insert" on public.%I;', t);
    execute format('drop policy if exists "own_update" on public.%I;', t);
    execute format('drop policy if exists "own_delete" on public.%I;', t);

    execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- Profiles usam id = auth.uid()
drop policy if exists "profile_select" on public.profiles;
drop policy if exists "profile_update" on public.profiles;
drop policy if exists "profile_insert" on public.profiles;
create policy "profile_select" on public.profiles for select using (auth.uid() = id);
create policy "profile_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profile_insert" on public.profiles for insert with check (auth.uid() = id);

-- =============================================================================
-- FUNÇÃO: criar categorias padrão para um novo usuário
-- Chame manualmente ou pela aplicação após o cadastro.
-- =============================================================================
create or replace function public.seed_default_categories(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.categories (user_id, name, type) values
    (p_user_id, 'Salário', 'receita'),
    (p_user_id, 'Empresa', 'receita'),
    (p_user_id, 'Comissões', 'receita'),
    (p_user_id, 'Investimentos', 'receita'),
    (p_user_id, 'Freelance', 'receita'),
    (p_user_id, 'Outros', 'receita'),
    (p_user_id, 'Alimentação', 'despesa'),
    (p_user_id, 'Transporte', 'despesa'),
    (p_user_id, 'Moradia', 'despesa'),
    (p_user_id, 'Internet', 'despesa'),
    (p_user_id, 'Energia', 'despesa'),
    (p_user_id, 'Água', 'despesa'),
    (p_user_id, 'Funcionários', 'despesa'),
    (p_user_id, 'Marketing', 'despesa'),
    (p_user_id, 'Impostos', 'despesa'),
    (p_user_id, 'Investimentos', 'despesa'),
    (p_user_id, 'Outros', 'despesa')
  on conflict do nothing;
end; $$;

-- =============================================================================
-- STORAGE — bucket de avatares (fotos de perfil)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar_public_read" on storage.objects;
drop policy if exists "avatar_owner_write" on storage.objects;
drop policy if exists "avatar_owner_update" on storage.objects;
drop policy if exists "avatar_owner_delete" on storage.objects;

create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatar_owner_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatar_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatar_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================
