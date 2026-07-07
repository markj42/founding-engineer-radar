// Pure diff: previous listing snapshot vs current -> radar events.
// Event types: company.raised (fundraising listings), listing.new_engineer
// (candidate listings targeting founders/recruiters).

const RAISE_TYPES = new Set(['fundraising']);
const ENGINEER_SELF_ROLES = new Set(['candidate']);

function classify(listing) {
  if ((listing.status ?? 'open') !== 'open') return null;
  if (RAISE_TYPES.has(listing.listing_type_id)) return 'company.raised';
  const selfRole = listing.self?.role_type_id;
  const targets = (listing.target?.roles ?? []).map((r) => r.role_type_id);
  if (ENGINEER_SELF_ROLES.has(selfRole) && targets.some((t) => t === 'founder' || t === 'recruiter')) {
    return 'listing.new_engineer';
  }
  // Live browse output has no self/target blocks; fall back to listing type.
  if (!listing.self && listing.listing_type_id === 'recruiting') return 'listing.new_engineer';
  return null;
}

function fingerprint(listing) {
  return JSON.stringify([listing.status, listing.summary, listing.self, listing.target]);
}

export function diffListings(previous, current) {
  const prevById = new Map(previous.map((l) => [l.listing_id, l]));
  const events = [];
  for (const listing of current) {
    const type = classify(listing);
    if (!type) continue;
    const prev = prevById.get(listing.listing_id);
    if (prev && fingerprint(prev) === fingerprint(listing)) continue;
    events.push({ type, subject_hi_id: listing.listing_id, payload: listing });
  }
  return events;
}
