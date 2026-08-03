-- Founding Engineer Radar schema
create table if not exists public.radar_listings (
  hi_id text primary key,
  kind text not null check (kind in ('raise', 'engineer')),
  summary text,
  raw jsonb not null,
  created_at_hi timestamptz,
  seen_at timestamptz not null default now()
);

create table if not exists public.radar_events (
  id bigint generated always as identity primary key,
  type text not null,
  subject_hi_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (type, subject_hi_id, created_at)
);

create table if not exists public.radar_matches (
  company_hi_id text not null,
  listing_hi_id text not null,
  score int not null check (score between 0 and 100),
  reasons jsonb not null default '[]',
  computed_at timestamptz not null default now(),
  primary key (company_hi_id, listing_hi_id)
);

create table if not exists public.radar_scan_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'error')),
  error text,
  counts jsonb not null default '{}'
);

-- Scanner-side key/value store. Holds the Hi agent credentials + token cache
-- written by the auth bootstrap in supabase/functions/scanner.
create table if not exists public.radar_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists radar_events_created_idx on public.radar_events (created_at desc);
create index if not exists listings_kind_idx on public.radar_listings (kind, seen_at desc);

-- Lock down: RLS on, no policies -> only service-role access
alter table public.radar_config enable row level security;
alter table public.radar_listings enable row level security;
alter table public.radar_events enable row level security;
alter table public.radar_matches enable row level security;
alter table public.radar_scan_runs enable row level security;
