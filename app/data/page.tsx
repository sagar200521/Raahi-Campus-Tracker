'use client';
import { useEffect, useState } from 'react';

export default function DataPage() {
  const [view, setView] = useState<'real' | 'simulated'>('real');
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const createSession = async () => {
          const session = await fetch('/api/session', { method: 'POST' });
          if (!session.ok) throw new Error('Unable to create a demo session.');
          const key: string = (await session.json()).key;
          if (!key) throw new Error('Unable to create a demo session.');
          localStorage.setItem('raahi-session', key);
          return key;
        };
        let key = localStorage.getItem('raahi-session') || await createSession();
        const getData = () => fetch(`/api/data?limit=50&simulated=${view === 'simulated'}`, { headers: { 'X-Raahi-Session': key }, cache: 'no-store' });
        let response = await getData();
        if (response.status === 401) { key = await createSession(); response = await getData(); }
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Telemetry unavailable.');
        if (active) { setData(body); setError(''); }
      } catch (e) { if (active) { setData(null); setError(e instanceof Error ? e.message : 'Telemetry unavailable.'); } }
    }
    setData(null); void refresh();
    const timer = setInterval(refresh, 20000);
    return () => { active = false; clearInterval(timer); };
  }, [view]);
  return <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px', color: '#eaf2fa' }}>
    <a href="/" style={{ color: '#72e3bd' }}>← Raahi dashboard</a>
    <h1>TTN device data</h1>
    <p>Device raahi-vt · Updates every 20 seconds. Anyone with a demo session can view this data.</p>
    <p>Real and simulated uplinks are shown separately. An impact flag is not a confirmed crash.</p>
    <div className="ttn-switch"><button className="button secondary" aria-pressed={view === 'real'} onClick={() => setView('real')}>Real device</button><button className="button secondary" aria-pressed={view === 'simulated'} onClick={() => setView('simulated')}>Simulated tests</button></div>
    {error ? <p role="alert">{error}</p> : data ? <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 16, border: '1px solid #243449', borderRadius: 8, marginTop: 16 }}>{JSON.stringify(data, null, 2)}</pre> : <p>Loading telemetry…</p>}
  </main>;
}
