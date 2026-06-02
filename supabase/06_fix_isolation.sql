-- =============================================================================
-- TOMAZ FINANÇAS — Migration 06: CORREÇÃO DE ISOLAMENTO (privacidade)
-- Garante que CADA usuário veja SOMENTE os próprios dados financeiros.
-- Remove leituras de admin e compartilhamento de "equipe" das tabelas
-- financeiras (o recurso de equipe será reintroduzido de forma explícita).
-- Execute INTEIRO no SQL Editor do Supabase.
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'companies','categories','bank_accounts','credit_cards','transactions',
    'installments','goals','investments','employees','subscriptions',
    'notifications','reports'
  ] loop
    -- Garante RLS ligado
    execute format('alter table public.%I enable row level security;', t);

    -- Remove TODAS as políticas conhecidas (de versões anteriores)
    execute format('drop policy if exists "own_select" on public.%I;', t);
    execute format('drop policy if exists "own_insert" on public.%I;', t);
    execute format('drop policy if exists "own_update" on public.%I;', t);
    execute format('drop policy if exists "own_delete" on public.%I;', t);
    execute format('drop policy if exists "admin_select" on public.%I;', t);

    -- Recria estritamente por dono (user_id = usuário logado)
    execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- O painel admin continua funcionando: ele usa profiles, kyc e billing
-- (que têm políticas de admin próprias e intencionais). As tabelas
-- financeiras acima agora são 100% privadas de cada usuário.
