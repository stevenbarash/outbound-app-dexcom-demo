/**
 * Client component that calls our backend route `/api/dexcom/egvs` and
 * pretty-prints the response. The browser never touches the Dexcom access
 * token — the backend pulls it from Descope and proxies the API call.
 *
 * `EgvsResponse` mirrors Dexcom's v3 EGV response shape; see
 * https://developer.dexcom.com/docs/dexcomv3/endpoint-egvs/ for the full
 * schema (we only type the fields we display).
 */
'use client';

import { useState } from 'react';

type Egv = {
  systemTime?: string;
  displayTime?: string;
  value?: number;
  unit?: string;
  trend?: string;
  rateUnit?: string;
};

type EgvsResponse = {
  recordType?: string;
  recordVersion?: string;
  userId?: string;
  records?: Egv[];
};

export default function GlucosePanel() {
  const [data, setData] = useState<EgvsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchEgvs = async () => {
    setLoading(true);
    setErr(null);
    setData(null);
    try {
      const res = await fetch('/api/dexcom/egvs');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button className="btn" onClick={fetchEgvs} disabled={loading}>
        {loading ? 'Fetching…' : 'Fetch glucose readings (last 24h)'}
      </button>
      {err && <p style={{ color: '#ff6b6b' }}>Error: {err}</p>}
      {data && (
        <>
          <p className="muted">
            {data.records?.length ?? 0} records · userId{' '}
            <code>{data.userId ?? '(none)'}</code>
          </p>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
