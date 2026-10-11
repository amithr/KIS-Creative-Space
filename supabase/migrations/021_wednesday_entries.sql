-- Wednesday design-session sign-ups (teacher portal + admin).
create table if not exists public.wednesday_entries (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  email text not null,
  period smallint not null check (period between 1 and 8),
  cls text not null,
  text text not null,
  resources text,
  project_id uuid references public.student_projects (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists wednesday_entries_date_idx
  on public.wednesday_entries (session_date, period);

create index if not exists wednesday_entries_email_idx
  on public.wednesday_entries (lower(email));

create unique index if not exists wednesday_entries_date_period_uidx
  on public.wednesday_entries (session_date, period);

alter table public.wednesday_entries enable row level security;

drop policy if exists "Wednesday entries are publicly readable" on public.wednesday_entries;
drop policy if exists "Anyone can create wednesday entries" on public.wednesday_entries;
drop policy if exists "Anyone can update wednesday entries" on public.wednesday_entries;
drop policy if exists "Anyone can delete wednesday entries" on public.wednesday_entries;

-- Mutations are authorized in server actions (teacher portal / admin).
create policy "Wednesday entries are publicly readable"
  on public.wednesday_entries for select
  using (true);

create policy "Anyone can create wednesday entries"
  on public.wednesday_entries for insert
  with check (true);

create policy "Anyone can update wednesday entries"
  on public.wednesday_entries for update
  using (true)
  with check (true);

create policy "Anyone can delete wednesday entries"
  on public.wednesday_entries for delete
  using (true);

do $$
begin
  alter publication supabase_realtime add table public.wednesday_entries;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
