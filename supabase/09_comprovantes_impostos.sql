-- =============================================================================
-- TOMAS FINANCE — Migration 09: COMPROVANTES + IMPOSTOS
-- Anexo de comprovante (ex.: comprovante bancário) em receitas/despesas, e
-- configuração de regime tributário + alíquota por empresa (ou pessoal) com
-- cálculo automático do imposto estimado sobre a receita do período.
-- Execute INTEIRO no SQL Editor do Supabase.
-- =============================================================================

-- =============================================================================
-- 1. TRANSACTIONS — anexo de comprovante
-- =============================================================================
alter table public.transactions
  add column if not exists receipt_path text;

-- =============================================================================
-- 2. STORAGE — bucket PRIVADO para comprovantes (extrato/comprovante bancário)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

drop policy if exists "comprovante_owner_read" on storage.objects;
drop policy if exists "comprovante_owner_write" on storage.objects;
drop policy if exists "comprovante_owner_update" on storage.objects;
drop policy if exists "comprovante_owner_delete" on storage.objects;

-- Dono: lê/grava só na própria pasta (primeiro segmento do path = user id)
create policy "comprovante_owner_read" on storage.objects
  for select using (bucket_id = 'comprovantes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "comprovante_owner_write" on storage.objects
  for insert with check (bucket_id = 'comprovantes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "comprovante_owner_update" on storage.objects
  for update using (bucket_id = 'comprovantes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "comprovante_owner_delete" on storage.objects
  for delete using (bucket_id = 'comprovantes' and auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- 3. IMPOSTOS — regime tributário e alíquota por empresa (ou pessoal)
-- =============================================================================
do $$ begin
  create type tax_regime as enum (
    'mei', 'simples_nacional', 'lucro_presumido', 'lucro_real', 'pessoa_fisica'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.tax_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- null = configuração "Pessoal" (fora de qualquer empresa)
  company_id uuid references public.companies(id) on delete cascade,
  regime tax_regime not null default 'simples_nacional',
  -- alíquota efetiva informada pelo usuário (%), aplicada sobre a receita do período
  rate numeric(5,2) not null default 0 check (rate >= 0 and rate <= 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_updated_at on public.tax_settings;
create trigger set_updated_at before update on public.tax_settings
  for each row execute function public.set_updated_at();

-- No máximo uma configuração "Pessoal" e uma por empresa, por usuário.
create unique index if not exists uq_tax_settings_pessoal
  on public.tax_settings(user_id) where company_id is null;
create unique index if not exists uq_tax_settings_company
  on public.tax_settings(user_id, company_id) where company_id is not null;
create index if not exists idx_tax_settings_user on public.tax_settings(user_id);

alter table public.tax_settings enable row level security;
drop policy if exists "own_select" on public.tax_settings;
drop policy if exists "own_insert" on public.tax_settings;
drop policy if exists "own_update" on public.tax_settings;
drop policy if exists "own_delete" on public.tax_settings;

create policy "own_select" on public.tax_settings for select using (auth.uid() = user_id);
create policy "own_insert" on public.tax_settings for insert with check (auth.uid() = user_id);
create policy "own_update" on public.tax_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_delete" on public.tax_settings for delete using (auth.uid() = user_id);

-- =============================================================================
-- FIM DA MIGRAÇÃO 09
-- =============================================================================
