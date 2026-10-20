// One door for "game feel": every sound, haptic and visual effect the UI triggers goes
// through here. App calls fx.* for events it knows (a command ran, a mission ended) and
// hands fx.frame() a snapshot after every render, so opening a sheet, switching tab,
// starting a loading or gaining credits get their feedback without scattering hooks.
import { settings, onSettings } from './settings.js';
import { audio } from './audio.js';
import { cue, blip, loop } from './sfx.js';
import { setScene, duck } from './music.js';
import { vfx } from './vfx.js';
import { haptic } from './haptics.js';

const CMD_CUE = {
  CONNECT: 'cmdConnect', DISCONNECT: 'cmdDisconnect', SCAN: 'cmdScan', INSPECT: 'cmdInspect', LOGIN: 'cmdLogin', CRACK: 'cmdCrack',
  EXPLOIT: 'cmdExploit', ELEVATE: 'cmdElevate', READ: 'cmdRead', DOWNLOAD: 'cmdDownload', UPLOAD: 'cmdUpload', RECOVER: 'cmdRecover',
  DECRYPT: 'cmdDecrypt', COMPARE: 'cmdCompare', ROUTE: 'cmdRoute', TRACE: 'cmdTrace', EDIT: 'cmdEdit',
  STOP: 'cmdStop', START: 'cmdStart', CONFIG: 'cmdConfig', RESTORE: 'cmdConfig', CONTROL: 'cmdControl', SEARCH: 'cmdSearch',
  LS: 'cmdFiles', PS: 'cmdFiles', MAP: 'tab'
};
// commands that feel "big" when they succeed: a glitch + a stronger haptic
const BIG = new Set(['CRACK', 'EXPLOIT', 'ELEVATE', 'LOGIN', 'DECRYPT', 'ROUTE', 'TRACE']);
const TOAST = { lock: 'toastWarn', back: 'toastInfo', hint: 'toastInfo', doc: 'toastOk', target: 'toastOk', warn: 'toastError' };

let prev = null;
let stopLoad = null;
let inited = false;

const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
const q = (sel) => (typeof document === 'undefined' ? null : document.querySelector(sel));

function sceneFor(s) {
  if (s.intro) return 'intro';
  if (s.sleeping) return 'sleep';
  if (s.ending) return 'ending';
  if (s.dlg) return 'dialog';
  if (s.finale) return 'tense';
  if (s.district === 'industri') return 'industri';
  if (['terminal', 'files', 'system', 'control'].includes(s.view)) return 'terminal';
  return 'map';
}

