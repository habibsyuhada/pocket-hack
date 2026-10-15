// Reputation → rank ladder. Rep is earned by clearing sites and jobs.
export const RANKS = [
  { id: 0, name: 'Script Kiddie', min: 0 },
  { id: 1, name: 'Runner', min: 60 },
  { id: 2, name: 'Breaker', min: 160 },
  { id: 3, name: 'Ghost', min: 340 },
  { id: 4, name: 'Operator', min: 620 },
  { id: 5, name: 'Phantom', min: 1000 },
  { id: 6, name: 'NULLBYTE', min: 1600 }
];

export function rankFor(rep) {
  let r = RANKS[0];
  for (const rank of RANKS) if (rep >= rank.min) r = rank;
  return r;
}

export function nextRank(rep) {
  return RANKS.find((r) => r.min > rep) || null;
}

// 0..1 progress toward the next rank (1 when maxed).
export function rankProgress(rep) {
  const cur = rankFor(rep);
  const nxt = nextRank(rep);
  if (!nxt) return 1;
  return (rep - cur.min) / (nxt.min - cur.min);
}
