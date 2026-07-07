// Scan orchestration, decoupled from Supabase/Deno so it is unit-testable.
// deps: { hi: HiClient-like, db: storage adapter }

import { diffListings } from './differ.js';
import { rankMatches } from './matcher.js';

// Normalize the live browse_recent response. Live shape (verified 2026-07-06):
// { capability_id, tool_name, result: { items: [{ listing_id, listing_type_id,
//   published_by_agent_id, target_preview_text, listing_created_at }] } }
// Older/fixture shape: { listings: [...] }.
export function normalizeBrowseResponse(res) {
  const items = res?.result?.items ?? res?.items ?? res?.listings ?? [];
  return items.map((l) => ({
    ...l,
    status: l.status ?? 'open',
    summary: l.summary ?? (l.target_preview_text ? String(l.target_preview_text).slice(0, 200) : null),
    text: l.text ?? l.target_preview_text ?? null,
    created_at: l.created_at ?? l.listing_created_at ?? null,
  }));
}

export async function runScan({ hi, db }) {
  const startedAt = new Date().toISOString();
  try {
    const previous = await db.loadListings();
    const res = await hi.call('hi.agent-listings', { action: 'browse_recent', limit: 100 });
    const current = normalizeBrowseResponse(res).filter((l) => l.status === 'open');

    const events = diffListings(previous, current);
    if (events.length) await db.insertEvents(events);

    const raises = current.filter((l) => l.listing_type_id === 'fundraising');
    const engineers = current.filter((l) => l.self?.role_type_id === 'candidate' || (!l.self && l.listing_type_id === 'recruiting'));
    const matches = raises.flatMap((r) => rankMatches(r, engineers).filter((m) => m.score > 0));
    if (matches.length) await db.upsertMatches(matches);

    await db.saveListings(current);
    const run = {
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: 'ok',
      counts: { listings: current.length, events: events.length, matches: matches.length },
    };
    await db.recordRun(run);
    return run;
  } catch (error) {
    const run = {
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: 'error',
      error: String(error?.message ?? error),
      counts: {},
    };
    await db.recordRun(run);
    return run;
  }
}
