// One place that folds today's event and NPC friendship perks into the
// multipliers the rest of the game reads. Defaults are all neutral.
import { eventFor, FOCUS_BASE } from './time.js';
import { npcLevel } from './npc.js';

export const HINT_BASE = 10;

export function perksFor(profile) {
  const ev = eventFor(profile.day) || {};
  const laras = npcLevel(profile, 'laras');
  const dimas = npcLevel(profile, 'dimas');
  const rani = npcLevel(profile, 'rani');
  const gun = npcLevel(profile, 'gun');
  const hadi = npcLevel(profile, 'hadi');
  const wulan = npcLevel(profile, 'wulan');
  const sari = npcLevel(profile, 'sari');
  const vira = npcLevel(profile, 'vira');
  const bought = (id) => profile.bought?.includes(id);
  return {
    focusCost: (dimas >= 4 ? 0.7 : dimas >= 3 ? 0.85 : 1) * (hadi >= 2 ? 0.95 : 1) * (wulan >= 3 ? 0.9 : 1) * (vira >= 4 ? 0.9 : 1) * (bought('up_cooling') ? 0.9 : 1),
    loading: (ev.loading ?? 1) * (dimas >= 2 ? 0.85 : 1) * (sari >= 2 ? 0.9 : 1),
    focusMax: FOCUS_BASE + (laras >= 2 ? 10 : 0) + (wulan >= 2 ? 10 : 0) + (bought('up_bed') ? 10 : 0),
    retainerMult: (ev.retainerMult ?? 1) * (laras >= 3 ? 1.2 : 1),
    kopiMult: Math.max(laras >= 4 ? 1.5 : 1, wulan >= 4 ? 1.5 : wulan >= 1 ? 1.25 : 1),
    talkBonus: ev.talkBonus ?? 0,
    // market
    marketDiscount: ev.marketDiscount ?? 0,
    speedDiscount: Math.min(0.5, (dimas >= 4 ? 0.4 : dimas >= 1 ? 0.15 : 0) + (sari >= 3 ? 0.15 : 0)),
    intelDiscount: Math.min(0.5, (rani >= 1 ? 0.25 : 0) + (sari >= 1 ? 0.15 : 0) + (sari >= 4 ? 0.15 : 0)),
    cmdDiscount: gun >= 3 ? 0.25 : gun >= 1 ? 0.1 : 0,
    toolDiscount: (ev.toolDiscount ?? 0) + (vira >= 1 ? 0.1 : 0),
    goodsDiscount: ev.goodsDiscount ?? 0,
    // missions / hints
    hintCost: rani >= 3 ? 5 : hadi >= 3 ? 7 : vira >= 2 ? 8 : HINT_BASE,
    repMult: (rani >= 4 ? 1.25 : 1) * (hadi >= 1 ? 1.1 : 1) * (vira >= 3 ? 1.1 : 1),
    creditMult: (gun >= 4 ? 1.2 : 1) * (hadi >= 4 ? 1.1 : 1),
    event: eventFor(profile.day)
  };
}
