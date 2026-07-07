// Supabase scheduled edge function: runs the radar scan every 15 minutes.
// Schedule it with:  select cron.schedule('radar-scan', '*/15 * * * *', $$ ... $$);
// or via the dashboard (Edge Functions -> scanner -> schedule).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { runScan } from './scanner-core.js';
import { HiClient } from './hi-client.js';
import { getAccessToken } from './hi-auth.js';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const db = {
    loadListings: async () => {
      const { data, error } = await supabase.from('radar_listings').select('raw');
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.raw);
    },
    saveListings: async (rows: any[]) => {
      const { error } = await supabase.from('radar_listings').upsert(
        rows.map((l) => ({
          hi_id: l.listing_id,
          kind: l.listing_type_id === 'fundraising' ? 'raise' : 'engineer',
          summary: l.summary ?? null,
          raw: l,
          created_at_hi: l.created_at ?? null,
          seen_at: new Date().toISOString(),
        })),
      );
      if (error) throw new Error(error.message);
    },
    insertEvents: async (events: any[]) => {
      const { error } = await supabase.from('radar_events').insert(events);
      if (error) throw new Error(error.message);
    },
    upsertMatches: async (matches: any[]) => {
      const { error } = await supabase.from('radar_matches').upsert(matches);
      if (error) throw new Error(error.message);
    },
    recordRun: async (run: any) => {
      const { error } = await supabase.from('radar_scan_runs').insert(run);
      if (error) throw new Error(error.message);
    },
    getConfig: async () => {
      const { data, error } = await supabase.from('radar_config').select('value').eq('key', 'hi_auth');
      if (error) throw new Error(error.message);
      return data?.[0]?.value ?? null;
    },
    saveConfig: async (value: any) => {
      const { error } = await supabase.from('radar_config').upsert({ key: 'hi_auth', value, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    },
  };

  let result;
  try {
    const token = await getAccessToken({ db });
    const hi = new HiClient({ baseUrl: Deno.env.get('HI_BASE_URL') ?? 'https://hi.hirey.ai', token });
    result = await runScan({ hi, db });
  } catch (error) {
    result = {
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      status: 'error',
      error: 'auth: ' + String((error as Error)?.message ?? error),
      counts: {},
    };
    await db.recordRun(result).catch(() => {});
  }
  return new Response(JSON.stringify(result), {
    headers: { 'content-type': 'application/json' },
    status: result.status === 'ok' ? 200 : 500,
  });
});
