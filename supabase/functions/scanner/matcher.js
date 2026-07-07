// Pure matcher: score an engineer listing against a raise (fundraising) listing.
// Signals: keyword overlap between each side's target.requirements and the
// other side's self.facts, plus an SF co-location boost.

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'for', 'at', 'on', 'with', 'open']);

function textOf(rows = []) {
  return rows
    .flatMap((r) => [r.attribute_label, r.raw_value_text])
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function tokens(text) {
  return new Set(
    text.split(/[^a-z0-9+#]+/).filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}

function overlap(requirementsText, factsText) {
  const req = tokens(requirementsText);
  const facts = tokens(factsText);
  const hits = [...req].filter((t) => facts.has(t));
  return { hits, ratio: req.size === 0 ? 0 : hits.length / req.size };
}

function cityOf(listing) {
  const rows = [...(listing.self?.facts ?? [])];
  for (const row of rows) {
    if (row.value_kind === 'location') {
      return (row.normalized_value?.city ?? row.raw_value_text ?? '').toLowerCase();
    }
  }
  return '';
}

export function scoreMatch(raiseListing, engineerListing) {
  const reasons = [];
  let score = 0;

  // Founder requirements vs engineer facts (max 40)
  const founderSide = overlap(
    textOf(raiseListing.target?.requirements),
    textOf(engineerListing.self?.facts),
  );
  score += Math.round(founderSide.ratio * 40);
  if (founderSide.hits.length) {
    reasons.push(`Matches the founder's requirements: ${founderSide.hits.slice(0, 4).join(', ')}`);
  }

  // Engineer requirements vs founder facts (max 40)
  const engineerSide = overlap(
    textOf(engineerListing.target?.requirements),
    textOf(raiseListing.self?.facts),
  );
  score += Math.round(engineerSide.ratio * 40);
  if (engineerSide.hits.length) {
    reasons.push(`Fits what the engineer wants: ${engineerSide.hits.slice(0, 4).join(', ')}`);
  }

  // Location (max 20, SF weighted per spec)
  const cityA = cityOf(raiseListing);
  const cityB = cityOf(engineerListing);
  if (cityA && cityA === cityB) {
    const sf = cityA.includes('san francisco');
    score += sf ? 20 : 12;
    reasons.push(sf ? 'Both in San Francisco' : `Both in ${cityB}`);
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export function rankMatches(raiseListing, engineerListings) {
  return engineerListings
    .map((eng) => ({
      company_hi_id: raiseListing.listing_id,
      listing_hi_id: eng.listing_id,
      ...scoreMatch(raiseListing, eng),
    }))
    .sort((a, b) => b.score - a.score);
}
