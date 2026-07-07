import { describe, it, expect, vi } from 'vitest';
import { getAccessToken } from '../src/lib/hi-auth.js';

const ok = (body) => ({ ok: true, status: 200, json: async () => body });

function memDb(initial = null) {
  let cfg = initial;
  return {
    getConfig: vi.fn(async () => cfg),
    saveConfig: vi.fn(async (v) => { cfg = v; }),
    current: () => cfg,
  };
}

describe('getAccessToken', () => {
  it('registers a client on first run, then fetches a token', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok({ client_id: 'cid', client_secret: 'sec' }))
      .mockResolvedValueOnce(ok({ access_token: 'tok1', expires_in: 3600 }));
    const db = memDb();
    const token = await getAccessToken({ fetch: fetchMock, db });
    expect(token).toBe('tok1');
    expect(fetchMock.mock.calls[0][0]).toContain('/oauth/register');
    expect(fetchMock.mock.calls[1][0]).toContain('/oauth/token');
    expect(db.current().credentials.client_id).toBe('cid');
  });

  it('reuses stored credentials and cached unexpired token', async () => {
    const fetchMock = vi.fn();
    const db = memDb({
      credentials: { client_id: 'cid', client_secret: 'sec' },
      token: { access_token: 'cached', expires_at: Date.now() + 3600_000 },
    });
    const token = await getAccessToken({ fetch: fetchMock, db });
    expect(token).toBe('cached');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes an expired token without re-registering', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok({ access_token: 'fresh', expires_in: 3600 }));
    const db = memDb({
      credentials: { client_id: 'cid', client_secret: 'sec' },
      token: { access_token: 'stale', expires_at: Date.now() - 1000 },
    });
    const token = await getAccessToken({ fetch: fetchMock, db });
    expect(token).toBe('fresh');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/oauth/token');
  });
});
