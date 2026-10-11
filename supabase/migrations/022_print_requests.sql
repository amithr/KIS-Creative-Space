-- Student print requests (3D prints, vinyl posters, die-cut stickers).
-- Students are identified by email only (no password). Status changes are
-- admin-only: the update policy requires a teacher session; students may
-- only cancel (delete) a request while it is still RECEIVED (status 0).

create table if not exists public.print_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('3d', 'poster', 'sticker')),
  name text not null,
  email text not null,
  grade text not null check (grade in ('G6','G7','G8','G9','G10','G11','G12')),
  file_name text not null,
  -- Object path inside the `print-files` storage bucket. Null for seeded rows.
  file_path text,
  file_size bigint not null default 0,
  color text not null check (color in ('red','white','black','blue','yellow','natural','vinyl')),
  size text not null,
  qty smallint not null default 1 check (qty between 1 and 50),
  cut text check (cut is null or cut in ('contour','border','square')),
  due date,
  notes text not null default '',
  -- Index into the kind's stage list:
  --   3d:             0 RECEIVED · 1 SLICING  · 2 PRINTING · 3 READY
  --   poster/sticker: 0 RECEIVED · 1 PRINTING · 2 CUTTING  · 3 READY
  status smallint not null default 0 check (status between 0 and 3),
  ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists print_requests_email_idx
  on public.print_requests (lower(email), created_at desc);

create index if not exists print_requests_status_idx
  on public.print_requests (status, due);

create or replace function public.print_requests_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status = 3 and (old.status is distinct from 3) then
    new.ready_at := coalesce(new.ready_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists print_requests_touch_updated_at on public.print_requests;
create trigger print_requests_touch_updated_at
  before update on public.print_requests
  for each row execute function public.print_requests_touch_updated_at();

alter table public.print_requests enable row level security;

drop policy if exists "Print requests are publicly readable" on public.print_requests;
drop policy if exists "Anyone can create print requests" on public.print_requests;
drop policy if exists "Teachers can update print requests" on public.print_requests;
drop policy if exists "Students can cancel received print requests" on public.print_requests;
drop policy if exists "Teachers can delete print requests" on public.print_requests;

create policy "Print requests are publicly readable"
  on public.print_requests for select
  using (true);

create policy "Anyone can create print requests"
  on public.print_requests for insert
  with check (status = 0 or auth.uid() in (select id from public.teachers));

-- Admin-only status changes (web admin server actions + Flutter admin both run
-- as a signed-in teacher).
create policy "Teachers can update print requests"
  on public.print_requests for update
  using (auth.uid() in (select id from public.teachers))
  with check (auth.uid() in (select id from public.teachers));

-- Students (anonymous) may only cancel while the job is still RECEIVED; the
-- server action additionally checks the email matches.
create policy "Students can cancel received print requests"
  on public.print_requests for delete
  using (status = 0);

create policy "Teachers can delete print requests"
  on public.print_requests for delete
  using (auth.uid() in (select id from public.teachers));

do $$
begin
  alter publication supabase_realtime add table public.print_requests;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- Uploaded files live in a public-read bucket; 50 MB cap, per-kind MIME list.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'print-files',
  'print-files',
  true,
  52428800,
  array[
    'model/stl', 'application/sla', 'application/vnd.ms-pki.stl', 'model/x.stl-binary', 'model/x.stl-ascii',
    'model/3mf', 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
    'model/obj', 'text/plain', 'application/octet-stream',
    'application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Print files are publicly readable" on storage.objects;
drop policy if exists "Anyone can upload print files" on storage.objects;
drop policy if exists "Teachers can delete print files" on storage.objects;

create policy "Print files are publicly readable"
  on storage.objects for select
  using (bucket_id = 'print-files');

create policy "Anyone can upload print files"
  on storage.objects for insert
  with check (bucket_id = 'print-files');

create policy "Teachers can delete print files"
  on storage.objects for delete
  using (bucket_id = 'print-files' and auth.uid() in (select id from public.teachers));

-- Demo data: olena.k@kis.edu has three jobs (files not uploaded, so file_path is null).
insert into public.print_requests
  (id, kind, name, email, grade, file_name, file_size, color, size, qty, cut, due, notes, status, created_at)
values
  ('00000000-0000-4000-8000-000000000001', '3d', 'Olena K.', 'olena.k@kis.edu', 'G8',
   'rover-wheel-v3.stl', 1843200, 'red', 'M', 1, null, current_date + 4, 'Robotics', 2, now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000003', 'sticker', 'Olena K.', 'olena.k@kis.edu', 'G8',
   'robotics-club-logo.svg', 209715, 'vinyl', 'S', 12, 'contour', current_date + 6, 'For our laptops', 1, now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000002', '3d', 'Olena K.', 'olena.k@kis.edu', 'G8',
   'phone-stand.3mf', 3251200, 'natural', 'S', 1, null, current_date - 2, '', 3, now() - interval '9 days')
on conflict (id) do nothing;
