import { siteById } from '../sites/index.js';

// Open-world map metadata. Each node references a site network in ../sites.
// `x`/`y` are percentages on the city map. `unlockRep` gates discovery.
export const CITY = { id: 'surabaya', name: 'Surabaya' };

export const WORLD_NODES = [
  { id: 's00', district: 'Tengah', x: 30, y: 68, difficulty: 1, repReward: 40, unlockRep: 0,
    short: 'Warung kopi — kontrak latihan.' },
  { id: 's02', district: 'Utara', x: 62, y: 34, difficulty: 2, repReward: 70, unlockRep: 30,
    short: 'Gedung parkir — kamera plat.' },
  { id: 's01', district: 'Barat', x: 20, y: 40, difficulty: 3, repReward: 120, unlockRep: 80,
    short: 'Lab arsip — blueprint hilang.' },
  { id: 's03', district: 'Selatan', x: 74, y: 72, difficulty: 4, repReward: 180, unlockRep: 160,
    short: 'Bursa kripto — buku besar palsu.' }
];

export const DIFF_LABEL = ['', '◍ Mudah', '◍◍ Sedang', '◍◍◍ Sulit', '◍◍◍◍ Berat'];

export function nodeFor(id) {
  const n = WORLD_NODES.find((x) => x.id === id);
  return n ? { ...n, site: siteById(id) } : null;
}

// A node is reachable (shown as a live pin) once the player's rep clears it,
// or once it was discovered/cleared before. Locked nodes still show as a
// dimmed "sinyal lemah" pin so the world feels larger than what's open.
export function nodeState(profile, id) {
  const n = WORLD_NODES.find((x) => x.id === id);
  if (!n) return 'hidden';
  if (profile.cleared[id]) return 'cleared';
  if (profile.rep >= n.unlockRep || profile.discovered[id] || profile.intel[id]) return 'open';
  return 'locked';
}

export function worldNodes(profile) {
  return WORLD_NODES.map((n) => ({ ...n, site: siteById(n.id), state: nodeState(profile, n.id) }));
}

// Jobs = the endings offered by each OPEN site, surfaced in the Job board.
export function availableJobs(profile) {
  const jobs = [];
  for (const n of WORLD_NODES) {
    const st = nodeState(profile, n.id);
    if (st === 'locked') continue;
    const site = siteById(n.id);
    jobs.push({
      siteId: n.id, code: site.code, title: site.title, client: site.client,
      brief: site.brief, reward: site.reward, repReward: n.repReward,
      difficulty: n.difficulty, district: n.district, done: !!profile.cleared[n.id]
    });
  }
  return jobs;
}
