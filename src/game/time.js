import { t, tr, isEnglish } from '../i18n/index.js';
// Day / Fokus (energy) model. Pure logic, no DOM.
// Santai: nothing here ever blocks the player — low Fokus only makes actions
// slower and pricier. Sleeping at the Safehouse starts the next day.

export const FOCUS_BASE = 100;

// Base Fokus cost per command (anything unlisted costs DEFAULT_COST).
export const FOCUS_COST = {
  SCAN: 3, CONNECT: 2, DISCONNECT: 0, INSPECT: 1,
  LOGIN: 5, CRACK: 5, EXPLOIT: 5, ELEVATE: 4,
  READ: 1, DOWNLOAD: 2, RECOVER: 3, DECRYPT: 4, COMPARE: 3, SEARCH: 2,
  LS: 1, PS: 1, STOP: 2, START: 2, CONFIG: 3, RESTORE: 2, CONTROL: 2,
  ROUTE: 3, UPLOAD: 3, EDIT: 3, TRACE: 4
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

// ---------- calendar: the real one ----------
// `profile.day` is the real calendar day on the device, as days since
// 1970-01-01 (local date). Weekly events, NPC routes, daily contracts and
// seasons all follow the actual date and weekday.
export const DAY_MS = 86400000;
const DAY_NAMES = { id: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
const MONTH_NAMES = { id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
const dayNames = () => DAY_NAMES[isEnglish() ? 'en' : 'id'];
const monthNames = () => MONTH_NAMES[isEnglish() ? 'en' : 'id'];
// Indonesian climate by month
const SEASON_BY_MONTH = ['Penghujan', 'Penghujan', 'Pancaroba', 'Pancaroba', 'Kemarau', 'Kemarau', 'Kemarau', 'Kemarau', 'Kemarau', 'Pancaroba', 'Penghujan', 'Penghujan'];

export function dayIndex(now = Date.now()) {
  const d = new Date(now);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}
// the UTC fields of this date hold the local calendar date
const dayDate = (day) => new Date(day * DAY_MS);
export const weekdayOf = (day) => dayDate(day).getUTCDay();            // 0 = Minggu
export const fmtDate = (day) => {
  const d = dayDate(day), w = dayNames()[d.getUTCDay()], m = monthNames()[d.getUTCMonth()];
  return isEnglish() ? `${w}, ${m} ${d.getUTCDate()}` : `${w}, ${d.getUTCDate()} ${m}`;
};
export const fmtDateShort = (day) => {
  const d = dayDate(day), w = dayNames()[d.getUTCDay()].slice(0, 3), m = monthNames()[d.getUTCMonth()].slice(0, 3);
  return isEnglish() ? `${w} ${m} ${d.getUTCDate()}` : `${w} ${d.getUTCDate()} ${m}`;
};
export const seasonName = (day) => SEASON_BY_MONTH[dayDate(day).getUTCMonth()];

// Moves the profile to today's date. Returns true when the day rolled over.
export function syncDay(profile, now = Date.now()) {
  const today = dayIndex(now);
  if (profile.day === today) return false;
  profile.day = today;
  return true;
}

// Soft recurring events. Each is a small, friendly tweak — never a penalty wall.
export const EVENTS = {
  festival: { id: 'festival', name: 'Lomba Mingguan', desc: 'Pendapatan kontrak ×2 dan ngobrol memberi +2 kedekatan.',
    retainerMult: 2, talkBonus: 2 },
  pasar: { id: 'pasar', name: 'Hari Pasar', desc: 'Semua barang di Pasar diskon 20%.',
    marketDiscount: 0.2 },
  padam: { id: 'padam', name: 'Pemadaman Listrik', desc: 'Loading lebih lambat, tapi lembur dibayar: kontrak +30%.',
    loading: 1.5, retainerMult: 1.3 },
  kampus: { id: 'kampus', name: 'Hari Kampus', desc: 'Tool dan command di Pasar diskon 20%.',
    toolDiscount: 0.2 },
  subuh: { id: 'subuh', name: 'Pasar Subuh', desc: 'Barang di Pasar diskon 30%. Pagi-pagi stok melimpah.',
    goodsDiscount: 0.3 }
};

// Sun: Lomba Mingguan · Wed: Hari Pasar · Thu: Hari Kampus · Fri: Pemadaman Listrik · Sat: Pasar Subuh
export function eventFor(day) {
  const w = weekdayOf(day);
  if (w === 0) return EVENTS.festival;
  if (w === 3) return EVENTS.pasar;
  if (w === 5) return EVENTS.padam;
  if (w === 4) return EVENTS.kampus;
  if (w === 6) return EVENTS.subuh;
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
  return h ? (m ? t('{1} jam {2} mnt', h, m) : t('{1} jam', h)) : t('{1} mnt', m);
}

// clock for a countdown: 4825000 ms -> "1:20:25", 95000 -> "1:35"
export function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
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

// A finished sleep restores Fokus to full (the date is the real one, it does not move).
// Returns null if still asleep / not sleeping.
export function finishSleep(profile, now = Date.now()) {
  const pr = sleepProgress(profile, now);
  if (!pr?.done) return null;
  const z = pr.sleep;
  profile.sleeping = null;
  profile.focus = z.focusMax;
  return { slept: z.minutes, focus: z.focusMax };
}

// Waking up early keeps the rest you already got.
export function wakeEarly(profile, now = Date.now()) {
  const pr = sleepProgress(profile, now);
  if (!pr) return 0;
  const gained = Math.max(0, pr.focusNow - pr.sleep.focus);
  profile.sleeping = null;
  restoreFocus(profile, gained, pr.sleep.focusMax);
  return gained;
}

// Moves the calendar one day forward (only for tests / debugging — the game
// follows the real date through syncDay).
export function advanceDay(profile) {
  profile.day += 1;
  return profile.day;
}
