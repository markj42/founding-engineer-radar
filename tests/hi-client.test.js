import { describe, it, expect, vi } from 'vitest';
import { HiClient, HiError } from '../src/lib/hi-client.js';

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const err = (body, status = 400) => ({ ok: false, status, json: async () => body });

describe('HiClient', () => {
  it('POSTs to /v1/capabilities/{id}/call with the args', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ listings: [] }));
    const client = new HiClient({ fetch: fetchMock, baseUrl: 'https://hi.example' });
    await client.call('hi.agent-listings', { action: 'browse_recent', limit: 50 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hi.example/v1/capabilities/hi.agent-listings/call');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ action: 'browse_recent', limit: 50 });
  });

  it('retries on retryable errors then succeeds', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(err({ error_code: 'rate_limited', message: 'slow down', retryable: true }, 429))
      .mockResolvedValueOnce(ok({ listings: [1] }));
    const client = new HiClient({ fetch: fetchMock, baseUrl: 'https://hi.example', backoffMs: 1 });
    const res = await client.call('hi.agent-listings', { action: 'browse_recent' });
    expect(res.listings).toEqual([1]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws HiError immediately on non-retryable errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(err({ error_code: 'bad_request', message: 'nope', retryable: false }));
    const client = new HiClient({ fetch: fetchMock, baseUrl: 'https://hi.example', backoffMs: 1 });
    await expect(client.call('hi.companies', { action: 'get' })).rejects.toThrow(HiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxRetries retryable failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(err({ error_code: 'rate_limited', message: 'x', retryable: true }, 429));
    const client = new HiClient({ fetch: fetchMock, baseUrl: 'https://hi.example', backoffMs: 1, maxRetries: 2 });
    await expect(client.call('hi.companies', { action: 'get' })).rejects.toThrow(HiError);
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('exposes error_code on HiError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(err({ error_code: 'not_found', message: 'missing', retryable: false }, 404));
    const client = new HiClient({ fetch: fetchMock, baseUrl: 'https://hi.example' });
    const e = await client.call('hi.companies', { action: 'get' }).catch((x) => x);
    expect(e.errorCode).toBe('not_found');
  });
});
