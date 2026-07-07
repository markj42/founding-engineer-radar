import { describe, it, expect } from 'vitest';
import { scoreMatch, rankMatches } from '../src/lib/matcher.js';
import fixtures from '../src/lib/fixtures/listings-sample.json' with { type: 'json' };

const raiseListing = fixtures.listings.find(l => l.listing_id === 'li_raise_001');
const engineerSF = fixtures.listings.find(l => l.listing_id === 'li_eng_001');
const engineerNYC = fixtures.listings.find(l => l.listing_id === 'li_eng_002');

describe('scoreMatch', () => {
  it('scores within 0-100', () => {
    const { score } = scoreMatch(raiseListing, engineerSF);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores a strong stack+stage+location fit higher than a mismatch', () => {
    const fit = scoreMatch(raiseListing, engineerSF).score;
    const misfit = scoreMatch(raiseListing, engineerNYC).score;
    expect(fit).toBeGreaterThan(misfit);
  });

  it('boosts San Francisco co-location', () => {
    const { reasons } = scoreMatch(raiseListing, engineerSF);
    expect(reasons.join(' ')).toMatch(/San Francisco|location/i);
  });

  it('populates human-readable reasons', () => {
    const { reasons } = scoreMatch(raiseListing, engineerSF);
    expect(reasons.length).toBeGreaterThanOrEqual(2);
    for (const r of reasons) expect(typeof r).toBe('string');
  });

  it('rewards requirement/fact keyword overlap', () => {
    const { reasons } = scoreMatch(raiseListing, engineerSF);
    expect(reasons.join(' ').toLowerCase()).toContain('backend');
  });
});

describe('rankMatches', () => {
  it('returns engineers sorted by score desc, stable output shape', () => {
    const ranked = rankMatches(raiseListing, [engineerNYC, engineerSF]);
    expect(ranked[0].listing_hi_id).toBe('li_eng_001');
    expect(ranked[0]).toHaveProperty('score');
    expect(ranked[0]).toHaveProperty('reasons');
    expect(ranked[0].company_hi_id).toBe('li_raise_001');
  });
});
