// NPC contacts: they roam between a few map cells by day, like gifts, offer
// missions and open perks as the friendship grows. Pure logic — dialogue text
// lives in game/dialogues.js and the UI in ui/app.js.
import { addItem, removeItem, countOf } from './items.js';
import { NPC_CELLS, cellXY } from '../city/layout.js';

// affinity needed for levels 0..4
export const AFF_STEPS = [0, 10, 25, 45, 70];
export const LEVEL_NAMES = ['Asing', 'Kenal', 'Teman', 'Dekat', 'Sahabat'];
export const TALK_GAIN = 3;
export const GIFT_LIKED = 8;
export const GIFT_OTHER = 3;
export const MISSION_GAIN = 10;
// How long until the same NPC can be talked to / given a gift again.
export const TALK_COOLDOWN_MIN = 60;
export const GIFT_COOLDOWN_MIN = 180;
const MIN = 60000;

export const NPCS = [
  { id: 'laras', name: 'Bu Laras', role: 'Pemilik Kafe Senja', site: 's00', unlockRep: 0, likes: 'kue',
    perks: ['Kopi gratis tiap kali ngobrol', 'Fokus harian +10', 'Pendapatan kontrak +20%', 'Kopi memulihkan Fokus ×1,5'] },
  { id: 'rani', name: 'Rani', role: 'Jurnalis lepas', site: 's02', unlockRep: 30, likes: 'dokumen',
    perks: ['Diskon 25% untuk intel', 'Satu kontak baru dibocorkan', 'Hint hanya ◆5', 'Reputasi misi +25%'] },
  { id: 'dimas', name: 'Dimas', role: 'Teknisi warnet', site: 's01', unlockRep: 60, likes: 'komponen',
    perks: ['Diskon 15% Overclock', 'Loading −15%', 'Biaya Fokus −15%', 'Biaya Fokus −30% & Overclock 40%'] },
  { id: 'gun', name: 'Mbah Gun', role: 'Broker pasar gelap', site: 's03', unlockRep: 120, likes: 'rongsok',
    perks: ['Diskon 10% command & tool', 'SEARCH gratis', 'Diskon 25% command & tool', 'Kredit misi +20%'] }
];

export const npcById = (id) => NPCS.find((n) => n.id === id);
export const npcForSite = (siteId) => NPCS.find((n) => n.site === siteId);

export const levelOf = (aff) => AFF_STEPS.reduce((lv, min, i) => (aff >= min ? i : lv), 0);

export function npcState(profile, id) {
  const all = (profile.npc ||= {});
  return (all[id] ||= { aff: 0, talkedAt: 0, giftAt: 0, claimed: 0 });
}
export const npcLevel = (profile, id) => levelOf(profile.npc?.[id]?.aff || 0);

// 0..1 progress toward the next friendship level
export function levelProgress(aff) {
  const lv = levelOf(aff);
  if (lv >= AFF_STEPS.length - 1) return 1;
  return (aff - AFF_STEPS[lv]) / (AFF_STEPS[lv + 1] - AFF_STEPS[lv]);
}

// An NPC shows up on the map once your reputation is high enough, or once
// you bought intel on them (intel is keyed by their mission site).
export const isVisible = (profile, npc) => profile.rep >= npc.unlockRep || !!profile.intel?.[npc.site];

// Each NPC walks a 3-cell route, one cell per day. Returns map pixels.
export const npcSpot = (npc, day) => {
  const cells = NPC_CELLS[npc.id];
  return cellXY(cells[(day - 1) % cells.length]);
};

// ms left until you can talk / give a gift again (0 = ready)
export const talkWait = (profile, id, now = Date.now()) => Math.max(0, (npcState(profile, id).talkedAt || 0) + TALK_COOLDOWN_MIN * MIN - now);
export const giftWait = (profile, id, now = Date.now()) => Math.max(0, (npcState(profile, id).giftAt || 0) + GIFT_COOLDOWN_MIN * MIN - now);
export const canTalk = (profile, id, now = Date.now()) => talkWait(profile, id, now) === 0;
export const canGift = (profile, id, now = Date.now()) => giftWait(profile, id, now) === 0;

// One-time rewards the first time a friendship level is reached.
function claimLevelRewards(profile, npc, out) {
  const st = npcState(profile, npc.id);
  while (st.claimed < levelOf(st.aff)) {
    st.claimed += 1;
    out.push(`${npc.name}: ${LEVEL_NAMES[st.claimed]} — ${npc.perks[st.claimed - 1]}`);
    if (npc.id === 'rani' && st.claimed === 2) {
      const next = NPCS.filter((n) => !isVisible(profile, n)).sort((a, b) => a.unlockRep - b.unlockRep)[0];
      if (next) { (profile.intel ||= {})[next.site] = true; out.push(`Rani membocorkan sebuah kontak: ${next.name}, ${next.role}.`); }
    }
    if (npc.id === 'gun' && st.claimed === 2) {
      profile.cmds = profile.cmds || [];
      if (!profile.cmds.includes('SEARCH')) { profile.cmds.push('SEARCH'); out.push('Command SEARCH terbuka gratis.'); }
    }
  }
}

// Talk (then wait TALK_COOLDOWN_MIN). `bonus` is what the player's dialogue choice earned.
// Returns { gain, kopi, notes } or null while still cooling down.
export function talk(profile, id, mods = {}, bonus = 0, now = Date.now()) {
  const npc = npcById(id);
  if (!npc || !canTalk(profile, id, now)) return null;
  const st = npcState(profile, id);
  st.talkedAt = now;
  const gain = TALK_GAIN + (mods.talkBonus || 0) + bonus;
  st.aff += gain;
  const notes = [];
  claimLevelRewards(profile, npc, notes);
  let kopi = false;
  if (id === 'laras' && levelOf(st.aff) >= 1) { addItem(profile, 'kopi', 1); kopi = true; }
  return { gain, kopi, notes };
}

// Gift (then wait GIFT_COOLDOWN_MIN). Returns { gain, liked, notes } or null.
export function gift(profile, id, itemId, now = Date.now()) {
  const npc = npcById(id);
  if (!npc || !canGift(profile, id, now) || !removeItem(profile, itemId)) return null;
  const st = npcState(profile, id);
  st.giftAt = now;
  const liked = npc.likes === itemId;
  const gain = liked ? GIFT_LIKED : GIFT_OTHER;
  st.aff += gain;
  const notes = [];
  claimLevelRewards(profile, npc, notes);
  return { gain, liked, notes };
}

// Clearing a site for the first time warms up the NPC tied to it.
export function missionBond(profile, siteId) {
  const npc = npcForSite(siteId);
  if (!npc) return [];
  const st = npcState(profile, npc.id);
  st.aff += MISSION_GAIN;
  const notes = [];
  claimLevelRewards(profile, npc, notes);
  return notes;
}

export const hasItemFor = (profile, id) => countOf(profile, npcById(id)?.likes) > 0;
