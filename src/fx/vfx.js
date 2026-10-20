// VFX layer. Lives in #fx on document.body (OUTSIDE #app) because App.render()
// replaces everything inside #app. One canvas for particles + DOM for floating text.
// rAF runs only while particles / rain exist, and never while the tab is hidden.
import { settings, onSettings } from './settings.js';

const CAP = { full: 250, lite: 80 };
const RAIN_CAP = 40;
const PALETTE = ['#45f09a', '#f0c24a', '#5fd4ec', '#ff7a5e', '#dcf4e8'];
const HEX = '0123456789abcdef';
const TAP_SEL = 'button, .node, .cmd-row, .dock-btn, .dlg-opt, .act, .jackin, .cat-cmd, .market-row .buy';
const MAX_RIPPLES = 6;

let mode = settings.vfx || 'full';
let root = null, canvas = null, ctx = null, floats = null;
let w = 0, h = 0, dpr = 1;
let parts = [];
let raf = 0, last = 0;
let rainOn = false, rainAcc = 0;
let inited = false, tapBound = false;

const reduced = () => {
  try { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};
// effective mode: reduced-motion downgrades full to lite
const eff = () => (mode === 'off' ? 'off' : mode === 'full' && reduced() ? 'lite' : mode);
const hidden = () => typeof document !== 'undefined' && document.hidden;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const raf_ = (fn) => (globalThis.requestAnimationFrame ? globalThis.requestAnimationFrame(fn) : setTimeout(() => fn(now()), 16));
const caf_ = (id) => (globalThis.cancelAnimationFrame ? globalThis.cancelAnimationFrame(id) : clearTimeout(id));
const now = () => (globalThis.performance?.now ? performance.now() : Date.now());

function ensure() {
  if (!inited) vfx.init();
  return !!root;
}
const active = () => eff() !== 'off' && ensure();

function resize() {
  if (!canvas) return;
  dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  w = globalThis.innerWidth || 400; h = globalThis.innerHeight || 760;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function startLoop() {
  if (raf || hidden()) return;
  if (!parts.length && !(rainOn && eff() === 'full')) return;
  last = now();
  raf = raf_(tick);
}
function stopLoop() { if (raf) caf_(raf); raf = 0; }

function spawn(p) {
  const cap = CAP[eff()] || 0;
  if (p.rain) { if (parts.filter((q) => q.rain).length >= RAIN_CAP) return; }
  else if (parts.reduce((n, q) => n + (q.rain ? 0 : 1), 0) >= cap) return;
  p.age = 0; parts.push(p);
}

function tick(ts) {
  raf = 0;
  if (hidden()) return;
  const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000) || 0.016);
  last = ts;
  if (rainOn && eff() === 'full') {
    rainAcc += dt;
    while (rainAcc > 0.09) {
      rainAcc -= 0.09;
      spawn({ rain: true, kind: 'bits', x: rnd(0, w), y: -10, vx: 0, vy: rnd(50, 110), g: 0, max: rnd(5, 9), color: '#45f09a', size: 12, ch: pick(HEX), alpha: 0.18 });
    }
  }
  if (ctx) ctx.clearRect(0, 0, w, h);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.age += dt;
    if (p.age >= p.max || p.y > h + 30) { parts.splice(i, 1); continue; }
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (ctx) draw(p);
  }
  if (parts.length || (rainOn && eff() === 'full')) raf = raf_(tick);
}

function draw(p) {
  const t = p.age / p.max;
  const a = (p.alpha ?? 1) * (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
  ctx.globalAlpha = Math.max(0, a);
  ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
  switch (p.kind) {
    case 'confetti':
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.age * 7 + p.rot)); // flutter
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6); ctx.restore(); break;
    case 'sparks': {
      const l = 3 + p.size, m = Math.hypot(p.vx, p.vy) || 1;
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - (p.vx / m) * l, p.y - (p.vy / m) * l); ctx.stroke(); break;
    }
    case 'bits':
      ctx.font = `${p.size}px "JetBrains Mono", ui-monospace, monospace`; ctx.textAlign = 'center';
      ctx.fillText(p.ch, p.x, p.y); break;
    case 'ring':
      ctx.lineWidth = 2 * (1 - t) + 0.5; ctx.beginPath();
      ctx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * (1 - (1 - t) * (1 - t)), 0, 6.2832); ctx.stroke(); break;
  }
  ctx.globalAlpha = 1;
}

