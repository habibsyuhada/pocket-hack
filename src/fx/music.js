// Generative ambient music (bright major-key chiptune-ish for the everyday scenes; minor/dark for industri, tense, sleep). A scene = pad + drone + bass pulse + sparse arp/bells,
// scheduled step by step (eighth notes) from a pure function of the step index, so the
// same code runs live (look-ahead timer) and offline (renderScene, no timer).
import { audio } from './audio.js';
import { settings, onSettings } from './settings.js';

export const SCENES = ['intro', 'map', 'terminal', 'dialog', 'industri', 'tense', 'sleep', 'ending'];

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// deterministic 0..1 hash of (step, salt)
function rnd(i, s) {
  let x = (Math.imul(i + 1, 374761393) + Math.imul(s + 7, 668265263)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// chords: [bassRootMidi, [pad intervals above root+12]]
const DEF = {
  intro: { bpm: 76, cb: 8, vol: 0.95, wave: 'triangle', cut: 1500, lfo: 0.07, pad: 0.08, drone: 0.08,
    ch: [[48, [0, 4, 7, 11]], [43, [0, 4, 7, 14]], [45, [0, 3, 7, 14]], [41, [0, 4, 7, 11]]],
    arp: { p: 0.3, v: 0.055, oct: 1, wave: 'triangle' }, bell: { p: 0.14, v: 0.07, oct: 2 }, echo: [0.4, 0.4, 0.32] },
  map: { bpm: 96, cb: 8, vol: 1, wave: 'triangle', cut: 1900, lfo: 0.09, pad: 0.07, drone: 0.07,
    ch: [[48, [0, 4, 7, 14]], [43, [0, 4, 7, 11]], [45, [0, 4, 7, 12]], [41, [0, 4, 7, 14]]],
    bass: { pat: 'x..xx...', wave: 'triangle', cut: 600, v: 0.15 },
    arp: { p: 0.42, v: 0.055, oct: 1, wave: 'square' }, bell: { p: 0.1, v: 0.07, oct: 2 }, echo: [0.31, 0.35, 0.3] },
  terminal: { bpm: 104, cb: 8, vol: 0.95, wave: 'triangle', cut: 1400, lfo: 0.11, pad: 0.05, drone: 0.06,
    ch: [[45, [0, 3, 7, 14]], [41, [0, 4, 7, 11]], [48, [0, 4, 7, 14]], [43, [0, 4, 7, 12]]],
    bass: { pat: 'x.xxx.x.', wave: 'triangle', cut: 520, v: 0.17 },
    arp: { p: 0.5, v: 0.05, oct: 1, wave: 'square' }, bell: { p: 0.06, v: 0.06, oct: 2 }, echo: [0.29, 0.33, 0.28] },
  dialog: { bpm: 84, cb: 8, vol: 1, wave: 'triangle', cut: 2200, lfo: 0.1, pad: 0.085, drone: 0.06,
    ch: [[48, [0, 4, 7, 14]], [41, [0, 4, 9, 14]], [43, [0, 4, 7, 12]], [45, [0, 3, 7, 10]]],
    arp: { p: 0.26, v: 0.05, oct: 1, wave: 'sine' }, bell: { p: 0.12, v: 0.06, oct: 2 }, echo: [0.36, 0.33, 0.3] },
  industri: { bpm: 78, cb: 8, vol: 0.9, wave: 'sawtooth', cut: 420, lfo: 0.07, pad: 0.06, drone: 0.12,
    ch: [[38, [0, 1, 7, 10]], [34, [0, 7, 11, 13]], [43, [0, 6, 7, 10]], [33, [0, 1, 7, 12]]],
    bass: { pat: 'x..x..x.', wave: 'sawtooth', cut: 260, v: 0.13 },
    arp: { p: 0.07, v: 0.045, oct: 1, wave: 'square' }, echo: [0.3, 0.4, 0.25] },
  tense: { bpm: 112, cb: 8, vol: 0.9, wave: 'sawtooth', cut: 480, lfo: 0.2, pad: 0.05, drone: 0.1,
    ch: [[40, [0, 6, 7, 10]], [41, [0, 7, 8, 12]], [38, [0, 6, 10, 13]], [40, [0, 7, 10, 15]]],
    bass: { pat: 'xxx.xx.x', wave: 'sawtooth', cut: 300, v: 0.14 },
    arp: { p: 0.3, v: 0.045, oct: 1, wave: 'square' }, echo: [0.27, 0.35, 0.25] },
  sleep: { bpm: 44, cb: 8, vol: 0.9, wave: 'sine', cut: 700, lfo: 0.04, pad: 0.09, drone: 0.1,
    ch: [[43, [0, 7, 11, 16]], [41, [0, 7, 11, 14]], [40, [0, 7, 10, 14]], [41, [0, 7, 11, 16]]],
    bell: { p: 0.08, v: 0.05, oct: 3 }, echo: [0.6, 0.45, 0.4] },
  ending: { bpm: 88, cb: 8, vol: 1, wave: 'triangle', cut: 2400, lfo: 0.06, pad: 0.085, drone: 0.08,
    ch: [[41, [0, 4, 7, 14]], [43, [0, 4, 7, 11]], [45, [0, 3, 7, 14]], [48, [0, 4, 7, 12]]],
    bass: { pat: 'x...x...', wave: 'triangle', cut: 500, v: 0.13 },
    arp: { p: 0.34, v: 0.06, oct: 1, wave: 'triangle' }, bell: { p: 0.16, v: 0.07, oct: 2 }, echo: [0.34, 0.38, 0.34] }
};

function track(sc, n) { sc.srcs.add(n); n.onended = () => sc.srcs.delete(n); return n; }

function osc(ctx, sc, type, f, T, end, dest, detune = 0) {
  const o = track(sc, ctx.createOscillator());
  o.type = type; o.frequency.value = f; o.detune.value = detune;
  o.connect(dest); o.start(T); o.stop(end);
  return o;
}

function pad(ctx, sc, cfg, root, ivs, T, dur) {
  const att = Math.min(2.2, dur * 0.3), end = T + dur + att;
  const env = ctx.createGain(), lp = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  env.gain.setValueAtTime(0, T);
  env.gain.linearRampToValueAtTime(1, T + att);
  env.gain.setValueAtTime(1, T + dur);
  env.gain.linearRampToValueAtTime(0, end);
  lp.type = 'lowpass'; lp.Q.value = 0.8; lp.frequency.value = cfg.cut;
  lfo.frequency.value = cfg.lfo; lg.gain.value = cfg.cut * 0.35;
  lfo.connect(lg); lg.connect(lp.frequency); lp.connect(env); env.connect(sc.lvl);
  track(sc, lfo); lfo.start(T); lfo.stop(end + 0.05);
  const per = cfg.pad / Math.sqrt(ivs.length);
  let last;
  for (const iv of ivs) {
    const g = ctx.createGain(); g.gain.value = per; g.connect(lp);
    const f = hz(root + 12 + iv);
    osc(ctx, sc, cfg.wave, f, T, end + 0.05, g, -7);
    last = osc(ctx, sc, cfg.wave, f, T, end + 0.05, g, 7);
  }
  // drone: sine on the chord root
  const dg = ctx.createGain(); dg.gain.value = cfg.drone; dg.connect(lp);
  osc(ctx, sc, 'sine', hz(root), T, end + 0.05, dg);
  last.addEventListener?.('ended', () => { try { lp.disconnect(); env.disconnect(); } catch { /* ignore */ } });
}

function pluck(ctx, sc, type, f, T, d, v, fm) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, T);
  g.gain.linearRampToValueAtTime(v, T + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, T + d);
  g.connect(sc.fx);
  const o = osc(ctx, sc, type, f, T, T + d + 0.03, g);
  if (fm) {
    const m = track(sc, ctx.createOscillator()), mg = ctx.createGain();
    m.frequency.value = f * 3.5; mg.gain.setValueAtTime(f * 0.5, T); mg.gain.exponentialRampToValueAtTime(0.01, T + d);
    m.connect(mg); mg.connect(o.frequency); m.start(T); m.stop(T + d + 0.03);
  }
}

