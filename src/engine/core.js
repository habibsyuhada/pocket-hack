// Pure game logic: no DOM. Everything here is a fictional simulation.
// Profile/tool helpers live in ../game/profile.js; re-exported for convenience.
export { TOOLS, newProfile, ramUsed, toggleTool, toolActive } from '../game/profile.js';

export const LEVELS = ['none', 'guest', 'user', 'admin'];
export const LEVEL_LABEL = { none: 'TANPA AKSES', guest: 'TAMU', user: 'USER', admin: 'ADMIN' };

export const lvl = (l) => LEVELS.indexOf(l || 'none');
export const atLeast = (have, need) => lvl(have) >= lvl(need || 'guest');

// ---------- run state ----------

export function newRun(mission) {
  const world = structuredClone(mission.world);
  for (const d of Object.values(world.devices)) {
    d.access = d.access || 'none';
    d.discovered = !!d.discovered;
    d.files = d.files || [];
    d.procs = d.procs || [];
    d.controls = d.controls || [];
    for (const p of d.procs) if (p.config) p.snapshot = structuredClone(p.config);
  }
  return {
    missionId: mission.id,
    devices: world.devices,
    current: null,
    local: [],
    clues: [],
    creds: [],
    flags: [],
    read: [],
    log: [{ t: 'sys', text: mission.intro || `Kontrak "${mission.title}" diterima. Terminal siap.` }],
    ended: null
  };
}

export const has = (run, flag) => run.flags.includes(flag);

export function device(run, id) {
  return run.devices[id];
}

export function findFile(run, ref) {
  if (ref.local) return run.local.find((f) => f.id === ref.id);
  return device(run, ref.device)?.files.find((f) => f.id === ref.id);
}

function add(list, items) {
  for (const i of items || []) if (!list.includes(i)) list.push(i);
}

export function applyEffects(run, mission, fx, out) {
  if (!fx) return;
  for (const c of fx.clues || []) {
    if (!run.clues.includes(c)) {
      run.clues.push(c);
      out.push({ t: 'clue', text: `+ Petunjuk: ${mission.clues[c]?.title || c}` });
    }
  }
  for (const c of fx.creds || []) {
    if (!run.creds.includes(c)) {
      run.creds.push(c);
      out.push({ t: 'clue', text: `+ Kredensial: ${mission.creds[c]?.label || c}` });
    }
  }
  add(run.flags, fx.flags);
  for (const id of fx.reveal || []) {
    const d = device(run, id);
    if (d && !d.discovered) {
      d.discovered = true;
      out.push({ t: 'ok', text: `Perangkat ditemukan: ${d.name} [${d.addr}]` });
    }
  }
  for (const id of fx.online || []) device(run, id).online = true;
  if (fx.log) out.push({ t: 'out', text: fx.log });
}

// A device is reachable when it is an entry point or linked from any device
// the player already holds access on.
export function reachable(run, mission, id) {
  if (mission.entry.includes(id)) return true;
  return Object.values(run.devices).some((d) => atLeast(d.access, 'guest') && d.links?.includes(id));
}

export function fileVisible(run, d, f) {
  if (f.requiresProc) {
    const p = d.procs.find((x) => x.id === f.requiresProc);
    if (!p?.running) return false;
  }
  return atLeast(d.access, f.minAccess || 'guest');
}

export function visibleFiles(run, devId) {
  const d = device(run, devId);
  if (!d) return [];
  return d.files.filter((f) => fileVisible(run, d, f));
}

export function lockingProc(d, f) {
  return d.procs.find((p) => p.running && p.locks?.includes(f.id));
}

export function configValid(p) {
  return Object.values(p.config || {}).every((field) => field.value === field.correct);
}
