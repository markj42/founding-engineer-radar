// Thin Hi REST client. One method: call(capabilityId, args).
// Implements the uniform error envelope (error_code, message, retryable)
// with exponential backoff on retryable errors. Branch on error_code, not
// HTTP status (per hirey.ai/api).

export class HiError extends Error {
  constructor(envelope, status) {
    super(envelope?.message ?? `Hi API error (HTTP ${status})`);
    this.name = 'HiError';
    this.errorCode = envelope?.error_code ?? 'unknown';
    this.retryable = Boolean(envelope?.retryable);
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class HiClient {
  constructor({ fetch: fetchImpl = globalThis.fetch, baseUrl = 'https://hi.hirey.ai', token = null, maxRetries = 3, backoffMs = 500 } = {}) {
    this.fetch = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
    this.maxRetries = maxRetries;
    this.backoffMs = backoffMs;
  }

  async call(capabilityId, args = {}) {
    let attempt = 0;
    for (;;) {
      const res = await this.fetch(`${this.baseUrl}/v1/capabilities/${capabilityId}/call`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify(args),
      });
      if (res.ok) return res.json();
      const envelope = await res.json().catch(() => null);
      const error = new HiError(envelope, res.status);
      if (!error.retryable || attempt >= this.maxRetries) throw error;
      await sleep(this.backoffMs * 2 ** attempt);
      attempt += 1;
    }
  }
}
