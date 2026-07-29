-- Unit-level checkout/check-in for the scanner app

alter table public.equipment_units
  add column if not exists status text not null default 'available'
  check (status in ('available', 'checked_out'));

create table if not exists public.unit_checkouts (
  id uuid primary key default gen_random_uuid(),
  equipment_unit_id uuid not null references public.equipment_units (id) on delete cascade,
  reservation_id uuid references public.reservations (id) on delete set null,
  borrower_name text not null,
  borrower_email text,
  checked_out_at timestamptz not null default now(),
  checked_in_at timestamptz,
  checked_out_by uuid references auth.users (id),
  check (char_length(trim(borrower_name)) > 0)
);

create unique index if not exists unit_checkouts_active_unit_idx
  on public.unit_checkouts (equipment_unit_id)
  where checked_in_at is null;

create index if not exists unit_checkouts_reservation_idx
  on public.unit_checkouts (reservation_id);

alter table public.unit_checkouts enable row level security;

create policy "Teachers can read unit checkouts"
  on public.unit_checkouts for select
  using (public.is_teacher());

create policy "Teachers can insert unit checkouts"
  on public.unit_checkouts for insert
  with check (public.is_teacher());

create policy "Teachers can update unit checkouts"
  on public.unit_checkouts for update
  using (public.is_teacher());

create policy "Teachers can update equipment units"
  on public.equipment_units for update
  using (public.is_teacher());

drop policy if exists "Teachers can delete reservations"
  on public.reservations;

create policy "Teachers can delete reservations"
  on public.reservations for delete
  using (public.is_teacher());

-- Resolve a scanned QR payload (serial, slug, or equipment URL) to unit/equipment info.
create or replace function public.resolve_equipment_scan(p_payload text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_payload text := trim(p_payload);
  v_serial text;
  v_slug text;
  v_unit record;
  v_equipment record;
  v_checkout record;
begin
  if v_payload = '' then
    raise exception 'Empty scan payload';
  end if;

  -- Serial number (e.g. KIS-A7X9K2M4)
  if v_payload ~* '^KIS-[A-Z0-9]+$' then
    v_serial := upper(v_payload);
  elsif v_payload ~ '/equipment/' then
    v_slug := lower(regexp_replace(v_payload, '^.*/equipment/', ''));
    v_slug := split_part(v_slug, '?', 1);
    v_slug := split_part(v_slug, '#', 1);
  else
    v_slug := lower(v_payload);
  end if;

  if v_serial is not null then
    select u.*, e.area, e.name as equipment_name, e.detail, e.qr_code, e.quantity_available
    into v_unit
    from public.equipment_units u
    join public.equipment e on e.id = u.equipment_id
    where upper(u.serial_number) = v_serial;

    if not found then
      raise exception 'Unit not found for serial %', v_serial;
    end if;

    select * into v_checkout
    from public.unit_checkouts
    where equipment_unit_id = v_unit.id
      and checked_in_at is null
    order by checked_out_at desc
    limit 1;

    return jsonb_build_object(
      'kind', 'unit',
      'serial_number', v_unit.serial_number,
      'unit_id', v_unit.id,
      'equipment_id', v_unit.equipment_id,
      'equipment_name', v_unit.equipment_name,
      'area', v_unit.area,
      'detail', v_unit.detail,
      'qr_code', v_unit.qr_code,
      'status', v_unit.status,
      'quantity_available', v_unit.quantity_available,
      'active_checkout', case
        when v_checkout.id is null then null
        else jsonb_build_object(
          'id', v_checkout.id,
          'borrower_name', v_checkout.borrower_name,
          'borrower_email', v_checkout.borrower_email,
          'checked_out_at', v_checkout.checked_out_at
        )
      end
    );
  end if;

  select * into v_equipment
  from public.equipment
  where lower(qr_code) = v_slug;

  if not found then
    raise exception 'Equipment not found for code %', v_slug;
  end if;

  return jsonb_build_object(
    'kind', 'equipment',
    'equipment_id', v_equipment.id,
    'equipment_name', v_equipment.name,
    'area', v_equipment.area,
    'detail', v_equipment.detail,
    'qr_code', v_equipment.qr_code,
    'quantity_available', v_equipment.quantity_available,
    'available_units', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'unit_id', u.id,
        'serial_number', u.serial_number
      ) order by u.created_at), '[]'::jsonb)
      from public.equipment_units u
      where u.equipment_id = v_equipment.id
        and u.status = 'available'
    )
  );
end;
$$;

