// SFX catalog: every sound is a recipe (ctx, out, t0, opts) -> duration (s) that builds
// nodes into `out`. Recipes also run on an OfflineAudioContext (tools/render-audio.mjs).
import { audio } from './audio.js';
import { settings } from './settings.js';

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const noiseBufs = new WeakMap();

// one white-noise buffer per context, reused by every recipe
function noiseBuf(ctx) {
  let b = noiseBufs.get(ctx);
  if (!b) {
    const n = Math.floor(ctx.sampleRate * 2);
    b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData?.(0);
    if (d) for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseBufs.set(ctx, b);
  }
  return b;
}

// Small toolbox bound to one cue. Times are relative to t0; pitch/gain come from opts.
function kit(ctx, out, t0, o = {}) {
  const pitch = o.pitch || 1, g = (o.gain == null ? 1 : o.gain) * 1.8; // 1.8 = overall SFX trim
  const k = { dest: out };
  const env = (T, d, v, a, dest) => {
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, T);
    e.gain.linearRampToValueAtTime(v * g, T + a);
    e.gain.exponentialRampToValueAtTime(0.0001, T + d);
    e.connect(dest || k.dest);
    return e;
  };
  // x: f1 (end freq), v peak, a attack, lp/lp1 (lowpass cutoff / end), fm [ratio, depth], det (cents)
  k.tone = (type, f, t, d, x = {}) => {
    const T = t0 + t, a = Math.min(x.a ?? 0.004, d * 0.4);
    const e = env(T, d, x.v ?? 0.25, a);
    let tail = e;
    if (x.lp) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.Q.value = x.q ?? 0.7;
      lp.frequency.setValueAtTime(x.lp, T);
      if (x.lp1) lp.frequency.exponentialRampToValueAtTime(x.lp1, T + d);
      lp.connect(e); tail = lp;
    }
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f * pitch, T);
    if (x.f1) osc.frequency.exponentialRampToValueAtTime(x.f1 * pitch, T + d);
    if (x.det) osc.detune.value = x.det;
    osc.connect(tail);
    if (x.fm) {
      const m = ctx.createOscillator(), mg = ctx.createGain();
      m.frequency.value = f * pitch * x.fm[0];
      mg.gain.setValueAtTime(f * pitch * x.fm[1], T);
      mg.gain.exponentialRampToValueAtTime(0.01, T + d);
      m.connect(mg); mg.connect(osc.frequency);
      m.start(T); m.stop(T + d + 0.03);
    }
    osc.start(T); osc.stop(T + d + 0.03);
  };
  // filtered noise: x.f/f1 centre sweep, q, type, v, a
  k.noise = (f, t, d, x = {}) => {
    const T = t0 + t, a = Math.min(x.a ?? 0.003, d * 0.4);
    const e = env(T, d, x.v ?? 0.2, a);
    const fl = ctx.createBiquadFilter();
    fl.type = x.type || 'bandpass'; fl.Q.value = x.q ?? 1;
    fl.frequency.setValueAtTime(f, T);
    if (x.f1) fl.frequency.exponentialRampToValueAtTime(x.f1, T + d);
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf(ctx); s.loop = true;
    s.connect(fl); fl.connect(e);
    s.start(T, Math.random() * 1.5); s.stop(T + d + 0.03);
  };
  // short feedback echo for everything created after this call
  k.echo = (dt, fb, wet) => {
    const inp = ctx.createGain(), dl = ctx.createDelay(1), f = ctx.createGain(), w = ctx.createGain();
    dl.delayTime.value = dt; f.gain.value = fb; w.gain.value = wet;
    inp.connect(out); inp.connect(dl); dl.connect(f); f.connect(dl); dl.connect(w); w.connect(out);
    k.dest = inp;
  };
  return k;
}

const ticks = (k, n, step, f, x = {}) => { for (let i = 0; i < n; i++) k.noise(f * (1 + i * (x.rise || 0)), i * step, 0.018, { q: 3, v: x.v ?? 0.2 }); };

