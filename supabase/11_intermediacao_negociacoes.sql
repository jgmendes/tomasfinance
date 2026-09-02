-- =============================================================================
-- TOMASIN INTERMEDIAÇÕES — Migration 11: NEGOCIAÇÕES
-- Primeiro módulo do novo produto de Intermediação e Negociação de Negócios
-- (Tomasin Intermediações de Negócios LTDA, CNPJ 68.248.717/0001-90).
-- Mesmo projeto/Supabase/login do Tomas Finance — reaproveita public.is_admin().
-- Execute INTEIRO no SQL Editor do Supabase (depois das migrações 01–10).
-- =============================================================================

-- =============================================================================
-- 1. NEGOTIATIONS — a negociação em si (condição atual + status + condição final)
-- =============================================================================
create table if not exists public.negotiations (
  id uuid primary key default gen_random_uuid(),
  number bigserial unique,
  user_id uuid not null references auth.users(id) on delete cascade, -- o cliente dono
  client_company_name text not null,
  necessidade text not null,
  -- Termos livres da condição atual (ex.: {"taxa_atual": "4.99%", "volume_mensal": 500000, "custo_estimado": 24950})
  condicao_atual jsonb,
  status text not null default 'solicitacao_recebida' check (status in (
    'solicitacao_recebida', 'em_analise', 'negociacao',
    'contraproposta_enviada', 'contraproposta_recebida',
    'aprovada', 'recusada', 'cancelada'
  )),
  -- Preenchido só quando status = 'aprovada'
  condicao_final jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_updated_at on public.negotiations;
create trigger set_updated_at before update on public.negotiations
  for each row execute function public.set_updated_at();

create index if not exists idx_negotiations_user on public.negotiations(user_id);

alter table public.negotiations enable row level security;
drop policy if exists "own_select" on public.negotiations;
drop policy if exists "own_insert" on public.negotiations;
drop policy if exists "own_update" on public.negotiations;
drop policy if exists "own_delete" on public.negotiations;

-- Cliente vê/atualiza a própria; admin vê/atualiza todas.
create policy "own_select" on public.negotiations
  for select using (auth.uid() = user_id or public.is_admin());
create policy "own_update" on public.negotiations
  for update using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());
-- Só o admin cria negociações nesta fase (cliente ainda não tem "Solicitações").
create policy "own_insert" on public.negotiations
  for insert with check (public.is_admin());
-- Só o admin pode remover (corrigir cadastro errado).
create policy "own_delete" on public.negotiations
  for delete using (public.is_admin());

-- =============================================================================
-- 2. NEGOTIATION_EVENTS — histórico imutável (propostas, contrapropostas, mensagens)
-- =============================================================================
create table if not exists public.negotiation_events (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references public.negotiations(id) on delete cascade,
  -- 'admin' = Tomasin, 'parceiro' = o terceiro sendo negociado (sem login,
  -- registrado manualmente pelo admin), 'cliente' = o usuário dono da negociação.
  author_role text not null check (author_role in ('admin', 'parceiro', 'cliente')),
  event_type text not null check (event_type in (
    'proposta_inicial', 'contraproposta', 'mensagem',
    'aprovacao', 'recusa', 'cancelamento'
  )),
  -- Termos propostos neste evento, quando aplicável (ex.: {"taxa": "3.00%", "volume": 500000, "prazo_meses": 12, "condicao_pagamento": "..."})
  terms jsonb,
  message text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists idx_negotiation_events_negotiation on public.negotiation_events(negotiation_id);

alter table public.negotiation_events enable row level security;
drop policy if exists "own_select" on public.negotiation_events;
drop policy if exists "own_insert" on public.negotiation_events;

-- Acesso via dono da negociação relacionada (ou admin). Sem policy de
-- update/delete: histórico é append-only por design, igual audit_logs.
create policy "own_select" on public.negotiation_events
  for select using (
    exists (
      select 1 from public.negotiations n
      where n.id = negotiation_events.negotiation_id
        and (n.user_id = auth.uid() or public.is_admin())
    )
  );
create policy "own_insert" on public.negotiation_events
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.negotiations n
      where n.id = negotiation_events.negotiation_id
        and (n.user_id = auth.uid() or public.is_admin())
    )
  );

-- =============================================================================
-- FIM DA MIGRAÇÃO 11
-- =============================================================================
