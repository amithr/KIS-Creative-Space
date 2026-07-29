-- Reservations and max loan period setting

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  name text not null,
  email text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'returned')),
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (char_length(trim(name)) > 0),
  check (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

create index reservations_equipment_id_idx on public.reservations (equipment_id);
create index reservations_dates_idx on public.reservations (start_date, end_date);

alter table public.reservations enable row level security;

create policy "Anyone can create reservations"
  on public.reservations for insert
  with check (true);

create policy "Teachers can read reservations"
  on public.reservations for select
  using (public.is_teacher());

create policy "Teachers can update reservations"
  on public.reservations for update
  using (public.is_teacher());

create policy "Teachers can delete reservations"
  on public.reservations for delete
  using (public.is_teacher());

insert into public.site_settings (key, value) values
  ('max_reservation_days', '7')
on conflict (key) do nothing;
