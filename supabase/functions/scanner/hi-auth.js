// Anonymous agent bootstrap, mirroring the official installer
// (hi.hirey.ai/v1/install/claude.sh):
//   1. POST {base}/v1/agents/register  (open) -> client_id/secret, agent_id, audience
//   2. POST {token_url}                grant_type=client_credentials + audience -> access token
//   3. POST {base}/v1/agents/activate  (bearer, once, idempotent)
// Credentials + token cache live in the db adapter (radar_config, service-role only).
// NOTE (identity durability): we only register when no credentials exist, so the
// agent identity is stable across runs — never silently re-register.

const EXPIRY_MARGIN_MS = 60_000;

export async function getAccessToken({ fetch: fetchImpl = globalThis.fetch, db, baseUrl = 'https://hi.hirey.ai' }) {
  const cfg = (await db.getConfig()) ?? {};
  let credentials = cfg.credentials;

  if (!credentials) {
    const res = await fetchImpl(`${baseUrl}/v1/agents/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ display_name: 'Founding Engineer Radar (Hirey Hub)', agent_kind: 'external' }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Hi agent registration failed (HTTP ${res.status}): ${String(body).slice(0, 300)}`);
    }
    const reg = await res.json();
    credentials = {
      client_id: reg.auth?.client_id,
      client_secret: reg.auth?.client_secret,
      audience: reg.auth?.audience,
      token_url: reg.auth?.token_url ?? `${baseUrl}/oauth/token`,
      agent_id: reg.agent?.agent_id,
      installation_id: reg.installation?.installation_id,
      activated: false,
    };
    await db.saveConfig({ credentials });
  }

  if (cfg.token && cfg.token.expires_at > Date.now() + EXPIRY_MARGIN_MS) {
    return cfg.token.access_token;
  }

  const tokenRes = await fetchImpl(credentials.token_url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      audience: credentials.audience ?? '',
    }).toString(),
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => '');
    throw new Error(`Hi token exchange failed (HTTP ${tokenRes.status}): ${String(body).slice(0, 300)}`);
  }
  const tok = await tokenRes.json();
  const token = {
    access_token: tok.access_token,
    expires_at: Date.now() + (tok.expires_in ?? 3600) * 1000,
  };

  if (!credentials.activated) {
    const act = await fetchImpl(`${baseUrl}/v1/agents/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token.access_token}` },
      body: '{}',
    });
    if (act.ok) credentials = { ...credentials, activated: true };
  }

  await db.saveConfig({ credentials, token });
  return token.access_token;
}
