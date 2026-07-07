import React, { useEffect, useState } from 'react';
import { loadRadar } from './lib/api.js';
import RaiseCard from './components/RaiseCard.jsx';
import EngineerCard from './components/EngineerCard.jsx';
import StatusBanner from './components/StatusBanner.jsx';

export default function App() {
  const [tab, setTab] = useState('raises');
  const [data, setData] = useState(null);

  useEffect(() => { loadRadar().then(setData); }, []);

  if (!data) return <div className="shell"><p className="muted">Scanning the network…</p></div>;

  return (
    <div className="shell">
      <header className="masthead">
        <h1>Founding Engineer Radar</h1>
        <p className="tagline">Who just raised on <a href="https://hirey.ai">Hi</a> — and which founding engineers match.</p>
      </header>
      <StatusBanner demo={data.demo} lastScanAt={data.status?.last_scan_at} />
      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'raises'} className={tab === 'raises' ? 'active' : ''} onClick={() => setTab('raises')}>
          Just raised <span className="count">{data.raises.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'engineers'} className={tab === 'engineers' ? 'active' : ''} onClick={() => setTab('engineers')}>
          Founding engineers <span className="count">{data.engineers.length}</span>
        </button>
      </nav>
      <main>
        {tab === 'raises'
          ? data.raises.map((r) => <RaiseCard key={r.hi_id} raise={r} />)
          : data.engineers.map((e) => <EngineerCard key={e.hi_id} engineer={e} />)}
        {tab === 'raises' && data.raises.length === 0 && <p className="muted">No raise signals yet.</p>}
        {tab === 'engineers' && data.engineers.length === 0 && <p className="muted">No engineer listings yet.</p>}
      </main>
      <footer className="foot">
        Built on the <a href="https://hirey.ai/api">Hi REST API</a> · intros happen through your own agent, one reciprocated edge at a time.
      </footer>
    </div>
  );
}
