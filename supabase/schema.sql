-- Run once in the Supabase SQL editor.
-- RLS is on with no policies: the anon key can read nothing. The app only talks to
-- the database from the server with the secret (service_role) key.

create table teams (
  id int primary key,
  name text not null,
  emoji text not null default '🏒',
  pin text check (pin ~ '^\d{4}$')
);
insert into teams (id, name, emoji) values
  (1, 'Sauce', '🏒'), (2, 'Luke', '🥅'), (3, 'Noah', '🚨'), (4, 'Jake', '🧊'),
  (5, 'Leo', '🦁'), (6, 'Simon', '⭐');

create table players (
  id bigint primary key,            -- NHL player id
  name text not null,
  team text not null,               -- NHL team abbrev
  pos text not null check (pos in ('C', 'W', 'D')),  -- skaters only
  headshot text,
  cur jsonb not null default '{}',  -- this season {gp,g,a}
  last jsonb not null default '{}'  -- last season, same shape
);

create table rosters (
  team_id int not null references teams on delete cascade,
  slot text not null check (slot ~ '^R([1-9]|1[0-4])$'),  -- round 1-14: R1-R10 forwards, R11-R14 defense
  player_id bigint not null references players,
  primary key (team_id, slot),
  unique (team_id, player_id)
);

create table settings (
  id int primary key default 1 check (id = 1),
  scoring jsonb not null default '{"g":1,"a":1}',
  locked boolean not null default false,
  stats_updated_at timestamptz
);
insert into settings default values;

-- One row per team per day, written on each refresh; powers "today" and trend arrows.
create table snapshots (
  day date not null,
  team_id int not null references teams on delete cascade,
  points numeric not null,
  rank int not null,
  primary key (day, team_id)
);

alter table teams enable row level security;
alter table players enable row level security;
alter table rosters enable row level security;
alter table settings enable row level security;
alter table snapshots enable row level security;
