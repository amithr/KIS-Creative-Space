-- Item requests / wishlist: teachers suggest purchases; coordinator advances lifecycle.

create table if not exists public.item_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  why text,
  by_name text not null check (char_length(trim(by_name)) > 0),
  votes integer not null default 1 check (votes >= 0),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'ordered', 'arrived')),
  created_at timestamptz not null default now()
);

create index if not exists item_requests_votes_created_idx
  on public.item_requests (votes desc, created_at desc);

create index if not exists item_requests_status_votes_idx
  on public.item_requests (status, votes desc);

create table if not exists public.item_request_votes (
  request_id uuid not null references public.item_requests (id) on delete cascade,
  voter_key text not null check (char_length(trim(voter_key)) > 0),
  created_at timestamptz not null default now(),
  primary key (request_id, voter_key)
);

create index if not exists item_request_votes_voter_idx
  on public.item_request_votes (voter_key);

alter table public.item_requests enable row level security;
alter table public.item_request_votes enable row level security;

drop policy if exists "Item requests are publicly readable" on public.item_requests;
drop policy if exists "Teachers can update item requests" on public.item_requests;
drop policy if exists "Teachers can delete item requests" on public.item_requests;
drop policy if exists "Item request votes are publicly readable" on public.item_request_votes;

create policy "Item requests are publicly readable"
  on public.item_requests for select
  using (true);

create policy "Teachers can update item requests"
  on public.item_requests for update
  using (public.is_teacher())
  with check (public.is_teacher());

create policy "Teachers can delete item requests"
  on public.item_requests for delete
  using (public.is_teacher());

create policy "Item request votes are publicly readable"
  on public.item_request_votes for select
  using (true);

-- Create request + requester's own vote (votes starts at 1).
create or replace function public.create_item_request(
  p_name text,
  p_why text,
  p_by text,
  p_voter_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(p_name);
  v_why text := nullif(trim(coalesce(p_why, '')), '');
  v_by text := trim(p_by);
  v_key text := trim(p_voter_key);
  v_row public.item_requests%rowtype;
begin
  if v_name = '' then
    raise exception 'Item name is required';
  end if;
  if v_by = '' then
    raise exception 'Your name is required';
  end if;
  if v_key = '' then
    raise exception 'Voter key is required';
  end if;

  insert into public.item_requests (name, why, by_name, votes, status)
  values (v_name, v_why, v_by, 1, 'requested')
  returning * into v_row;

  insert into public.item_request_votes (request_id, voter_key)
  values (v_row.id, v_key);

  return jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'why', v_row.why,
    'by', v_row.by_name,
    'votes', v_row.votes,
    'status', v_row.status,
    'created_at', v_row.created_at,
    'voted', true
  );
end;
$$;

-- Toggle one vote per voter_key; clamp votes >= 0.
create or replace function public.toggle_item_request_vote(
  p_request_id uuid,
  p_voter_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := trim(p_voter_key);
  v_exists boolean;
  v_votes integer;
  v_voted boolean;
begin
  if v_key = '' then
    raise exception 'Voter key is required';
  end if;

  if not exists (select 1 from public.item_requests where id = p_request_id) then
    raise exception 'Request not found';
  end if;

  select exists (
    select 1 from public.item_request_votes
    where request_id = p_request_id and voter_key = v_key
  ) into v_exists;

  if v_exists then
    delete from public.item_request_votes
    where request_id = p_request_id and voter_key = v_key;

    update public.item_requests
    set votes = greatest(0, votes - 1)
    where id = p_request_id
    returning votes into v_votes;

    v_voted := false;
  else
    insert into public.item_request_votes (request_id, voter_key)
    values (p_request_id, v_key);

    update public.item_requests
    set votes = votes + 1
    where id = p_request_id
    returning votes into v_votes;

    v_voted := true;
  end if;

  return jsonb_build_object(
    'request_id', p_request_id,
    'votes', v_votes,
    'voted', v_voted
  );
end;
$$;

grant execute on function public.create_item_request(text, text, text, text) to anon, authenticated;
grant execute on function public.toggle_item_request_vote(uuid, text) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.item_requests;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
