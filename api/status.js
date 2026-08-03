import { makeDb } from './_db.js';
import { getStatus } from './_core.js';

export const config = { runtime: 'edge' };

export default async () => {
  try {
    const body = await getStatus(makeDb());
    return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error.message ?? error) }), { status: 500 });
  }
};
