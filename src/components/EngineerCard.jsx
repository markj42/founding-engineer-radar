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
      <a className="cta" href={introLink(engineer)} target="_blank" rel="noreferrer">
        Request intro via your Hi agent →
      </a>
    </article>
  );
}
