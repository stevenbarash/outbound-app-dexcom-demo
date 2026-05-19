/**
 * GET /api/dexcom/egvs
 *
 * End-to-end demonstration of the **Descope Outbound Apps** read pattern:
 * fetch the user-scoped Dexcom access token from Descope, then use it to
 * call the Dexcom API server-side.
 *
 * Flow:
 *   1. Read the Descope session from cookies (`session()` helper).
 *   2. ── OUTBOUND APPS ──
 *      Ask the Outbound Apps Management API for the Dexcom access token
 *      that was stored when the user connected (see ConnectDexcomButton).
 *      Refresh happens transparently inside Descope if the token is stale.
 *   3. Call Dexcom's `/v3/users/self/egvs` with that token.
 *   4. Return Dexcom's JSON to the client unchanged.
 *
 * The browser never sees the Dexcom access token — only this route does.
 *
 * Query params (both optional):
 *   startDate, endDate — ISO-8601 without timezone, e.g. 2025-01-15T12:00:00
 *                        Defaults to the last 24 hours.
 *
 * Dexcom API docs: https://developer.dexcom.com/docs/dexcomv3/endpoint-overview/
 */
import { NextResponse } from 'next/server';
import { session } from '@descope/nextjs-sdk/server';
import { getOutboundToken } from '@/lib/descope-outbound';

// Don't let Next.js cache this — every request must re-read the session.
export const dynamic = 'force-dynamic';

const APP_ID = process.env.DESCOPE_OUTBOUND_APP_ID ?? 'dexcom';

// Default to Dexcom's sandbox so the demo runs without a real CGM. Override
// with `DEXCOM_API_BASE=https://api.dexcom.com` in production.
const DEXCOM_BASE =
  process.env.DEXCOM_API_BASE ?? 'https://sandbox-api.dexcom.com';

export async function GET(req: Request) {
  const s = await session();
  const userId = s?.token?.sub;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let token: string;
  try {
    const t = await getOutboundToken({
      appId: APP_ID,
      userId,
      scopes: ['offline_access'],
    });
    token = t.accessToken;
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Token fetch failed', detail: e?.message ?? String(e) },
      { status: 502 },
    );
  }

  // Dexcom expects ISO-8601 timestamps WITHOUT the trailing `Z`.
  const url = new URL(req.url);
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 19);
  const startDate = url.searchParams.get('startDate') ?? fmt(dayAgo);
  const endDate = url.searchParams.get('endDate') ?? fmt(now);

  const apiUrl = new URL(`${DEXCOM_BASE}/v3/users/self/egvs`);
  apiUrl.searchParams.set('startDate', startDate);
  apiUrl.searchParams.set('endDate', endDate);

  const res = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  // Dexcom may return non-JSON error pages — handle that gracefully.
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Dexcom API error', dexcom: json, httpStatus: res.status },
      { status: 502 },
    );
  }

  return NextResponse.json(json);
}
