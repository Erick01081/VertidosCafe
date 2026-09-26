-- Ejecuta todo este archivo en Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.coffees (
  id uuid primary key default gen_random_uuid(),
  name text not null default '', roaster text not null default '', variety text not null default '',
  country text not null default '', region text not null default '', municipality text not null default '',
  farm text not null default '', producer text not null default '', process text not null default '',
  altitude integer, notes text not null default '', photo_path text,
  created_at timestamptz not null default now()
);
create table if not exists public.brews (
  id uuid primary key default gen_random_uuid(),
  coffee_id uuid not null references public.coffees(id) on delete cascade,
  brewed_at timestamptz not null default now(), recipe jsonb not null,
  dripper text not null default 'V60', grind text not null default '', temperature numeric,
  total_time text not null default '', flavor text not null default '', aroma text not null default '',
  body text not null default '', extraction text not null default '', change_next text not null default '', details text not null default ''
);
-- Elimina políticas previas solo de las tablas que usa Cafetal.
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('coffees', 'brews')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;
-- Permite volver a ejecutar este esquema sobre la primera versión con cuentas.
drop index if exists public.coffees_user_created_idx;
drop index if exists public.brews_user_date_idx;
alter table public.coffees drop column if exists user_id;
alter table public.brews drop column if exists user_id;
create index if not exists coffees_created_idx on public.coffees(created_at desc);
create index if not exists brews_date_idx on public.brews(brewed_at desc);
create index if not exists brews_coffee_date_idx on public.brews(coffee_id, brewed_at desc);

alter table public.coffees enable row level security;
alter table public.brews enable row level security;
create policy "Public access for personal app" on public.coffees for all to anon, authenticated using (true) with check (true);
create policy "Public access for personal app" on public.brews for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.coffees, public.brews to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coffee-photos', 'coffee-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
-- Reemplaza políticas anteriores que hacen referencia a este bucket, sin tocar otros buckets.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ilike '%coffee-photos%'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;
create policy "Public manage coffee photos" on storage.objects for all to anon, authenticated using (bucket_id = 'coffee-photos') with check (bucket_id = 'coffee-photos');
grant select, insert, update, delete on storage.objects to anon, authenticated;
