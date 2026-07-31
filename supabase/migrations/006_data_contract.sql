-- Data contract: reservation lifecycle (reserved → out → returned) + activity_events

-- ---------------------------------------------------------------------------
-- 1. Reshape reservations
-- ---------------------------------------------------------------------------

-- Drop old status / email / date constraints that conflict with the new shape
alter table public.reservations drop constraint if exists reservations_status_check;
alter table public.reservations drop constraint if exists reservations_email_check;
alter table public.reservations drop constraint if exists reservations_dates_order_check;
alter table public.reservations drop constraint if exists reservations_check;

-- New columns
alter table public.reservations
  add column if not exists qty integer not null default 1,
  add column if not exists days date[] not null default '{}',
  add column if not exists period_start smallint,
  add column if not exists period_end smallint,
  add column if not exists out_qty integer not null default 0,
  add column if not exists source text not null default 'web',
  add column if not exists out_at timestamptz,
  add column if not exists returned_at timestamptz;

-- Backfill days from legacy start_date / end_date
update public.reservations
set days = case
  when start_date is not null and end_date is not null then
    (
      select coalesce(array_agg(d::date order by d), array[start_date])
      from generate_series(start_date::timestamp, end_date::timestamp, '1 day'::interval) as d
    )
  when start_date is not null then array[start_date]
  when end_date is not null then array[end_date]
  else array[current_date]
end
where cardinality(days) = 0;

update public.reservations set qty = greatest(qty, 1) where qty < 1;

-- Map legacy statuses
update public.reservations
set status = case
  when status in ('pending', 'confirmed') then 'reserved'
  when status = 'cancelled' then 'returned'
  when status = 'returned' then 'returned'
  when status in ('reserved', 'out', 'returned') then status
  else 'reserved'
end;

-- Remove cancelled leftovers as returned is fine; keep rows
-- Drop email not-null already done in 005; make email fully optional / unused
alter table public.reservations alter column email drop not null;

-- Period range: both null = "all day"
alter table public.reservations drop constraint if exists reservations_periods_check;
alter table public.reservations
  add constraint reservations_periods_check
  check (
    (period_start is null and period_end is null)
    or (
      period_start between 1 and 8
      and period_end between 1 and 8
      and period_end >= period_start
    )
  );

alter table public.reservations drop constraint if exists reservations_qty_check;
alter table public.reservations
  add constraint reservations_qty_check check (qty >= 1);

alter table public.reservations drop constraint if exists reservations_out_qty_check;
alter table public.reservations
  add constraint reservations_out_qty_check check (out_qty >= 0);

alter table public.reservations drop constraint if exists reservations_source_check;
alter table public.reservations
  add constraint reservations_source_check check (source in ('web', 'app'));

alter table public.reservations drop constraint if exists reservations_status_check;
alter table public.reservations
  add constraint reservations_status_check
  check (status in ('reserved', 'out', 'returned'));

alter table public.reservations drop constraint if exists reservations_days_check;
alter table public.reservations
  add constraint reservations_days_check check (cardinality(days) >= 1);

create index if not exists reservations_status_idx on public.reservations (status);
create index if not exists reservations_days_idx on public.reservations using gin (days);

-- ---------------------------------------------------------------------------
-- 2. RLS: public read + create reserved; undo reserved; teachers update
-- ---------------------------------------------------------------------------

drop policy if exists "Anyone can create reservations" on public.reservations;
drop policy if exists "Teachers can read reservations" on public.reservations;
drop policy if exists "Teachers can update reservations" on public.reservations;
drop policy if exists "Teachers can delete reservations" on public.reservations;

create policy "Reservations are publicly readable"
  on public.reservations for select
  using (true);

create policy "Anyone can create web reservations"
  on public.reservations for insert
  with check (
    status = 'reserved'
    and source = 'web'
  );

create policy "Teachers can create app reservations"
  on public.reservations for insert
  with check (
    public.is_teacher()
    and source = 'app'
  );

create policy "Anyone can undo reserved reservations"
  on public.reservations for delete
  using (status = 'reserved');

create policy "Teachers can delete reservations"
  on public.reservations for delete
  using (public.is_teacher());

create policy "Teachers can update reservations"
  on public.reservations for update
  using (public.is_teacher())
  with check (public.is_teacher());

-- ---------------------------------------------------------------------------
-- 3. activity_events (shared audit log)
-- ---------------------------------------------------------------------------

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  type text not null
    check (type in ('reserve', 'checkout', 'checkin', 'add', 'remove', 'edit', 'sync')),
  item_id uuid references public.equipment (id) on delete set null,
  reservation_id uuid references public.reservations (id) on delete set null,
  actor text not null default '',
  source text not null
    check (source in ('WEBSITE', 'THIS PHONE', 'ADMIN', 'AUTO')),
  at timestamptz not null default now(),
  message text not null default ''
);

create index if not exists activity_events_at_idx
  on public.activity_events (at desc);

alter table public.activity_events enable row level security;

drop policy if exists "Activity events are publicly readable" on public.activity_events;
drop policy if exists "Anyone can insert website activity" on public.activity_events;
drop policy if exists "Teachers can insert activity" on public.activity_events;

create policy "Activity events are publicly readable"
  on public.activity_events for select
  using (true);

create policy "Anyone can insert website activity"
  on public.activity_events for insert
  with check (source = 'WEBSITE');

create policy "Teachers can insert activity"
  on public.activity_events for insert
  with check (public.is_teacher());
