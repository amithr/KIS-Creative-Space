-- Space-booking confirmation: pending → confirmed | declined | cancelled
-- Evolves period_bookings → space_bookings. Item reservations unchanged.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'period_bookings'
  ) then
    alter table public.period_bookings rename to space_bookings;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'period_bookings_pkey'
  ) then
    alter table public.space_bookings
      rename constraint period_bookings_pkey to space_bookings_pkey;
  end if;
end $$;

alter index if exists period_bookings_date_idx rename to space_bookings_date_idx;

alter table public.space_bookings
  add column if not exists purpose text,
  add column if not exists area text,
  add column if not exists request_group uuid,
  add column if not exists status text,
  add column if not exists decided_at timestamptz,
  add column if not exists decided_by text,
  add column if not exists decline_reason text;

-- Existing instant bookings → confirmed; new requests default to pending.
update public.space_bookings
set status = 'confirmed'
where status is null;

alter table public.space_bookings
  alter column status set default 'pending',
  alter column status set not null;

alter table public.space_bookings drop constraint if exists space_bookings_status_check;
alter table public.space_bookings
  add constraint space_bookings_status_check
  check (status in ('pending', 'confirmed', 'declined', 'cancelled'));

-- Allow overlap: drop hard unique; only pending/confirmed occupy the grid.
alter table public.space_bookings
  drop constraint if exists period_bookings_booking_date_period_key;
alter table public.space_bookings
  drop constraint if exists space_bookings_booking_date_period_key;

create index if not exists space_bookings_active_slot_idx
  on public.space_bookings (booking_date, period)
  where status in ('pending', 'confirmed');

create index if not exists space_bookings_status_date_idx
  on public.space_bookings (status, booking_date);

drop policy if exists "Period bookings are publicly readable" on public.space_bookings;
drop policy if exists "Anyone can create period bookings" on public.space_bookings;
drop policy if exists "Anyone can delete period bookings" on public.space_bookings;
drop policy if exists "Space bookings are publicly readable" on public.space_bookings;
drop policy if exists "Anyone can request space bookings" on public.space_bookings;
drop policy if exists "Anyone can cancel active space bookings" on public.space_bookings;
drop policy if exists "Teachers can decide space bookings" on public.space_bookings;

create policy "Space bookings are publicly readable"
  on public.space_bookings for select
  using (true);

create policy "Anyone can request space bookings"
  on public.space_bookings for insert
  with check (status = 'pending');

create policy "Anyone can cancel active space bookings"
  on public.space_bookings for update
  using (status in ('pending', 'confirmed'))
  with check (status = 'cancelled');

create policy "Teachers can decide space bookings"
  on public.space_bookings for update
  using (public.is_teacher())
  with check (public.is_teacher());

-- Realtime (ignore if already present / publication missing)
do $$
begin
  alter publication supabase_realtime add table public.space_bookings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
