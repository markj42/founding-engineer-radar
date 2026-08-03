import { makeDb } from './_db.js';
import { getRaises } from './_core.js';

export const config = { runtime: 'edge' };

export default async () => {
  try {
    const body = await getRaises(makeDb());
    return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error.message ?? error) }), { status: 500 });
  }
};
