// Audio engine: one AudioContext, sfxBus + musicBus -> master -> limiter -> out.
// Safe without WebAudio (tests / old WebViews): every call becomes a no-op.
import { settings, onSettings } from './settings.js';

let ctx = null, master = null, sfxBus = null, musicBus = null, limiter = null;
let inited = false;
const readyFns = new Set();

// perceptual-ish volume curve; music sits a bit under SFX
const vol = (v, k = 1) => Math.pow(Math.max(0, Math.min(1, Number(v) || 0)), 1.6) * k;

function applyVolumes(fast) {
  if (!ctx) return;
  const t = ctx.currentTime, tc = fast ? 0.005 : 0.04;
  try {
    sfxBus.gain.setTargetAtTime(vol(settings.sfx), t, tc);
    musicBus.gain.setTargetAtTime(vol(settings.music, 0.7), t, tc);
  } catch { /* ignore */ }
}

function resume() {
  if (!ctx || (typeof document !== 'undefined' && document.hidden)) return;
  try {
    if (ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume?.()?.catch?.(() => {});
  } catch { /* ignore */ }
}

function suspend() {
  try { if (ctx && ctx.state === 'running') ctx.suspend?.()?.catch?.(() => {}); } catch { /* ignore */ }
}

function init() {
  if (inited) return !!ctx;
  inited = true;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return false;
  try {
    ctx = new AC({ latencyHint: 'interactive' });
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    master = ctx.createGain();
    master.gain.value = 0.9;
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus.connect(master);
    musicBus.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);
    sfxBus.gain.value = vol(settings.sfx);
    musicBus.gain.value = vol(settings.music, 0.7);
    onSettings(() => applyVolumes(false));
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => (document.hidden ? suspend() : resume()));
      // unlock for Android / iOS (also re-wakes an interrupted context)
      for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, resume, true);
    }
    resume();
    for (const fn of [...readyFns]) { try { fn(); } catch { /* ignore */ } }
    return true;
  } catch {
    ctx = null; master = sfxBus = musicBus = limiter = null;
    return false;
  }
}

export const audio = {
  init,
  get ctx() { return ctx; },
  get master() { return master; },
  get sfxBus() { return sfxBus; },
  get musicBus() { return musicBus; },
  resume,
  suspend,
  isReady() { return !!ctx && ctx.state !== 'closed'; },
  // extra: run fn once the context exists (immediately if it already does)
  onReady(fn) { if (ctx) fn(); else readyFns.add(fn); }
};
