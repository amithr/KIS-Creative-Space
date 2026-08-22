-- Optional start date for weekly blocks (lower bound). Null = no lower bound (legacy).
alter table public.space_blocks
  add column if not exists start_date date;