export const RECIPES = {
  // ---- UI
  tap(c, o, t, p) { const k = kit(c, o, t, p); k.noise(2800, 0, 0.022, { q: 1.2, v: 0.32 }); k.tone('sine', 1200, 0, 0.03, { f1: 700, v: 0.14 }); return 0.06; },
  tapSoft(c, o, t, p) { const k = kit(c, o, t, p); k.tone('sine', 800, 0, 0.045, { f1: 500, v: 0.2 }); k.noise(1500, 0, 0.02, { type: 'lowpass', v: 0.08 }); return 0.07; },
  tab(c, o, t, p) { const k = kit(c, o, t, p); k.tone('triangle', 660, 0, 0.05, { v: 0.2 }); k.tone('triangle', 880, 0.05, 0.07, { v: 0.2 }); return 0.14; },
  sheetOpen(c, o, t, p) { const k = kit(c, o, t, p); k.noise(400, 0, 0.24, { f1: 1800, q: 1.5, v: 0.18, a: 0.07 }); k.tone('triangle', 330, 0, 0.22, { f1: 523, v: 0.14, a: 0.03 }); return 0.28; },
  sheetClose(c, o, t, p) { const k = kit(c, o, t, p); k.noise(1800, 0, 0.2, { f1: 400, q: 1.5, v: 0.16, a: 0.04 }); k.tone('triangle', 523, 0, 0.18, { f1: 330, v: 0.14, a: 0.02 }); return 0.24; },
  toastInfo(c, o, t, p) { const k = kit(c, o, t, p); k.tone('sine', 880, 0, 0.12, { v: 0.22 }); k.tone('sine', 1175, 0.08, 0.16, { v: 0.2 }); return 0.28; },
  toastOk(c, o, t, p) { const k = kit(c, o, t, p); [660, 990, 1320].forEach((f, i) => k.tone('triangle', f, i * 0.08, 0.18, { v: 0.2 })); return 0.44; },
  toastWarn(c, o, t, p) { const k = kit(c, o, t, p); k.tone('square', 440, 0, 0.1, { lp: 1400, v: 0.14 }); k.tone('square', 440, 0.14, 0.12, { lp: 1400, v: 0.14 }); return 0.3; },
  toastError(c, o, t, p) { const k = kit(c, o, t, p); k.tone('sawtooth', 220, 0, 0.3, { f1: 165, lp: 900, v: 0.22 }); k.tone('square', 110, 0, 0.3, { lp: 500, v: 0.12 }); return 0.36; },
  toggleOn(c, o, t, p) { const k = kit(c, o, t, p); k.tone('square', 520, 0, 0.05, { lp: 3000, v: 0.14 }); k.tone('square', 780, 0.05, 0.07, { lp: 3000, v: 0.14 }); return 0.14; },
  toggleOff(c, o, t, p) { const k = kit(c, o, t, p); k.tone('square', 780, 0, 0.05, { lp: 3000, v: 0.14 }); k.tone('square', 520, 0.05, 0.07, { lp: 3000, v: 0.14 }); return 0.14; },
  back(c, o, t, p) { const k = kit(c, o, t, p); k.tone('triangle', 520, 0, 0.1, { f1: 330, v: 0.22 }); k.noise(2000, 0, 0.02, { v: 0.1 }); return 0.14; },
  denied(c, o, t, p) { const k = kit(c, o, t, p); k.tone('square', 180, 0, 0.09, { lp: 700, v: 0.2 }); k.tone('square', 180, 0.11, 0.1, { lp: 700, v: 0.2 }); return 0.24; },
  confirm(c, o, t, p) { const k = kit(c, o, t, p); k.tone('triangle', 523, 0, 0.12, { v: 0.2 }); k.tone('triangle', 784, 0.07, 0.22, { v: 0.2 }); k.tone('sine', 1568, 0.07, 0.2, { v: 0.06 }); return 0.32; },
  typeTick(c, o, t, p) { const k = kit(c, o, t, p); k.noise(3500, 0, 0.014, { q: 2, v: 0.18 }); k.tone('sine', 2200, 0, 0.01, { v: 0.05 }); return 0.03; },

  // ---- commands
  cmdConnect(c, o, t, p) { const k = kit(c, o, t, p); k.tone('sine', 330, 0, 0.26, { f1: 880, v: 0.22, a: 0.02, fm: [2, 0.6] }); k.tone('triangle', 1320, 0.24, 0.2, { v: 0.18 }); k.noise(2500, 0, 0.2, { f1: 5000, v: 0.05, a: 0.05 }); return 0.46; },
  cmdDisconnect(c, o, t, p) { const k = kit(c, o, t, p); k.tone('sine', 880, 0, 0.3, { f1: 220, v: 0.22, a: 0.01, fm: [2, 0.4] }); k.noise(1500, 0.28, 0.03, { v: 0.12 }); return 0.4; },
  cmdScan(c, o, t, p) { const k = kit(c, o, t, p); k.noise(300, 0, 0.72, { f1: 4000, q: 4, v: 0.26, a: 0.12 }); k.echo(0.13, 0.35, 0.4); k.tone('sine', 1760, 0.66, 0.36, { v: 0.2 }); return 1.3; },
  cmdInspect(c, o, t, p) { const k = kit(c, o, t, p); k.tone('triangle', 600, 0, 0.16, { f1: 1200, v: 0.18, a: 0.02 }); k.tone('sine', 1320, 0.14, 0.1, { v: 0.16 }); k.noise(3000, 0.14, 0.04, { v: 0.08 }); return 0.28; },
  cmdLogin(c, o, t, p) { const k = kit(c, o, t, p); [440, 660, 880].forEach((f, i) => k.tone('triangle', f, i * 0.1, 0.2, { v: 0.17 })); k.tone('sine', 1760, 0.2, 0.2, { v: 0.05 }); return 0.5; },
  cmdCrack(c, o, t, p) {
    const k = kit(c, o, t, p);
    ticks(k, 11, 0.056, 3800, { rise: 0.05, v: 0.2 });
    for (let i = 0; i < 11; i++) k.tone('sine', 1200 + i * 90, i * 0.056, 0.02, { v: 0.05 });
    k.noise(1800, 0.68, 0.02, { v: 0.32 }); k.tone('triangle', 523, 0.7, 0.3, { v: 0.2 }); k.tone('triangle', 784, 0.78, 0.3, { v: 0.2 });
    return 1.12;
  },
  cmdExploit(c, o, t, p) {
    const k = kit(c, o, t, p);
    k.tone('sawtooth', 1800, 0, 0.2, { f1: 90, lp: 4000, lp1: 300, v: 0.22 });
    [2200, 900, 3100, 1400].forEach((f, i) => { k.noise(f, 0.16 + i * 0.05, 0.035, { q: 4, v: 0.18 }); k.tone('square', 220 * (i + 1.5), 0.16 + i * 0.05, 0.03, { lp: 2500, v: 0.08 }); });
    return 0.5;
  },
  cmdElevate(c, o, t, p) { const k = kit(c, o, t, p); [262, 330, 392, 523, 659].forEach((f, i) => { k.tone('triangle', f, i * 0.08, 0.2, { v: 0.16 }); k.tone('sine', f * 2, i * 0.08, 0.16, { v: 0.05 }); }); return 0.66; },
  cmdRead(c, o, t, p) { const k = kit(c, o, t, p); k.noise(2500, 0, 0.16, { type: 'lowpass', v: 0.14, a: 0.03 }); k.tone('sine', 900, 0.1, 0.07, { v: 0.12 }); return 0.28; },
  cmdDownload(c, o, t, p) { const k = kit(c, o, t, p); for (let i = 0; i < 6; i++) k.tone('square', 2000 - i * 180, i * 0.065, 0.05, { f1: 1500 - i * 150, lp: 3500, v: 0.1 }); k.tone('sine', 500, 0.4, 0.14, { v: 0.15 }); return 0.58; },
  cmdUpload(c, o, t, p) { const k = kit(c, o, t, p); for (let i = 0; i < 6; i++) k.tone('square', 900 + i * 180, i * 0.065, 0.05, { f1: 1200 + i * 200, lp: 3500, v: 0.1 }); k.tone('sine', 1760, 0.4, 0.14, { v: 0.15 }); return 0.58; },
  cmdRecover(c, o, t, p) { const k = kit(c, o, t, p); k.noise(4000, 0, 0.3, { f1: 500, q: 2, v: 0.1, a: 0.1 }); k.echo(0.11, 0.3, 0.3); [392, 494, 587, 740].forEach((f, i) => k.tone('sine', f, 0.2 + i * 0.07, 0.22, { v: 0.17 })); return 0.95; },
  cmdDecrypt(c, o, t, p) {
    const k = kit(c, o, t, p);
    [700, 1100, 520, 1500, 880, 1250, 640, 980].forEach((f, i) => k.tone('square', f, i * 0.05, 0.04, { lp: 2800, v: 0.08 }));
    k.tone('triangle', 523, 0.45, 0.4, { v: 0.16 }); k.tone('triangle', 659, 0.45, 0.4, { v: 0.14 }); k.noise(2000, 0.44, 0.02, { v: 0.2 });
    return 0.9;
  },
  cmdCompare(c, o, t, p) { const k = kit(c, o, t, p); k.tone('sine', 660, 0, 0.09, { v: 0.2 }); k.tone('sine', 880, 0.1, 0.09, { v: 0.2 }); k.tone('triangle', 660, 0.22, 0.16, { v: 0.14 }); k.tone('triangle', 880, 0.22, 0.16, { v: 0.14 }); return 0.4; },
  cmdRoute(c, o, t, p) { const k = kit(c, o, t, p); [0, 1, 2].forEach((i) => { k.noise(800 * (1 + i * 0.4), i * 0.15, 0.14, { f1: 2500 * (1 + i * 0.4), q: 2, v: 0.2, a: 0.03 }); k.tone('sine', [660, 880, 1175][i], i * 0.15 + 0.1, 0.12, { v: 0.14 }); }); return 0.55; },
  cmdTrace(c, o, t, p) { const k = kit(c, o, t, p); k.echo(0.2, 0.42, 0.4); k.tone('sine', 1400, 0, 0.4, { v: 0.2, a: 0.01 }); k.noise(600, 0, 0.3, { f1: 2400, q: 3, v: 0.05, a: 0.1 }); return 1.3; },
  cmdEdit(c, o, t, p) { const k = kit(c, o, t, p); [0, 0.07, 0.13, 0.23, 0.29].forEach((x) => k.noise(2500, x, 0.016, { q: 2, v: 0.17 })); k.tone('sine', 200, 0.36, 0.1, { f1: 120, v: 0.25 }); return 0.5; },
  cmdPing(c, o, t, p) { const k = kit(c, o, t, p); k.tone('sine', 1000, 0, 0.09, { v: 0.22 }); k.tone('sine', 1500, 0.22, 0.1, { v: 0.16 }); return 0.36; },
  cmdStop(c, o, t, p) { const k = kit(c, o, t, p); k.tone('square', 440, 0, 0.26, { f1: 110, lp: 1500, v: 0.17 }); k.noise(1200, 0.24, 0.025, { v: 0.14 }); return 0.32; },
  cmdStart(c, o, t, p) { const k = kit(c, o, t, p); k.tone('square', 110, 0, 0.26, { f1: 440, lp: 1500, v: 0.17, a: 0.02 }); k.noise(2200, 0.25, 0.025, { v: 0.16 }); return 0.32; },
  cmdConfig(c, o, t, p) { const k = kit(c, o, t, p); k.noise(1800, 0, 0.02, { q: 2, v: 0.25 }); k.noise(1800, 0.07, 0.02, { q: 2, v: 0.25 }); k.tone('triangle', 700, 0.07, 0.05, { v: 0.14 }); return 0.16; },
  cmdControl(c, o, t, p) { const k = kit(c, o, t, p); k.tone('sawtooth', 120, 0, 0.2, { f1: 240, lp: 800, v: 0.18, a: 0.03 }); k.tone('square', 600, 0.2, 0.05, { lp: 2500, v: 0.14 }); return 0.3; },
  cmdSearch(c, o, t, p) { const k = kit(c, o, t, p); k.tone('sine', 900, 0, 0.13, { f1: 1300, v: 0.2, a: 0.02 }); k.tone('sine', 1300, 0.14, 0.14, { f1: 900, v: 0.18, a: 0.02 }); k.noise(3000, 0.1, 0.05, { v: 0.05 }); return 0.32; },
  cmdFiles(c, o, t, p) { const k = kit(c, o, t, p); [700, 800, 900].forEach((f, i) => k.tone('triangle', f, i * 0.05, 0.05, { v: 0.15 })); k.tone('sine', 180, 0.16, 0.09, { v: 0.22 }); return 0.28; },
  cmdGeneric(c, o, t, p) { const k = kit(c, o, t, p); k.tone('triangle', 600, 0, 0.09, { v: 0.2 }); k.tone('triangle', 900, 0.07, 0.12, { v: 0.2 }); return 0.22; },

  // ---- loading
  loadDone(c, o, t, p) { const k = kit(c, o, t, p); k.echo(0.1, 0.3, 0.25); k.tone('triangle', 880, 0, 0.16, { v: 0.2 }); k.tone('sine', 1320, 0.09, 0.28, { v: 0.2 }); return 0.7; },
  loadFail(c, o, t, p) { const k = kit(c, o, t, p); k.tone('sawtooth', 180, 0, 0.5, { f1: 70, lp: 600, v: 0.26, a: 0.01 }); k.tone('square', 90, 0, 0.5, { f1: 45, lp: 300, v: 0.12 }); return 0.56; },
  loadCancel(c, o, t, p) { const k = kit(c, o, t, p); k.tone('triangle', 500, 0, 0.15, { f1: 300, v: 0.2 }); k.noise(1500, 0, 0.02, { v: 0.1 }); return 0.2; },

  // ---- economy
  coin(c, o, t, p) { const k = kit(c, o, t, p); k.tone('triangle', 1319, 0, 0.1, { v: 0.2 }); k.tone('triangle', 1760, 0.07, 0.4, { v: 0.2 }); k.tone('sine', 3520, 0.07, 0.25, { v: 0.05 }); return 0.5; },
  buy(c, o, t, p) { const k = kit(c, o, t, p); k.noise(1400, 0, 0.03, { v: 0.2 }); k.tone('sine', 140, 0, 0.1, { v: 0.2 }); k.tone('triangle', 1047, 0.1, 0.1, { v: 0.17 }); k.tone('triangle', 1568, 0.17, 0.35, { v: 0.17 }); return 0.54; },
  broke(c, o, t, p) { const k = kit(c, o, t, p); k.tone('sawtooth', 220, 0, 0.13, { f1: 165, lp: 700, v: 0.2 }); k.tone('sawtooth', 196, 0.16, 0.16, { f1: 130, lp: 700, v: 0.2 }); return 0.36; },

  // ---- world
  nodeFound(c, o, t, p) { const k = kit(c, o, t, p); k.echo(0.16, 0.4, 0.4); k.tone('sine', 880, 0, 0.1, { f1: 1760, v: 0.14, a: 0.01 }); k.tone('sine', 1568, 0.1, 0.35, { v: 0.2 }); return 1.2; },
  missionAccept(c, o, t, p) { const k = kit(c, o, t, p); [392, 523, 659].forEach((f, i) => { k.tone('triangle', f, i * 0.09, 0.3, { v: 0.17 }); k.tone('sine', f * 2, i * 0.09, 0.2, { v: 0.04 }); }); return 0.6; },
  missionDone(c, o, t, p) {
    const k = kit(c, o, t, p); k.echo(0.2, 0.3, 0.2);
    [[523, 0, 0.35], [659, 0.18, 0.35], [784, 0.36, 0.4], [1047, 0.6, 1.0]].forEach(([f, s, d]) => {
      k.tone('triangle', f, s, d, { v: 0.17, a: 0.01 }); k.tone('sawtooth', f, s, d, { lp: 2500, v: 0.05 }); k.tone('sine', f * 2, s, d, { v: 0.05 });
    });
    return 1.85;
  },
  ending(c, o, t, p) {
    const k = kit(c, o, t, p); k.echo(0.28, 0.35, 0.25);
    const ch = [[0, [53, 57, 60, 65], 1.5], [1.0, [55, 59, 62, 67], 1.5], [2.0, [48, 55, 60, 64, 72], 2.1]];
    ch.forEach(([s, ns, d]) => ns.forEach((m) => { k.tone('triangle', hz(m), s, d, { v: 0.06, a: 0.25 }); k.tone('sine', hz(m) * 2, s, d, { v: 0.025, a: 0.3 }); }));
    [[84, 2.1], [88, 2.45], [91, 2.8]].forEach(([m, s]) => k.tone('sine', hz(m), s, 1.1, { v: 0.1, a: 0.01, fm: [3.5, 0.15] }));
    return 4.1;
  },
  rankUp(c, o, t, p) { const k = kit(c, o, t, p); k.echo(0.12, 0.3, 0.25); [523, 659, 784, 1047, 1319].forEach((f, i) => k.tone('triangle', f, i * 0.07, i === 4 ? 0.5 : 0.18, { v: 0.17 })); k.tone('sine', 2637, 0.3, 0.35, { v: 0.05 }); return 1.0; },
  bondUp(c, o, t, p) { const k = kit(c, o, t, p); k.echo(0.14, 0.3, 0.25); k.tone('sine', 784, 0, 0.22, { f1: 988, v: 0.18, a: 0.02 }); k.tone('sine', 1319, 0.12, 0.4, { v: 0.18, a: 0.01 }); k.tone('triangle', 659, 0.12, 0.3, { v: 0.08 }); return 0.8; },
  gift(c, o, t, p) { const k = kit(c, o, t, p); [1568, 1976, 2349, 1760, 2637].forEach((f, i) => k.tone('sine', f, i * 0.05, 0.16, { v: 0.1 })); k.tone('triangle', 659, 0, 0.3, { v: 0.12, a: 0.02 }); return 0.5; },
  talk(c, o, t, p) { const k = kit(c, o, t, p); k.tone('sine', 440, 0, 0.06, { lp: 1800, v: 0.18 }); k.tone('sine', 523, 0.08, 0.08, { lp: 1800, v: 0.18 }); return 0.2; },
  notify(c, o, t, p) { const k = kit(c, o, t, p); k.echo(0.12, 0.3, 0.3); k.tone('sine', 988, 0, 0.1, { v: 0.2 }); k.tone('sine', 1319, 0.12, 0.3, { v: 0.2 }); return 0.8; },

  // ---- time
  sleepStart(c, o, t, p) {
    const k = kit(c, o, t, p); k.echo(0.3, 0.35, 0.25);
    [784, 659, 587, 523, 440, 392].forEach((f, i) => { k.tone('sine', f, i * 0.48, 0.9, { v: 0.14, a: 0.05 }); k.tone('triangle', f / 2, i * 0.48, 0.9, { v: 0.05, a: 0.08, lp: 900 }); });
    return 3.8;
  },
  wake(c, o, t, p) {
    const k = kit(c, o, t, p); k.echo(0.25, 0.3, 0.25);
    [523, 659, 784, 1047].forEach((f, i) => k.tone('sine', f, i * 0.25, 1.1, { v: 0.14, a: 0.01, fm: [3.5, 0.2] }));
    k.tone('triangle', 262, 0, 1.6, { v: 0.06, a: 0.4 });
    return 2.7;
  }
};

