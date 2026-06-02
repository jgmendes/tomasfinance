-- =============================================================================
-- TOMAZ FINANÇAS — Migration 07: Trial de 14 dias + Plano único + Admin
-- Execute INTEIRO no SQL Editor do Supabase (após as anteriores).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Garante plano único (mensal/anual) e colunas de ciclo
-- -----------------------------------------------------------------------------
alter table public.plans add column if not exists price_annual_cents integer not null default 0;
alter table public.billing_subscriptions add column if not exists cycle text not null default 'mensal';
alter table public.charges add column if not exists cycle text not null default 'mensal';

update public.plans set active = false where code in ('free', 'pro', 'business');

insert into public.plans (code, name, description, price_cents, price_annual_cents, sort, active, features)
values (
  'tomaz', 'Tomaz Finanças', 'Tudo por usuário', 1490, 10690, 0, true,
  '["Dashboard e relatórios completos","Receitas, despesas e contas ilimitadas","Empresas ilimitadas","CFO Virtual com IA + chat","Cofre de senhas criptografado","Metas, investimentos e cartões","Cobrança por PIX","14 dias grátis"]'
)
on conflict (code) do update set
  name = excluded.name, description = excluded.description,
  price_cents = excluded.price_cents, price_annual_cents = excluded.price_annual_cents,
  features = excluded.features, active = true, sort = 0;

-- -----------------------------------------------------------------------------
-- 2) Trial de 14 dias para NOVOS usuários (no cadastro)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_plan uuid;
begin
  insert into public.profiles (id, full_name, avatar_url, email, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email, 'user')
  on conflict (id) do update set email = excluded.email;

  select id into v_plan from public.plans where code = 'tomaz' limit 1;

  insert into public.billing_subscriptions
    (user_id, plan_id, status, billing_enabled, current_period_end, next_charge_date, cycle)
  values
    (new.id, v_plan, 'trial', true, (now() + interval '14 days')::date, (now() + interval '14 days')::date, 'mensal')
  on conflict (user_id) do nothing;

  return new;
end; $$;

-- -----------------------------------------------------------------------------
-- 3) Trial para usuários JÁ existentes que ainda não têm assinatura
-- -----------------------------------------------------------------------------
insert into public.billing_subscriptions
  (user_id, plan_id, status, billing_enabled, current_period_end, next_charge_date, cycle)
select u.id, (select id from public.plans where code = 'tomaz' limit 1),
       'trial', true, (now() + interval '14 days')::date, (now() + interval '14 days')::date, 'mensal'
from auth.users u
where not exists (select 1 from public.billing_subscriptions b where b.user_id = u.id)
on conflict (user_id) do nothing;

-- -----------------------------------------------------------------------------
-- 4) Admin pode atualizar perfis (gerenciar papéis pelo painel)
-- -----------------------------------------------------------------------------
drop policy if exists "profile_admin_update" on public.profiles;
create policy "profile_admin_update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
