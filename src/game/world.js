import { SITES, siteById } from '../sites/index.js';
import { npcById, npcLevel, isVisible } from './npc.js';

export const CITY = { id: 'surabaya', name: 'Surabaya' };

// Missions are handed out by NPCs. `giver` is the NPC, `minLevel` the
// friendship level they need before they trust you with it.
export const MISSIONS = [
  { id: 's00', giver: 'laras', minLevel: 0, district: 'Tengah', difficulty: 1, repReward: 40, short: 'Kafe Senja — kontrak latihan.' },
  { id: 's04', giver: 'laras', minLevel: 1, district: 'Tengah', difficulty: 1, repReward: 50, short: 'Warung Tini — kasir macet.' },
  { id: 's02', giver: 'rani', minLevel: 0, district: 'Utara', difficulty: 2, repReward: 70, short: 'Gedung parkir — kamera plat.' },
  { id: 's05', giver: 'rani', minLevel: 2, district: 'Timur', difficulty: 3, repReward: 100, short: 'Radio komunitas — siaran dibajak.' },
  { id: 's06', giver: 'dimas', minLevel: 0, district: 'Timur', difficulty: 2, repReward: 70, short: 'Sekolah — arsip nilai terkunci.' },
  { id: 's01', giver: 'dimas', minLevel: 1, district: 'Barat', difficulty: 3, repReward: 120, short: 'Lab arsip — blueprint hilang.' },
  { id: 's03', giver: 'gun', minLevel: 0, district: 'Selatan', difficulty: 4, repReward: 180, short: 'Bursa kripto — buku besar palsu.' }
];
// New missions describe themselves (`meta` in their site file); they join the list in order.
for (const site of SITES) {
  if (site.meta && !MISSIONS.some((m) => m.id === site.id)) MISSIONS.push({ id: site.id, ...site.meta });
}
// legacy name kept for callers that only need the list
export const WORLD_NODES = MISSIONS;

export const DIFF_LABEL = ['', '◍ Mudah', '◍◍ Sedang', '◍◍◍ Sulit', '◍◍◍◍ Berat'];

export function nodeFor(id) {
  const n = MISSIONS.find((x) => x.id === id);
  return n ? { ...n, site: siteById(id) } : null;
}

// A mission counts as accepted once taken from its giver (or cleared).
export const isAccepted = (profile, id) => !!(profile.accepted?.[id] || profile.cleared[id]);

// cleared | accepted | open (giver is known and trusts you) | locked
export function nodeState(profile, id) {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) return 'hidden';
  if (profile.cleared[id]) return 'cleared';
  if (profile.accepted?.[id]) return 'accepted';
  if ((m.requires || []).some((r) => !profile.cleared[r])) return 'locked';
  const npc = npcById(m.giver);
  if (npc && isVisible(profile, npc) && npcLevel(profile, m.giver) >= m.minLevel) return 'open';
  return 'locked';
}

export function worldNodes(profile) {
  return MISSIONS.map((n) => ({ ...n, site: siteById(n.id), state: nodeState(profile, n.id) }));
}

// Missions this NPC can hand out right now.
export const offersFrom = (profile, npcId) => MISSIONS.filter((m) => m.giver === npcId && nodeState(profile, m.id) === 'open');
// Missions of theirs still waiting on more friendship (for a polite refusal line).
export const waitingOn = (profile, npcId) => MISSIONS.filter((m) => m.giver === npcId && nodeState(profile, m.id) === 'locked');

// Jobs = missions that are not locked, for lists and tests.
export function availableJobs(profile) {
  return MISSIONS.filter((n) => nodeState(profile, n.id) !== 'locked').map((n) => {
    const site = siteById(n.id);
    return {
      siteId: n.id, code: site.code, title: site.title, client: site.client,
      brief: site.brief, reward: site.reward, repReward: n.repReward,
      difficulty: n.difficulty, district: n.district, done: !!profile.cleared[n.id]
    };
  });
}
