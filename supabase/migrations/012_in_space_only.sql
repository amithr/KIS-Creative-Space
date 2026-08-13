-- In-space-only flag: item stays in the Makerspace (no take-away check-out)

alter table public.equipment
  add column if not exists in_space_only boolean not null default false;

update public.equipment
set in_space_only = true
where name in ('Soldering station', 'Prusa MK4 printer');

-- Block take-away check-out and item reservations for flagged equipment.
create or replace function public.enforce_in_space_only()
returns trigger
language plpgsql
as $$
declare
  v_name text;
  v_flag boolean;
begin
  if tg_table_name = 'reservations' then
    if tg_op = 'UPDATE'
      and new.status is not distinct from old.status then
      return new;
    end if;

    if new.status not in ('out', 'reserved') then
      return new;
    end if;

    select e.name, e.in_space_only
      into v_name, v_flag
    from public.equipment e
    where e.id = new.equipment_id;

    if coalesce(v_flag, false) then
      raise exception
        '% stays in the Makerspace — it can''t be checked out or taken to another space.',
        v_name;
    end if;
  elsif tg_table_name = 'unit_checkouts' then
    select e.name, e.in_space_only
      into v_name, v_flag
    from public.equipment_units u
    join public.equipment e on e.id = u.equipment_id
    where u.id = new.equipment_unit_id;

    if coalesce(v_flag, false) then
      raise exception
        '% stays in the Makerspace — it can''t be checked out or taken to another space.',
        v_name;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reservations_in_space_only on public.reservations;
create trigger reservations_in_space_only
  before insert or update of status on public.reservations
  for each row
  execute function public.enforce_in_space_only();

drop trigger if exists unit_checkouts_in_space_only on public.unit_checkouts;
create trigger unit_checkouts_in_space_only
  before insert on public.unit_checkouts
  for each row
  execute function public.enforce_in_space_only();
