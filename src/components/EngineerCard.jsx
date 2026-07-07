import React from 'react';
import FreshnessBadge from './FreshnessBadge.jsx';
import { introLink } from '../lib/api.js';

export default function EngineerCard({ engineer }) {
  const facts = engineer.listing?.self?.facts ?? [];
  return (
    <article className="card">
      <header>
        <h3>{engineer.summary}</h3>
        <FreshnessBadge isoDate={engineer.created_at} />
      </header>
      <ul className="facts">
        {facts.slice(0, 4).map((f, i) => <li key={i}>{f.attribute_label}</li>)}
      </ul>
      {engineer.matches?.length > 0 && (
        <div className="matches">
          <h4>Matching startups that raised</h4>
          {engineer.matches.slice(0, 3).map((m) => (
            <div key={m.company_hi_id} className="match-row">
              <span className="score">{m.score}</span>
              <span className="reasons">{(m.reasons ?? []).join(' · ')}</span>
            </div>
          ))}
        </div>
      )}
      <a className="cta" href={introLink(engineer)} target="_blank" rel="noreferrer">
        Request intro via your Hi agent →
      </a>
    </article>
  );
}
