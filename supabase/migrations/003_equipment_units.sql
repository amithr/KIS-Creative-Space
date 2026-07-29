-- Individual equipment units with unique serial numbers

create table public.equipment_units (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  serial_number text not null unique,
  created_at timestamptz not null default now()
);

create index equipment_units_equipment_id_idx on public.equipment_units (equipment_id);

alter table public.equipment_units enable row level security;

create policy "Equipment units are publicly readable"
  on public.equipment_units for select
  using (true);

create policy "Teachers can insert equipment units"
  on public.equipment_units for insert
  with check (public.is_teacher());

create policy "Teachers can delete equipment units"
  on public.equipment_units for delete
  using (public.is_teacher());

-- Backfill one unit per existing equipment row (uses quantity_available count)
do $$
declare
  rec record;
  i integer;
  serial text;
begin
  for rec in select id, quantity_available from public.equipment loop
    for i in 1 .. greatest(rec.quantity_available, 1) loop
      serial := 'KIS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      insert into public.equipment_units (equipment_id, serial_number)
      values (rec.id, serial)
      on conflict (serial_number) do nothing;
    end loop;
  end loop;
end $$;
