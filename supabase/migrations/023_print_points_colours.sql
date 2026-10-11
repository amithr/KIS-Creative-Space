-- Student print site v2: points economy (origin / quality / adjust), school-project
-- teacher, admin-managed filament colours. Drops the v1 grade/size/due/notes fields.

alter table public.print_requests
  add column if not exists origin text not null default 'found',
  add column if not exists teacher text,
  add column if not exists quality smallint not null default 1,
  add column if not exists adjust integer not null default 0;

alter table public.print_requests drop constraint if exists print_requests_origin_check;
alter table public.print_requests
  add constraint print_requests_origin_check check (origin in ('mine', 'school', 'found'));
alter table public.print_requests drop constraint if exists print_requests_quality_check;
alter table public.print_requests
  add constraint print_requests_quality_check check (quality between 1 and 3);
-- Colours are now admin-managed slugs, so the fixed list goes.
alter table public.print_requests drop constraint if exists print_requests_color_check;

alter table public.print_requests
  drop column if exists grade,
  drop column if exists size,
  drop column if exists due,
  drop column if exists notes;

drop index if exists public.print_requests_status_idx;
create index if not exists print_requests_status_idx
  on public.print_requests (status, created_at desc);

-- Students insert at RECEIVED with default quality/adjust; teachers (and the
-- service role used by the Studio Admin) may restore any row.
drop policy if exists "Anyone can create print requests" on public.print_requests;
create policy "Anyone can create print requests"
  on public.print_requests for insert
  with check (
    (status = 0 and quality = 1 and adjust = 0)
    or auth.uid() in (select id from public.teachers)
  );

-- Filament colours on offer (Studio Admin manages; students see `on` only).
create table if not exists public.filament_colors (
  v text primary key,
  label text not null,
  hex text not null,
  "on" boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.filament_colors enable row level security;

drop policy if exists "Filament colours are publicly readable" on public.filament_colors;
drop policy if exists "Teachers manage filament colours" on public.filament_colors;

create policy "Filament colours are publicly readable"
  on public.filament_colors for select
  using (true);

create policy "Teachers manage filament colours"
  on public.filament_colors for all
  using (auth.uid() in (select id from public.teachers))
  with check (auth.uid() in (select id from public.teachers));

do $$
begin
  alter publication supabase_realtime add table public.filament_colors;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

insert into public.filament_colors (v, label, hex, "on", sort) values
  ('red', 'RED', '#b5342c', true, 0),
  ('white', 'WHITE', '#f4efe6', true, 1),
  ('black', 'BLACK', '#2a211c', true, 2),
  ('blue', 'BLUE', '#2f5d8a', true, 3),
  ('yellow', 'YELLOW', '#e0b020', true, 4),
  ('natural', 'NATURAL', '#d9c7a8', true, 5)
on conflict (v) do nothing;

-- Demo data (prototype seed): three students, mixed origins and stages.
update public.print_requests set origin = 'mine', quality = 1
  where id = '00000000-0000-4000-8000-000000000001';
update public.print_requests set origin = 'mine', quality = 1
  where id = '00000000-0000-4000-8000-000000000003';
update public.print_requests set origin = 'found', quality = 1
  where id = '00000000-0000-4000-8000-000000000002';

insert into public.print_requests
  (id, kind, origin, teacher, quality, name, email, file_name, file_size, color, qty, cut, status, created_at)
values
  ('00000000-0000-4000-8000-000000000004', '3d', 'mine', null, 3, 'Olena K.', 'olena.k@kis.edu',
   'gear-housing.stl', 2411000, 'black', 1, null, 3, now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000000005', '3d', 'mine', null, 2, 'Taras B.', 'taras.b@kis.edu',
   'bridge-truss.stl', 1870000, 'blue', 1, null, 3, now() - interval '12 days'),
  ('00000000-0000-4000-8000-000000000006', 'poster', 'school', 'i.tkachenko', 1, 'Mira S.', 'mira.s@kis.edu',
   'science-fair-a3.pdf', 5320000, 'vinyl', 2, 'square', 3, now() - interval '5 days'),
  ('00000000-0000-4000-8000-000000000007', '3d', 'mine', null, 2, 'Mira S.', 'mira.s@kis.edu',
   'cell-model.stl', 3100000, 'yellow', 1, null, 3, now() - interval '15 days')
on conflict (id) do nothing;
