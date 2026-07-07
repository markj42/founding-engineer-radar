import { makeDb } from './_db.js';
import { getRaises, getEngineers, getStatus } from './_core.js';

const handlers = { raises: getRaises, engineers: getEngineers, status: getStatus };

export default async () => {
  try {
    const body = await handlers['status'](makeDb());
    return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error.message ?? error) }), { status: 500 });
  }
};