export const SFX_NAMES = Object.keys(RECIPES);

// ---- dialogue blips: per-NPC voice (base Hz, wave, length, lowpass)
export const BLIPS = {
  laras: { f: 196, w: 'triangle', d: 0.06, lp: 1400 },   // warm, low
  rani: { f: 620, w: 'square', d: 0.05, lp: 3500 },       // bright
  dimas: { f: 330, w: 'sine', d: 0.075, lp: 1800, glide: 0.94 }, // laid back
  gun: { f: 110, w: 'sawtooth', d: 0.07, lp: 520 },       // hoarse, low
  hadi: { f: 165, w: 'square', d: 0.075, lp: 900 },       // authoritative
  vira: { f: 720, w: 'square', d: 0.045, lp: 4000, glide: 1.08 }, // bright, cheeky
  wulan: { f: 440, w: 'sine', d: 0.07, lp: 1600 },        // soft
  sari: { f: 260, w: 'square', d: 0.04, lp: 2400 }        // firm
};
const STEPS = [-2, 0, 2, 3, 5, 7];
export function blipRecipe(c, o, t, p = {}) {
  const v = BLIPS[p.npc] || BLIPS.laras, mood = p.mood;
  const k = kit(c, o, t, { pitch: p.pitch, gain: p.gain });
  const m = mood === 'happy' ? 1.09 : mood === 'worried' ? 0.92 : 1;
  const d = v.d * (mood === 'serious' ? 0.7 : 1);
  const f = v.f * m * Math.pow(2, STEPS[Math.floor(Math.random() * STEPS.length)] / 12);
  k.tone(v.w, f, 0, d, { f1: f * (v.glide || 1), lp: v.lp, v: v.w === 'sine' ? 0.22 : 0.13, a: 0.005 });
  return d + 0.04;
}

