// Anonymous agent bootstrap per hirey.ai/auth.md:
// 1. Dynamic client registration (RFC 7591) at auth.hi.hirey.ai -> client credentials
// 2. OAuth client-credentials grant -> bearer access token (scope hi.read)
// Credentials + token cache live in the db adapter (radar_config, service-role only).

const EXPIRY_MARGIN_MS = 60_000;

export async function getAccessToken({ fetch: fetchImpl = globalThis.fetch, db, authBase = 'https://auth.hi.hirey.ai', scope = 'hi.read' }) {
  const cfg = (await db.getConfig()) ?? {};

  let credentials = cfg.credentials;
  if (!credentials) {
    const res = await fetchImpl(`${authBase}/oauth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_name: 'founding-engineer-radar',
        grant_types: ['client_credentials'],
        token_endpoint_auth_method: 'client_secret_post',
        scope,
      }),
    });
    if (!res.ok) throw new Error(`Hi client registration failed (HTTP ${res.status})`);
    const reg = await res.json();
    credentials = { client_id: reg.client_id, client_secret: reg.client_secret };
    await db.saveConfig({ ...cfg, credentials });
  }

  if (cfg.token && cfg.token.expires_at > Date.now() + EXPIRY_MARGIN_MS) {
    return cfg.token.access_token;
  }

  const res = await fetchImpl(`${authBase}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      scope,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Hi token exchange failed (HTTP ${res.status})`);
  const tok = await res.json();
  const token = {
    access_token: tok.access_token,
    expires_at: Date.now() + (tok.expires_in ?? 3600) * 1000,
  };
  await db.saveConfig({ credentials, token });
  return token.access_token;
}
