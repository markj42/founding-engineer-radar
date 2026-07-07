import { describe, it, expect, vi } from 'vitest';
import { getAccessToken } from '../src/lib/hi-auth.js';

const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });

function memDb(initial = null) {
  let cfg = initial;
  return {
    getConfig: vi.fn(async () => cfg),
    saveConfig: vi.fn(async (v) => { cfg = v; }),
    current: () => cfg,
  };
}

const REG_RESPONSE = {
  agent: { agent_id: 'ag_1' },
  installation: { installation_id: 'in_1' },
  auth: { client_id: 'cid', client_secret: 'sec', audience: 'https://hi.hirey.ai', token_url: 'https://hi.hirey.ai/oauth/token' },
};

describe('getAccessToken (agents/register flow)', () => {
  it('first run: registers agent, mints token, activates', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok(REG_RESPONSE))
      .mockResolvedValueOnce(ok({ access_token: 'tok1', expires_in: 3600 }))
      .mockResolvedValueOnce(ok({ activated: true }));
    const db = memDb();
    const token = await getAccessToken({ fetch: fetchMock, db });
    expect(token).toBe('tok1');
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/agents/register');
    expect(fetchMock.mock.calls[1][0]).toContain('/oauth/token');
    expect(fetchMock.mock.calls[1][1].body).toContain('audience=');
    expect(fetchMock.mock.calls[2][0]).toContain('/v1/agents/activate');
    expect(db.current().credentials.client_id).toBe('cid');
    expect(db.current().credentials.agent_id).toBe('ag_1');
  });

  it('reuses stored credentials and cached unexpired token, no fetches', async () => {
    const fetchMock = vi.fn();
    const db = memDb({
      credentials: { client_id: 'cid', client_secret: 'sec', audience: 'aud', token_url: 'https://hi.hirey.ai/oauth/token', agent_id: 'ag_1', activated: true },
      token: { access_token: 'cached', expires_at: Date.now() + 3600_000 },
    });
    const token = await getAccessToken({ fetch: fetchMock, db });
    expect(token).toBe('cached');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes an expired token without re-registering', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok({ access_token: 'fresh', expires_in: 3600 }));
    const db = memDb({
      credentials: { client_id: 'cid', client_secret: 'sec', audience: 'aud', token_url: 'https://hi.hirey.ai/oauth/token', agent_id: 'ag_1', activated: true },
      token: { access_token: 'stale', expires_at: Date.now() - 1000 },
    });
    const token = await getAccessToken({ fetch: fetchMock, db });
    expect(token).toBe('fresh');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/oauth/token');
  });
});
