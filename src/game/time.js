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

// How much longer everything takes. Flat while rested/tired; below 20 it keeps
// getting worse with every lost point, and at 0 you crawl (×6).
//   >50: ×1 · 20–50: ×1.5 · 19: ×2.2 · 10: ×4 · 0: ×6
export function fatigueMult(focus) {
  if (focus > 50) return 1;
  if (focus >= 20) return 1.5;
  return Math.round((2 + (20 - focus) * 0.2) * 100) / 100;
}

// `mods` carries perk/event multipliers: { focusCost, loading }.
export function focusCostFor(profile, cmd, mods = {}) {
  const base = FOCUS_COST[cmd] ?? DEFAULT_COST;
  if (!base) return 0;
  const m = COST_MULT[focusState(profile.focus)] * (mods.focusCost ?? 1);
  return Math.max(1, Math.round(base * m));
}

export function loadingMult(profile, mods = {}) {
  return fatigueMult(profile.focus) * (mods.loading ?? 1);
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

// ---------- sleeping takes real time ----------
// 1 minute of real time per missing point of Fokus (at least a 5 minute nap).
// The start time is saved on the profile, so sleep keeps running while the
// app is closed and is settled the next time it opens.
export const SLEEP_MIN_PER_POINT = 1;
export const SLEEP_MIN_TOTAL = 5;
const MIN = 60000;

export function sleepPlan(profile, focusMax = FOCUS_BASE) {
  const missing = Math.max(0, focusMax - profile.focus);
  const minutes = Math.max(SLEEP_MIN_TOTAL, missing * SLEEP_MIN_PER_POINT);
  return { missing, minutes, ms: minutes * MIN, focusMax };
}

// "1 jam 20 mnt" / "45 mnt"
export function fmtGameTime(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? (m ? `${h} jam ${m} mnt` : `${h} jam`) : `${m} mnt`;
}

// clock for a countdown: 4825000 ms -> "1:20:25", 95000 -> "1:35"
export function fmtClock(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  const two = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
}

export function startSleep(profile, focusMax = FOCUS_BASE, now = Date.now()) {
  const plan = sleepPlan(profile, focusMax);
  profile.sleeping = { startedAt: now, focus: profile.focus, ...plan };
  return profile.sleeping;
}

// Where an ongoing sleep stands. null when not sleeping.
export function sleepProgress(profile, now = Date.now()) {
  const z = profile.sleeping;
  if (!z) return null;
  const elapsed = Math.max(0, now - z.startedAt);
  const fraction = Math.min(1, elapsed / z.ms);
  const done = elapsed >= z.ms;
  const focusNow = done ? z.focusMax : Math.min(z.focusMax, z.focus + Math.floor(elapsed / MIN)); // 1 point per minute
  return { elapsed, left: Math.max(0, z.ms - elapsed), fraction, done, focusNow, sleep: z };
}

// A finished sleep starts the next day; returns null if still asleep / not sleeping.
export function finishSleep(profile, now = Date.now()) {
  const pr = sleepProgress(profile, now);
  if (!pr?.done) return null;
  const z = pr.sleep;
  profile.sleeping = null;
  const info = sleep(profile, z.focusMax);
  return { ...info, slept: z.minutes };
}

// Waking up early keeps the rest you already got; the day does not change.
export function wakeEarly(profile, now = Date.now()) {
  const pr = sleepProgress(profile, now);
  if (!pr) return 0;
  const gained = Math.max(0, pr.focusNow - pr.sleep.focus);
  profile.sleeping = null;
  restoreFocus(profile, gained, pr.sleep.focusMax);
  return gained;
}

// Starts the next day: full Fokus, day +1, daily NPC limits reset by day number.
export function sleep(profile, focusMax = FOCUS_BASE) {
  profile.day += 1;
  profile.focus = focusMax;
  return { day: profile.day, season: seasonName(profile.day), event: eventFor(profile.day) };
}
