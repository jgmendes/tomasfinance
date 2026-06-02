-- =============================================================================
-- TOMAZ FINANÇAS — Migration 03: Cofre de Senhas + Escopo (pessoal/empresarial)
-- Execute no SQL Editor do Supabase (após o schema.sql e o 02_...).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) ESCOPO em transações: separar PESSOAL x EMPRESARIAL (com visão combinada)
-- -----------------------------------------------------------------------------
do $$ begin
  create type transaction_scope as enum ('pessoal', 'empresarial');
exception when duplicate_object then null; end $$;

alter table public.transactions
  add column if not exists scope transaction_scope not null default 'pessoal';

-- Marca como empresarial o que já está vinculado a uma empresa
update public.transactions set scope = 'empresarial'
where company_id is not null and scope = 'pessoal';

create index if not exists idx_transactions_scope on public.transactions(scope);

-- Flag para saber se o usuário tem 2FA ativo (usada para exigir o 2FA no login
-- sem custo extra de rede a cada página).
alter table public.profiles add column if not exists mfa_enabled boolean not null default false;

-- -----------------------------------------------------------------------------
-- 2) COFRE DE SENHAS (zero-knowledge: o servidor só guarda dados cifrados)
-- -----------------------------------------------------------------------------
-- Metadados do cofre por usuário: salt + "verifier" cifrado para validar a
-- senha-mestra SEM armazená-la. A senha-mestra NUNCA vai para o servidor.
create table if not exists public.vault_meta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salt text not null,
  verifier_iv text not null,
  verifier_ct text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Itens do cofre: o campo da senha é cifrado no navegador (AES-GCM).
create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  username text,
  url text,
  category text,
  notes text,
  password_iv text not null,
  password_ct text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_updated_at on public.vault_meta;
create trigger set_updated_at before update on public.vault_meta
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.vault_items;
create trigger set_updated_at before update on public.vault_items
  for each row execute function public.set_updated_at();

create index if not exists idx_vault_items_user on public.vault_items(user_id);

-- -----------------------------------------------------------------------------
-- 3) RLS — apenas o dono acessa o próprio cofre (admin NÃO lê senhas)
-- -----------------------------------------------------------------------------
alter table public.vault_meta enable row level security;
alter table public.vault_items enable row level security;

drop policy if exists "vault_meta_own" on public.vault_meta;
create policy "vault_meta_own" on public.vault_meta
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "vault_items_own_select" on public.vault_items;
drop policy if exists "vault_items_own_insert" on public.vault_items;
drop policy if exists "vault_items_own_update" on public.vault_items;
drop policy if exists "vault_items_own_delete" on public.vault_items;
create policy "vault_items_own_select" on public.vault_items for select using (auth.uid() = user_id);
create policy "vault_items_own_insert" on public.vault_items for insert with check (auth.uid() = user_id);
create policy "vault_items_own_update" on public.vault_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vault_items_own_delete" on public.vault_items for delete using (auth.uid() = user_id);

-- Obs.: propositalmente NÃO há política de admin no cofre — nem o admin
-- consegue ler as senhas (são cifradas no cliente, conhecimento zero).
