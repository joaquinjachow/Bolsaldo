create table public.movements (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  movement_group text not null check (movement_group in ('Ingresos', 'Gastos fijos', 'Gastos del día a día')),
  category text not null,
  amount numeric(14, 2) not null check (amount > 0),
  movement_date date not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.movements enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.movements to authenticated;

create policy "Users can read their own movements"
on public.movements for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own movements"
on public.movements for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own movements"
on public.movements for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own movements"
on public.movements for delete
to authenticated
using ((select auth.uid()) = user_id);

create index movements_user_date_idx on public.movements (user_id, movement_date desc);
