create table public.finance_groups (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.finance_categories (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.finance_groups(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, group_id, name)
);

alter table public.finance_groups enable row level security;
alter table public.finance_categories enable row level security;
grant select, insert, update, delete on public.finance_groups, public.finance_categories to authenticated;

create policy "Users manage their own groups" on public.finance_groups for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own categories" on public.finance_categories for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
