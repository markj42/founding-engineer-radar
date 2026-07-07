// Pure API core: shapes responses from a db adapter. Unit-testable.

function card(row) {
  return {
    hi_id: row.hi_id,
    summary: row.summary,
    created_at: row.created_at_hi,
    seen_at: row.seen_at,
    listing: row.raw,
  };
}

export async function getRaises(db) {
  const rows = await db.listingsByKind('raise');
  const raises = [];
  for (const row of rows) {
    const matches = await db.matchesFor(row.hi_id);
    raises.push({ ...card(row), matches });
  }
  raises.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return { raises };
}

export async function getEngineers(db) {
  const rows = await db.listingsByKind('engineer');
  const engineers = [];
  for (const row of rows) {
    const matches = await db.matchesForEngineer(row.hi_id);
    engineers.push({ ...card(row), matches });
  }
  engineers.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return { engineers };
}

export async function getStatus(db) {
  const run = await db.lastOkRun();
  return { last_scan_at: run?.finished_at ?? null };
}
