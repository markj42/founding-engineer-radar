import { describe, it, expect, vi, beforeEach } from 'vitest';

// api-shapes.test.js covers _core.js. These cover the Vercel route handlers
// themselves: the edge runtime export, the JSON envelope, and the 500 path.
// _db.js is mocked so nothing reaches Supabase.

const listings = {
  raise: [{
    hi_id: 'li_raise_001', kind: 'raise', summary: 'Raised $4M seed',
    raw: { listing_id: 'li_raise_001' },
    created_at_hi: '2026-07-05T18:00:00Z', seen_at: '2026-07-06T00:00:00Z',
  }],
  engineer: [{
    hi_id: 'li_eng_001', kind: 'engineer', summary: 'Founding backend engineer',
    raw: { listing_id: 'li_eng_001' },
    created_at_hi: '2026-07-05T19:00:00Z', seen_at: '2026-07-06T00:00:00Z',
  }],
};

const match = { company_hi_id: 'li_raise_001', listing_hi_id: 'li_eng_001', score: 80, reasons: ['x'] };

let dbBehaviour;

vi.mock('../api/_db.js', () => ({
  makeDb: () => {
    if (dbBehaviour === 'throw') throw new Error('SUPABASE_URL is required');
    return {
      listingsByKind: async (kind) => listings[kind] ?? [],
      matchesFor: async () => [match],
      matchesForEngineer: async () => [match],
      lastOkRun: async () => ({ finished_at: '2026-07-06T03:00:00Z', status: 'ok' }),
    };
  },
}));

const { default: raises, config: raisesConfig } = await import('../api/raises.js');
const { default: engineers, config: engineersConfig } = await import('../api/engineers.js');
const { default: status, config: statusConfig } = await import('../api/status.js');

beforeEach(() => { dbBehaviour = 'ok'; });

describe('vercel route handlers', () => {
  it('every route opts into the edge runtime', () => {
    for (const config of [raisesConfig, engineersConfig, statusConfig]) {
      expect(config).toEqual({ runtime: 'edge' });
    }
  });

  it('GET /api/raises returns 200 JSON with matches attached', async () => {
    const res = await raises();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    const body = await res.json();
    expect(body.raises).toHaveLength(1);
    expect(body.raises[0].hi_id).toBe('li_raise_001');
    expect(body.raises[0].matches[0].score).toBe(80);
  });

  it('GET /api/engineers returns 200 JSON', async () => {
    const res = await engineers();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.engineers[0].hi_id).toBe('li_eng_001');
  });

  it('GET /api/status returns the last successful scan', async () => {
    const res = await status();
    expect(res.status).toBe(200);
    expect((await res.json()).last_scan_at).toBe('2026-07-06T03:00:00Z');
  });

  it('a db failure becomes a 500 with an error body, not an unhandled throw', async () => {
    dbBehaviour = 'throw';
    for (const handler of [raises, engineers, status]) {
      const res = await handler();
      expect(res.status).toBe(500);
      expect((await res.json()).error).toContain('SUPABASE_URL is required');
    }
  });

  // The frontend treats any non-array raises as "demo mode" (src/lib/api.js),
  // so the 500 body must not accidentally satisfy the happy-path shape.
  it('the 500 body does not look like a successful response', async () => {
    dbBehaviour = 'throw';
    const body = await (await raises()).json();
    expect(Array.isArray(body.raises)).toBe(false);
  });
});
