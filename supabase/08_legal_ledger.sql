-- =============================================================================
-- TOMAZ FINANÇAS — Migration 08: LEDGER JURÍDICO
-- Adiciona motivo, nota fiscal e beneficiário aos lançamentos, tabela de
-- lembretes (chat) e trava a tabela audit_logs para servir como trilha de
-- auditoria à prova de adulteração (só o trigger do banco escreve nela).
-- Execute INTEIRO no SQL Editor do Supabase.
-- =============================================================================

-- =============================================================================
-- 1. BENEFICIARIES (beneficiários / fornecedores dos lançamentos)
-- =============================================================================
create table if not exists public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  document text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- 2. REMINDERS (lembretes do chat, com atalho no celular)
-- =============================================================================
do $$ begin
  create type reminder_status as enum ('pendente', 'concluido', 'cancelado');
exception when duplicate_object then null; end $$;

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  status reminder_status not null default 'pendente',
  notified boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- 3. TRANSACTIONS — motivo, nota fiscal e beneficiário
-- =============================================================================
alter table public.transactions
  add column if not exists reason text,
  add column if not exists invoice_issued boolean,
  add column if not exists invoice_number text,
  add column if not exists beneficiary_id uuid references public.beneficiaries(id) on delete set null;

-- Backfill: registros antigos recebem o motivo a partir da descrição já existente
update public.transactions set reason = description where reason is null;

-- =============================================================================
-- 4. TRIGGERS updated_at para as tabelas novas
-- =============================================================================
drop trigger if exists set_updated_at on public.beneficiaries;
create trigger set_updated_at before update on public.beneficiaries
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.reminders;
create trigger set_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 5. ÍNDICES
-- =============================================================================
create index if not exists idx_transactions_beneficiary on public.transactions(beneficiary_id);
create index if not exists idx_beneficiaries_user on public.beneficiaries(user_id);
create index if not exists idx_reminders_user_remind_at on public.reminders(user_id, remind_at);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity, entity_id);

-- =============================================================================
-- 6. RLS — beneficiaries e reminders seguem o padrão "own_*" das demais tabelas
-- =============================================================================
alter table public.beneficiaries enable row level security;
alter table public.reminders enable row level security;

do $$
declare t text;
begin
  foreach t in array array['beneficiaries', 'reminders'] loop
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

-- =============================================================================
-- 7. TRILHA DE AUDITORIA — trigger automático em transactions
-- Grava toda inserção/edição/exclusão em audit_logs. A função roda como
-- security definer (dono do banco) para conseguir escrever mesmo depois que
-- a RLS de audit_logs for travada no passo 8 (usuário comum não escreve mais
-- diretamente nela — só este trigger).
-- =============================================================================
create or replace function public.log_transaction_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  if tg_op = 'DELETE' then
    v_user := coalesce(auth.uid(), old.user_id);
    insert into public.audit_logs(user_id, action, entity, entity_id, metadata)
    values (v_user, 'transaction_deleted', 'transactions', old.id, jsonb_build_object('old', to_jsonb(old)));
    return old;
  elsif tg_op = 'UPDATE' then
    v_user := coalesce(auth.uid(), new.user_id);
    insert into public.audit_logs(user_id, action, entity, entity_id, metadata)
    values (v_user, 'transaction_updated', 'transactions', new.id, jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
    return new;
  else
    v_user := coalesce(auth.uid(), new.user_id);
    insert into public.audit_logs(user_id, action, entity, entity_id, metadata)
    values (v_user, 'transaction_created', 'transactions', new.id, jsonb_build_object('new', to_jsonb(new)));
    return new;
  end if;
end; $$;

drop trigger if exists trg_log_transaction_audit on public.transactions;
create trigger trg_log_transaction_audit
  after insert or update or delete on public.transactions
  for each row execute function public.log_transaction_audit();

-- =============================================================================
-- 8. TRAVAR audit_logs — só leitura para o usuário; escrita só via trigger
-- (security definer acima ignora RLS). Isso impede que o próprio usuário
-- edite ou apague seu histórico de auditoria pela API.
-- =============================================================================
alter table public.audit_logs enable row level security;

drop policy if exists "own_select" on public.audit_logs;
drop policy if exists "own_insert" on public.audit_logs;
drop policy if exists "own_update" on public.audit_logs;
drop policy if exists "own_delete" on public.audit_logs;

create policy "own_select" on public.audit_logs for select using (auth.uid() = user_id);
-- Sem policies de insert/update/delete: nenhum usuário (nem via API) grava
-- ou apaga diretamente. Só a função security definer do trigger consegue.

-- =============================================================================
-- FIM DA MIGRAÇÃO 08
-- =============================================================================
