-- Per-project secret for teacher share links (?edit=<id>.<key>).
-- Portal updates authorize in server actions; anon update policy matches insert.

alter table public.student_projects
  add column if not exists edit_key text;

drop policy if exists "Anyone can update student projects" on public.student_projects;
create policy "Anyone can update student projects"
  on public.student_projects for update
  using (true)
  with check (true);
