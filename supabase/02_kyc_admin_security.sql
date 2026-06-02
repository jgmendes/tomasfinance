-- =============================================================================
-- TOMAZ FINANÇAS — Migration 02: KYC + Admin + Segurança
-- Execute este arquivo INTEIRO no SQL Editor do Supabase (após o schema.sql).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) PROFILES: papel (role) + e-mail (para o admin listar usuários)
-- -----------------------------------------------------------------------------
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists email text;

-- Preenche e-mails dos usuários já existentes
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

-- Atualiza o trigger de criação de perfil para já gravar e-mail e papel
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    'user'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;

-- -----------------------------------------------------------------------------
-- 2) FUNÇÃO is_admin() — usada nas políticas RLS (SECURITY DEFINER evita recursão)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- 3) KYC — Know Your Customer (dados e documentos do cliente)
-- -----------------------------------------------------------------------------
do $$ begin
  create type kyc_status as enum ('nao_enviado', 'pendente', 'aprovado', 'rejeitado');
exception when duplicate_object then null; end $$;

create table if not exists public.kyc (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  -- Dados pessoais
  full_name text,
  cpf text,
  birth_date date,
  phone text,
  -- Endereço
  cep text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  -- Perfil financeiro
  occupation text,
  monthly_income numeric(14,2),
  -- Documento
  document_type text,        -- RG, CNH, Passaporte
  document_number text,
  document_front_url text,
  document_back_url text,
  selfie_url text,
  -- Status / revisão
  status kyc_status not null default 'pendente',
  rejection_reason text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_updated_at on public.kyc;
create trigger set_updated_at before update on public.kyc
  for each row execute function public.set_updated_at();

create index if not exists idx_kyc_user on public.kyc(user_id);
create index if not exists idx_kyc_status on public.kyc(status);

-- -----------------------------------------------------------------------------
-- 4) RLS — KYC: dono gerencia o próprio; admin lê e revisa todos
-- -----------------------------------------------------------------------------
alter table public.kyc enable row level security;

drop policy if exists "kyc_own_select" on public.kyc;
drop policy if exists "kyc_own_insert" on public.kyc;
drop policy if exists "kyc_own_update" on public.kyc;
drop policy if exists "kyc_admin_select" on public.kyc;
drop policy if exists "kyc_admin_update" on public.kyc;

create policy "kyc_own_select" on public.kyc for select using (auth.uid() = user_id);
create policy "kyc_own_insert" on public.kyc for insert with check (auth.uid() = user_id);
create policy "kyc_own_update" on public.kyc for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "kyc_admin_select" on public.kyc for select using (public.is_admin());
create policy "kyc_admin_update" on public.kyc for update using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5) RLS — Admin pode LER (select) os dados de todos os usuários
-- -----------------------------------------------------------------------------
-- Perfis
drop policy if exists "profile_admin_select" on public.profiles;
create policy "profile_admin_select" on public.profiles for select using (public.is_admin());

-- Tabelas financeiras (somente leitura para admin)
do $$
declare t text;
begin
  foreach t in array array[
    'companies','bank_accounts','credit_cards','transactions','installments',
    'goals','investments','employees','subscriptions','notifications'
  ] loop
    execute format('drop policy if exists "admin_select" on public.%I;', t);
    execute format('create policy "admin_select" on public.%I for select using (public.is_admin());', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 6) STORAGE — bucket PRIVADO para documentos de KYC
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

drop policy if exists "kyc_doc_owner_read" on storage.objects;
drop policy if exists "kyc_doc_owner_write" on storage.objects;
drop policy if exists "kyc_doc_owner_update" on storage.objects;
drop policy if exists "kyc_doc_owner_delete" on storage.objects;
drop policy if exists "kyc_doc_admin_read" on storage.objects;

-- Dono: lê/grava só na própria pasta (primeiro segmento do path = user id)
create policy "kyc_doc_owner_read" on storage.objects
  for select using (bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "kyc_doc_owner_write" on storage.objects
  for insert with check (bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "kyc_doc_owner_update" on storage.objects
  for update using (bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "kyc_doc_owner_delete" on storage.objects
  for delete using (bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- Admin: pode ler documentos de qualquer usuário (para revisar o KYC)
create policy "kyc_doc_admin_read" on storage.objects
  for select using (bucket_id = 'kyc-documents' and public.is_admin());

-- -----------------------------------------------------------------------------
-- 7) AUDITORIA — registra mudanças de status do KYC em audit_logs
-- -----------------------------------------------------------------------------
-- Admin pode ler os logs de auditoria
drop policy if exists "audit_admin_select" on public.audit_logs;
create policy "audit_admin_select" on public.audit_logs for select using (public.is_admin());

create or replace function public.log_kyc_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status) then
    insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
    values (
      auth.uid(),
      'kyc_status_change',
      'kyc',
      new.id,
      jsonb_build_object('de', old.status, 'para', new.status, 'titular', new.user_id)
    );
  end if;
  return new;
end; $$;

drop trigger if exists trg_log_kyc_review on public.kyc;
create trigger trg_log_kyc_review after update on public.kyc
  for each row execute function public.log_kyc_review();

-- =============================================================================
-- COMO TORNAR ALGUÉM ADMIN (rode trocando pelo seu e-mail):
--   update public.profiles set role = 'admin' where email = 'seu@email.com';
-- =============================================================================
