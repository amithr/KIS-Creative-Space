-- Design handoff: quantity_total + period bookings for room schedule

alter table public.equipment
  add column if not exists quantity_total integer not null default 0
  check (quantity_total >= 0);

update public.equipment
set quantity_total = greatest(quantity_total, quantity_available)
where quantity_total < quantity_available;

-- Period bookings for "Schedule the space" (P1–P8, Mon–Fri)
create table if not exists public.period_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  period smallint not null check (period between 1 and 8),
  teacher_name text not null,
  created_at timestamptz not null default now(),
  unique (booking_date, period),
  check (char_length(trim(teacher_name)) > 0)
);

create index if not exists period_bookings_date_idx
  on public.period_bookings (booking_date);

alter table public.period_bookings enable row level security;

create policy "Period bookings are publicly readable"
  on public.period_bookings for select
  using (true);

create policy "Anyone can create period bookings"
  on public.period_bookings for insert
  with check (true);

create policy "Anyone can delete period bookings"
  on public.period_bookings for delete
  using (true);

-- Soften reservation email requirement for inline name+class reserves
alter table public.reservations
  drop constraint if exists reservations_email_check;

alter table public.reservations
  alter column email drop not null;

alter table public.reservations
  alter column start_date drop not null;

alter table public.reservations
  alter column end_date drop not null;

alter table public.reservations
  add constraint reservations_email_check
  check (email is null or email ~* '^[^@]+@[^@]+\.[^@]+$');

alter table public.reservations
  drop constraint if exists reservations_check;

alter table public.reservations
  add constraint reservations_dates_order_check
  check (
    start_date is null
    or end_date is null
    or end_date >= start_date
  );
