import { describe, it, expect } from 'vitest';
import { getRaises, getEngineers, getStatus } from '../netlify/functions/_core.js';

const row = (over = {}) => ({
  hi_id: 'li_raise_001', kind: 'raise', summary: 'Raised $4M seed',
  raw: { listing_id: 'li_raise_001', listing_type_id: 'fundraising', summary: 'Raised $4M seed', created_at: '2026-07-05T18:00:00Z' },
  created_at_hi: '2026-07-05T18:00:00Z', seen_at: '2026-07-06T00:00:00Z', ...over,
});

function stubDb({ listings = [], matches = [], runs = [] } = {}) {
  return {
    listingsByKind: async (kind) => listings.filter((l) => l.kind === kind),
    matchesFor: async () => matches,
    matchesForEngineer: async (id) => matches.filter((m) => m.listing_hi_id === id),
    lastOkRun: async () => runs[0] ?? null,
  };
}

describe('api core', () => {
  it('getRaises returns raise cards with matches attached', async () => {
    const db = stubDb({
      listings: [row()],
      matches: [{ company_hi_id: 'li_raise_001', listing_hi_id: 'li_eng_001', score: 80, reasons: ['x'] }],
    });
    const out = await getRaises(db);
    expect(out.raises).toHaveLength(1);
    expect(out.raises[0]).toMatchObject({ hi_id: 'li_raise_001', summary: 'Raised $4M seed' });
    expect(out.raises[0].matches[0].score).toBe(80);
  });

  it('getEngineers returns engineer cards with matching startups attached', async () => {
    const db = stubDb({
      listings: [row({ hi_id: 'li_eng_001', kind: 'engineer' })],
      matches: [{ company_hi_id: 'li_raise_001', listing_hi_id: 'li_eng_001', score: 80, reasons: ['x'] }],
    });
    const out = await getEngineers(db);
    expect(out.engineers).toHaveLength(1);
    expect(out.engineers[0].matches[0].company_hi_id).toBe('li_raise_001');
  });

  it('getStatus reports last successful scan or null', async () => {
    expect((await getStatus(stubDb())).last_scan_at).toBeNull();
    const out = await getStatus(stubDb({ runs: [{ finished_at: '2026-07-06T03:00:00Z', status: 'ok' }] }));
    expect(out.last_scan_at).toBe('2026-07-06T03:00:00Z');
  });
});
