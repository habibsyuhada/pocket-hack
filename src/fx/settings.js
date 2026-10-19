// Sound / haptics / effects preferences. One small JSON in localStorage, shared by
// the audio engine, the haptics layer, the VFX layer and the settings screen.
const KEY = 'pockethack_fx';

const reduced = () => {
  try { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};
const defaults = () => ({ sfx: 0.7, music: 0.45, haptics: true, vfx: reduced() ? 'lite' : 'full' });

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') return { ...defaults(), ...raw };
  } catch { /* no storage / bad json */ }
  return defaults();
}

const state = load();
const listeners = new Set();

export const settings = state;                       // read: settings.sfx, settings.music, settings.haptics, settings.vfx ('full' | 'lite' | 'off')
export const VFX_MODES = ['full', 'lite', 'off'];

export function setSettings(patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'sfx' || k === 'music') state[k] = Math.max(0, Math.min(1, Number(v) || 0));
    else if (k === 'haptics') state.haptics = !!v;
    else if (k === 'vfx' && VFX_MODES.includes(v)) state.vfx = v;
  }
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  for (const fn of listeners) fn(state);
}

// returns an unsubscribe function
export function onSettings(fn) { listeners.add(fn); return () => listeners.delete(fn); }
