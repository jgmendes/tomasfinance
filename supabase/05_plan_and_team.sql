-- =============================================================================
-- TOMAZ FINANÇAS — Migration 05: Plano único (mensal/anual) + Equipe (multiusuário)
-- Execute no SQL Editor do Supabase (após schema.sql, 02, 03 e 04).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) PLANO ÚNICO com preço mensal e anual (por usuário)
-- -----------------------------------------------------------------------------
alter table public.plans add column if not exists price_annual_cents integer not null default 0;

-- Desativa os planos antigos
update public.plans set active = false where code in ('free', 'pro', 'business');

-- Plano único
insert into public.plans (code, name, description, price_cents, price_annual_cents, sort, active, features)
values (
  'tomaz',
  'Tomaz Finanças',
  'Plano completo, por usuário',
  1490,    -- mensal R$ 14,90
  10690,   -- anual R$ 106,90
  0,
  true,
  '["Dashboard e relatórios completos","Receitas, despesas e contas ilimitadas","Empresas ilimitadas e multiusuário","CFO Virtual com IA + chat","Cofre de senhas criptografado","Metas, investimentos e cartões","Cobrança por PIX","Suporte prioritário"]'
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  price_annual_cents = excluded.price_annual_cents,
  features = excluded.features,
  active = true,
  sort = 0;

-- Ciclo (mensal/anual) na assinatura e na cobrança
alter table public.billing_subscriptions add column if not exists cycle text not null default 'mensal';
alter table public.charges add column if not exists cycle text not null default 'mensal';

-- -----------------------------------------------------------------------------
-- 2) EQUIPE — vários usuários no mesmo painel (workspace do dono)
-- -----------------------------------------------------------------------------
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'membro',
  created_at timestamptz default now(),
  unique (owner_id, member_id)
);

create index if not exists idx_wm_owner on public.workspace_members(owner_id);
create index if not exists idx_wm_member on public.workspace_members(member_id);

alter table public.workspace_members enable row level security;
drop policy if exists "wm_select" on public.workspace_members;
create policy "wm_select" on public.workspace_members
  for select using (owner_id = auth.uid() or member_id = auth.uid());

-- Conjunto de user_ids acessíveis (eu + meu workspace). Para usuário solo,
-- retorna apenas o próprio id (comportamento idêntico ao anterior).
create or replace function public.accessible_user_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  with my_owner as (
    select coalesce(
      (select owner_id from public.workspace_members where member_id = auth.uid() limit 1),
      auth.uid()
    ) as oid
  )
  select oid from my_owner
  union
  select wm.member_id from public.workspace_members wm, my_owner mo where wm.owner_id = mo.oid
  union
  select auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- 3) RLS compartilhada nas tabelas financeiras (cada membro vê/edita os dados
--    do workspace). Cofre, KYC e cobrança continuam PESSOAIS (não compartilham).
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'companies','categories','bank_accounts','credit_cards','transactions',
    'installments','goals','investments','employees','subscriptions'
  ] loop
    execute format('drop policy if exists "own_select" on public.%I;', t);
    execute format('drop policy if exists "own_update" on public.%I;', t);
    execute format('drop policy if exists "own_delete" on public.%I;', t);
    execute format('create policy "own_select" on public.%I for select using (user_id in (select public.accessible_user_ids()));', t);
    execute format('create policy "own_update" on public.%I for update using (user_id in (select public.accessible_user_ids())) with check (user_id in (select public.accessible_user_ids()));', t);
    execute format('create policy "own_delete" on public.%I for delete using (user_id in (select public.accessible_user_ids()));', t);
    -- own_insert (user_id = auth.uid()) permanece como definido no schema.
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 4) RPCs de gestão de equipe (SECURITY DEFINER — busca por e-mail com segurança)
-- -----------------------------------------------------------------------------
create or replace function public.add_workspace_member(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  select id into target from public.profiles where lower(email) = lower(p_email) limit 1;
  if target is null then
    raise exception 'Usuário com este e-mail não encontrado. Ele precisa criar uma conta primeiro.';
  end if;
  if target = auth.uid() then
    raise exception 'Você não pode adicionar a si mesmo.';
  end if;
  insert into public.workspace_members (owner_id, member_id)
  values (auth.uid(), target)
  on conflict (owner_id, member_id) do nothing;
end; $$;

create or replace function public.remove_workspace_member(p_member_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.workspace_members where owner_id = auth.uid() and member_id = p_member_id;
$$;

create or replace function public.list_my_team()
returns table(user_id uuid, email text, full_name text, is_owner boolean)
language sql stable security definer set search_path = public as $$
  with my_owner as (
    select coalesce(
      (select owner_id from public.workspace_members where member_id = auth.uid() limit 1),
      auth.uid()
    ) as oid
  )
  select p.id, p.email, p.full_name, (p.id = mo.oid) as is_owner
  from my_owner mo
  join public.profiles p
    on p.id = mo.oid
    or p.id in (select member_id from public.workspace_members where owner_id = mo.oid)
  order by is_owner desc, p.full_name;
$$;
