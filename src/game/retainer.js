// Retainers ("ladang"): after clearing a site the client can keep you on a
// maintenance contract. Each day you open the file server on their entry node
// and collect the pay. Skipped days stack up to MAX_BACKLOG — no penalty.
export const MAX_BACKLOG = 3;

export const payPerDay = (site) => Math.max(15, Math.min(35, Math.round(site.reward / 10)));

export const hasContract = (profile, siteId) => !!profile.retainers?.[siteId];

export const canContract = (profile, siteId) => !!profile.cleared[siteId] && !hasContract(profile, siteId);

export function startContract(profile, siteId) {
  if (!canContract(profile, siteId)) return false;
  (profile.retainers ||= {})[siteId] = { since: profile.day, lastDone: profile.day - 1 };
  return true;
}

export function pendingDays(profile, siteId) {
  const r = profile.retainers?.[siteId];
  if (!r) return 0;
  return Math.max(0, Math.min(MAX_BACKLOG, profile.day - r.lastDone));
}

export function payout(profile, siteId, site, mods = {}) {
  return Math.round(payPerDay(site) * pendingDays(profile, siteId) * (mods.retainerMult ?? 1));
}

// Returns { credits, days } or null when nothing is due.
export function collect(profile, siteId, site, mods = {}) {
  const days = pendingDays(profile, siteId);
  if (!days) return null;
  const credits = payout(profile, siteId, site, mods);
  profile.credits += credits;
  profile.retainers[siteId].lastDone = profile.day;
  return { credits, days };
}
