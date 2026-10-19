import { dayIndex } from './time.js';
// Persistent player profile for the open-world game. Saved across sessions.
export const TOOLS = {
  keyloom: { id: 'keyloom', name: 'KeyLoom', ram: 2, cmd: 'CRACK', desc: 'Menyusun kandidat kata sandi dari petunjuk yang kamu kumpulkan.' },
  mender: { id: 'mender', name: 'Mender', ram: 1, cmd: 'RECOVER', desc: 'Memulihkan file terhapus atau rusak.' },
  cipher: { id: 'cipher', name: 'Cipher', ram: 1, cmd: 'DECRYPT', desc: 'Membuka file terkunci dengan kunci yang kamu simpulkan.' }
};

// Commands unlocked from the start — everything the 4 sites need, so the
// player is never blocked. Kept here (not imported) to avoid a cycle.
const DEFAULT_CMDS = [
  'SCAN', 'INSPECT', 'MAP', 'CONNECT', 'LOGIN', 'CRACK', 'EXPLOIT', 'ELEVATE', 'DISCONNECT',
  'FILES', 'SERVICES', 'LS', 'READ', 'DOWNLOAD', 'RECOVER', 'DECRYPT', 'COMPARE',
  'PS', 'STOP', 'START', 'CONFIG', 'RESTORE', 'CONTROL'
];

export function newProfile() {
  return {
    v: 1,
    credits: 80,
    rep: 0,
    ram: 4,
    upgrades: [],
    tools: { keyloom: true, mender: true, cipher: false },
    active: ['keyloom'],
    bought: [],
    archive: [],
    discovered: {},
    day: dayIndex(),             // real calendar day, see game/time.js
    sleeping: null,             // { startedAt, focus, missing, minutes, ms, focusMax } while asleep
    focus: 100,                 // daily energy; see game/time.js
    items: {},                  // inventory: itemId -> count
    retainers: {},              // siteId -> { lastDone }
    npc: {},                    // npcId -> { aff, talkedAt, giftAt, claimed }
    speed: 0,                   // loading-speed upgrade level (market)
    accepted: {},               // siteId -> true once the mission is taken at the mission board
    cleared: {},
    intel: {},                  // siteId -> true (bought scouting intel)
    cmds: [...DEFAULT_CMDS],     // unlocked commands
    location: 'tengah'
  };
}

// Every command runs behind a full-screen loading; market upgrades shorten it.
// Credits spent per hint.
export const HINT_COST = 10;

export const LOAD_MS = [1800, 1100, 600, 250];
export const loadMs = (profile) => LOAD_MS[Math.min(profile.speed || 0, LOAD_MS.length - 1)];

export const hasCmd = (profile, cmd) => (profile.cmds || DEFAULT_CMDS).includes(cmd);

export function ramUsed(profile) {
  return profile.active.reduce((sum, id) => sum + (TOOLS[id]?.ram || 0), 0);
}

export function toggleTool(profile, id) {
  if (!profile.tools[id]) return { ok: false, msg: 'Tool belum dimiliki. Beli di Pasar Gelap (peta, Selatan).' };
  if (profile.active.includes(id)) {
    profile.active = profile.active.filter((t) => t !== id);
    return { ok: true, msg: `${TOOLS[id].name} ditutup.` };
  }
  if (ramUsed(profile) + TOOLS[id].ram > profile.ram) {
    return { ok: false, msg: `RAM tidak cukup (${ramUsed(profile)}/${profile.ram}). Tutup tool lain dulu.` };
  }
  profile.active.push(id);
  return { ok: true, msg: `${TOOLS[id].name} aktif.` };
}

export const toolActive = (profile, id) => profile.active.includes(id);
