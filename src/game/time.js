// Day / Fokus (energy) model. Pure logic, no DOM.
// Santai: nothing here ever blocks the player — low Fokus only makes actions
// slower and pricier. Sleeping at the Safehouse starts the next day.

export const FOCUS_BASE = 100;

// Base Fokus cost per command (anything unlisted costs DEFAULT_COST).
export const FOCUS_COST = {
  SCAN: 3, CONNECT: 2, DISCONNECT: 0, INSPECT: 1,
  LOGIN: 5, CRACK: 5, EXPLOIT: 5, ELEVATE: 4,
  READ: 1, DOWNLOAD: 2, RECOVER: 3, DECRYPT: 4, COMPARE: 3, SEARCH: 2,
  LS: 1, PS: 1, STOP: 2, START: 2, CONFIG: 3, RESTORE: 2, CONTROL: 2
};
const DEFAULT_COST = 2;

// segar >50, lelah 20..50, kelelahan <20
export function focusState(focus) {
  if (focus > 50) return 'segar';
  if (focus >= 20) return 'lelah';
  return 'kelelahan';
}
export const FOCUS_LABEL = { segar: 'Segar', lelah: 'Lelah', kelelahan: 'Kelelahan' };
export const COST_MULT = { segar: 1, lelah: 1.5, kelelahan: 2 };
export const LOAD_MULT = { segar: 1, lelah: 1.5, kelelahan: 2.5 };

// `mods` carries perk/event multipliers: { focusCost, loading }.
export function focusCostFor(profile, cmd, mods = {}) {
  const base = FOCUS_COST[cmd] ?? DEFAULT_COST;
  if (!base) return 0;
  const m = COST_MULT[focusState(profile.focus)] * (mods.focusCost ?? 1);
  return Math.max(1, Math.round(base * m));
}

export function loadingMult(profile, mods = {}) {
  return LOAD_MULT[focusState(profile.focus)] * (mods.loading ?? 1);
}

// Never goes below 0 and never blocks the action.
export function spendFocus(profile, cost) {
  profile.focus = Math.max(0, profile.focus - cost);
  return profile.focus;
}

export function restoreFocus(profile, amount, max = FOCUS_BASE) {
  profile.focus = Math.min(max, profile.focus + amount);
  return profile.focus;
}

// ---------- calendar ----------
const SEASONS = ['Kemarau', 'Pancaroba', 'Penghujan', 'Pancaroba'];
export const seasonName = (day) => SEASONS[Math.floor((day - 1) / 14) % SEASONS.length];

// Soft recurring events. Each is a small, friendly tweak — never a penalty wall.
export const EVENTS = {
  festival: { id: 'festival', name: 'Lomba Mingguan', desc: 'Pendapatan kontrak ×2 dan ngobrol memberi +2 kedekatan.',
    retainerMult: 2, talkBonus: 2 },
  pasar: { id: 'pasar', name: 'Hari Pasar', desc: 'Semua barang di Pasar diskon 20%.',
    marketDiscount: 0.2 },
  padam: { id: 'padam', name: 'Pemadaman Listrik', desc: 'Loading lebih lambat, tapi lembur dibayar: kontrak +30%.',
    loading: 1.5, retainerMult: 1.3 }
};

export function eventFor(day) {
  if (day % 7 === 0) return EVENTS.festival;
  if (day % 7 === 3) return EVENTS.pasar;
  if (day % 7 === 5) return EVENTS.padam;
  return null;
}

// Starts the next day: full Fokus, day +1, daily NPC limits reset by day number.
export function sleep(profile, focusMax = FOCUS_BASE) {
  profile.day += 1;
  profile.focus = focusMax;
  return { day: profile.day, season: seasonName(profile.day), event: eventFor(profile.day) };
}
