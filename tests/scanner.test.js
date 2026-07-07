import { describe, it, expect, vi } from 'vitest';
import { runScan } from '../src/lib/scanner-core.js';
import fixtures from '../src/lib/fixtures/listings-sample.json' with { type: 'json' };

function makeDb(previousListings = []) {
  const state = { listings: [...previousListings], events: [], matches: [], runs: [] };
  return {
    state,
    loadListings: vi.fn(async () => state.listings),
    saveListings: vi.fn(async (rows) => { state.listings = rows; }),
    insertEvents: vi.fn(async (events) => { state.events.push(...events); }),
    upsertMatches: vi.fn(async (matches) => { state.matches.push(...matches); }),
    recordRun: vi.fn(async (run) => { state.runs.push(run); }),
  };
}

const hiStub = (listings) => ({ call: vi.fn(async () => ({ listings })) });

describe('runScan', () => {
  it('first scan: stores snapshot, emits events, computes matches, records ok run', async () => {
    const db = makeDb();
    const hi = hiStub(fixtures.listings);
    const result = await runScan({ hi, db });
    expect(db.state.listings).toHaveLength(3);
    expect(db.state.events.map((e) => e.type).sort()).toEqual([
      'company.raised', 'listing.new_engineer', 'listing.new_engineer',
    ]);
    expect(db.state.matches.length).toBeGreaterThan(0);
    expect(db.state.matches[0]).toHaveProperty('score');
    expect(result.status).toBe('ok');
    expect(db.state.runs[0].status).toBe('ok');
  });

  it('second scan with no changes emits no new events', async () => {
    const db = makeDb();
    const hi = hiStub(fixtures.listings);
    await runScan({ hi, db });
    const eventsAfterFirst = db.state.events.length;
    await runScan({ hi, db });
    expect(db.state.events.length).toBe(eventsAfterFirst);
  });

  it('records an error run when the Hi API fails', async () => {
    const db = makeDb();
    const hi = { call: vi.fn(async () => { throw new Error('boom'); }) };
    const result = await runScan({ hi, db });
    expect(result.status).toBe('error');
    expect(db.state.runs.at(-1).status).toBe('error');
    expect(db.state.runs.at(-1).error).toContain('boom');
  });
});
