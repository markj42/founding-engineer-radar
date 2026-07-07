import React from 'react';

export default function FreshnessBadge({ isoDate }) {
  if (!isoDate) return null;
  const hours = (Date.now() - new Date(isoDate).getTime()) / 36e5;
  if (Number.isNaN(hours)) return null;
  if (hours <= 24) return <span className="badge badge-new">new today</span>;
  if (hours <= 72) return <span className="badge badge-recent">this week</span>;
  return null;
}