export const fx = {
  // call once at boot; audio itself only wakes on the first user gesture
  init() {
    if (inited) return; inited = true;
    const html = document.documentElement;
    const sync = () => { html.dataset.vfx = settings.vfx; };
    sync(); onSettings(sync);
    vfx.init(); vfx.bindTapRipple();
    // first touch: unlock audio and tick on every press of something pressable
    const press = (e) => {
      audio.init();
      if (e.target?.closest?.('button, .node, .cmd-row, .dock-btn, .dlg-opt, .market-row .buy, .cat-cmd')) cue('tapSoft');
    };
    document.addEventListener('pointerdown', press, true);
  },

  cue(name, o) { cue(name, o); },
  haptic,
  blip,                                           // dialogue letter: fx.blip(npcId, mood)
  duck,
  scene(name) { setScene(name); },

  // a command just ran. ok = no warning/error lines came out of it
  command(cmd, ok = true) {
    if (!ok) { this.fail(); return; }
    cue(CMD_CUE[cmd] || 'cmdGeneric');
    haptic(BIG.has(cmd) ? 'medium' : 'light');
    if (BIG.has(cmd)) { vfx.glitch(undefined, 200); }
  },

  // "no weakness found" / refused / not enough credits
  fail() {
    haptic('error'); vfx.shake(2); vfx.flash('#ff5b5b', 140, 0.14);
  },
  denied() { cue('denied'); haptic('warning'); },
  cancel() { cue('loadCancel'); haptic('light'); },
  buy(ok = true) { if (ok) { cue('buy'); haptic('success'); } else { cue('broke'); haptic('warning'); } },
  accept() { cue('missionAccept'); haptic('medium'); },
  gift() { cue('gift'); haptic('success'); const el = q('.dlg'); if (el) { const [x, y] = center(el); vfx.burst(x, y * 0.8, { kind: 'sparks', n: 18 }); } },
  bond(el) { cue('bondUp'); haptic('success'); if (el) vfx.floatAt(el, '♥', { color: '#ff7aa8', size: 26 }); },
  discover(n = 1) { if (n > 0) { cue('nodeFound'); } },
  back() { cue('back'); },
  confirm() { cue('confirm'); haptic('light'); },

  // a mission was handed in: res = { reward, rep }
  missionDone(res) {
    cue('missionDone'); haptic('success'); duck(2500);
    const w = typeof innerWidth === 'number' ? innerWidth : 400;
    vfx.burst(w / 2, 140, { kind: 'confetti', n: 70 });
    vfx.burst(w / 2, 220, { kind: 'bits', n: 28 });
    vfx.flash('#45f09a', 220, 0.12);
  },
  ending() { cue('ending'); haptic('success'); const w = typeof innerWidth === 'number' ? innerWidth : 400; vfx.burst(w / 2, 180, { kind: 'confetti', n: 90 }); },
  rankUp(el) { cue('rankUp'); haptic('success'); const w = typeof innerWidth === 'number' ? innerWidth : 400; vfx.burst(w / 2, 90, { kind: 'sparks', n: 40 }); vfx.flash('#ffc857', 260, 0.14); },

  // after every render: react to what changed since the last one
  frame(s) {
    const p = prev; prev = s;
    setScene(sceneFor(s));
    if (!p) return;
    if (p.intro && !s.intro) { cue('confirm'); haptic('medium'); vfx.burst(innerWidth / 2, innerHeight / 2, { kind: 'ring', n: 1 }); }
    if (!s.intro && p.view !== s.view) { cue('tab'); haptic('select'); }
    if (s.overlay && s.overlay !== p.overlay) { if (s.overlayKind !== 'result') { cue('sheetOpen'); haptic('select'); } }
    else if (!s.overlay && p.overlay) cue('sheetClose');
    if (s.dlg && !p.dlg) { cue('talk'); haptic('light'); }
    if (s.busy && !p.busy) { stopLoad?.(); stopLoad = loop('load'); vfx.rain(true); }
    if (!s.busy && p.busy) { stopLoad?.(); stopLoad = null; vfx.rain(false); }
    if (s.noticeId && s.noticeId !== p.noticeId) cue(TOAST[s.noticeIcon] || 'toastInfo');
    if (s.sleeping && !p.sleeping) { cue('sleepStart'); haptic('light'); }
    if (!s.sleeping && p.sleeping) { cue('wake'); haptic('success'); }
    // numbers in the status bar
    if (s.credits !== p.credits) {
      const el = q('.statusbar .cr');
      if (el) {
        vfx.countUp(el, p.credits, s.credits, 650, (n) => `◆ ${n}`);
        const d = s.credits - p.credits;
        vfx.floatAt(el, d > 0 ? `+◆${d}` : `−◆${-d}`, { color: d > 0 ? '#ffc857' : '#9aa9a0' });
      }
      if (s.credits > p.credits && !s.busy) cue('coin');
    }
    if (s.focus !== p.focus && p.focus != null && !s.sleeping) {
      const el = q('.statusbar .fo');
      if (el && s.focus < p.focus) vfx.floatAt(el, `⚡−${p.focus - s.focus}`, { color: '#ff9a5b' });
    }
    if (s.rank > p.rank) this.rankUp();
  }
};