// ---- playback: rate limit, polyphony cap, random pitch
const MAX_VOICES = 24, GAP = 35;
const GAPS = { typeTick: 22, blip: 28 };
const last = new Map();
let voices = [];
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function play(key, recipe, opts) {
  const ctx = audio.ctx;
  if (!ctx || !audio.isReady() || !(settings.sfx > 0)) return false;
  const ms = now();
  if (ms - (last.get(key) ?? -1e9) < (GAPS[key] ?? GAP)) return false;
  const t = ctx.currentTime;
  voices = voices.filter((e) => e > t);
  if (voices.length >= MAX_VOICES) return false;
  last.set(key, ms);
  const out = ctx.createGain();
  out.connect(audio.sfxBus);
  const pitch = (opts.pitch || 1) * (1 + (Math.random() * 2 - 1) * 0.03);
  try {
    const dur = recipe(ctx, out, t + 0.005, { ...opts, pitch }) || 0.3;
    voices.push(t + dur);
    setTimeout(() => { try { out.disconnect(); } catch { /* ignore */ } }, (dur + 0.15) * 1000);
    return true;
  } catch {
    try { out.disconnect(); } catch { /* ignore */ }
    return false;
  }
}

export function cue(name, opts = {}) {
  const r = RECIPES[name];
  return r ? play(name, r, opts || {}) : false;
}

