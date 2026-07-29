-- KIS Creativity Space — initial schema

create extension if not exists "pgcrypto";

-- Teachers (must match a row in auth.users after sign-up)
create table public.teachers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Equipment inventory (each row has a unique QR code slug)
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  qr_code text not null unique,
  area text not null,
  name text not null,
  detail text not null default '',
  quantity_available integer not null default 0 check (quantity_available >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index equipment_sort_order_idx on public.equipment (sort_order, name);

-- Editable site content (weekly note, etc.)
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger equipment_updated_at
  before update on public.equipment
  for each row execute function public.set_updated_at();

create trigger site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- Helper: is the current user a teacher?
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teachers where id = auth.uid()
  );
$$;

-- RLS
alter table public.teachers enable row level security;
alter table public.equipment enable row level security;
alter table public.site_settings enable row level security;

create policy "Teachers can read own row"
  on public.teachers for select
  using (auth.uid() = id);

create policy "Equipment is publicly readable"
  on public.equipment for select
  using (true);

create policy "Teachers can insert equipment"
  on public.equipment for insert
  with check (public.is_teacher());

create policy "Teachers can update equipment"
  on public.equipment for update
  using (public.is_teacher());

create policy "Teachers can delete equipment"
  on public.equipment for delete
  using (public.is_teacher());

create policy "Site settings are publicly readable"
  on public.site_settings for select
  using (true);

create policy "Teachers can manage site settings"
  on public.site_settings for all
  using (public.is_teacher())
  with check (public.is_teacher());

-- Seed settings
insert into public.site_settings (key, value) values
  ('weekly_note', '"Drop-in hours daily 14–17. New filament colors in the print corner."'),
  ('show_telegram', 'true'),
  ('max_reservation_days', '7');

-- Seed equipment (matches the original prototype)
insert into public.equipment (qr_code, area, name, detail, quantity_available, sort_order) values
  ('prusa', '3D PRINT', 'Prusa MK4 printer', 'PLA/PETG · book per print job', 3, 1),
  ('spike', 'ROBOTICS', 'LEGO SPIKE Prime kit', 'Full class set · 45 min lessons', 12, 2),
  ('quest', 'VR', 'Meta Quest 3 headset', 'Charged and sanitized', 6, 3),
  ('arduino', 'ROBOTICS', 'Arduino starter kit', 'Board, sensors, breadboard', 10, 4),
  ('cutter', 'ART', 'Cricut vinyl cutter', 'Bring your own vinyl', 1, 5),
  ('ipad', 'ART', 'iPad + Apple Pencil', 'Procreate installed', 8, 6),
  ('camera', 'ART', 'DSLR camera kit', 'Body, lens, tripod', 2, 7),
  ('solder', 'ROBOTICS', 'Soldering station', 'Supervised use only', 4, 8);