-- Check out a unit by serial; optionally link to a reservation (removed on success).
create or replace function public.checkout_unit_by_serial(
  p_serial_number text,
  p_borrower_name text default null,
  p_borrower_email text default null,
  p_reservation_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_serial text := upper(trim(p_serial_number));
  v_unit public.equipment_units%rowtype;
  v_equipment public.equipment%rowtype;
  v_reservation public.reservations%rowtype;
  v_borrower_name text;
  v_borrower_email text;
  v_reservation_id uuid;
  v_checkout_id uuid;
begin
  if not public.is_teacher() then
    raise exception 'Only teachers can check out equipment';
  end if;

  if v_serial = '' then
    raise exception 'Serial number is required';
  end if;

  select u.* into v_unit
  from public.equipment_units u
  where upper(u.serial_number) = v_serial
  for update;

  if not found then
    raise exception 'Unit not found: %', v_serial;
  end if;

  if v_unit.status = 'checked_out' then
    raise exception 'Unit % is already checked out', v_serial;
  end if;

  select * into v_equipment
  from public.equipment
  where id = v_unit.equipment_id
  for update;

  if v_equipment.quantity_available < 1 then
    raise exception 'No available quantity for %', v_equipment.name;
  end if;

  v_reservation_id := p_reservation_id;

  if v_reservation_id is not null then
    select * into v_reservation
    from public.reservations
    where id = v_reservation_id
      and equipment_id = v_unit.equipment_id
      and status in ('pending', 'confirmed');

    if not found then
      raise exception 'Active reservation not found';
    end if;

    v_borrower_name := v_reservation.name;
    v_borrower_email := v_reservation.email;
  else
    v_borrower_name := nullif(trim(p_borrower_name), '');
    v_borrower_email := nullif(trim(coalesce(p_borrower_email, '')), '');

    if v_borrower_name is null then
      raise exception 'Borrower name or reservation is required';
    end if;

    select * into v_reservation
    from public.reservations
    where equipment_id = v_unit.equipment_id
      and status in ('pending', 'confirmed')
      and lower(trim(name)) = lower(v_borrower_name)
      and (
        v_borrower_email is null
        or lower(trim(email)) = lower(v_borrower_email)
      )
      and start_date <= current_date
      and end_date >= current_date
    order by created_at asc
    limit 1;

    if found then
      v_reservation_id := v_reservation.id;
      v_borrower_email := coalesce(v_borrower_email, v_reservation.email);
    end if;
  end if;

  update public.equipment_units
  set status = 'checked_out'
  where id = v_unit.id;

  update public.equipment
  set quantity_available = quantity_available - 1
  where id = v_equipment.id;

  insert into public.unit_checkouts (
    equipment_unit_id,
    reservation_id,
    borrower_name,
    borrower_email,
    checked_out_by
  )
  values (
    v_unit.id,
    v_reservation_id,
    v_borrower_name,
    v_borrower_email,
    auth.uid()
  )
  returning id into v_checkout_id;

  if v_reservation_id is not null then
    delete from public.reservations where id = v_reservation_id;
  end if;

  select * into v_equipment from public.equipment where id = v_unit.equipment_id;

  return jsonb_build_object(
    'checkout_id', v_checkout_id,
    'serial_number', v_unit.serial_number,
    'equipment_name', v_equipment.name,
    'borrower_name', v_borrower_name,
    'borrower_email', v_borrower_email,
    'reservation_removed', v_reservation_id is not null,
    'quantity_available', v_equipment.quantity_available
  );
end;
$$;

-- Check in a unit by serial; restores inventory quantity.
create or replace function public.checkin_unit_by_serial(p_serial_number text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_serial text := upper(trim(p_serial_number));
  v_unit public.equipment_units%rowtype;
  v_equipment public.equipment%rowtype;
  v_checkout public.unit_checkouts%rowtype;
begin
  if not public.is_teacher() then
    raise exception 'Only teachers can check in equipment';
  end if;

  if v_serial = '' then
    raise exception 'Serial number is required';
  end if;

  select u.* into v_unit
  from public.equipment_units u
  where upper(u.serial_number) = v_serial
  for update;

  if not found then
    raise exception 'Unit not found: %', v_serial;
  end if;

  if v_unit.status <> 'checked_out' then
    raise exception 'Unit % is not checked out', v_serial;
  end if;

  select * into v_checkout
  from public.unit_checkouts
  where equipment_unit_id = v_unit.id
    and checked_in_at is null
  order by checked_out_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No active checkout found for unit %', v_serial;
  end if;

  update public.unit_checkouts
  set checked_in_at = now()
  where id = v_checkout.id;

  update public.equipment_units
  set status = 'available'
  where id = v_unit.id;

  update public.equipment
  set quantity_available = quantity_available + 1
  where id = v_unit.equipment_id
  returning * into v_equipment;

  return jsonb_build_object(
    'checkout_id', v_checkout.id,
    'serial_number', v_unit.serial_number,
    'equipment_name', v_equipment.name,
    'borrower_name', v_checkout.borrower_name,
    'quantity_available', v_equipment.quantity_available
  );
end;
$$;

-- Active reservations for an equipment type (scanner checkout UI).
create or replace function public.list_equipment_reservations(p_equipment_id uuid)
returns setof public.reservations
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.reservations
  where equipment_id = p_equipment_id
    and status in ('pending', 'confirmed')
    and end_date >= current_date
  order by start_date asc, created_at asc;
$$;

grant execute on function public.resolve_equipment_scan(text) to anon, authenticated;
grant execute on function public.checkout_unit_by_serial(text, text, text, uuid) to authenticated;
grant execute on function public.checkin_unit_by_serial(text) to authenticated;
grant execute on function public.list_equipment_reservations(uuid) to authenticated;

-- Enable Realtime on equipment for live web updates
alter publication supabase_realtime add table public.equipment;
