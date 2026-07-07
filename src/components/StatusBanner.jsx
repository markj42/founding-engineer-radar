import React from 'react';

export default function StatusBanner({ demo, lastScanAt }) {
  if (demo) return <div className="banner">Demo mode — showing sample data. Deploy with Supabase + the scanner for live radar.</div>;
  if (!lastScanAt) return <div className="banner">No completed scans yet — data will appear after the first scanner run.</div>;
  return <div className="banner banner-ok">Data as of {new Date(lastScanAt).toLocaleString()}</div>;
}