function removeLater(el, ms) { setTimeout(() => el.remove(), ms); }

export const vfx = {
  init() {
    if (typeof document === 'undefined' || !document.body) return;
    inited = true;
    root = document.getElementById('fx');
    if (!root) {
      root = document.createElement('div');
      root.id = 'fx'; root.setAttribute('aria-hidden', 'true');
      canvas = document.createElement('canvas'); canvas.className = 'fx-canvas';
      floats = document.createElement('div'); floats.className = 'fx-floats';
      root.append(canvas, floats);
    } else {
      canvas = root.querySelector('canvas'); floats = root.querySelector('.fx-floats');
    }
    if (!root.isConnected) document.body.appendChild(root);
    try { ctx = canvas.getContext('2d') || null; } catch { ctx = null; }
    resize();
    if (!vfx._wired) {
      vfx._wired = true;
      globalThis.addEventListener?.('resize', resize);
      document.addEventListener('visibilitychange', () => { if (hidden()) stopLoop(); else startLoop(); });
    }
  },

  setMode(m) {
    if (!['full', 'lite', 'off'].includes(m)) return;
    mode = m;
    if (m === 'off') {
      parts = []; rainOn = false; stopLoop();
      if (ctx) ctx.clearRect(0, 0, w, h);
      if (floats) floats.replaceChildren();
      root?.querySelectorAll('.fx-ripple, .fx-flash').forEach((e) => e.remove());
    } else if (m === 'lite') { parts = parts.filter((p) => !p.rain); const c = CAP.lite; if (parts.length > c) parts.length = c; }
  },
  get mode() { return eff(); },
  count() { return parts.length; },

  ripple(x, y, color = '#45f09a') {
    if (!active() || !floats) return;
    if (root.querySelectorAll('.fx-ripple').length >= MAX_RIPPLES) return;
    const el = document.createElement('i');
    el.className = 'fx-ripple'; el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.setProperty('--c', color);
    root.appendChild(el); removeLater(el, 600);
  },

  bindTapRipple() {
    if (tapBound || typeof document === 'undefined') return;
    tapBound = true;
    document.addEventListener('pointerdown', (e) => {
      const t = e.target;
      if (!t?.closest || !t.closest(TAP_SEL)) return; // map background / drag: no ripple
      vfx.ripple(e.clientX, e.clientY);
    }, true);
  },

  float(text, x, y, { color = '#f0c24a', size = 16, ms = 1000 } = {}) {
    if (!active() || !floats) return;
    if (floats.children.length > 24) floats.firstChild.remove();
    const el = document.createElement('span');
    el.className = 'fx-float'; el.textContent = text;
    el.style.left = (x ?? (globalThis.innerWidth || 400) / 2) + 'px';
    el.style.top = (y ?? (globalThis.innerHeight || 760) / 2) + 'px';
    el.style.color = color; el.style.fontSize = size + 'px'; el.style.setProperty('--ms', ms + 'ms');
    floats.appendChild(el); removeLater(el, ms + 80);
  },

  floatAt(el, text, opts) {
    const r = el?.getBoundingClientRect?.();
    if (r && (r.width || r.height)) vfx.float(text, r.left + r.width / 2, r.top + r.height / 2, opts);
    else vfx.float(text, undefined, undefined, opts);
  },

  burst(x, y, { kind = 'sparks', n, color } = {}) {
    if (!active()) return;
    const lite = eff() === 'lite';
    const def = { sparks: 18, confetti: 36, bits: 14, ring: 1 }[kind];
    if (def === undefined) return;
    let c = n ?? def;
    if (lite && kind !== 'ring') c = Math.max(1, Math.round(c * 0.4));
    if (kind === 'ring') c = Math.min(c, 3);
    x ??= (globalThis.innerWidth || 400) / 2; y ??= (globalThis.innerHeight || 760) / 2;
    for (let i = 0; i < c; i++) {
      const a = rnd(0, 6.2832);
      if (kind === 'sparks') {
        const s = rnd(60, 230);
        spawn({ kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, g: 320, max: rnd(0.5, 0.9), color: color || (Math.random() < 0.3 ? '#fff3c4' : '#f0c24a'), size: rnd(1, 3), rot: 0, vr: 0 });
      } else if (kind === 'confetti') {
        spawn({ kind, x, y, vx: rnd(-150, 150), vy: rnd(-300, -80), g: 380, max: rnd(1.3, 2.2), color: color || pick(PALETTE), size: rnd(5, 8), rot: rnd(0, 6), vr: rnd(-8, 8) });
      } else if (kind === 'bits') {
        spawn({ kind, x: x + rnd(-24, 24), y: y + rnd(-6, 6), vx: rnd(-14, 14), vy: rnd(-95, -40), g: 0, max: rnd(0.9, 1.5), color: color || '#45f09a', size: rnd(11, 15), ch: pick(HEX + '01'), rot: 0, vr: 0 });
      } else {
        spawn({ kind, x, y, vx: 0, vy: 0, g: 0, max: 0.7 + i * 0.12, age: -i * 0.15, color: color || '#5fd4ec', r0: 4, r1: 70 + i * 16, rot: 0, vr: 0 });
      }
    }
    startLoop();
  },

  shake(level = 1) {
    if (eff() === 'off' || typeof document === 'undefined') return;
    const app = document.getElementById('app'); if (!app) return;
    const l = Math.max(1, Math.min(3, Math.round(level)));
    app.classList.remove('fx-shake-1', 'fx-shake-2', 'fx-shake-3');
    void app.offsetWidth; // restart animation
    app.classList.add('fx-shake-' + l);
    clearTimeout(vfx._shakeT);
    vfx._shakeT = setTimeout(() => app.classList.remove('fx-shake-1', 'fx-shake-2', 'fx-shake-3'), 130 + l * 90);
  },

  flash(color = '#fff', ms = 160, alpha = 0.18) {
    if (!active()) return;
    const el = document.createElement('i');
    el.className = 'fx-flash'; el.style.setProperty('--c', color); el.style.setProperty('--ms', ms + 'ms'); el.style.setProperty('--a', alpha);
    root.appendChild(el); removeLater(el, ms + 60);
  },

  glitch(el, ms = 220) {
    if (eff() === 'off' || typeof document === 'undefined') return;
    el = el || document.getElementById('app'); if (!el) return;
    el.style.setProperty('--fx-ms', ms + 'ms');
    el.classList.add('fx-glitch');
    clearTimeout(el._fxG);
    el._fxG = setTimeout(() => el.classList.remove('fx-glitch'), ms);
  },

  countUp(el, from, to, ms = 600, fmt = (n) => String(n)) {
    if (!el) return () => {};
    const set = (v) => { el.textContent = fmt(v); };
    if (eff() === 'off' || hidden() || from === to || ms <= 0) { set(to); return () => {}; }
    const int = Number.isInteger(from) && Number.isInteger(to);
    const t0 = now(); let id = 0, done = false;
    const step = () => {
      if (done) return;
      const t = Math.min(1, (now() - t0) / ms);
      if (t >= 1) { done = true; set(to); return; }
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const v = from + (to - from) * e;
      set(int ? Math.round(v) : v);
      id = raf_(step);
    };
    set(from); id = raf_(step);
    return () => { if (!done) { done = true; caf_(id); } };
  },

  rain(on) {
    rainOn = !!on && eff() === 'full';
    if (!rainOn) parts = parts.filter((q) => !q.rain);   // loading is over: clear the glyphs off the content
    if (rainOn && ensure()) startLoop();
  },
};

onSettings((s) => vfx.setMode(s.vfx));
