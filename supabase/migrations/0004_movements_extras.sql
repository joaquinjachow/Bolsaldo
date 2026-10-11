alter table public.movements drop constraint if exists movements_movement_group_check;
alter table public.movements add column if not exists currency text not null default 'ARS' check (currency in ('ARS', 'USD', 'EUR', 'BRL'));
alter table public.movements add column if not exists attachment_path text;

insert into storage.buckets (id, name, public)
values ('movement-receipts', 'movement-receipts', false)
on conflict (id) do nothing;

create policy "Users upload their own receipts"
on storage.objects for insert to authenticated
with check (bucket_id = 'movement-receipts' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users view their own receipts"
on storage.objects for select to authenticated
using (bucket_id = 'movement-receipts' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users update their own receipts"
on storage.objects for update to authenticated
using (bucket_id = 'movement-receipts' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users delete their own receipts"
on storage.objects for delete to authenticated
using (bucket_id = 'movement-receipts' and (storage.foldername(name))[1] = (select auth.uid()::text));
