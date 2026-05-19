/**
 * ============================================================================
 *  DESCOPE OUTBOUND APPS — server-side token retrieval
 * ============================================================================
 *
 * This file is the server-side surface of Descope Outbound Apps in this
 * sample. It calls the Outbound Apps Management API to retrieve the access
 * token that Descope stored for a given (Descope userId, Outbound App) pair.
 *
 * What you DON'T need to write because of Outbound Apps:
 *   - An OAuth callback route (Descope hosts api.descope.com/v1/outbound/...)
 *   - A per-user token table
 *   - Refresh-token rotation logic
 *   - Provider-specific token-exchange code
 *
 * What you DO write: this ~30 line wrapper around the Management API.
 *
 * This is what lets your backend call third-party APIs (Dexcom, Slack,
 * GitHub, etc.) on behalf of a signed-in user without ever seeing those
 * provider credentials in your own code or DB.
 *
 * Auth model:
 *   Authorization: Bearer <projectId>:<managementKey>
 *
 * Endpoint:
 *   POST https://api.descope.com/v1/mgmt/outbound/app/user/token
 *
 * Docs:
 *   https://docs.descope.com/identity-federation/outbound-apps/using-outbound-apps
 */

const DESCOPE_BASE = process.env.DESCOPE_BASE_URL ?? 'https://api.descope.com';

// Response shape per Descope Mgmt API docs:
// https://docs.descope.com/api/management/outbound-apps/fetch-outbound-app-user-token
type TokenResponse = {
  token: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    scopes?: string[];
  };
};

export async function getOutboundToken(opts: {
  appId: string;
  userId: string;
  scopes?: string[];
  /**
   * Restrict the token to a specific tenant. Use when the same user
   * connects to the provider once per tenant.
   */
  tenantId?: string;
  /**
   * Look up the connection by an external identifier instead of by
   * Descope userId. Useful when the connection is provisioned without a
   * Descope user.
   */
  externalIdentifier?: string;
  /** Also return the refresh token. Most callers don't need this. */
  withRefreshToken?: boolean;
  /**
   * Force Descope to refresh the access token before returning it. Per
   * the Outbound Apps docs the API will return a refreshed token
   * regardless of this flag if the cached one is stale — set this to
   * `true` only to force the refresh dance (e.g. after a 401 from the
   * upstream provider).
   */
  forceRefresh?: boolean;
}): Promise<{ accessToken: string; expiresAt?: number; scopes?: string[] }> {
  const projectId = process.env.DESCOPE_PROJECT_ID;
  const managementKey = process.env.DESCOPE_MANAGEMENT_KEY;
  if (!projectId || !managementKey) {
    throw new Error('DESCOPE_PROJECT_ID or DESCOPE_MANAGEMENT_KEY not set');
  }

  const res = await fetch(`${DESCOPE_BASE}/v1/mgmt/outbound/app/user/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${projectId}:${managementKey}`,
    },
    body: JSON.stringify({
      appId: opts.appId,
      userId: opts.userId,
      scopes: opts.scopes ?? [],
      tenantId: opts.tenantId,
      externalIdentifier: opts.externalIdentifier,
      options: {
        withRefreshToken: opts.withRefreshToken ?? false,
        forceRefresh: opts.forceRefresh ?? false,
      },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Descope token fetch failed (${res.status}): ${body}`);
  }

  const data: TokenResponse = await res.json();
  if (!data.token?.accessToken) {
    throw new Error(
      `No access token in Descope response: ${JSON.stringify(data)}`,
    );
  }
  return {
    accessToken: data.token.accessToken,
    expiresAt: data.token.expiresAt,
    scopes: data.token.scopes,
  };
}
