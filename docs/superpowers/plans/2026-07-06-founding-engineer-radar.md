# Founding Engineer Radar Implementation Plan

**Spec:** docs/superpowers/specs/2026-07-06-founding-engineer-radar-design.md
**Stack:** Vite + React (frontend), Netlify Functions (api), Supabase (Postgres + scheduled edge function), vitest (tests)
**Rules:** TDD (RED-GREEN-REFACTOR) for all logic modules. Commit after each task.

## File structure

```
founding-engineer-radar/
  package.json, netlify.toml, vitest.config.js, .env.example, README.md
  src/lib/hi-client.js        # Hi API wrapper: capability calls, error envelope, backoff
  src/lib/differ.js           # snapshot A vs B -> radar events (pure)
  src/lib/matcher.js          # score engineer listings vs raised startups (pure)
  src/lib/fixtures/*.json     # recorded/derived Hi API shapes
  netlify/functions/raises.js, engineers.js, matches.js, status.js
  netlify/functions/_db.js    # Supabase server-side client helper
  supabase/migrations/001_schema.sql
  supabase/functions/scanner/index.ts   # scheduled scan (Deno)
  src/App.jsx, src/main.jsx, src/index.css, index.html
  src/components/RaiseCard.jsx, EngineerCard.jsx, FreshnessBadge.jsx, StatusBanner.jsx
  tests/differ.test.js, matcher.test.js, hi-client.test.js, api-shapes.test.js
```

## Tasks

1. **Probe Hi API shapes** — fetch capability schemas for hi.companies /
   hi.agent-listings / hi.events; save real or schema-derived fixtures to
   src/lib/fixtures/. If live POST probing is unavailable from this
   environment, derive fixtures from published schemas and mark
   `FIXTURE_SOURCE.md` accordingly. Verify: fixtures parse as JSON.
2. **Scaffold** — package.json (vite, react, vitest), vitest.config, netlify.toml,
   .env.example. Verify: `npm test` runs (0 tests), `npm run build` succeeds. Commit.
3. **differ.js (TDD)** — failing tests: new company w/ raise signal → company.raised;
   new engineer listing → listing.new_engineer; unchanged → no event; changed
   raise field → company.raised once. Implement minimal. Tests green. Commit.
4. **matcher.js (TDD)** — failing tests: stack overlap scores, stage fit, SF location
   boost, seriousness weight, reasons[] populated, score bounds 0-100, ranking
   stable. Implement. Green. Commit.
5. **hi-client.js (TDD)** — failing tests (mocked fetch): calls
   POST /v1/capabilities/{id}/call; retries on retryable:true with backoff;
   throws typed error on retryable:false; parses error envelope. Implement. Green. Commit.
6. **Schema SQL** — 001_schema.sql: companies, listings, radar_events, matches,
   scan_runs (per spec), idempotent upsert keys. Verify: postgres syntax check
   (best effort locally). Commit.
7. **scanner edge function** — compose hi-client + differ + matcher; upsert to
   Supabase; record scan_runs. Integration test runs scanner against fixture
   HTTP layer (inject fetch). Green. Commit.
8. **Netlify functions** — raises/engineers/matches/status reading Supabase;
   api-shapes.test.js validates response shapes with a stubbed db. Green. Commit.
9. **Frontend** — two tabs (Just raised / Founding engineers), cards, freshness
   badges, stale-data banner, intro CTA deep-linking to Hi. Demo mode: if no
   API, load fixtures so the Hub demo always renders. Verify: build + manual
   render check. Commit.
10. **README + deploy docs** — Supabase setup (migration, scheduled function),
    Netlify deploy, env vars, Hub submission line ("add github.com/<you>/<repo>
    to the hirey hub"). Commit.
11. **Final verification** — full test suite, production build, review diff vs
    spec. Commit.
