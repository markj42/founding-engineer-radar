import { describe, it, expect } from 'vitest';
import { diffListings } from '../src/lib/differ.js';

const raise = (id, extra = {}) => ({
  listing_id: id, listing_type_id: 'fundraising', status: 'open',
  created_at: '2026-07-05T18:00:00Z', summary: 's',
  self: { role_type_id: 'founder', facts: [] },
  target: { roles: [{ role_type_id: 'candidate' }], requirements: [] },
  ...extra,
});
const eng = (id) => ({
  listing_id: id, listing_type_id: 'job_seeking', status: 'open',
  created_at: '2026-07-06T02:00:00Z', summary: 's',
  self: { role_type_id: 'candidate', facts: [] },
  target: { roles: [{ role_type_id: 'founder' }], requirements: [] },
});

describe('diffListings', () => {
  it('emits company.raised for a new fundraising listing', () => {
    const events = diffListings([], [raise('li_1')]);
    expect(events).toEqual([
      expect.objectContaining({ type: 'company.raised', subject_hi_id: 'li_1' }),
    ]);
  });

  it('emits listing.new_engineer for a new candidate listing targeting founders', () => {
    const events = diffListings([], [eng('li_2')]);
    expect(events).toEqual([
      expect.objectContaining({ type: 'listing.new_engineer', subject_hi_id: 'li_2' }),
    ]);
  });

  it('emits nothing when snapshots are identical', () => {
    const prev = [raise('li_1'), eng('li_2')];
    expect(diffListings(prev, prev)).toEqual([]);
  });

  it('emits company.raised once when raise facts change', () => {
    const before = raise('li_1');
    const after = raise('li_1', { self: { role_type_id: 'founder', facts: [{ attribute_label: 'stage: seed $4M', value_kind: 'text' }] } });
    const events = diffListings([before], [after]);
    expect(events.filter(e => e.type === 'company.raised')).toHaveLength(1);
  });

  it('ignores closed listings', () => {
    const events = diffListings([], [raise('li_1', { status: 'closed' })]);
    expect(events).toEqual([]);
  });

  it('attaches the listing payload to events', () => {
    const [event] = diffListings([], [raise('li_9')]);
    expect(event.payload.listing_id).toBe('li_9');
  });
});