function bass(ctx, sc, b, f, T, d) {
  const g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = b.cut; lp.Q.value = 1.2;
  g.gain.setValueAtTime(0, T);
  g.gain.linearRampToValueAtTime(b.v, T + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, T + d);
  lp.connect(g); g.connect(sc.lvl);
  osc(ctx, sc, b.wave, f, T, T + d + 0.03, lp);
}

function stepTime(sc, i) { return sc.t0 + i * (30 / sc.cfg.bpm); }

function scheduleStep(ctx, sc, i) {
  const cfg = sc.cfg, sd = 30 / cfg.bpm, cs = cfg.cb * 2;
  const [root, ivs] = cfg.ch[Math.floor(i / cs) % cfg.ch.length];
  const T = stepTime(sc, i), pos = i % cs;
  if (pos === 0) pad(ctx, sc, cfg, root, ivs, T, cs * sd);
  if (cfg.bass && cfg.bass.pat[i % cfg.bass.pat.length] === 'x') bass(ctx, sc, cfg.bass, hz(root), T, sd * 1.7);
  const a = cfg.arp;
  if (a && rnd(i, sc.salt) < a.p) {
    const n = root + 12 * a.oct + ivs[Math.floor(rnd(i, sc.salt + 1) * ivs.length)];
    pluck(ctx, sc, a.wave, hz(n + 12), T, sd * 2.2, a.v);
  }
  const b = cfg.bell;
  if (b && rnd(i, sc.salt + 2) < b.p) {
    const n = root + 12 * b.oct + ivs[Math.floor(rnd(i, sc.salt + 3) * ivs.length)];
    pluck(ctx, sc, 'sine', hz(n), T, 2.4, b.v, true);
  }
}

