-- Managed item areas (categories) for inventory grouping.

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists areas_name_lower_uidx
  on public.areas (lower(trim(name)));

create index if not exists areas_sort_order_idx
  on public.areas (sort_order, name);

alter table public.areas enable row level security;

drop policy if exists "Areas are publicly readable" on public.areas;
drop policy if exists "Teachers can insert areas" on public.areas;
drop policy if exists "Teachers can delete areas" on public.areas;

create policy "Areas are publicly readable"
  on public.areas for select
  using (true);

create policy "Teachers can insert areas"
  on public.areas for insert
  with check (public.is_teacher());

create policy "Teachers can delete areas"
  on public.areas for delete
  using (public.is_teacher());

-- Seed defaults, then any distinct areas already on equipment.
insert into public.areas (name, sort_order)
select d.name, d.sort_order
from (values
  ('LEGO Play', 1),
  ('Robotics', 2),
  ('Art & Design', 3),
  ('VR Lab', 4),
  ('3D Printing', 5)
) as d(name, sort_order)
where not exists (
  select 1 from public.areas a
  where lower(trim(a.name)) = lower(trim(d.name))
);

insert into public.areas (name, sort_order)
select distinct e.area, 100 + row_number() over (order by e.area)
from public.equipment e
where char_length(trim(e.area)) > 0
  and not exists (
    select 1 from public.areas a
    where lower(trim(a.name)) = lower(trim(e.area))
  );

do $$
begin
  alter publication supabase_realtime add table public.areas;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
