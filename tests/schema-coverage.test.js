import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The scanner reached for radar_config before the migration created it, so a
// fresh deploy died on the first auth bootstrap. Guard the whole class: every
// radar_* table the code queries must exist in the migration.

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCHEMA = readFileSync(join(ROOT, 'supabase/migrations/001_schema.sql'), 'utf8');

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function tablesQueriedIn(dirs) {
  const found = new Map();
  for (const dir of dirs) {
    for (const file of walk(join(ROOT, dir))) {
      if (!/\.(js|ts)$/.test(file)) continue;
      const source = readFileSync(file, 'utf8');
      for (const [, table] of source.matchAll(/\.from\(\s*['"`](radar_[a-z_]+)['"`]\s*\)/g)) {
        if (!found.has(table)) found.set(table, file.slice(ROOT.length));
      }
    }
  }
  return found;
}

describe('migration covers every table the code queries', () => {
  const queried = tablesQueriedIn(['api', 'supabase/functions']);

  it('finds the radar tables in the source', () => {
    expect(queried.size).toBeGreaterThan(0);
  });

  for (const [table, where] of queried) {
    it(`001_schema.sql creates ${table} (queried in ${where})`, () => {
      expect(SCHEMA).toContain(`create table if not exists public.${table}`);
    });

    it(`${table} has RLS enabled`, () => {
      expect(SCHEMA).toContain(`alter table public.${table} enable row level security`);
    });
  }
});
