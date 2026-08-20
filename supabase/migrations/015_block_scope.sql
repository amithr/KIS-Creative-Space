-- Training-only block scope: reserve periods from Book training without
-- closing them on the public Schedule. Missing/legacy = 'all'.

alter table public.space_blocks
  add column if not exists scope text not null default 'all'
  check (scope in ('all', 'training'));
