-- Admin block periods: close slots for a day or weekly recurrence.
-- Does not mutate space_bookings; schedule UI + request action enforce blocks.

create table if not exists public.space_blocks (
  id uuid primary key default gen_random_uuid(),
  repeat text not null check (repeat in ('once', 'weekly')),
  block_date date,
  dow text check (dow is null or dow in ('MON', 'TUE', 'WED', 'THU', 'FRI')),
  until_date date,
  period_from smallint not null check (period_from between 1 and 8),
  period_to smallint not null check (period_to between 1 and 8),
  reason text not null default 'Blocked',
  created_at timestamptz not null default now(),
  constraint space_blocks_period_order check (period_from <= period_to),
  constraint space_blocks_repeat_shape check (
    (repeat = 'once' and block_date is not null and dow is null)
    or (repeat = 'weekly' and dow is not null and block_date is null)
  )
);

create index if not exists space_blocks_created_idx
  on public.space_blocks (created_at desc);

alter table public.space_blocks enable row level security;

drop policy if exists "Space blocks are publicly readable" on public.space_blocks;
drop policy if exists "Teachers can create space blocks" on public.space_blocks;
drop policy if exists "Teachers can delete space blocks" on public.space_blocks;

create policy "Space blocks are publicly readable"
  on public.space_blocks for select
  using (true);

create policy "Teachers can create space blocks"
  on public.space_blocks for insert
  with check (public.is_teacher());

create policy "Teachers can delete space blocks"
  on public.space_blocks for delete
  using (public.is_teacher());

do $$
begin
  alter publication supabase_realtime add table public.space_blocks;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
