// Supabase-backed db adapter for the Netlify functions (server-side only).
import { createClient } from '@supabase/supabase-js';

export function makeDb(env = process.env) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  return {
    listingsByKind: async (kind) => {
      const { data, error } = await supabase.from('listings')
        .select('*').eq('kind', kind).order('seen_at', { ascending: false }).limit(100);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    matchesFor: async (companyHiId) => {
      const { data, error } = await supabase.from('matches')
        .select('company_hi_id, listing_hi_id, score, reasons')
        .eq('company_hi_id', companyHiId).order('score', { ascending: false }).limit(10);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    matchesForEngineer: async (listingHiId) => {
      const { data, error } = await supabase.from('matches')
        .select('company_hi_id, listing_hi_id, score, reasons')
        .eq('listing_hi_id', listingHiId).order('score', { ascending: false }).limit(5);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    lastOkRun: async () => {
      const { data, error } = await supabase.from('scan_runs')
        .select('finished_at, status').eq('status', 'ok')
        .order('finished_at', { ascending: false }).limit(1);
      if (error) throw new Error(error.message);
      return data?.[0] ?? null;
    },
  };
}
