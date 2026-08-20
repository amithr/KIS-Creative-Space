-- Allow teachers to re-scope existing blocks in place (all ↔ training).

drop policy if exists "Teachers can update space blocks" on public.space_blocks;

create policy "Teachers can update space blocks"
  on public.space_blocks for update
  using (public.is_teacher())
  with check (public.is_teacher());