function advance(ctx, sc, until) {
  while (stepTime(sc, sc.step) < until) scheduleStep(ctx, sc, sc.step++);
}

// Build the node graph of one scene into `out`. fadeIn = crossfade seconds (0 = none).
function build(ctx, out, name, fadeIn) {
  const cfg = DEF[name], t = ctx.currentTime;
  const bus = ctx.createGain(), lvl = ctx.createGain(), fx = ctx.createGain();
  const dl = ctx.createDelay(2), fb = ctx.createGain(), wet = ctx.createGain();
  lvl.gain.value = cfg.vol;
  dl.delayTime.value = cfg.echo[0]; fb.gain.value = cfg.echo[1]; wet.gain.value = cfg.echo[2];
  if (fadeIn > 0) { bus.gain.setValueAtTime(0, t); bus.gain.linearRampToValueAtTime(1, t + fadeIn); }
  fx.connect(lvl); fx.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(lvl);
  lvl.connect(bus); bus.connect(out);
  return { name, cfg, bus, lvl, fx, dl, fb, wet, srcs: new Set(), step: 0, t0: t + 0.05, salt: SCENES.indexOf(name) * 11 };
}

function teardown(sc) {
  for (const s of sc.srcs) { try { s.stop(); } catch { /* ignore */ } }
  sc.srcs.clear();
  for (const n of [sc.fx, sc.dl, sc.fb, sc.wet, sc.lvl, sc.bus]) { try { n.disconnect(); } catch { /* ignore */ } }
}

// Offline helper: schedule `seconds` of a scene into out (default ctx.destination). No timers.
export function renderScene(ctx, name, seconds, out = ctx.destination) {
  if (!DEF[name]) return null;
  const sc = build(ctx, out, name, 0);
  sc.t0 = 0;
  advance(ctx, sc, seconds);
  return sc;
}

// ---- live manager
let wanted = null, cur = null, timer = null, duckNode = null, duckCtx = null;
const FADE = 1.5, LOOKAHEAD = 0.4;

function getDuck(ctx) {
  if (duckCtx !== ctx) {
    duckNode = ctx.createGain();
    duckNode.connect(audio.musicBus);
    duckCtx = ctx;
  }
  return duckNode;
}

function fadeOut(sc, secs) {
  const ctx = audio.ctx;
  try {
    const n = ctx.currentTime;
    sc.bus.gain.cancelScheduledValues(n);
    sc.bus.gain.setTargetAtTime(0, n, secs / 4);
  } catch { /* ignore */ }
  setTimeout(() => teardown(sc), secs * 1000 + 250);
}

function tick() {
  const ctx = audio.ctx;
  if (ctx && cur) advance(ctx, cur, ctx.currentTime + LOOKAHEAD);
}

// Reconcile what plays with what is wanted (scene, music volume, audio readiness).
function sync() {
  const ctx = audio.ctx;
  const want = ctx && audio.isReady() && settings.music > 0 ? wanted : null;
  if (want !== (cur ? cur.name : null)) {
    const muting = !want && wanted && settings.music <= 0;
    if (cur) fadeOut(cur, muting ? 0.3 : FADE);
    cur = null;
    if (want) {
      cur = build(ctx, getDuck(ctx), want, FADE);
      tick();
    }
  }
  if (cur && !timer) timer = setInterval(tick, 100);
  else if (!cur && timer) { clearInterval(timer); timer = null; }
}

export function setScene(name) {
  if (name != null && !DEF[name]) return;
  name = name || null;
  if (name === wanted) return;
  wanted = name;
  try { sync(); } catch { /* ignore */ }
}

export function duck(ms = 1200, amount = 0.4) {
  const ctx = audio.ctx;
  if (!ctx || !audio.isReady() || !audio.musicBus) return;
  try {
    const g = getDuck(ctx).gain, n = ctx.currentTime;
    g.cancelScheduledValues(n);
    g.setTargetAtTime(Math.max(0, 1 - amount), n, 0.08);
    g.setTargetAtTime(1, n + ms / 1000, 0.4);
  } catch { /* ignore */ }
}

export function musicState() { return { wanted, scene: cur ? cur.name : null, running: !!timer }; }

onSettings(() => { try { sync(); } catch { /* ignore */ } });
audio.onReady(() => { try { sync(); } catch { /* ignore */ } });
