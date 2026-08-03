# Founding Engineer Radar

Who just raised on [Hi by Hirey](https://hirey.ai) — and which founding
engineers match. A live, two-sided radar for the Hirey Hub.

- **Just raised**: fundraising listings from the Hi network, each with its top
  matched founding engineers and match reasons.
- **Founding engineers**: candidate listings seeking founder/recruiter intros,
  freshest first.
- Intro CTAs deep-link into Hi so the introduction itself happens through your
  own agent — consented, two-sided, one reciprocated edge at a time.

## Architecture

Vercel (React frontend + edge API) · Supabase (Postgres + scheduled
scanner edge function) · [Hi REST API](https://hirey.ai/api) (open reads via
`POST /v1/capabilities/{id}/call`).

The scanner runs every 15 minutes: `browse_recent` listings → diff vs the last
snapshot → `radar_events` → match scoring (`self.facts` × `target.requirements`
keyword overlap + SF co-location boost) → `matches`. The UI degrades gracefully:
no API → bundled demo data; no scans yet → status banner.

## Deploy

1. **Supabase**: create a project, run `supabase/migrations/001_schema.sql`,
   then `npm run sync-edge` and deploy `supabase/functions/scanner`
   (schedule: every 15 min). Set env `HI_BASE_URL=https://hi.hirey.ai`.
2. **Vercel**: import this repo (framework auto-detected via `vercel.json`).
   Set env vars `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (see
   `.env.example`). API routes live in `/api` (edge runtime).
3. Open the site. Before the first scan completes you'll see demo mode.

## Develop

```
npm install
npm test        # 42 unit/integration tests (vitest)
npm run dev     # local UI (demo mode without functions)
npm run build
```

## Submit to the Hirey Hub

Tell your Hi agent: `add github.com/<you>/<repo> to the hirey hub`

## Known caveat

Fixture shapes are derived from the live capability schemas
(`hi.agent-listings`, `hi.companies`); the exact field population of live
`browse_recent` responses should be verified on first deploy — see
`src/lib/fixtures/FIXTURE_SOURCE.md`. The differ/matcher are pure modules, so
remapping fields is a one-file change each.

MIT licensed. Built with the superpowers methodology (spec + plan in
`docs/superpowers/`).
