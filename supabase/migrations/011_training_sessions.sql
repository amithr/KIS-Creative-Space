-- Training sessions with the Creativity Space coordinator.
-- Availability is derived from space_bookings + space_blocks (one-way);
-- training sessions never block the space schedule.

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  period smallint not null check (period between 1 and 8),
  teacher_name text not null check (char_length(trim(teacher_name)) > 0),
  topic text not null check (char_length(trim(topic)) > 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  decline_reason text
);

create index if not exists training_sessions_date_idx
  on public.training_sessions (session_date);

create unique index if not exists training_sessions_active_slot_uidx
  on public.training_sessions (session_date, period)
  where status in ('pending', 'confirmed');

create index if not exists training_sessions_status_date_idx
  on public.training_sessions (status, session_date);

alter table public.training_sessions enable row level security;

drop policy if exists "Training sessions are publicly readable" on public.training_sessions;
drop policy if exists "Anyone can request training sessions" on public.training_sessions;
drop policy if exists "Anyone can cancel active training sessions" on public.training_sessions;
drop policy if exists "Teachers can decide training sessions" on public.training_sessions;

create policy "Training sessions are publicly readable"
  on public.training_sessions for select
  using (true);

create policy "Anyone can request training sessions"
  on public.training_sessions for insert
  with check (status = 'pending');

create policy "Anyone can cancel active training sessions"
  on public.training_sessions for update
  using (status in ('pending', 'confirmed'))
  with check (status = 'cancelled');

create policy "Teachers can decide training sessions"
  on public.training_sessions for update
  using (public.is_teacher())
  with check (public.is_teacher());

do $$
begin
  alter publication supabase_realtime add table public.training_sessions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
