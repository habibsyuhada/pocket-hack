// One place that folds today's event (and, later, NPC perks) into the
// multipliers the rest of the game reads. Defaults are all neutral.
import { eventFor, FOCUS_BASE } from './time.js';

export function perksFor(profile) {
  const ev = eventFor(profile.day) || {};
  return {
    focusCost: 1,
    loading: ev.loading ?? 1,
    focusMax: FOCUS_BASE,
    retainerMult: ev.retainerMult ?? 1,
    talkBonus: ev.talkBonus ?? 0,
    marketDiscount: ev.marketDiscount ?? 0,
    event: eventFor(profile.day)
  };
}
