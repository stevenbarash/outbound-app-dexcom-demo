/**
 * ============================================================================
 *  DESCOPE OUTBOUND APPS — client-side entry point
 * ============================================================================
 *
 * This file is the entire client-side surface of Descope Outbound Apps in
 * this sample. One SDK call (`sdk.outbound.connect`) replaces an entire
 * OAuth client implementation: state generation, PKCE, callback hosting,
 * token exchange, and per-user token storage are all handled by Descope.
 *
 * High-level flow:
 *   1. User (already signed into Descope) clicks the button.
 *   2. `sdk.outbound.connect()` POSTs to Descope's outbound endpoint and
 *      returns an authorization URL pointing at Dexcom's OAuth screen
 *      (with state + PKCE managed by Descope).
 *   3. We navigate the browser to that URL.
 *   4. After the user consents, Dexcom redirects back to Descope's
 *      callback URL (`https://api.descope.com/v1/outbound/oauth/callback`),
 *      Descope exchanges the code for access/refresh tokens and stores them
 *      against the current Descope user.
 *   5. Descope then redirects the browser to the `redirectUrl` we passed
 *      below (`/connected`).
 *
 * Note: `outbound.connect()` returns a URL — it does NOT redirect for you.
 * You must call `window.location.assign(...)` yourself.
 */
'use client';

import { useDescope } from '@descope/nextjs-sdk/client';
import { useState } from 'react';

// Must match the "ID" field on the Outbound App in the Descope console.
const OUTBOUND_APP_ID =
  process.env.NEXT_PUBLIC_DESCOPE_OUTBOUND_APP_ID ?? 'dexcom';

export default function ConnectDexcomButton() {
  const sdk = useDescope();
  const [err, setErr] = useState<string | null>(null);

  const handleConnect = async () => {
    setErr(null);
    try {
      const res = await sdk.outbound.connect(OUTBOUND_APP_ID, {
        // Absolute URL is safer than a relative path — Descope echoes this
        // value back as the final post-OAuth landing page.
        redirectUrl: `${window.location.origin}/connected`,
        // Dexcom requires `offline_access` to issue a refresh token.
        scopes: ['offline_access'],
      });

      if (!res.ok) {
        throw new Error(
          res.error?.errorDescription ||
            res.error?.errorMessage ||
            `Connect failed (${res.code})`,
        );
      }

      const url = res.data?.url;
      if (!url) throw new Error('No authorization URL returned');
      window.location.assign(url);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  return (
    <div>
      <button className="btn" onClick={handleConnect}>
        Connect Dexcom
      </button>
      {err && (
        <p className="muted" style={{ color: '#ff6b6b' }}>
          Error: {err}
        </p>
      )}
    </div>
  );
}
