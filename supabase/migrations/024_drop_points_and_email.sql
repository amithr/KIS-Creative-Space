-- Student print site v3: the points economy and the email identity go.
-- Requests carry the student's name only; the tracker and cancel match on it.
-- Drops origin / teacher / quality / adjust (points) and email.

-- Policies reference the dropped columns, so they go first.
drop policy if exists "Anyone can create print requests" on public.print_requests;

alter table public.print_requests
  drop column if exists origin,
  drop column if exists teacher,
  drop column if exists quality,
  drop column if exists adjust,
  drop column if exists email;

alter table public.print_requests drop constraint if exists print_requests_origin_check;
alter table public.print_requests drop constraint if exists print_requests_quality_check;

drop index if exists public.print_requests_email_idx;
create index if not exists print_requests_name_idx
  on public.print_requests (lower(name), created_at desc);

-- Students insert at RECEIVED; teachers (and the service role used by the
-- Studio Admin) may restore any row.
create policy "Anyone can create print requests"
  on public.print_requests for insert
  with check (status = 0 or auth.uid() in (select id from public.teachers));
