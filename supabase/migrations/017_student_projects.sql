-- Student projects: teacher-designed multi-week sprints with agile boards.
-- Teachers create + read their own (email); only teachers (admin) mutate after.

create table if not exists public.student_projects (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  course text not null,
  unit text not null,
  initials text not null,
  summary text not null default '',
  start_date date not null,
  weeks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint student_projects_weeks_is_array check (jsonb_typeof(weeks) = 'array')
);

create index if not exists student_projects_email_idx
  on public.student_projects (lower(email));

create index if not exists student_projects_created_idx
  on public.student_projects (created_at desc);

alter table public.student_projects enable row level security;

drop policy if exists "Student projects are publicly readable" on public.student_projects;
drop policy if exists "Anyone can create student projects" on public.student_projects;
drop policy if exists "Teachers can update student projects" on public.student_projects;
drop policy if exists "Teachers can delete student projects" on public.student_projects;

create policy "Student projects are publicly readable"
  on public.student_projects for select
  using (true);

create policy "Anyone can create student projects"
  on public.student_projects for insert
  with check (true);

create policy "Teachers can update student projects"
  on public.student_projects for update
  using (public.is_teacher())
  with check (public.is_teacher());

create policy "Teachers can delete student projects"
  on public.student_projects for delete
  using (public.is_teacher());

do $$
begin
  alter publication supabase_realtime add table public.student_projects;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
