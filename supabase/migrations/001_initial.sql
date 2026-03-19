-- SF Giants Season Ticket Draft Platform
-- Initial schema

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  color text not null default '#FD5A1E',
  created_at timestamptz default now()
);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time text,
  opponent text not null,
  game_number integer,
  notes text,
  created_at timestamptz default now()
);

create table if not exists draft_sessions (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  status text not null default 'setup', -- setup | active | completed
  draft_order jsonb not null default '[]'::jsonb, -- array of member ids
  current_round integer not null default 1,        -- 1-indexed
  current_pick_in_round integer not null default 0, -- 0-indexed
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  draft_session_id uuid not null references draft_sessions(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  round integer not null,
  pick_number_overall integer not null,
  picked_at timestamptz default now(),
  unique(draft_session_id, game_id)
);

-- Indexes
create index if not exists picks_session_idx on picks(draft_session_id);
create index if not exists picks_game_idx on picks(game_id);
create index if not exists picks_member_idx on picks(member_id);
create index if not exists games_date_idx on games(date);

-- Enable Realtime for live draft updates
alter publication supabase_realtime add table draft_sessions;
alter publication supabase_realtime add table picks;

-- Atomic pick RPC — inserts a pick and advances the session state atomically
create or replace function make_pick(
  p_session_id uuid,
  p_game_id uuid,
  p_member_id uuid,
  p_round integer,
  p_pick_overall integer,
  p_next_round integer,
  p_next_pick_in_round integer,
  p_total_games integer
) returns void
language plpgsql
as $$
declare
  v_existing_picks integer;
begin
  -- Insert the pick (unique constraint on game_id will prevent double-picks)
  insert into picks (draft_session_id, game_id, member_id, round, pick_number_overall)
  values (p_session_id, p_game_id, p_member_id, p_round, p_pick_overall);

  -- Count total picks now
  select count(*) into v_existing_picks
  from picks
  where draft_session_id = p_session_id;

  -- Advance session state; mark completed if all games are picked
  update draft_sessions
  set
    current_round = p_next_round,
    current_pick_in_round = p_next_pick_in_round,
    status = case
      when v_existing_picks >= p_total_games then 'completed'
      else status
    end,
    completed_at = case
      when v_existing_picks >= p_total_games then now()
      else completed_at
    end
  where id = p_session_id;
end;
$$;
