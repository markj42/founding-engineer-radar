import React from 'react';
import FreshnessBadge from './FreshnessBadge.jsx';
import { introLink } from '../lib/api.js';

export default function RaiseCard({ raise }) {
  return (
    <article className="card">
      <header>
        <h3>{raise.summary}</h3>
        <FreshnessBadge isoDate={raise.created_at} />
      </header>
      {raise.listing?.text && <p className="muted">{raise.listing.text}</p>}
      {raise.matches?.length > 0 && (
        <div className="matches">
          <h4>Top matched engineers</h4>
          {raise.matches.slice(0, 3).map((m) => (
            <div key={m.listing_hi_id} className="match-row">
              <span className="score">{m.score}</span>
              <span className="reasons">{(m.reasons ?? []).join(' · ')}</span>
            </div>
          ))}
        </div>
      )}
      <a className="cta" href={introLink(raise)} target="_blank" rel="noreferrer">
        Request intro via your Hi agent →
      </a>
    </article>
  );
}
