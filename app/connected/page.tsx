/**
 * Main demo page (protected — see proxy.ts).
 *
 * Two server-rendered cards:
 *   1. Connect button → kicks off the Descope outbound OAuth flow for Dexcom.
 *   2. Fetch button  → calls our backend route which proxies Dexcom's API
 *                      using the access token Descope stored for this user.
 *
 * Server-side, we read the Descope session JWT to display the user's ID.
 */
import { session } from '@descope/nextjs-sdk/server';
import ConnectDexcomButton from '@/components/ConnectDexcomButton';
import GlucosePanel from '@/components/GlucosePanel';

// Force dynamic rendering — we need fresh session info on every request.
export const dynamic = 'force-dynamic';

export default async function ConnectedPage() {
  const s = await session();
  const userId = s?.token?.sub ?? null;

  return (
    <div>
      <h1>Connected workspace</h1>
      <p className="lede">
        Signed-in Descope user: <code>{userId ?? '(none)'}</code>
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>1. Connect Dexcom</h2>
        <p className="muted">
          Opens the Dexcom OAuth consent screen via Descope. Tokens land in
          Descope and are retrievable server-side.
        </p>
        <ConnectDexcomButton />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>2. Call Dexcom API</h2>
        <p className="muted">
          Server route grabs the user&apos;s access token from Descope, then
          GETs <code>/v3/users/self/egvs</code> (estimated glucose values).
        </p>
        <GlucosePanel />
      </div>
    </div>
  );
}
