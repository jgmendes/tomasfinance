-- =============================================================================
-- TOMAS FINANCE — Migration 10: ONBOARDING + LEMBRETE RECORRENTE
-- Onboarding obrigatório no primeiro acesso (tipo de uso + empresa) e suporte
-- a lembretes recorrentes (ex.: lembrete diário de registrar gastos).
-- Execute INTEIRO no SQL Editor do Supabase.
-- =============================================================================

-- =============================================================================
-- 1. PROFILES — estado do onboarding
-- =============================================================================
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists usage_type text;

-- Backfill: quem já tem transação ou empresa cadastrada é considerado usuário
-- ativo — não deve ser interrompido pelo onboarding retroativamente.
update public.profiles p
set onboarding_completed = true
where onboarding_completed = false
  and (
    exists (select 1 from public.transactions t where t.user_id = p.id)
    or exists (select 1 from public.companies c where c.user_id = p.id)
  );

-- =============================================================================
-- 2. REMINDERS — recorrência (ex.: lembrete diário)
-- =============================================================================
alter table public.reminders
  add column if not exists recurrence text check (recurrence is null or recurrence in ('daily'));

-- =============================================================================
-- FIM DA MIGRAÇÃO 10
-- =============================================================================
