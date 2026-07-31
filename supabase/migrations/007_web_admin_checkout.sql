-- Handoff v5: web-admin check-out source + teacher insert for admin loans

alter table public.reservations drop constraint if exists reservations_source_check;
alter table public.reservations
  add constraint reservations_source_check
  check (source in ('web', 'app', 'web-admin'));

drop policy if exists "Teachers can create app reservations" on public.reservations;

create policy "Teachers can create operational reservations"
  on public.reservations for insert
  with check (
    public.is_teacher()
    and source in ('app', 'web-admin')
  );
