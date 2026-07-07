# Founding Engineer Radar — Design

Date: 2026-07-06
Status: Approved by Mark Johnson (Hirey growth)
Methodology: superpowers (brainstorming → writing-plans → TDD implementation)

## Purpose

A hosted web app on the Hi network (hirey.ai) for the Hirey Hub. When a startup
on Hi shows a fresh raise signal, engineers open to founding roles see it ranked
against their profile; founders who just raised see matching founding engineers.
Two symmetric radar views.

Primary success criterion: a polished, demo-quality app accepted to the Hirey Hub
(browse UI first, intro flow second). Secondary: intro requests routed through Hi.

## Decisions (from brainstorming)

- Audience: both sides, symmetric (founders ↔ engineers)
- Form factor: hosted web app — Netlify frontend + functions, Supabase state.
  Repo remains self-hostable for Hub convention.
- Signals: Hi network only (no external funding data in v1)
- Optimization: Hub listing / demo quality

## Architecture

- **Netlify**: static React (Vite) frontend; thin serverless function layer
  (`/api/*`). Functions keep Supabase service keys server-side and give a single
  CORS surface.
- **Supabase (Postgres)**: radar state. A scheduled edge function (the
  **scanner**) runs every 15 minutes: reads the open Hi REST API
  (`hi.companies`, `hi.agent-listings`, `hi.events` via
  `POST https://hi.hirey.ai/v1/capabilities/{id}/call`), diffs against stored
  snapshots, writes `radar_events`.
- **Hi API**: open reads, anonymous. Writes (future intro requests) use OAuth
  client-credentials per hirey.ai/auth.md. Intro CTA in v1 deep-links into Hi so
  the intro happens through the user's own agent.

## Components

1. **scanner** (Supabase scheduled edge function)
   - Fetch companies, listings, events from Hi; upsert snapshots
   - Diff vs previous snapshot → emit `radar_events`
     (`company.raised`, `listing.new_engineer`, `listing.new_role`)
   - Record `scan_runs` (started_at, finished_at, status, counts)
2. **matcher** (pure module, runs after scan)
   - Scores engineer listings against newly-raised startups:
     stack overlap, stage fit, location (SF-weighted), seriousness signals
   - Writes `matches` (company_id, listing_id, score, reasons[])
3. **api** (Netlify functions)
   - `GET /api/raises` — recent raise events + matched engineers
   - `GET /api/engineers` — founding-engineer listings + matching startups
   - `GET /api/matches?side=founder|engineer&id=…`
   - `GET /api/status` — last successful scan timestamp
4. **ui** (React SPA)
   - Tab 1 "Just raised": startup cards, freshness badges, top matched engineers
   - Tab 2 "Founding engineers": engineer cards, matching startups
   - Intro CTA → deep-link to Hi (agent-mediated intro)
   - "Data as of <last successful scan>" banner

## Data model (Supabase)

- `companies` (hi_id, name, stage, raise_signal, raised_at, location, raw jsonb, seen_at)
- `listings` (hi_id, kind [engineer|role], title, stack[], stage_pref, location, seriousness, raw jsonb, seen_at)
- `radar_events` (id, type, subject_hi_id, payload jsonb, created_at)
- `matches` (company_hi_id, listing_hi_id, score, reasons jsonb, computed_at)
- `scan_runs` (id, started_at, finished_at, status, error, counts jsonb)

## Data flow

cron → scanner → diff → radar_events → matcher → matches → api → ui.
Freshness derives from event timestamps, so a missed scan degrades gracefully.

## Error handling

- Hi's uniform error envelope (`error_code`, `message`, `retryable`) drives
  retry with exponential backoff on `retryable: true`
- All snapshot writes are idempotent upserts keyed on hi_id
- Scanner failures recorded in `scan_runs`; UI shows stale-data banner rather
  than erroring

## Testing (TDD, vitest)

- Unit: differ (snapshot A vs B → expected events); matcher scoring against
  fixture data recorded from the live Hi API
- Integration: scanner against recorded HTTP fixtures (no live calls in CI)
- Smoke: API functions return expected shapes

## Known risk (flagged at design time)

The Hi capability catalog confirms `hi.companies`, `hi.agent-listings`, and
`hi.events` exist, but the exact shape of "raise" signals is unverified.
**Implementation task #1 is probing these endpoints and fixing field mappings**
in the scanner/matcher before any dependent code is written.

## Out of scope (YAGNI, v2 candidates)

User accounts, push/email notifications, external funding sources (Crunchbase,
news), in-app messaging, SMS alerts.
