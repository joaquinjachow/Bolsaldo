alter table public.movements
  add column if not exists installment_id text,
  add column if not exists installment_number integer,
  add column if not exists installment_total integer,
  add column if not exists paid boolean not null default true;

create index if not exists movements_installment_idx on public.movements (user_id, installment_id);
