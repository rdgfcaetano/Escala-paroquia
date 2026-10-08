-- Execute este script uma vez no SQL Editor do Supabase.
create table if not exists public.servers (
  id text primary key,
  name text not null,
  availability text not null default '',
  active boolean not null default true
);

create table if not exists public.masses (
  id text primary key,
  day text not null,
  weekday integer not null check (weekday between 0 and 6),
  time text not null,
  place text not null default 'Igreja',
  slots integer not null default 2 check (slots between 1 and 20)
);

create table if not exists public.events (
  id text primary key,
  title text not null,
  date date not null,
  type text not null check (type in ('evento', 'feriado'))
);

create table if not exists public.generated_scales (
  month text primary key check (month ~ '^\d{4}-\d{2}$'),
  assignments jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.servers enable row level security;
alter table public.masses enable row level security;
alter table public.events enable row level security;
alter table public.generated_scales enable row level security;

-- Este app é privado: somente contas autenticadas podem acessar os dados.
drop policy if exists "Authenticated users manage servers" on public.servers;
drop policy if exists "Authenticated users manage masses" on public.masses;
drop policy if exists "Authenticated users manage events" on public.events;
drop policy if exists "Authenticated users manage generated scales" on public.generated_scales;

create policy "Authenticated users manage servers" on public.servers
  for all to authenticated using (true) with check (true);
create policy "Authenticated users manage masses" on public.masses
  for all to authenticated using (true) with check (true);
create policy "Authenticated users manage events" on public.events
  for all to authenticated using (true) with check (true);
create policy "Authenticated users manage generated scales" on public.generated_scales
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.servers to authenticated;
grant select, insert, update, delete on public.masses to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.generated_scales to authenticated;
revoke all on public.servers, public.masses, public.events, public.generated_scales from anon;
