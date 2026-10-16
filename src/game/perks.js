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
  return {
    focusCost: dimas >= 4 ? 0.7 : dimas >= 3 ? 0.85 : 1,
    loading: (ev.loading ?? 1) * (dimas >= 2 ? 0.85 : 1),
    focusMax: FOCUS_BASE + (laras >= 2 ? 10 : 0),
    retainerMult: (ev.retainerMult ?? 1) * (laras >= 3 ? 1.2 : 1),
    kopiMult: laras >= 4 ? 1.5 : 1,
    talkBonus: ev.talkBonus ?? 0,
    // market
    marketDiscount: ev.marketDiscount ?? 0,
    speedDiscount: dimas >= 4 ? 0.4 : dimas >= 1 ? 0.15 : 0,
    intelDiscount: rani >= 1 ? 0.25 : 0,
    cmdDiscount: gun >= 3 ? 0.25 : gun >= 1 ? 0.1 : 0,
    // missions / hints
    hintCost: rani >= 3 ? 5 : HINT_BASE,
    repMult: rani >= 4 ? 1.25 : 1,
    creditMult: gun >= 4 ? 1.2 : 1,
    event: eventFor(profile.day)
  };
}
