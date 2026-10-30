-- ON THE PRINTERS shows "N min ago" relative to the last stage change, not
-- only to submission. The trigger stamps status_at whenever status moves.
-- A fresh insert gets now() for both created_at and status_at (same
-- transaction clock, so they are equal); a restore-after-undo re-inserts the
-- snapshot's own status_at.
alter table public.print_requests
  add column if not exists status_at timestamptz not null default now();

-- Backfill every existing row: READY rows already know when they got there;
-- everything else counts from submission.
update public.print_requests
  set status_at = coalesce(ready_at, created_at);

create or replace function public.print_requests_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.status_at := now();
  end if;
  if new.status = 3 and (old.status is distinct from 3) then
    new.ready_at := coalesce(new.ready_at, now());
  end if;
  return new;
end;
$$;
