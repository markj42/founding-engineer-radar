import { describe, it, expect, vi } from 'vitest';
import { normalizeBrowseResponse } from '../src/lib/scanner-core.js';
import { runScan } from '../src/lib/scanner-core.js';
import { diffListings } from '../src/lib/differ.js';
import { scoreMatch } from '../src/lib/matcher.js';
import live from '../src/lib/fixtures/browse-live-shape.json' with { type: 'json' };

describe('normalizeBrowseResponse (live API shape)', () => {
  it('unwraps result.items and maps preview/created_at', () => {
    const listings = normalizeBrowseResponse(live);
    expect(listings).toHaveLength(2);
    expect(listings[0].listing_id).toBe('listing_292acf8a1dd7');
    expect(listings[0].status).toBe('open');
    expect(listings[0].summary).toContain('Lucas');
    expect(listings[0].created_at).toBe('2026-07-04T23:49:24.614Z');
  });

  it('still accepts the flat {listings:[...]} shape', () => {
    const listings = normalizeBrowseResponse({ listings: [{ listing_id: 'x', status: 'open', summary: 's' }] });
    expect(listings[0].listing_id).toBe('x');
  });
});

describe('differ with live-shape items', () => {
  it('classifies fundraising as company.raised and recruiting as listing.new_engineer', () => {
    const listings = normalizeBrowseResponse(live);
    const events = diffListings([], listings);
    expect(events.map((e) => e.type).sort()).toEqual(['company.raised', 'listing.new_engineer']);
  });
});

describe('matcher fallback without structured facts', () => {
  it('scores on preview-text overlap and location mentions', () => {
    const [raise, eng] = normalizeBrowseResponse(live);
    const { score, reasons } = scoreMatch(raise, eng);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(reasons)).toBe(true);
  });
});

describe('runScan end-to-end with live shape', () => {
  it('stores listings and events from a result.items response', async () => {
    const state = { listings: [], events: [], matches: [], runs: [] };
    const db = {
      loadListings: async () => state.listings,
      saveListings: async (rows) => { state.listings = rows; },
      insertEvents: async (e) => state.events.push(...e),
      upsertMatches: async (m) => state.matches.push(...m),
      recordRun: async (r) => state.runs.push(r),
    };
    const hi = { call: vi.fn(async () => live) };
    const result = await runScan({ hi, db });
    expect(result.status).toBe('ok');
    expect(result.counts.listings).toBe(2);
    expect(state.events).toHaveLength(2);
  });
});
