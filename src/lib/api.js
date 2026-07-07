// Frontend data layer. Falls back to bundled fixtures ("demo mode") when the
// API is unreachable, so the Hub demo always renders.
import fixtures from './fixtures/listings-sample.json';
import { rankMatches } from './matcher.js';

function demoData() {
  const open = fixtures.listings.filter((l) => l.status === 'open');
  const raises = open.filter((l) => l.listing_type_id === 'fundraising');
  const engineers = open.filter((l) => l.self?.role_type_id === 'candidate');
  const card = (l) => ({ hi_id: l.listing_id, summary: l.summary, created_at: l.created_at, seen_at: l.created_at, listing: l });
  return {
    demo: true,
    status: { last_scan_at: null },
    raises: raises.map((r) => ({ ...card(r), matches: rankMatches(r, engineers).filter((m) => m.score > 0) })),
    engineers: engineers.map((e) => ({
      ...card(e),
      matches: raises
        .map((r) => rankMatches(r, [e])[0])
        .filter((m) => m && m.score > 0)
        .sort((x, y) => y.score - x.score),
    })),
  };
}

export async function loadRadar() {
  try {
    const [status, raises, engineers] = await Promise.all([
      fetch('/api/status').then((r) => r.json()),
      fetch('/api/raises').then((r) => r.json()),
      fetch('/api/engineers').then((r) => r.json()),
    ]);
    if (!Array.isArray(raises.raises)) throw new Error('bad shape');
    return { demo: false, status, raises: raises.raises, engineers: engineers.engineers };
  } catch {
    return demoData();
  }
}

export function introLink(listing) {
  // Intros happen through the user's own Hi agent; deep-link to the listing on Hi.
  return `https://hi.hirey.ai/hub?listing=${encodeURIComponent(listing.hi_id)}`;
}
