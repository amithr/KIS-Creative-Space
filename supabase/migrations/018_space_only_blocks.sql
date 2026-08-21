-- Third block scope: space-only (closes Schedule, training stays open).

alter table public.space_blocks
  drop constraint if exists space_blocks_scope_check;

alter table public.space_blocks
  add constraint space_blocks_scope_check
  check (scope in ('all', 'training', 'space'));