export function blip(npcId, mood) {
  return play('blip', blipRecipe, { npc: npcId, mood });
}

// ---- loop('load'): soft processing hum + periodic ticks. Returns stop().
export function loop(name) {
  const ctx = audio.ctx;
  if (name !== 'load' || !ctx || !audio.isReady() || !(settings.sfx > 0)) return () => {};
  const t = ctx.currentTime;
  const g = ctx.createGain(), lp = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.16, t + 0.35);
  lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 2;
  lfo.frequency.value = 0.7; lg.gain.value = 140;
  lfo.connect(lg); lg.connect(lp.frequency);
  const srcs = [lfo];
  for (const [type, f, v] of [['sine', 55, 1], ['triangle', 110.5, 0.45], ['sawtooth', 82.5, 0.12]]) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = type; o.frequency.value = f; og.gain.value = v;
    o.connect(og); og.connect(lp); o.start(t); srcs.push(o);
  }
  lfo.start(t);
  lp.connect(g); g.connect(audio.sfxBus);
  const tick = () => {
    const out = ctx.createGain();
    out.connect(audio.sfxBus);
    const k = kit(ctx, out, ctx.currentTime + 0.005, { pitch: 1 + (Math.random() - 0.5) * 0.2, gain: 0.7 });
    k.noise(3000, 0, 0.016, { q: 3, v: 0.14 }); k.tone('sine', 1500, 0, 0.012, { v: 0.05 });
    setTimeout(() => { try { out.disconnect(); } catch { /* ignore */ } }, 150);
  };
  const iv = setInterval(tick, 480);
  let stopped = false;
  return function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(iv);
    const n = ctx.currentTime;
    try {
      g.gain.cancelScheduledValues(n);
      g.gain.setTargetAtTime(0, n, 0.08);
      for (const s of srcs) s.stop(n + 0.5);
    } catch { /* ignore */ }
    setTimeout(() => { try { g.disconnect(); } catch { /* ignore */ } }, 600);
  };
}

export function _resetSfx() { last.clear(); voices = []; }
