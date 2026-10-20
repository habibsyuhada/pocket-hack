import { SITES, siteById } from '../sites/index.js';
import { newProfile, newRun, TOOLS, LEVEL_LABEL, atLeast, device, visibleFiles } from '../engine/core.js';
import { getActions, getChoices, exec, objectives, hint, endings, finish, LOCAL_CAP } from '../engine/actions.js';
import { CMD_META, GROUPS, groupCommands, commandTargets } from '../engine/commands.js';
import { hasCmd, loadMs } from '../game/profile.js';
import { DEFAULT_CMDS } from '../engine/commands.js';
import { CITY as CITY_INFO, WORLD_NODES, DIFF_LABEL, nodeFor, worldNodes, isAccepted, offersFrom, waitingOn } from '../game/world.js';
import { CITY as NET, START_NODES, CITY_VERSION, DISTRICTS } from '../city/index.js';
import { paginate } from './paginate.js';
import { MAPW, MAPH, cellXY, SAFEHOUSE_CELL, MARKET_CELL, CONTRACT_CELL } from '../city/layout.js';
import { greetingFor, talkSceneFor, offerSceneFor, noOfferLine, giftLines, turnInSceneFor, thanksLine } from '../game/dialogues.js';
import { readyFrom, endingsFor, awaitingTurnIn } from '../game/turnin.js';
import { PLACEHOLDER, portraitSrc } from './portraits.js';
import { MARKET, buy, canBuy, owned, priceFor } from '../game/market.js';
import { ITEMS, KOPI_FOCUS, isKey, missionItems, addItem, addAll, removeItem, countOf, contractDrop } from '../game/items.js';
import { NPCS, LEVEL_NAMES, AFF_STEPS, npcById, npcState, npcLevel, levelOf, levelProgress, isVisible, npcSpot, canTalk, canGift, talkWait, giftWait, talk, gift, missionBond } from '../game/npc.js';
import { tickTrace, lockLeft, WARN_MS, LOCKOUT_MS } from '../engine/trace.js';
import { eventFor, focusCostFor, restoreFocus, loadingMult, spendFocus, startSleep, sleepPlan, sleepProgress, finishSleep, wakeEarly, fmtGameTime, fmtClock, fmtDate, fmtDateShort, dayIndex, syncDay, focusState, FOCUS_LABEL, seasonName } from '../game/time.js';
import { perksFor } from '../game/perks.js';
import { canContract, startContract, hasContract, pendingDays, payout, collect } from '../game/retainer.js';
import { rankFor, nextRank, rankProgress } from '../game/progression.js';
import { saveProfile, loadProfile, clearProfile } from '../platform/storage.js';
import { fx } from '../fx/index.js';
import { vfx } from '../fx/vfx.js';
import { cue as sfxCue } from '../fx/sfx.js';
import { settings, setSettings, VFX_MODES } from '../fx/settings.js';
import { iconSvg } from './icons.js';
import { t, tr, isEnglish, LANG, LANGS, setLang } from '../i18n/index.js';

const TAB_ICON = { map: 'map', terminal: 'terminal', goals: 'target', profile: 'profile' };
const MIN_SCALE = 0.25, MAX_SCALE = 1.8;
// In-world messages when a command has nothing to act on (instead of a generic error).
const NO_TARGET = {
  CONNECT: 'Tidak ada perangkat lain yang terlihat. Jalankan SCAN dulu.',
  LOGIN: 'Belum punya kredensial untuk node ini.',
  CRACK: 'Tidak ada sandi di node ini yang bisa dipecahkan.',
  EXPLOIT: 'Tidak ada celah yang ditemukan di node ini.',
  ELEVATE: 'Tidak ada jalur untuk menaikkan hak akses di sini.',
  INSPECT: 'Tidak ada yang bisa diperiksa.',
  SEARCH: 'Tidak ada file untuk dipindai di node ini.',
  ROUTE: 'Node ini tidak punya relay ke jaringan lain.',
  UPLOAD: 'Tidak ada file lokal yang bisa dikirim ke node ini.',
  EDIT: 'Tidak ada file yang bisa diubah di node ini.',
  TRACE: 'Tidak ada pesan atau koneksi yang bisa dilacak di sini.'
};
const NOT_CONNECTED = {
  DEFAULT: 'Belum terhubung ke node mana pun. Jalankan CONNECT dulu.',
  FILES: 'Belum terhubung — tidak ada file server yang bisa dibuka.',
  SERVICES: 'Belum terhubung — tidak ada service server yang bisa dibuka.',
  CONTROL: 'Belum terhubung — tidak ada perangkat yang bisa dikontrol.',
  DISCONNECT: 'Kamu belum terhubung ke node mana pun.'
};
const notConnected = (cmd) => NOT_CONNECTED[cmd] || NOT_CONNECTED.DEFAULT;
// 2520000 -> "42 mnt" / "42 min", 3900000 -> "1 j 5 mnt" / "1 h 5 min"
const fmtWait = (ms) => {
  const m = Math.max(1, Math.ceil(ms / 60000)), hr = Math.floor(m / 60), rest = m % 60;
  return hr ? (rest ? t('{1} j {2} mnt', hr, rest) : t('{1} j', hr)) : t('{1} mnt', m);
};
const TEXT_ATTRS = new Set(['title', 'alt', 'data-full', 'placeholder']);
const fmtSec = (ms) => t('{1} dtk', (ms / 1000).toFixed(1).replace('.', isEnglish() ? '.' : ','));
const NODE_PAGES = ['files', 'system', 'control'];
const TABS = [['map', 'Peta'], ['terminal', 'Terminal'], ['goals', 'Goals'], ['profile', 'Profil']];

export class App {
  constructor(root) {
    this.root = root;
    this.profile = newProfile();
    this.ctx = null;                 // { mission: city graph, run: shared run, profile }
    this.goalSite = null;            // mission shown in the Goals tab / used for hints
    this.dlg = null;                 // active dialogue scene
    this.profileSub = null;          // null = profile menu, else bag | contacts | tools | archive | settings
    this.view = 'map';               // map | terminal | goals | profile | files | system | control
    this.sel = { type: 'rig' };
    this.selSite = null;
    this.showHint = false;
    this.hintText = '';              // text of the hint the player paid for
    this.overlay = null;
    this.busy = null;               // { label, ms } while a command is loading
    this.notice = null;             // in-game toast { id, msg, icon }
    this.intro = false;
    this.mapView = null;             // { x, y, scale } pan/zoom, lazily centered
    this._dragged = false;
  }

  async boot() {
    const saved = await loadProfile();
    if (saved) {
      this.profile = { ...newProfile(), ...saved };
      this.profile.cmds = [...new Set([...(this.profile.cmds || []), ...DEFAULT_CMDS])];
    }
    this.intro = !saved;
    this.syncCalendar();
    this.initWorld();
    if (this.profile.sleeping) {
      const info = finishSleep(this.profile);                // slept through while the app was closed
      if (info) { this.persist(); this.overlay = { kind: 'daystart', info }; } else this.startSleepTicker();
    }
    this.render();
    // the date is the real one: notice midnight while the app stays open
    setInterval(() => this.checkDay(), 30000);
    setInterval(() => this.tickTraceUi(), 500);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.checkDay(); });
  }

  // Old saves counted days from 1; move them onto the real calendar without a free backlog.
  syncCalendar() {
    const p = this.profile;
    if (p.day < 10000) {
      p.day = dayIndex();
      for (const r of Object.values(p.retainers || {})) r.lastDone = p.day - 1;
    } else syncDay(p);
  }

  checkDay() {
    if (!syncDay(this.profile)) return;
    this.persist();
    this.render();
    const ev = perksFor(this.profile).event;
    this.toast(t('Hari baru: {1}{2}', fmtDate(this.profile.day), ev ? ` · ★ ${ev.name}` : ''), 'hint');
  }

  persist() { saveProfile(this.profile); }
  get cur() { return this.ctx?.run.current || null; }

  // ---------- the shared city run ----------
  // One run for the whole city. It lives on the profile so it is saved with it.
  initWorld() {
    const p = this.profile;
    const legacy = p.runs;                                   // old saves: one run per site
    if (legacy) for (const id of Object.keys(legacy)) p.accepted[id] = true;
    const valid = p.run && p.run.cityVer === CITY_VERSION && Object.keys(NET.world.devices).every((id) => p.run.devices?.[id]);
    if (!valid) p.run = this.freshRun(p.run);
    if (legacy) { for (const r of Object.values(legacy)) this.carryOver(p.run, r); delete p.runs; }
    delete p.lastSite;
    this.ctx = { mission: NET, run: p.run, profile: p };
    const open = SITES.filter((m) => isAccepted(p, m.id) && !p.cleared[m.id]);
    if (!this.goalSite || !isAccepted(p, this.goalSite)) this.goalSite = open.at(-1)?.id || null;
  }

  freshRun(old) {
    const p = this.profile;
    const run = newRun(NET);
    run.cityVer = CITY_VERSION;
    for (const id of START_NODES) run.devices[id].discovered = true;
    for (const m of SITES) if (isAccepted(p, m.id)) for (const e of m.entry) run.devices[e].discovered = true;
    if (old?.devices) this.carryOver(run, old);
    return run;
  }

  // Keeps progress when the city layout changes or an old per-site run is merged in.
  carryOver(run, old) {
    for (const k of ['clues', 'creds', 'flags', 'read']) for (const v of old[k] || []) if (!run[k].includes(v)) run[k].push(v);
    for (const f of old.local || []) if (!run.local.some((l) => l.id === f.id)) run.local.push(f);
    const order = ['none', 'guest', 'user', 'admin'];
    for (const [id, d] of Object.entries(old.devices || {})) {
      const n = run.devices[id];
      if (!n) continue;
      if (d.discovered) n.discovered = true;
      if (order.indexOf(d.access) > order.indexOf(n.access)) n.access = d.access;
    }
  }

  // Taking a mission reveals its start node on the map (no rig scan needed).
  acceptMission(siteId) {
    const m = siteById(siteId);
    this.profile.accepted[siteId] = true;
    for (const e of m.entry) this.ctx.run.devices[e].discovered = true;
    this.goalSite = siteId;
    this._centerOn = m.entry[0];
    this.mapView = null;
    this.persist();
    fx.accept();
  }

  // Android back button / Escape: unwind one level. Returns false when there is nothing left to close.
  back() {
    if (this.profile.sleeping) return true;
    if (this.busy) { this.cancelBusy(); return true; }
    if (this.overlay) { this.overlay = null; this.render(); return true; }
    if (this.view === 'profile' && this.profileSub) { this.profileSub = null; this.render(); return true; }
    if (this.dlg) {
      if (['gift', 'offers', 'turnlist', 'ending'].includes(this.dlg.mode)) this.dlgHub();
      else this.dlgClose();
      return true;
    }
    if (NODE_PAGES.includes(this.view)) { this.view = 'terminal'; this.render(); return true; }
    if (this.view !== 'map') { this.view = 'map'; this.render(); return true; }
    return false;
  }

  // ---------- in-game notices (replace browser alert/confirm) ----------
  toast(msg, icon) {
    const id = (this._toastId = (this._toastId || 0) + 1);
    this.notice = { id, msg, icon: icon || (/terkunci/i.test(msg) ? 'lock' : 'hint') };
    this.render();
    setTimeout(() => {
      if (this.notice?.id !== id) return;
      this.notice = null;
      this.root.querySelector('.toast')?.remove();
    }, 2800);
  }

  confirmBox(title, text, okLabel, onOk) {
    this.overlay = { kind: 'confirm', title, text, okLabel, onOk };
    this.render();
  }

  // ---------- trace timer ----------
  // Secured nodes watch you. The clock runs while you are connected (paused behind loading screens,
  // sleep and dialogues); when it hits zero you are thrown out and the node refuses you for 30 s.
  tickTraceUi() {
    const run = this.ctx?.run;
    if (!run || this.intro) return;
    const now = Date.now();
    const dt = Math.min(1000, now - (this._traceAt || now));
    this._traceAt = now;
    this.updateLocks(run, now);
    if (!run.trace) { this._traceWarned = null; return; }
    if (!(this.busy || this.profile.sleeping || this.dlg)) {
      const kick = tickTrace(run, dt, now);
      if (kick) return this.onKicked(kick.id);
    }
    if (run.trace.left <= WARN_MS && this._traceWarned !== run.trace.id) {
      this._traceWarned = run.trace.id;
      this.toast(t('Trace hampir selesai! Selesaikan urusanmu di {1} atau putus sebelum ditendang.', device(run, run.trace.id).name), 'warn');
      fx.fail();
    }
    this.refreshTraceChip(run);
    if (now - (this._traceSaved || 0) > 5000) { this._traceSaved = now; this.persist(); }
  }

  onKicked(id) {
    const run = this.ctx.run, d = device(run, id);
    if (NODE_PAGES.includes(this.view)) this.view = 'terminal';
    this.overlay = null;
    this.persist();
    fx.fail();
    this.toast(t('Terlacak! {1} menendangmu keluar. Tunggu {2} detik sebelum masuk lagi.', d.name, LOCKOUT_MS / 1000), 'warn');
    this.render();
  }

  refreshTraceChip(run) {
    const left = run.trace?.left ?? 0;
    for (const el of this.root.querySelectorAll('[data-trace]')) {
      el.textContent = t('TRACE {1}', fmtClock(left));
      el.className = 'trace-chip' + (left <= WARN_MS / 2 ? ' crit' : left <= WARN_MS * 2 ? ' warn' : '');
    }
  }

  traceChip() {
    const run = this.ctx?.run;
    if (!run?.trace) return null;
    const c = this.h('span', { class: 'trace-chip', 'data-trace': '1' });
    c.textContent = t('TRACE {1}', fmtClock(run.trace.left));
    return c;
  }

  // countdown on the map cards of nodes that kicked you; one re-render when a lockout ends
  updateLocks(run, now) {
    const active = Object.entries(run.locked || {}).filter(([, until]) => until > now);
    for (const [id, until] of active) {
      const el = this.root.querySelector(`[data-node="${id}"] .st`);
      if (el) el.textContent = t('TERKUNCI · {1} dtk', Math.ceil((until - now) / 1000));
    }
    if (active.length !== (this._lockCount || 0)) {
      this._lockCount = active.length;
      if (this.view === 'map' && !this.busy && !this.dlg) this.render();
    }
  }

  // ---------- loading ----------
  // Every command runs behind a full-screen loading. It shows how long it will
  // take (base × fatigue), counts down, and can be cancelled — Fokus is only
  // spent when it finishes, so a cancelled command costs nothing. Overclock
  // upgrades shorten the base time.
  //   opts.cost   fixed Fokus cost        opts.base  fixed base duration (still scaled by fatigue)
  //   opts.ms     fixed total duration    opts.onCancel(progress 0..1)
  withLoading(label, fn, opts = {}) {
    if (this.busy) return;
    const mods = perksFor(this.profile);
    const mult = opts.ms ? 1 : loadingMult(this.profile, mods);
    const base = opts.ms ?? opts.base ?? loadMs(this.profile);
    const ms = Math.round(base * mult);
    this.busy = {
      label, ms, base, mult, start: Date.now(), focus: this.profile.focus,
      state: focusState(this.profile.focus),
      cost: opts.cost ?? focusCostFor(this.profile, label, mods), onCancel: opts.onCancel || null
    };
    this.render();
    this._busyT = setTimeout(() => {
      const b = this.busy;
      this.clearBusy();
      spendFocus(this.profile, b.cost);
      fn();
    }, ms);
    this._busyTick = setInterval(() => this.tickBusy(), 100);
  }

  clearBusy() {
    clearTimeout(this._busyT); clearInterval(this._busyTick);
    this._busyT = this._busyTick = null;
    this.busy = null;
  }

  cancelBusy() {
    const b = this.busy;
    if (!b) return;
    const progress = Math.min(1, (Date.now() - b.start) / b.ms);
    this.clearBusy();
    if (b.onCancel) b.onCancel(progress);
    else this.toast('Perintah dibatalkan.', 'back');
    this.render();
  }

  tickBusy() {
    const b = this.busy;
    if (!b) return;
    const left = Math.max(0, b.ms - (Date.now() - b.start));
    const lbl = this.root.querySelector('.loading-left');
    if (lbl) lbl.textContent = t('sisa {1}', fmtSec(left));
  }

  // A command that found nothing to act on still takes its time and some Fokus
  // before it tells you so.
  failAttempt(cmd, message) {
    this.overlay = null;
    this.withLoading(cmd, () => { this.persist(); this.render(); fx.fail(); this.toast(message, 'warn'); });
  }

  useItem(id) {
    const mods = perksFor(this.profile);
    if (!countOf(this.profile, id)) return this.toast('Barang tidak ada di tas.');
    if (this.profile.focus >= mods.focusMax) return this.toast('Fokus sudah penuh.');
    removeItem(this.profile, id);
    const before = this.profile.focus;
    const base = id === 'kopi' ? KOPI_FOCUS : ITEMS[id].focus;
    restoreFocus(this.profile, Math.round(base * (id === 'kopi' ? mods.kopiMult : 1)), mods.focusMax);
    this.persist();
    this.render();
    this.toast(t('Fokus +{1}. Segar lagi.', this.profile.focus - before), 'hint');
  }

  // Biro Kontrak list: offers for cleared sites + today's chore for active contracts.
  contractRows() {
    const h = this.h.bind(this);
    const rows = [];
    for (const n of WORLD_NODES) {
      const site = siteById(n.id);
      if (canContract(this.profile, n.id)) {
        rows.push(h('div', { class: 'job' },
          h('b', {}, site.title), h('p', { style: 'color:var(--muted);font-size:12px;margin:4px 0 8px' }, 'Klien menawarkan kontrak perawatan harian.'),
          h('button', { class: 'jackin', style: 'width:auto;padding:8px 16px', onclick: () => this.takeContract(n.id) }, 'AMBIL KONTRAK')));
      } else if (hasContract(this.profile, n.id)) {
        const days = pendingDays(this.profile, n.id);
        const dev = site.world.devices[site.entry[0]];
        rows.push(h('div', { class: 'job' + (days ? '' : ' off') },
          h('b', {}, t('Kontrak · {1}', site.title)),
          h('p', { style: 'color:var(--muted);font-size:12px;margin:4px 0 0' },
            days ? t('Tugas: sambung ke {1} lalu buka File Server. Imbalan ◆{2}{3}.', dev.name, payout(this.profile, n.id, site, perksFor(this.profile)), days > 1 ? t(' ({1} hari menumpuk)', days) : '')
                 : '✓ Beres hari ini. Lanjut lagi besok.')));
      }
    }
    return rows;
  }

  dueNotes() {
    const h = this.h.bind(this);
    return WORLD_NODES.filter((n) => hasContract(this.profile, n.id) && pendingDays(this.profile, n.id) > 0)
      .map((n) => h('p', { style: 'color:var(--ink);font-size:13px;margin:6px 0' }, t('📄 Kontrak {1} menunggu: ◆{2}', siteById(n.id).title, payout(this.profile, n.id, siteById(n.id), perksFor(this.profile)))));
  }

  // Sleep is real time (1 minute per Fokus point) and is stored as a start
  // timestamp, so it keeps running when the app is closed.
  goSleep() {
    this.overlay = null;
    startSleep(this.profile, perksFor(this.profile).focusMax);
    this.persist();
    this.render();
    this.startSleepTicker();
  }

  startSleepTicker() {
    clearInterval(this._sleepT);
    this._sleepT = setInterval(() => this.tickSleep(), 1000);
  }

  tickSleep() {
    const pr = sleepProgress(this.profile);
    if (!pr) { clearInterval(this._sleepT); return; }
    if (pr.done) { this.completeSleep(); return; }
    const q = (c) => this.root.querySelector(c);
    if (q('.sleep-left')) q('.sleep-left').textContent = t('sisa {1}', fmtClock(pr.left));
    if (q('.sleep-focus')) q('.sleep-focus').textContent = `⚡ ${pr.focusNow}`;
    if (q('.sleep-bar i')) q('.sleep-bar i').style.width = `${Math.round(pr.fraction * 100)}%`;
  }

  completeSleep() {
    clearInterval(this._sleepT);
    const info = finishSleep(this.profile);
    if (!info) return;
    this.persist();
    this.overlay = { kind: 'daystart', info };
    this.render();
  }

  wake() {
    clearInterval(this._sleepT);
    const got = wakeEarly(this.profile);
    this.persist();
    this.render();
    this.toast(got ? t('Kamu bangun lebih awal. Fokus +{1}.', got) : 'Kamu batal tidur.', 'hint');
  }

  vSleeping() {
    const h = this.h.bind(this);
    const pr = sleepProgress(this.profile), z = pr.sleep;
    const stars = Array.from({ length: 14 }, (_, i) => h('i', { class: 'fx-twinkle sleep-star', style: `left:${(i * 53) % 100}%;top:${(i * 37) % 70}%;--d:${(i * 0.37).toFixed(2)}s` }));
    return h('div', { class: 'loading sleeping' }, ...stars,
      h('div', { class: 'loading-box fx-breathe' },
        h('div', { class: 'loading-cmd' }, '> tidur', h('span', { class: 'blink' }, '_')),
        h('div', { class: 'loading-bar sleep-bar' }, h('i', { style: `width:${Math.round(pr.fraction * 100)}%;animation:none` })),
        h('div', { class: 'loading-focus sleep-focus' }, `⚡ ${pr.focusNow}`),
        h('small', { class: 'loading-left sleep-left' }, t('sisa {1}', fmtClock(pr.left))),
        h('small', {}, t('Tidur {1} · 1 menit = 1 Fokus · ⚡{2} → {3}', fmtGameTime(z.minutes), z.focus, z.focusMax)),
        h('small', {}, 'Aplikasi boleh ditutup — tidurmu tetap berjalan.'),
        h('button', { class: 'loading-cancel', onclick: () => this.wake() }, 'BANGUN')));
  }

  // Opening the file server on a contracted site's entry node is the daily chore.
  collectRetainer() {
    const site = SITES.find((m) => hasContract(this.profile, m.id) && m.entry[0] === this.cur);
    if (!site) return null;
    const got = collect(this.profile, site.id, site, perksFor(this.profile));
    if (!got) return null;
    const drop = contractDrop(site.id, this.profile.day);
    if (drop) addItem(this.profile, drop, 1);
    this.persist();
    return { ...got, title: site.title, drop };
  }

  takeContract(siteId) {
    if (!startContract(this.profile, siteId)) return;
    this.persist();
    this.render();
    this.toast(t('Kontrak perawatan {1} diambil. Buka File Server node awalnya tiap hari.', siteById(siteId).title), 'doc');
  }

  // Entering the file / service server runs LS / PS behind the loading screen.
  openPage(view, label) {
    this.withLoading(label, () => {
      this.view = view;
      const got = view === 'files' ? this.collectRetainer() : null;
      this.render();
      if (got) this.toast(t('Kontrak {1}: +◆{2}{3}{4}', got.title, got.credits, got.days > 1 ? t(' ({1} hari)', got.days) : '', got.drop ? t(' · dapat {1}', ITEMS[got.drop].name) : ''), 'doc');
    });
  }

  // ---------- commands ----------
  runCommand(cmd, target) {
    const choosers = ['LOGIN', 'CRACK', 'DECRYPT', 'COMPARE', 'EDIT', 'CONFIG', 'CONTROL'];
    if (choosers.includes(cmd)) { this.openChooser(cmd, target); return; }
    this.overlay = null;
    this.withLoading(cmd, () => this.finishCommand(cmd, target));
  }

  finishCommand(cmd, target) {
    const { sheet, out } = exec(this.ctx, cmd, target);
    fx.command(cmd, !out.some((l) => l.t === 'warn' || l.t === 'err'));
    if (cmd === 'CONNECT' && this.cur) { this.sel = { type: 'device', id: this.cur }; this.view = 'terminal'; }
    this.persist();
    if (cmd === 'DISCONNECT' && NODE_PAGES.includes(this.view)) this.view = 'map';
    this.overlay = sheet ? { kind: 'read', sheet } : null;
    this.render();
  }

  openChooser(cmd, target) {
    this.overlay = { kind: 'choose', cmd, target, choices: getChoices(this.ctx, cmd, target), config: {} };
    this.render();
  }

  applyChoice(value) {
    const o = this.overlay;
    this.overlay = null;
    this.withLoading(o.cmd, () => {
      const { sheet, out } = exec(this.ctx, o.cmd, o.target, value);
      fx.command(o.cmd, !out.some((l) => l.t === 'warn' || l.t === 'err'));
      this.persist();
      this.overlay = sheet ? { kind: 'read', sheet } : null;
      this.render();
    });
  }

  applyConfig() {
    const o = this.overlay;
    this.overlay = null;
    this.withLoading('CONFIG', () => {
      for (const [key, value] of Object.entries(o.config)) exec(this.ctx, 'CONFIG', o.target, [key, value]);
      fx.command('CONFIG', true);
      this.persist();
      this.render();
    });
  }

  tapObject(target) {
    this.sel = target;
    this.overlay = { kind: 'actions', target, acts: getActions(this.ctx, target) };
    this.render();
  }

  // ----- command catalog (CMDS) -----
  openCatalog() { this.overlay = { kind: 'catalog', group: null }; this.render(); }

  runCatalog(cmd) {
    if (!hasCmd(this.profile, cmd)) { this.toast('Command terkunci. Beli di Pasar Gelap (peta, Selatan).'); return; }
    const meta = CMD_META[cmd];
    const k = meta.kind;
    if (k === 'map') { this.overlay = null; this.view = 'map'; this.render(); return; }
    if (k === 'scan') { this.overlay = null; this.runCommand('SCAN', this.cur ? { type: 'device', id: this.cur } : { type: 'rig' }); return; }
    if (k === 'disconnect') { if (!this.cur) return this.failAttempt(cmd, notConnected('DISCONNECT')); this.overlay = null; this.runCommand('DISCONNECT', { type: 'rig' }); return; }
    if (k === 'files') { if (!this.cur) return this.failAttempt('LS', notConnected('FILES')); this.overlay = null; this.openPage('files', 'LS'); return; }
    if (k === 'system') { if (!this.cur) return this.failAttempt('PS', notConnected('SERVICES')); this.overlay = null; this.openPage('system', 'PS'); return; }
    if (k === 'controlpage') { if (!this.cur) return this.failAttempt('CONTROL', notConnected('CONTROL')); this.overlay = null; this.openPage('control', 'CONTROL'); return; }
    if (k === 'search') {
      if (!this.cur) return this.failAttempt('SEARCH', notConnected('SEARCH'));
      this.overlay = null; this.view = 'terminal'; this.runCommand('SEARCH', { type: 'device', id: this.cur }); return;
    }
    // target-based: device / connect / file / proc / control
    const targets = commandTargets(this.ctx, cmd);
    if (!targets.length) { this.failAttempt(cmd, cmd === 'CONNECT' || this.cur ? (NO_TARGET[cmd] || 'Tidak ada yang bisa dilakukan di sini.') : notConnected(cmd)); return; }
    if (targets.length === 1 && targets[0].enabled) { this.runFromCatalog(cmd, targets[0].target); return; }
    this.overlay = { kind: 'param', cmd, targets };
    this.render();
  }

  runFromCatalog(cmd, target) {
    const k = CMD_META[cmd]?.kind;
    if (k === 'file') this.view = 'files';
    else if (k === 'proc') this.view = 'system';
    else if (k === 'control') this.view = 'control';
    this.overlay = null;
    this.runCommand(cmd, target);
  }

  submitSite(mission, endingId) {
    const ctx = { ...this.ctx, mission };
    const node = nodeFor(mission.id);
    const first = !this.profile.cleared[mission.id];
    const mods = perksFor(this.profile);
    const res = finish(ctx, endingId, { repReward: node?.repReward || 0, creditMult: mods.creditMult, repMult: mods.repMult });
    const noItems = mission.endings.find((e) => e.id === endingId)?.noItems;
    if (first && !noItems) {
      addAll(this.profile, missionItems(mission.id));
      res.items = missionItems(mission.id) || {};
      res.notes = missionBond(this.profile, mission.id, node?.giver);
    }
    this.persist();
    this.overlay = { kind: 'result', res };
    fx.missionDone(res);
    this.render();
  }

  doBuy(itemId) {
    const r = buy(this.profile, itemId);
    fx.buy(r.ok);
    if (r.ok) this.persist(); else this.toast(r.msg);
    this.render();
  }

  resetGame() { this.profile = newProfile(); clearProfile(); this.goalSite = null; this.dlg = null; this.initWorld(); this.mapView = null; this.view = 'map'; this.intro = true; this.render(); }

  // ---------- DOM ----------
  ic(name) { return this.h('span', { class: 'ic-svg', html: iconSvg(name) }); }

  h(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'html') e.innerHTML = v;
      else if (v !== null && v !== false && v !== undefined) e.setAttribute(k, TEXT_ATTRS.has(k) ? tr(String(v)) : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(tr(kid)));
    return e;
  }

  render() {
    const el = this.h('div', { class: 'screen' });
    if (this.intro) { el.append(this.vIntro()); this.root.replaceChildren(el); this.fxFrame(); return; }
    el.append(this.statusStrip());
    const mapfull = this.view === 'map';
    const pane = this.h('div', { class: 'pane' + (this.view === 'terminal' ? ' term fx-scan' : '') + (mapfull ? ' mapfull' : '') + (mapfull ? '' : this.enterCls('view', this.view, 'fx-fade-up')) });
    pane.append(...this.viewPane());
    el.append(pane);
    if (this.showHint && this.ctx) el.append(this.h('div', { class: 'hint' }, '💡 ', this.hintText));
    el.append(this.dock());
    if (this.dlg) el.append(this.vDialogue());
    if (this.overlay) el.append(this.vOverlay());
    if (this.busy) el.append(this.vLoading());
    if (this.profile.sleeping) el.append(this.vSleeping());
    if (this.notice) el.append(this.vToast());
    this.root.replaceChildren(el);
    if (this.view === 'map') this.setupMap();
    if (this.dlg) this.startTyping();
    this.fxFrame();
  }

  // Entrance animations must not replay on every render (the whole DOM is rebuilt):
  // the class is returned only when `key` differs from the last one seen in this slot.
  enterCls(slot, key, cls) {
    const m = (this._enter ||= {});
    if (m[slot] === key) return '';
    m[slot] = key;
    return ' ' + cls;
  }
  idOf(o) {
    const m = (this._ids ||= new WeakMap());
    if (!m.has(o)) m.set(o, (this._idN = (this._idN || 0) + 1));
    return m.get(o);
  }

  // hand the sound / effects layer a snapshot of what is on screen
  fxFrame() {
    const p = this.profile, run = this.ctx?.run;
    const dev = this.cur && run ? device(run, this.cur) : null;
    fx.frame({
      intro: this.intro, view: this.view, overlay: this.overlay, overlayKind: this.overlay?.kind, dlg: this.dlg, busy: !!this.busy,
      noticeId: this.notice?.id, noticeIcon: this.notice?.icon, sleeping: !!p.sleeping, credits: p.credits, focus: p.focus, rank: rankFor(p.rep).id,
      district: dev?.district || null, finale: !!p.accepted?.s21 && !p.cleared?.s21 && dev?.district === 'industri', ending: false
    });
  }

  vToast() {
    const h = this.h.bind(this);
    return h('div', { class: 'toast', onclick: () => { this.notice = null; this.render(); } }, this.ic(this.notice.icon), h('span', {}, this.notice.msg));
  }

  vLoading() {
    const h = this.h.bind(this);
    const b = this.busy;
    const left = Math.max(0, b.ms - (Date.now() - b.start));
    const note = b.mult > 1 ? t('Estimasi {1} = {2} × {3} ({4}, Fokus {5})', fmtSec(b.ms), fmtSec(b.base), String(b.mult).replace('.', ','), b.mult >= 2 ? 'Kelelahan' : 'Lelah', b.focus) : t('Estimasi {1} (normal)', fmtSec(b.ms));
    const rows = [h('small', { class: 'loading-left' }, t('sisa {1}', fmtSec(left))),
      h('small', {}, note),
      b.cost > 0 && h('small', { class: 'loading-cost' }, t('Biaya ⚡ −{1} (setelah selesai)', b.cost))];
    return h('div', { class: 'loading' },
      h('div', { class: 'loading-box' },
        h('div', { class: 'loading-cmd' }, '> ', b.label.toLowerCase(), h('span', { class: 'blink' }, '_')),
        h('div', { class: 'loading-bar fx-seg-shine' + (b.mult >= 2 ? ' slow' : '') }, h('i', { style: `animation-duration:${b.ms}ms;animation-delay:-${Date.now() - b.start}ms` })),
        ...rows,
        h('button', { class: 'loading-cancel', onclick: () => this.cancelBusy() }, 'BATAL')));
  }

  // ---------- dialogue (visual-novel style) ----------
  // A scene = a stack of lines you tap through, then optional choices. The
  // NPC's standing picture (ui/portraits.js) is drawn behind the text box.
  openDialogue(npcId) {
    const lv = npcLevel(this.profile, npcId);
    this.dlg = { npc: npcId, mode: 'hub', bonus: 0 };
    this.dlgSay({ who: 'npc', text: greetingFor(npcId, lv, this.profile.day), mood: 'normal' });
  }

  dlgSay(line) {
    this.dlg.line = line;
    this.dlg.pages = paginate(line.text);
    this.dlg.pi = 0;
    this.dlg.key = (this._dk = (this._dk || 0) + 1);
    this.render();
  }

  dlgPlay(lines, onEnd) {
    this.dlg.mode = 'scene';
    this.dlg.lines = lines;
    this.dlg.i = 0;
    this.dlg.onEnd = onEnd;
    this.dlgSay(lines[0]);
  }

  // Tap on the text box: finish the typing first, then go to the next line.
  dlgAdvance() {
    const d = this.dlg;
    if (!d || this.busy) return;
    if (this.finishTyping()) return;
    if (d.pi < d.pages.length - 1) {                         // long line: next page of the same line
      d.pi += 1;
      d.key = (this._dk += 1);
      this.render();
      return;
    }
    if (d.mode !== 'scene') return;
    d.i += 1;
    if (d.i < d.lines.length) this.dlgSay(d.lines[d.i]);
    else d.onEnd();
  }

  dlgHub(line) {
    this.dlg.mode = 'hub';
    this.dlgSay(line || this.dlg.line);
  }

  dlgTalk() {
    const id = this.dlg.npc;
    if (!canTalk(this.profile, id)) return this.toast(t('Baru saja ngobrol. Lagi {1}.', fmtWait(talkWait(this.profile, id))));
    this.withLoading('NGOBROL', () => {
      const st = npcState(this.profile, id);
      const scene = talkSceneFor(id, levelOf(st.aff), this.profile.day, st.aff);
      this.dlg.bonus = 0;
      this.dlgPlay(scene.lines, () => {
        if (!scene.choice) return this.dlgEndTalk();
        this.dlg.mode = 'choice';
        this.dlg.choice = scene.choice;
        this.dlg.key = (this._dk += 1);
        this.render();
      });
    }, { cost: 2, base: 500 });
  }

  dlgPick(option) {
    this.dlg.bonus += option.bonus;
    this.dlg.choice = null;
    this.dlgPlay(option.lines, () => this.dlgEndTalk());
  }

  dlgEndTalk() {
    const id = this.dlg.npc;
    const r = talk(this.profile, id, perksFor(this.profile), this.dlg.bonus);
    this.persist();
    this.dlgHub();
    if (this.dlg?.bonus > 0 || r?.notes?.length) fx.bond(this.root.querySelector('.portrait-ph, .portrait-img'));
    const msgs = [...(r?.kopi ? ['+1 Kopi Susu'] : []), ...(r?.notes || [])];
    if (msgs.length) this.toast(msgs.join(' · '), 'hint');
  }

  dlgGiftOpen() {
    if (!canGift(this.profile, this.dlg.npc)) return this.toast(t('Baru memberi hadiah. Lagi {1}.', fmtWait(giftWait(this.profile, this.dlg.npc))));
    this.dlg.mode = 'gift';
    this.dlg.key = (this._dk += 1);
    this.render();
  }

  dlgGift(itemId) {
    const id = this.dlg.npc;
    this.withLoading('HADIAH', () => {
      const r = gift(this.profile, id, itemId);
      fx.gift();
      this.persist();
      this.dlgPlay(giftLines(id, !!r?.liked), () => this.dlgHub());
      if (r?.notes.length) this.toast(r.notes.join(' · '), 'hint');
    }, { cost: 1, base: 400 });
  }

  dlgOffers() {
    const id = this.dlg.npc;
    const jobs = offersFrom(this.profile, id);
    if (!jobs.length) {
      const waiting = waitingOn(this.profile, id).length > 0;
      return this.dlgHub({ who: 'npc', text: noOfferLine(id, waiting ? 'locked' : 'none'), mood: waiting ? 'serious' : 'normal' });
    }
    if (jobs.length === 1) return this.dlgOffer(jobs[0].id);
    this.dlg.mode = 'offers';
    this.dlg.jobs = jobs;
    this.dlg.key = (this._dk += 1);
    this.render();
  }

  dlgOffer(missionId) {
    const id = this.dlg.npc;
    const offer = offerSceneFor(id, missionId);
    this.dlgPlay(offer.lines, () => {
      this.dlg.mode = 'decide';
      this.dlg.offer = { missionId, ...offer };
      this.dlg.key = (this._dk += 1);
      this.render();
    });
  }

  dlgDecide(accept) {
    const o = this.dlg.offer;
    this.dlg.offer = null;
    if (accept) {
      this.acceptMission(o.missionId);
      this.dlgPlay(o.onAccept, () => this.dlgHub());
      this.toast(t('Misi diterima: {1}. Lihat tab Goals.', siteById(o.missionId).title), 'target');
    } else {
      this.dlgPlay(o.onDecline, () => this.dlgHub());
    }
  }

  // Handing a finished mission to its giver, in person.
  dlgTurnIn() {
    const id = this.dlg.npc;
    const ready = readyFrom(this.ctx, this.profile, id);
    if (!ready.length) return this.toast('Belum ada tugas yang siap diserahkan.');
    if (ready.length === 1) return this.dlgTurnInMission(ready[0].id);
    this.dlg.mode = 'turnlist';
    this.dlg.jobs = ready;
    this.dlg.key = (this._dk += 1);
    this.render();
  }

  dlgTurnInMission(missionId) {
    const id = this.dlg.npc;
    this.dlgPlay(turnInSceneFor(id, missionId), () => {
      this.dlg.mode = 'ending';
      this.dlg.missionId = missionId;
      this.dlg.endingOptions = endingsFor(this.ctx, missionId);
      this.dlg.key = (this._dk += 1);
      this.render();
    });
  }

  dlgFinish(missionId, endingId) {
    const id = this.dlg.npc;
    this.dlg.missionId = null;
    this.dlgHub(thanksLine(id));
    this.submitSite(siteById(missionId), endingId);
  }

  dlgClose() {
    clearInterval(this._typeT);
    this._typeT = null;
    this.dlg = null;
    this.render();
  }

  // typewriter effect for the line currently shown
  startTyping() {
    clearInterval(this._typeT);
    const el = this.root.querySelector('.dlg-text');
    if (!el) return;
    const full = el.dataset.full || '';
    if (this.dlg.typedKey === this.dlg.key) { el.textContent = full; return; }
    let n = 0;
    el.textContent = '';
    const npcId = this.dlg.npc, mood = this.dlg.line.who === 'you' ? 'normal' : this.dlg.line.mood;
    const isYou = this.dlg.line.who === 'you';
    this._typeT = setInterval(() => {
      n += 1;
      el.textContent = full.slice(0, n);
      if (n % 2 === 0 && /\S/.test(full[n - 1] || '')) { if (isYou) sfxCue('typeTick'); else fx.blip(npcId, mood); }
      if (n >= full.length) this.endTyping();
    }, 18);
  }

  endTyping() {
    clearInterval(this._typeT);
    this._typeT = null;
    if (!this.dlg) return;
    this.dlg.typedKey = this.dlg.key;
    const last = this.dlg.pi >= this.dlg.pages.length - 1;
    this.root.querySelectorAll(last ? '.dlg-next, .dlg-menu' : '.dlg-next').forEach((e) => e.classList.add('on'));
  }

  finishTyping() {
    if (!this._typeT || !this.dlg || this.dlg.typedKey === this.dlg.key) return false;
    const el = this.root.querySelector('.dlg-text');
    if (el) el.textContent = el.dataset.full || '';
    this.endTyping();
    return true;
  }

  vDialogue() {
    const h = this.h.bind(this);
    const d = this.dlg, npc = npcById(d.npc), st = npcState(this.profile, d.npc), lv = levelOf(st.aff);
    const you = d.line.who === 'you';
    const ph = PLACEHOLDER[d.npc] || { color: '#6a7', initial: '?' };
    const src = portraitSrc(d.npc, d.line.mood);
    const lastPage = d.pi >= d.pages.length - 1;
    const ready = d.typedKey === d.key && lastPage ? ' on' : '';
    const portrait = src
      ? h('img', { class: 'portrait-img' + (you ? ' dim' : ''), src, alt: npc.name })
      : h('div', { class: 'portrait-ph' + (you ? ' dim' : ''), style: `--pc:${ph.color}` },
        h('div', { class: 'ph-body' }), h('div', { class: 'ph-letter' }, ph.initial), h('small', {}, 'gambar belum ada'));

    // what sits under the text box depends on the mode
    let menu;
    if (d.mode === 'hub') {
      const talked = !canTalk(this.profile, d.npc), gifted = !canGift(this.profile, d.npc);
      const jobs = offersFrom(this.profile, d.npc).length;
      const handIn = readyFrom(this.ctx, this.profile, d.npc).length;
      menu = h('div', { class: 'dlg-menu hub' + ready },
        handIn > 0 && h('button', { class: 'dlg-opt hot', onclick: (e) => { e.stopPropagation(); this.dlgTurnIn(); } }, 'Serahkan tugas ✓'),
        h('button', { class: 'dlg-opt' + (talked ? ' off' : ''), onclick: (e) => { e.stopPropagation(); this.dlgTalk(); } }, talked ? t('Ngobrol · lagi {1}', fmtWait(talkWait(this.profile, d.npc))) : 'Ngobrol · ⚡2'),
        h('button', { class: 'dlg-opt' + (gifted ? ' off' : ''), onclick: (e) => { e.stopPropagation(); this.dlgGiftOpen(); } }, gifted ? t('Beri hadiah · lagi {1}', fmtWait(giftWait(this.profile, d.npc))) : 'Beri hadiah'),
        h('button', { class: 'dlg-opt' + (jobs ? ' hot' : ''), onclick: (e) => { e.stopPropagation(); this.dlgOffers(); } }, jobs ? 'Ada kerjaan? ★' : 'Ada kerjaan?'),
        h('button', { class: 'dlg-opt dim', onclick: (e) => { e.stopPropagation(); this.dlgClose(); } }, 'Pergi'));
    } else if (d.mode === 'choice') {
      menu = h('div', { class: 'dlg-menu' + ready }, ...d.choice.options.map((o) =>
        h('button', { class: 'dlg-opt', onclick: (e) => { e.stopPropagation(); this.dlgPick(o); } }, o.label)));
    } else if (d.mode === 'offers') {
      menu = h('div', { class: 'dlg-menu' + ready },
        ...d.jobs.map((j) => h('button', { class: 'dlg-opt hot', onclick: (e) => { e.stopPropagation(); this.dlgOffer(j.id); } }, `${siteById(j.id).code} · ${siteById(j.id).title}`)),
        h('button', { class: 'dlg-opt dim', onclick: (e) => { e.stopPropagation(); this.dlgHub(); } }, 'Kembali'));
    } else if (d.mode === 'turnlist') {
      menu = h('div', { class: 'dlg-menu' + ready },
        ...d.jobs.map((j) => h('button', { class: 'dlg-opt hot', onclick: (e) => { e.stopPropagation(); this.dlgTurnInMission(j.id); } }, `${siteById(j.id).code} · ${siteById(j.id).title}`)),
        h('button', { class: 'dlg-opt dim', onclick: (e) => { e.stopPropagation(); this.dlgHub(); } }, 'Kembali'));
    } else if (d.mode === 'ending') {
      const site = siteById(d.missionId), first = !this.profile.cleared[d.missionId];
      menu = h('div', { class: 'dlg-menu' + ready },
        h('div', { class: 'dlg-offer' }, h('b', {}, `${site.code} · ${site.title}`), h('span', {}, 'pilih hasil yang diserahkan')),
        ...d.endingOptions.map((e) => h('button', { class: 'dlg-opt hot', onclick: (ev) => { ev.stopPropagation(); this.dlgFinish(d.missionId, e.id); } },
          `${e.label} · +${first ? e.reward : Math.round(e.reward / 4)} ◆`)),
        h('button', { class: 'dlg-opt dim', onclick: (e) => { e.stopPropagation(); this.dlgHub(); } }, 'Nanti dulu'));
    } else if (d.mode === 'decide') {
      const site = siteById(d.offer.missionId);
      menu = h('div', { class: 'dlg-menu' + ready },
        h('div', { class: 'dlg-offer' }, h('b', {}, `${site.code} · ${site.title}`), h('span', {}, `+${site.reward} ◆`)),
        h('button', { class: 'dlg-opt hot', onclick: (e) => { e.stopPropagation(); this.dlgDecide(true); } }, d.offer.accept),
        h('button', { class: 'dlg-opt dim', onclick: (e) => { e.stopPropagation(); this.dlgDecide(false); } }, d.offer.decline));
    } else if (d.mode === 'gift') {
      const have = Object.keys(ITEMS).filter((id) => countOf(this.profile, id) > 0 && !isKey(id));
      menu = h('div', { class: 'dlg-menu on' },
        h('div', { class: 'dlg-offer' }, h('b', {}, 'Pilih hadiah'), h('span', {}, t('favorit: {1}', ITEMS[npc.likes].name))),
        ...(have.length ? have : []).map((id) => h('button', { class: 'dlg-opt', onclick: (e) => { e.stopPropagation(); this.dlgGift(id); } },
          `${ITEMS[id].name} ×${countOf(this.profile, id)}${id === npc.likes ? ' ♥' : ''}`)),
        !have.length && h('div', { class: 'dlg-offer' }, h('span', {}, 'Tasmu kosong. Selesaikan misi atau kerjakan kontrak untuk dapat barang.')),
        h('button', { class: 'dlg-opt dim', onclick: (e) => { e.stopPropagation(); this.dlgHub(); } }, 'Kembali'));
    }

    return h('div', { class: 'dlg' + this.enterCls('dlg', this.idOf(d), 'fx-fade-up') },
      h('div', { class: 'dlg-top' },
        h('div', { class: 'dlg-who' }, h('b', {}, npc.name), h('small', {}, `${npc.role} · ${LEVEL_NAMES[lv]}`)),
        h('div', { class: 'dlg-bar' }, h('i', { style: `width:${Math.round(levelProgress(st.aff) * 100)}%` })),
        h('button', { class: 'dlg-x', title: 'Info & keuntungan', onclick: () => { this.overlay = { kind: 'npcinfo', id: d.npc }; this.render(); } }, 'i'),
        h('button', { class: 'dlg-x', title: 'Tutup', onclick: () => this.dlgClose() }, '✕')),
      h('div', { class: 'dlg-stage' + this.enterCls('portrait', `${this.idOf(d)}`, 'fx-slide-in-left') }, portrait),
      h('div', { class: 'dlg-box', onclick: () => this.dlgAdvance() },
        h('div', { class: 'dlg-name' + (you ? ' you' : '') }, you ? 'Kamu' : npc.name),
        h('div', { class: 'dlg-text', 'data-full': d.pages[d.pi] }, d.pages[d.pi]),
        h('div', { class: 'dlg-next' + (d.typedKey === d.key && (d.mode === 'scene' || !lastPage) ? ' on' : '') }, d.mode === 'scene' || !lastPage ? '▾' : '')),
      menu);                                                    // choices float above the box, over the portrait
  }

  // ---------- intro ----------
  vIntro() {
    const h = this.h.bind(this);
    const boot = ['> rig.init ........ OK', '> uplink: isp_core ... OK', '> menunggu operator_'];
    return h('div', { class: 'intro fx-hex-rain' },
      h('div', { class: 'intro-boot' }, ...boot.map((l, i) => h('div', { class: 'fx-fade-up', style: `animation-delay:${i * 380}ms` }, l))),
      h('div', { class: 'intro-logo fx-glitch-text', style: 'animation-delay:1100ms' }, 'POCKET', h('span', {}, 'HACK')),
      h('p', { class: 'intro-tag' }, t('Kota {1}. Sebuah terminal, sebuah rig, dan jaringan yang menunggu diselidiki.', CITY_INFO.name)),
      h('p', { class: 'intro-note' }, 'Semua jaringan, perangkat, dan celah di game ini fiktif. Ini puzzle investigasi, bukan alat peretasan nyata.'),
      h('button', { class: 'intro-go fx-pulse-glow fx-fade-up', style: 'animation-delay:1500ms', onclick: () => { this.intro = false; this.persist(); this.render(); } }, '▸ MASUK KOTA'));
  }

  // ---------- status strip ----------
  statusStrip() {
    const h = this.h.bind(this);
    if (this.view === 'map' || this.view === 'profile') {
      return h('div', { class: 'statusbar' },
        h('span', { class: 'loc' }, '◉ ', CITY_INFO.name.toUpperCase()),
        this.traceChip(),
        h('span', { class: 'spacer' }),
        h('span', { class: 'day' }, fmtDateShort(this.profile.day)),
        this.focusPill(),
        h('span', { class: 'cr' }, '◆ ', String(this.profile.credits)));
    }
    const d = this.cur ? device(this.ctx.run, this.cur) : null;
    if (NODE_PAGES.includes(this.view) && d) {
      return h('div', { class: 'statusbar' },
        h('button', { class: 'back', title: 'Kembali ke terminal', onclick: () => { this.view = 'terminal'; this.render(); } }, this.ic('back')),
        h('span', { class: 'loc' }, d.name),
        h('span', { class: 'addr' }, d.addr),
        h('span', { class: 'spacer' }),
        h('span', { class: 'lv' }, LEVEL_LABEL[d.access]),
        this.traceChip(),
        this.hintBtn());
    }
    return h('div', { class: 'statusbar' },
      h('span', { class: 'loc' }, d ? d.name : this.view === 'goals' ? 'Misi' : 'Terminal'),
      d && h('span', { class: 'lv' }, LEVEL_LABEL[d.access]),
      this.traceChip(),
      h('span', { class: 'spacer' }),
      this.focusPill(),
      h('span', { class: 'cr' }, '◆ ', String(this.profile.credits)),
      this.hintBtn());
  }

  focusPill() {
    return this.h('span', { class: 'fo ' + focusState(this.profile.focus), title: t('Fokus: {1}', FOCUS_LABEL[focusState(this.profile.focus)]) },
      '⚡', String(this.profile.focus));
  }

  hintBtn() {
    return this.h('button', { class: 'hintbtn' + (this.showHint ? ' on' : ''), onclick: () => this.toggleHint() },
      this.ic('hint'), !this.showHint && this.h('span', { class: 'hint-cost' }, `◆${perksFor(this.profile).hintCost}`));
  }

  // Hints cost credits; the text is fixed at the moment it is bought.
  toggleHint() {
    if (this.showHint) { this.showHint = false; this.render(); return; }
    const mission = this.goalSite ? siteById(this.goalSite) : null;
    if (!mission) return this.toast('Terima sebuah misi dulu untuk meminta hint.');
    const cost = perksFor(this.profile).hintCost;
    if (this.profile.credits < cost) return this.toast(t('Kredit tidak cukup. Hint butuh ◆ {1}.', cost));
    this.profile.credits -= cost;
    this.hintText = hint({ ...this.ctx, mission });
    this.showHint = true;
    this.persist();
    this.render();
  }

  // ---------- view router ----------
  viewPane() {
    if (this.view === 'profile') return this.paneProfile();
    if (this.view === 'map') return this.paneMap();
    if (this.view === 'terminal') return this.paneTerminal();
    if (this.view === 'goals') return this.paneObjectives();
    if (this.view === 'files') return this.paneFiles();
    if (this.view === 'system') return this.paneSystem();
    if (this.view === 'control') return this.paneControl();
    return this.paneMap();
  }

  // ===== unified map: city targets + (when jacked in) network nodes =====
  // One `.node` card in map-pixel coords; onclick is suppressed after a drag.
  nodeCardPx({ id, cls, cx, cy, icon, title, sub, st, stCls, tag, onclick }) {
    const h = this.h.bind(this);
    return h('button', { class: 'node ' + cls, 'data-node': id, style: `left:${cx}px;top:${cy}px`,
      onclick: (e) => { if (this._dragged) { e.preventDefault(); return; } onclick(); } },
      tag && h('i', { class: 'mchip ' + tag.cls }, tag.t),
      h('div', { class: 'nm' }, this.ic(icon), title),
      sub && h('div', { class: 'ad' }, sub),
      st && h('div', { class: 'st ' + (stCls || '') }, st));
  }

  // People and the safehouse are round tokens, so they never read as network devices.
  personTokenPx({ cx, cy, color = '#6a7', initial = '?', icon, title, sub, level, badge, st, kind = 'person', onclick }) {
    const h = this.h.bind(this);
    return h('button', { class: t('node token {1}', kind), style: `left:${cx}px;top:${cy}px;--pc:${color}`,
      onclick: (e) => { if (this._dragged) { e.preventDefault(); return; } onclick(); } },
      h('div', { class: 'tk-circle' }, icon ? this.ic(icon) : initial, badge && h('i', { class: 'tk-badge ' + badge.cls }, badge.t)),
      h('div', { class: 'tk-name' }, title),
      sub && h('div', { class: 'tk-sub' }, level ? `${sub} · ${level}` : sub),
      st && h('div', { class: 'tk-st' }, st));
  }

  // One big pannable/zoomable open-world canvas: the whole city graph. Only
  // nodes you have discovered are drawn; links appear between discovered pairs.
  paneMap() {
    const h = this.h.bind(this);
    const run = this.ctx.run;
    const inner = h('div', { class: 'map-inner', style: `width:${MAPW}px;height:${MAPH}px` });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'edge'); svg.setAttribute('width', MAPW); svg.setAttribute('height', MAPH);
    const drawn = new Set();
    const cur = run.current;
    const missionOf = (d) => { const m = NET.owner[d.id]; return m && isAccepted(this.profile, m) && !this.profile.cleared[m] ? m : null; };
    const line = (a, b) => {
      const key = [a.id, b.id].sort().join('|');
      if (drawn.has(key)) return;
      drawn.add(key);
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y); ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
      if (cur && (a.id === cur || b.id === cur)) ln.setAttribute('class', 'hot fx-flow');
      else if (missionOf(a) && missionOf(a) === missionOf(b)) ln.setAttribute('class', 'mission');
      svg.append(ln);
    };
    inner.append(svg);

    const known = Object.values(run.devices).filter((d) => d.discovered);
    for (const d of known) for (const l of d.links || []) { const nb = run.devices[l]; if (nb?.discovered) line(d, nb); }
    // ROUTE hops (relay → another network) are drawn dashed
    for (const d of known) for (const l of d.routes || []) {
      const nb = run.devices[l]; if (!nb?.discovered) continue;
      const key = [d.id, nb.id].sort().join('|~');
      if (drawn.has(key)) continue; drawn.add(key);
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', d.x); ln.setAttribute('y1', d.y); ln.setAttribute('x2', nb.x); ln.setAttribute('y2', nb.y);
      ln.setAttribute('class', 'route fx-flow');
      svg.append(ln);
    }
    // nodes that just showed up on the map pop in (not on the first draw)
    const fresh = new Set();
    if (this._seenNodes) for (const d of known) if (!this._seenNodes.has(d.id)) fresh.add(d.id);
    this._seenNodes = new Set(known.map((d) => d.id));
    if (fresh.size) setTimeout(() => fx.discover(fresh.size), 0);

    // district names appear once you know a node there
    const seen = new Set(known.map((d) => d.district));
    for (const dist of DISTRICTS) {
      if (!seen.has(dist.id)) continue;
      const p = cellXY(dist.at);
      inner.append(h('div', { class: 'district-tag', style: `left:${p.x}px;top:${p.y}px` }, dist.name));
    }

    const cards = [];
    const home = cellXY(SAFEHOUSE_CELL);
    cards.push(this.personTokenPx({ cx: home.x, cy: home.y, color: '#f0c24a', icon: 'rig', kind: 'home', title: 'SAFEHOUSE',
      sub: `${fmtDateShort(this.profile.day)} · ${seasonName(this.profile.day)}`, st: 'ISTIRAHAT',
      onclick: () => { this.overlay = { kind: 'safehouse' }; this.render(); } }));
    const shop = cellXY(MARKET_CELL);
    cards.push(this.personTokenPx({ cx: shop.x, cy: shop.y, color: '#ff8f5a', icon: 'market', kind: 'shop', title: 'PASAR GELAP',
      sub: 'Selatan · tool, command, upgrade', st: 'BELANJA',
      onclick: () => { this.overlay = { kind: 'market' }; this.render(); } }));
    const biro = cellXY(CONTRACT_CELL);
    const waiting = WORLD_NODES.filter((m) => canContract(this.profile, m.id) || (hasContract(this.profile, m.id) && pendingDays(this.profile, m.id) > 0)).length;
    cards.push(this.personTokenPx({ cx: biro.x, cy: biro.y, color: '#4fd1c5', icon: 'jobs', kind: 'shop', title: 'BIRO KONTRAK',
      sub: 'perawatan harian', badge: waiting ? { t: '!', cls: 'job' } : null, st: waiting ? t('{1} MENUNGGU', waiting) : 'KONTRAK',
      onclick: () => { this.overlay = { kind: 'contracts' }; this.render(); } }));
    for (const npc of NPCS) {
      if (!isVisible(this.profile, npc)) continue;
      const pos = npcSpot(npc, this.profile.day), lv = levelOf(npcState(this.profile, npc.id).aff);
      const jobs = offersFrom(this.profile, npc.id).length;
      const handIn = readyFrom(this.ctx, this.profile, npc.id).length;
      cards.push(this.personTokenPx({ cx: pos.x, cy: pos.y, color: (PLACEHOLDER[npc.id] || {}).color, initial: (PLACEHOLDER[npc.id] || {}).initial || npc.name[0],
        title: npc.name, sub: `${npc.role}`, level: LEVEL_NAMES[lv],
        badge: handIn ? { t: '✓', cls: 'turn' } : jobs ? { t: '★', cls: 'job' } : canTalk(this.profile, npc.id) ? { t: '●', cls: 'talk' } : null,
        st: handIn ? 'SERAHKAN TUGAS' : jobs ? 'ADA KERJAAN' : canTalk(this.profile, npc.id) ? 'BISA DIAJAK NGOBROL' : '',
        onclick: () => this.openDialogue(npc.id) }));
    }
    const contractAt = (id) => SITES.find((m) => hasContract(this.profile, m.id) && m.entry[0] === id);
    // nodes wired to where you are now are the ones CMDS → CONNECT offers
    const near = new Set();
    if (cur) {
      for (const l of run.devices[cur].links || []) near.add(l);
      for (const d of Object.values(run.devices)) if (d.links?.includes(cur)) near.add(d.id);
    } else for (const e of NET.entry) near.add(e);
    for (const d of known) {
      const mid = NET.owner[d.id];                       // mission that owns this node, if any
      const cleared = mid && this.profile.cleared[mid];
      const active = mid && isAccepted(this.profile, mid) && !cleared;
      const isCur = cur === d.id;
      const rut = contractAt(d.id);
      const due = rut && pendingDays(this.profile, rut.id) > 0;
      const mcode = mid && (active || cleared) ? siteById(mid).code : null;
      const state = isCur ? 'cur' : near.has(d.id) ? 'near' : 'far';
      const lockSec = Math.ceil(lockLeft(run, d.id) / 1000);
      cards.push(this.nodeCardPx({
        id: d.id,
        cls: 'dev ' + state + (fresh.has(d.id) ? ' fx-pop fx-sonar' : '') + (d.hub ? ' hub' : '') + (cleared ? ' m-done' : active ? ' m-active' : '') + (d.online ? '' : ' off'),
        cx: d.x, cy: d.y, icon: d.kind, title: d.name, sub: d.addr, tag: mcode ? { t: mcode, cls: cleared ? 'done' : 'on' } : null,
        st: isCur ? t('● TERHUBUNG · {1}', LEVEL_LABEL[d.access])
          : due ? t('RUTIN ◆{1}', payout(this.profile, rut.id, rut, perksFor(this.profile)))
          : lockSec > 0 ? t('TERKUNCI · {1} dtk', lockSec)
          : d.access !== 'none' ? LEVEL_LABEL[d.access] : !d.online ? 'OFFLINE' : d.statusText || (d.hub ? 'HOTSPOT' : 'TERLIHAT'),
        stCls: isCur ? 'cur' : lockSec > 0 ? 'o' : due ? 'due' : d.access !== 'none' ? 'lv-' + d.access : d.online && !d.statusText ? '' : 'o',
        onclick: () => this.tapObject({ type: 'device', id: d.id })
      }));
    }
    inner.append(...cards);

    // start on the node you are connected to, a freshly revealed mission node, or the home hotspot
    const focusId = run.current || this._centerOn;
    if (focusId && run.devices[focusId]) {
      this._mapCenter = { x: run.devices[focusId].x, y: run.devices[focusId].y };
      this._mapScale = 0.8;
    } else {
      // fresh start: frame the home hotspot together with the safehouse
      const hub = run.devices[START_NODES[0]];
      this._mapCenter = { x: (hub.x + home.x) / 2, y: (hub.y + home.y) / 2 };
      this._mapScale = 0.7;
    }

    const vp = h('div', { class: 'worldmap pan' }, inner,
      h('div', { class: 'zoom-btns' },
        h('button', { class: 'zoom-btn home', title: 'Ke Safehouse', onclick: () => this.focusHome() }, this.ic('home')),
        h('button', { class: 'zoom-btn', onclick: () => this.zoomBy(1.25) }, '+'),
        h('button', { class: 'zoom-btn', onclick: () => this.zoomBy(0.8) }, '−')),
      perksFor(this.profile).event && h('div', { class: 'map-tag' }, h('b', { class: 'ev' }, `★ ${perksFor(this.profile).event.name}`)));
    return [vp];
  }

  applyMapT(inner) {
    if (inner && this.mapView) {
      // keep the viewport centre inside the map so the camera can't drift into the void
      const vp = inner.parentElement, v = this.mapView;
      if (vp && vp.clientWidth) {
        const w = vp.clientWidth, hh = vp.clientHeight;
        v.x = Math.max(w / 2 - MAPW * v.scale, Math.min(w / 2, v.x));
        v.y = Math.max(hh / 2 - MAPH * v.scale, Math.min(hh / 2, v.y));
      }
    }
    if (inner && this.mapView) inner.style.transform = `translate(${this.mapView.x}px,${this.mapView.y}px) scale(${this.mapView.scale})`;
    if (this.mapView) this._lastT = { ...this.mapView };
  }

  // glide the camera to the safehouse
  focusHome() {
    const vp = this.root.querySelector('.worldmap.pan'); if (!vp || !this.mapView) return;
    const home = cellXY(SAFEHOUSE_CELL), r = vp.getBoundingClientRect();
    const inner = vp.querySelector('.map-inner');
    const scale = Math.max(this.mapView.scale, 0.8);
    this.mapView = { scale, x: r.width / 2 - home.x * scale, y: r.height / 2 - home.y * scale };
    if (inner && settings.vfx !== 'off') {
      inner.style.transition = 'transform 420ms cubic-bezier(.2,.8,.2,1)';
      setTimeout(() => { inner.style.transition = ''; }, 460);
    }
    this.applyMapT(inner);
  }

  zoomBy(f) {
    const vp = this.root.querySelector('.worldmap.pan'); if (!vp || !this.mapView) return;
    const r = vp.getBoundingClientRect();
    const mx = r.width / 2, my = r.height / 2;
    const wx = (mx - this.mapView.x) / this.mapView.scale, wy = (my - this.mapView.y) / this.mapView.scale;
    this.mapView.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.mapView.scale * f));
    this.mapView.x = mx - wx * this.mapView.scale; this.mapView.y = my - wy * this.mapView.scale;
    this.applyMapT(vp.querySelector('.map-inner'));
  }

  setupMap() {
    const vp = this.root.querySelector('.worldmap.pan'); if (!vp) return;
    const inner = vp.querySelector('.map-inner');
    if (!this.mapView) {
      const r = vp.getBoundingClientRect();
      const s = this._mapScale || 0.8, c = this._mapCenter || { x: MAPW / 2, y: MAPH / 2 };
      this.mapView = { scale: s, x: r.width / 2 - c.x * s, y: r.height / 2 - c.y * s };
      this._centerOn = null;
      // glide from where the camera was to the new focus instead of jumping
      const from = this._lastT;
      if (from && settings.vfx !== 'off' && inner) {
        inner.style.transform = `translate(${from.x}px,${from.y}px) scale(${from.scale})`;
        void inner.offsetWidth;
        inner.style.transition = 'transform 560ms cubic-bezier(.2,.8,.2,1)';
        setTimeout(() => { inner.style.transition = ''; }, 600);
      }
    }
    this.applyMapT(inner);
    this.bindPanZoom(vp, inner);
  }

  bindPanZoom(vp, inner) {
    const pts = new Map(); let st = null;
    const clampScale = (s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const apply = () => this.applyMapT(inner);
    vp.addEventListener('pointerdown', (e) => {
      // reset first, so a stale drag flag never swallows the next tap on a node
      this._dragged = false;
      // never interfere with a press that starts on a node/button
      if (e.target.closest('.node, .zoom-btn')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const a = [...pts.values()]; const r = vp.getBoundingClientRect();
        st = { pinch: true, dist: dist(a[0], a[1]), scale: this.mapView.scale, mx: (a[0].x + a[1].x) / 2 - r.left, my: (a[0].y + a[1].y) / 2 - r.top, vx: this.mapView.x, vy: this.mapView.y };
      } else {
        st = { pan: true, x: e.clientX, y: e.clientY, vx: this.mapView.x, vy: this.mapView.y };
        try { vp.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
    });
    vp.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1 && st?.pan) {
        const dx = e.clientX - st.x, dy = e.clientY - st.y;
        if (Math.hypot(dx, dy) > 6) this._dragged = true;
        this.mapView.x = st.vx + dx; this.mapView.y = st.vy + dy; apply();
      } else if (pts.size >= 2 && st?.pinch) {
        const a = [...pts.values()]; const ns = clampScale(st.scale * dist(a[0], a[1]) / st.dist);
        const wx = (st.mx - st.vx) / st.scale, wy = (st.my - st.vy) / st.scale;
        this.mapView.scale = ns; this.mapView.x = st.mx - wx * ns; this.mapView.y = st.my - wy * ns;
        this._dragged = true; apply();
      }
    });
    const end = (e) => { pts.delete(e.pointerId); st = null; if (pts.size === 1) { const a = [...pts.values()][0]; st = { pan: true, x: a.x, y: a.y, vx: this.mapView.x, vy: this.mapView.y }; } };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);
    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top;
      const wx = (mx - this.mapView.x) / this.mapView.scale, wy = (my - this.mapView.y) / this.mapView.scale;
      this.mapView.scale = clampScale(this.mapView.scale * (e.deltaY < 0 ? 1.12 : 0.89));
      this.mapView.x = mx - wx * this.mapView.scale; this.mapView.y = my - wy * this.mapView.scale; apply();
    }, { passive: false });
  }

  paneMarket() {
    const h = this.h.bind(this);
    const ev = perksFor(this.profile).event;
    const out = [h('h2', { style: 'margin:0 0 4px' }, t('Pasar Gelap · ◆ {1}', this.profile.credits))];
    if (ev?.marketDiscount) out.push(h('div', { class: 'event-chip' }, h('b', {}, `★ ${ev.name}`), h('small', {}, ev.desc)));
    let section = null;
    for (const item of MARKET) {
      if (item.section && item.section !== section) { section = item.section; out.push(h('div', { class: 'section-h' }, section)); }
      const have = owned(this.profile, item);
      const c = canBuy(this.profile, item);
      out.push(h('div', { class: 'market-row' + (have ? ' owned' : '') },
        h('div', { class: 'main' }, h('b', {}, item.name), h('small', {}, item.desc)),
        have
          ? h('span', { class: 'tag-r', style: 'color:var(--green)' }, 'DIMILIKI')
          : h('button', { class: 'buy' + (c.ok ? '' : ' off'), onclick: () => c.ok ? this.doBuy(item.id) : this.toast(c.reason) }, (() => { const pr = priceFor(this.profile, item); return pr < item.cost ? [h('s', { class: 'was' }, String(item.cost)), ` ◆ ${pr}`] : `◆ ${pr}`; })())));
    }
    return out;
  }

  // Profile is a hub: a short operator card and a menu of sub-pages.
  paneProfile() {
    const h = this.h.bind(this);
    const sub = this.profileSub;
    if (!sub) return this.profileMenu();
    const pages = { bag: ['Inventory', () => this.profileBag()], contacts: ['Kontak', () => this.profileContacts()],
      tools: ['Tool & Command', () => this.profileTools()], archive: ['Arsip', () => this.profileArchive()], settings: ['Pengaturan', () => this.profileSettings()], help: ['Bantuan', () => this.profileHelp()] };
    const [title, body] = pages[sub];
    return [h('button', { class: 'back-row', onclick: () => { this.profileSub = null; this.render(); } }, this.ic('back'), ' Profil'),
      h('h2', { style: 'margin:6px 0 10px' }, title), ...body()];
  }

  profileMenu() {
    const h = this.h.bind(this);
    const rank = rankFor(this.profile.rep);
    const nxt = nextRank(this.profile.rep);
    const pct = Math.round(rankProgress(this.profile.rep) * 100);
    const cleared = Object.keys(this.profile.cleared).length;
    const bagCount = Object.values(this.profile.items || {}).reduce((a, n) => a + n, 0);
    const known = NPCS.filter((n) => isVisible(this.profile, n)).length;
    const entry = (id, icon, title, sub) => h('button', { class: 'menu-row', onclick: () => { this.profileSub = id; this.render(); } },
      h('div', { class: 'ic' }, this.ic(icon)), h('div', { class: 'main' }, h('b', {}, title), h('small', {}, sub)), h('span', { class: 'chev' }, '›'));
    return [
      h('div', { class: 'section-h' }, 'Profil Operator'),
      h('div', { class: 'rankbox' },
        h('div', { class: 'rank-top' }, h('b', {}, rank.name), h('span', {}, t('{1} rep', this.profile.rep))),
        h('div', { class: 'rankbar' }, h('i', { style: `width:${pct}%` })),
        h('small', {}, nxt ? t('{1} rep lagi → {2}', nxt.min - this.profile.rep, nxt.name) : 'Rank tertinggi tercapai.')),
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', {}, String(this.profile.credits)), h('small', {}, 'kredit')),
        h('div', { class: 'stat' }, h('b', {}, `${cleared}/${WORLD_NODES.length}`), h('small', {}, 'misi selesai')),
        h('div', { class: 'stat' }, h('b', {}, String(this.profile.day ? fmtDateShort(this.profile.day) : '')), h('small', {}, 'hari ini'))),
      h('div', { class: 'menu-list' },
        entry('bag', 'bag', 'Inventory', bagCount ? t('{1} barang', bagCount) : 'kosong'),
        entry('contacts', 'users', 'Kontak', t('{1} dikenal', known)),
        entry('tools', 'wrench', 'Tool & Command', t('{1} tool · {2} command', Object.values(this.profile.tools).filter(Boolean).length, (this.profile.cmds || []).length)),
        entry('archive', 'file', 'Arsip', t('{1} file', this.profile.archive.length)),
        entry('help', 'help', 'Bantuan', 'legenda peta & cara bermain'),
        entry('settings', 'gear', 'Pengaturan', 'bahasa, reset progres'))
    ];
  }

  // Help page (Profil → Bantuan): the map legend lives here instead of on the map.
  profileHelp() {
    const h = this.h.bind(this);
    const row = (sw, name, desc) => h('div', { class: 'lg-row' }, sw, h('div', {}, h('b', {}, name), h('small', {}, desc)));
    const mini = (cls, txt) => h('span', { class: 'lg-card ' + cls }, txt);
    const tok = (cls, txt, color) => h('span', { class: 'lg-token ' + cls, style: `--pc:${color}` }, txt);
    return [
      h('div', { class: 'section-h' }, 'Cara bermain'),
      h('div', { class: 'setting-note' }, 'Ketuk perangkat di Peta untuk terhubung, lalu pakai CMDS di Terminal. Bicara dengan orang untuk ambil misi, kerjakan di jaringan, lalu serahkan hasilnya. Fokus habis? Tidur di Safehouse.'),
      h('div', { class: 'section-h' }, 'Trace'),
      h('div', { class: 'setting-note' }, 'Node yang dijaga ketat melacakmu. Waktu TRACE di bilah atas berjalan selama kamu tersambung (berhenti saat loading). Kalau habis, kamu ditendang dan node itu menolakmu 30 detik. Putus sebelum habis, sisa waktunya disimpan dan pulih pelan-pelan selama kamu pergi.'),
      h('div', { class: 'section-h' }, 'Kontrak harian'),
      h('div', { class: 'setting-note' }, 'Setelah misi selesai, kliennya bisa menawarkan kontrak perawatan di Biro Kontrak. Itu penghasilan sampingan yang boleh kamu abaikan atau ambil kapan saja.'),
      h('div', { class: 'section-h' }, 'Perangkat'),
      row(mini('', 'PC'), 'Perangkat biasa', 'Kartu persegi gelap. Ketuk untuk perintah.'),
      row(mini('hub', 'AP'), 'Hotspot distrik', 'Bingkai biru. Pintu masuk tiap distrik.'),
      row(mini('m-active', 'K-00'), 'Node misi aktif', 'Bingkai hijau + kode misi. Terlibat di misi yang kamu ambil.'),
      row(mini('m-done', 'K-00'), 'Node misi selesai', 'Pudar. Sudah tidak dipakai misi.'),
      row(mini('cur', '●'), 'Sedang terhubung', 'Bingkai terang berdenyut. Garis ke tetangganya menyala.'),
      row(mini('near', '→'), 'Bisa dijangkau', 'Bingkai putus-putus: terhubung langsung ke node-mu sekarang (muncul di CMDS → CONNECT).'),
      row(mini('far', '…'), 'Jauh', 'Kartu redup: tidak terhubung langsung. Telusuri lewat tetangganya.'),
      h('div', { class: 'section-h' }, 'Orang & tempat'),
      row(tok('person', 'L', '#e8a35a'), 'Orang (NPC)', 'Lingkaran berwarna. Ketuk untuk bicara.'),
      row(h('span', { class: 'lg-badge job' }, '★'), 'Ada kerjaan', 'Mereka menawarkan misi.'),
      row(h('span', { class: 'lg-badge turn' }, '✓'), 'Serahkan tugas', 'Misi mereka siap diserahkan.'),
      row(h('span', { class: 'lg-badge talk' }, '●'), 'Bisa ngobrol', 'Belum ngobrol hari ini.'),
      row(tok('home', '⌂', '#f0c24a'), 'Safehouse', 'Tempat tidur untuk memulihkan Fokus.'),
      row(tok('shop', '▤', '#4fd1c5'), 'Biro Kontrak', 'Ambil dan cek kontrak perawatan harian.'),
      row(tok('shop', '◆', '#ff8f5a'), 'Pasar Gelap', 'Beli tool, command, intel, dan upgrade. Ada di distrik Selatan.'),
      h('div', { class: 'section-h' }, 'Level akses'),
      h('div', { class: 'lg-lv' }, h('span', { class: 'lv-guest' }, 'TAMU'), h('span', { class: 'lv-user' }, 'USER'), h('span', { class: 'lv-admin' }, 'ADMIN'))];
  }

  profileBag() {
    const h = this.h.bind(this);
    const out = [];
    const bag = Object.keys(ITEMS).filter((id) => countOf(this.profile, id) > 0);
    if (!bag.length) out.push(h('div', { class: 'empty' }, 'Tas kosong.\nBeli barang di Pasar Gelap atau dapatkan dari misi dan kontrak.'));
    for (const id of bag) {
      out.push(h('div', { class: 'market-row' }, h('div', { class: 'main' }, h('b', {}, `${ITEMS[id].name} ×${countOf(this.profile, id)}`), h('small', {}, ITEMS[id].desc)),
        ITEMS[id].usable && h('button', { class: 'buy', onclick: () => this.useItem(id) }, 'PAKAI')));
    }
    return out;
  }

  profileContacts() {
    const h = this.h.bind(this);
    const out = [];
    const known = NPCS.filter((n) => isVisible(this.profile, n));
    if (!known.length) out.push(h('div', { class: 'empty' }, 'Belum kenal siapa pun.'));
    for (const n of known) {
      const st = npcState(this.profile, n.id), lv = levelOf(st.aff);
      out.push(h('button', { class: 'menu-row', onclick: () => { this.overlay = { kind: 'npcinfo', id: n.id }; this.render(); } },
        h('div', { class: 'ic' }, this.ic('profile')),
        h('div', { class: 'main' }, h('b', {}, `${n.name} · ${LEVEL_NAMES[lv]}`), h('small', {}, lv > 0 ? n.perks[lv - 1] : n.role)),
        h('span', { class: 'chev' }, '›')));
    }
    return out;
  }

  profileTools() {
    const h = this.h.bind(this);
    const out = [];
    for (const tool of Object.values(TOOLS)) {
      const ownd = this.profile.tools[tool.id];
      out.push(h('div', { class: 'tool' + (ownd ? '' : ' locked') },
        h('div', { class: 'hd' }, h('b', {}, tool.name), h('span', { class: 'cost' }, tool.cmd)),
        h('p', {}, ownd ? tool.desc : '🔒 Beli di Pasar Gelap (peta, Selatan).')));
    }
    return out;
  }

  profileArchive() {
    const h = this.h.bind(this);
    const out = [];
    if (!this.profile.archive.length) out.push(h('div', { class: 'empty' }, 'Belum ada file tersimpan.'));
    for (const f of this.profile.archive) {
      out.push(h('button', { class: 'obj', onclick: () => { this.overlay = { kind: 'read', sheet: { title: f.name, content: f.content } }; this.render(); } },
        h('div', { class: 'ic' }, this.ic('doc')), h('div', { class: 'main' }, h('b', {}, f.name))));
    }
    return out;
  }

  profileSettings() {
    const h = this.h.bind(this);
    return [
      h('div', { class: 'section-h' }, 'Bahasa'),
      h('div', { class: 'setting-note' }, 'Bahasa dipakai untuk seluruh tampilan, dialog, dan misi. Mengganti bahasa memuat ulang game; progresmu tetap tersimpan.'),
      h('div', { class: 'lang-row' }, ...Object.entries(LANGS).map(([code, name]) =>
        h('button', { class: 'lang-btn' + (code === LANG ? ' on' : ''), onclick: () => this.changeLanguage(code) }, name))),
      h('div', { class: 'section-h' }, 'Suara & efek'),
      this.slider('Suara', 'sfx', () => sfxCue('confirm')),
      this.slider('Musik', 'music'),
      h('div', { class: 'setting-row' }, h('span', {}, 'Getar (haptik)'),
        h('button', { class: 'lang-btn' + (settings.haptics ? ' on' : ''), onclick: () => { setSettings({ haptics: !settings.haptics }); fx.haptic('medium'); sfxCue(settings.haptics ? 'toggleOn' : 'toggleOff'); this.render(); } }, settings.haptics ? 'AKTIF' : 'MATI')),
      h('div', { class: 'setting-note' }, 'Efek visual: Penuh = semua animasi dan partikel · Hemat = lebih sedikit (baterai) · Mati = tanpa efek.'),
      h('div', { class: 'lang-row' }, ...VFX_MODES.map((m) =>
        h('button', { class: 'lang-btn' + (settings.vfx === m ? ' on' : ''), onclick: () => { setSettings({ vfx: m }); sfxCue('toggleOn'); this.render(); } }, { full: 'Penuh', lite: 'Hemat', off: 'Mati' }[m]))),
      h('button', { class: 'linklike', onclick: () => { sfxCue('missionAccept'); fx.haptic('success'); } }, 'tes suara & getar'),
      h('div', { class: 'section-h' }, 'Data'),
      h('button', { class: 'linklike', onclick: () => this.confirmBox('Hapus semua progres?', 'Semua kredit, rep, dan progres misi akan hilang.', 'HAPUS', () => this.resetGame()) }, 'reset progres')
    ];
  }

  // 0–100 slider bound to a fx setting (does not re-render while dragging)
  slider(label, key, onDone) {
    const h = this.h.bind(this);
    const out = h('b', {}, `${Math.round(settings[key] * 100)}%`);
    return h('div', { class: 'setting-row' }, h('span', {}, label),
      h('input', { type: 'range', min: 0, max: 100, value: Math.round(settings[key] * 100), class: 'fx-range',
        oninput: (e) => { setSettings({ [key]: e.target.value / 100 }); out.textContent = `${e.target.value}%`; },
        onchange: () => onDone?.() }), out);
  }

  // The whole session uses one language, so switching reloads the page.
  changeLanguage(code) {
    if (code === LANG) return;
    this.persist();
    setLang(code);
    setTimeout(() => location.reload(), 200);
  }

  paneObjectives() {
    const h = this.h.bind(this);
    const open = worldNodes(this.profile).filter((n) => isAccepted(this.profile, n.id));
    if (!open.length) return [h('div', { class: 'empty', style: 'margin-top:40px' }, 'Belum ada misi diterima.\nTemui seseorang di peta dan tanyakan "ada kerjaan?".')];
    if (!this.goalSite || !open.some((n) => n.id === this.goalSite)) this.goalSite = open.at(-1).id;
    const mission = siteById(this.goalSite);
    const ctx = { ...this.ctx, mission };
    const tabs = h('div', { class: 'mission-tabs' });
    for (const n of open)
      tabs.append(h('button', { class: 'mission-tab' + (n.id === this.goalSite ? ' on' : ''), onclick: () => { this.goalSite = n.id; this.showHint = false; this.render(); } },
        n.site.code, n.state === 'cleared' && ' ✓'));
    const node = nodeFor(mission.id);
    const objs = objectives(ctx);
    const anyMain = objs.filter((o) => o.main).every((o) => o.done);
    const out = [tabs,
      h('div', { class: 'section-h' }, `${mission.title} · ${node.district} · ${DIFF_LABEL[node.difficulty]}`),
      h('div', { style: 'color:var(--muted);font-size:13px;margin-bottom:6px' }, mission.client),
      h('div', { style: 'color:var(--muted);font-size:13px;margin-bottom:14px' }, mission.brief)];
    // only the goal and the bonus are shown up front; the steps in between are yours to work out,
    // and they appear here as field notes once you have done them
    const shown = objs.filter((o) => o.main || o.bonus || o.done);
    if (shown.length < objs.length) out.push(h('div', { class: 'setting-note' }, 'Cara mencapainya terserah kamu. Langkah yang sudah kamu lakukan tercatat di sini.'));
    for (const o of shown) {
      out.push(h('div', { class: 'obj' },
        h('div', { class: 'ic', style: o.done ? 'color:var(--green);border-color:var(--green-dim)' : '' }, o.done ? '✓' : '○'),
        h('div', { class: 'main' }, h('b', { style: o.done ? 'color:var(--green)' : '' }, o.text),
          h('small', {}, o.bonus ? 'bonus' : o.main ? 'utama' : 'catatan'))));
    }
    const giver = npcById(node.giver);
    if (this.profile.cleared[mission.id]) {
      out.push(h('div', { class: 'job off', style: 'margin-top:14px' }, h('b', {}, '✓ Sudah diserahkan'), h('p', { style: 'color:var(--muted);font-size:12px;margin:4px 0 0' }, 'Misi ini selesai.')));
    } else if (anyMain && awaitingTurnIn(this.ctx, this.profile, mission.id)) {
      const e0 = endingsFor(this.ctx, mission.id);
      out.push(h('div', { class: 'section-h', style: 'margin-top:18px' }, 'Siap diserahkan'),
        h('div', { class: 'job ready' },
          h('b', {}, t('Serahkan ke {1}', giver.name)),
          h('p', { style: 'color:var(--muted);font-size:12px;margin:4px 0 6px' }, t('Temui {1} di peta (hari ini: {2}) lalu pilih "Serahkan tugas".', giver.name, this.whereIs(giver))),
          h('span', { style: 'color:var(--amber);font-weight:600;font-size:13px' }, e0.map((e) => `${e.label}: +${e.reward} ◆`).join('  ·  '))));
    } else {
      out.push(h('div', { class: 'section-h', style: 'margin-top:18px' }, 'Penyerahan'),
        h('p', { style: 'color:var(--muted);font-size:12px;margin:0' }, t('Selesaikan tujuan utama, lalu serahkan langsung ke {1}.', giver.name)));
    }
    return out;
  }

  // Where an NPC is today, in words: the nearest known landmark of the map.
  whereIs(npc) {
    const pos = npcSpot(npc, this.profile.day);
    let best = null, bd = Infinity;
    for (const d of Object.values(NET.world.devices)) {
      const dist = Math.hypot(d.x - pos.x, d.y - pos.y);
      if (dist < bd) { bd = dist; best = d; }
    }
    return t('dekat {1}', best.name);
  }

  // ===== DEVICE pages =====
  deviceHeader() {
    const h = this.h.bind(this);
    const d = device(this.ctx.run, this.cur);
    const acts = getActions(this.ctx, { type: 'device', id: d.id }).filter((a) => a.cmd !== 'CONNECT' && a.cmd !== 'INSPECT');
    return h('button', { class: 'devhead', onclick: () => this.tapObject({ type: 'device', id: d.id }) },
      h('div', { class: 'ic' }, this.ic(d.kind)),
      h('div', { class: 'main' }, h('b', {}, d.name),
        h('small', {}, acts.length ? t('perintah: {1}', acts.map((a) => a.cmd).join(' · ')) : 'ketuk untuk INSPECT')),
      h('div', { class: 'tag-r', style: 'color:var(--green)' }, LEVEL_LABEL[d.access]));
  }

  paneFiles() {
    const h = this.h.bind(this);
    const run = this.ctx.run;
    const d = device(run, this.cur);
    const files = visibleFiles(run, d.id);
    const out = [this.deviceHeader(), h('div', { class: 'section-h' }, t('File Server · {1}', LEVEL_LABEL[d.access])),
      h('button', { class: 'obj' + (hasCmd(this.profile, 'SEARCH') ? '' : ' locked'),
        onclick: () => { if (!hasCmd(this.profile, 'SEARCH')) return this.toast('SEARCH terkunci. Beli di Pasar Gelap (peta, Selatan).'); this.view = 'terminal'; this.runCommand('SEARCH', { type: 'device', id: d.id }); } },
        h('div', { class: 'ic' }, this.ic(hasCmd(this.profile, 'SEARCH') ? 'terminal' : 'lock')),
        h('div', { class: 'main' }, h('b', {}, 'SEARCH'), h('small', {}, 'cari kata kunci di semua file node ini')))];
    if (!files.length) out.push(h('div', { class: 'empty' }, 'Tidak ada file yang bisa diakses pada level ini.'));
    for (const f of files) {
      out.push(h('button', { class: 'obj' + (f.corrupt || f.deleted || f.encrypted ? ' locked' : ''),
        onclick: () => this.tapObject({ type: 'file', device: d.id, id: f.id }) },
        h('div', { class: 'ic' }, this.ic('doc')),
        h('div', { class: 'main' }, h('b', {}, f.name),
          h('small', {}, f.deleted ? 'terhapus' : f.corrupt ? 'rusak' : f.encrypted ? 'terenkripsi' : run.read.includes(f.id) ? 'sudah dibaca' : 'belum dibaca')),
        h('div', { class: 'tag-r', style: f.noDownload ? 'color:var(--faint)' : 'color:var(--green-dim)' }, f.noDownload ? 'sistem' : '⬇')));
    }
    out.push(h('div', { class: 'section-h' }, t('Salinan lokal · {1}/{2}', run.local.length, LOCAL_CAP)));
    if (!run.local.length) out.push(h('div', { class: 'empty' }, 'Belum ada file yang diunduh.\nPenyimpanan rig terbatas — pilih yang penting.'));
    for (const f of run.local) {
      out.push(h('button', { class: 'obj', onclick: () => this.tapObject({ type: 'file', local: true, id: f.id }) },
        h('div', { class: 'ic' }, this.ic('doc')),
        h('div', { class: 'main' }, h('b', {}, f.name), h('small', {}, f.encrypted ? 'terenkripsi' : 'siap dibaca')),
        h('div', { class: 'tag-r' }, 'ketuk: hapus/baca')));
    }
    return out;
  }

  paneSystem() {
    const h = this.h.bind(this);
    const d = device(this.ctx.run, this.cur);
    const out = [this.deviceHeader(), h('div', { class: 'section-h' }, 'Service Server · Proses & Layanan')];
    if (!d.procs?.length) out.push(h('div', { class: 'empty' }, 'Tidak ada proses pada perangkat ini.'));
    for (const p of d.procs || []) {
      out.push(h('button', { class: 'obj', onclick: () => this.tapObject({ type: 'proc', device: d.id, id: p.id }) },
        h('div', { class: 'ic' }, this.ic('proc')),
        h('div', { class: 'main' }, h('b', {}, p.name), h('small', {}, p.desc)),
        h('div', { class: 'tag-r', style: p.running ? 'color:var(--green)' : 'color:var(--muted)' }, p.running ? 'RUN' : 'STOP')));
    }
    return out;
  }

  paneControl() {
    const h = this.h.bind(this);
    const d = device(this.ctx.run, this.cur);
    const out = [this.deviceHeader(), h('div', { class: 'section-h' }, 'Kontrol Perangkat')];
    if (!d.controls?.length) out.push(h('div', { class: 'empty' }, 'Perangkat ini tidak punya kontrol fisik.'));
    for (const c of d.controls || []) {
      out.push(h('button', { class: 'obj', onclick: () => this.tapObject({ type: 'control', device: d.id, id: c.id }) },
        h('div', { class: 'ic' }, this.ic('control')),
        h('div', { class: 'main' }, h('b', {}, c.label), h('small', {}, t('status: {1}', c.state)))));
    }
    return out;
  }

  // Terminal: log + big CMDS button opening the command catalog.
  paneTerminal() {
    const h = this.h.bind(this);
    const log = h('div', { class: 'log' });
    const seenN = this._logN ?? this.ctx.run.log.length;
    this.ctx.run.log.forEach((e, i) => log.append(h('div', { class: 'entry ' + e.t + (i >= seenN ? ' fx-fade-up' : '') }, e.text)));
    this._logN = this.ctx.run.log.length;
    setTimeout(() => { if (log.isConnected) log.scrollTop = log.scrollHeight; }, 0);
    const bar = h('div', { class: 'termbar' },
      h('button', { class: 'cmds-btn', onclick: () => this.openCatalog() }, this.ic('terminal'), ' CMDS'),
      h('div', { class: 'term-ctx' }, this.cur ? t('node: {1}', device(this.ctx.run, this.cur).name) : 'belum terhubung'));
    return [log, bar];
  }

  // ---------- dock ----------
  dock() {
    const h = this.h.bind(this);
    const active = NODE_PAGES.includes(this.view) ? 'terminal' : this.view;
    const row = h('div', { class: 'dock' });
    for (const [id, label] of TABS)
      row.append(h('button', { class: 'dock-btn' + (id === active ? ' on' + this.enterCls('dock', active, 'fx-dock-pop') : ''), onclick: () => { this.view = id; this.overlay = null; if (id === 'profile') this.profileSub = null; this.render(); } },
        h('span', { class: 'di' }, this.ic(TAB_ICON[id])), h('span', { class: 'dl' }, label)));
    return row;
  }

  selLabel() {
    const s = this.sel;
    if (!this.ctx) return '';
    if (s.type === 'rig') return 'rig lokal';
    if (s.type === 'device') return device(this.ctx.run, s.id).name;
    if (s.type === 'file') { const f = (s.local ? this.ctx.run.local : device(this.ctx.run, s.device).files).find((x) => x.id === s.id); return f?.name || ''; }
    if (s.type === 'proc') return device(this.ctx.run, s.device).procs.find((x) => x.id === s.id)?.name || '';
    if (s.type === 'control') return device(this.ctx.run, s.device).controls.find((x) => x.id === s.id)?.label || '';
    return '';
  }

  // ---------- overlays ----------
  vOverlay() {
    const h = this.h.bind(this);
    const o = this.overlay;
    const close = () => { this.overlay = null; this.render(); };
    const sheet = h('div', { class: 'sheet' + this.enterCls('overlay', this.idOf(o), 'fx-slide-up'), onclick: (e) => e.stopPropagation() }, h('div', { class: 'grab' }));
    // skip empty slots (`cond && node`) instead of printing "null" / "0"
    const put = sheet.append.bind(sheet);
    sheet.append = (...kids) => put(...kids.filter((k) => k != null && k !== false && k !== 0));

    if (o.kind === 'read') {
      sheet.append(h('h2', {}, o.sheet.title), h('div', { class: 'file' }, o.sheet.content), h('button', { class: 'act', onclick: close }, 'TUTUP'));
    } else if (o.kind === 'actions') {
      sheet.append(h('h2', {}, this.selLabel() || 'Perintah'));
      if (!o.acts.length) sheet.append(h('p', { class: 'reason' }, 'Tidak ada perintah untuk objek ini.'));
      for (const a of o.acts) {
        sheet.append(h('button', { class: 'cmd-row' + (a.enabled ? '' : ' off'),
          onclick: () => { if (!a.enabled) return; this.overlay = null; this.runCommand(a.cmd, o.target); } },
          h('b', {}, a.cmd), a.enabled ? h('span', {}, '▸') : h('small', { class: 'reason' }, a.reason)));
      }
      sheet.append(h('button', { class: 'act dim', onclick: close }, 'TUTUP'));
    } else if (o.kind === 'market') {
      sheet.append(...this.paneMarket(), h('button', { class: 'act dim', onclick: close }, 'TUTUP'));
    } else if (o.kind === 'contracts') {
      const rows = this.contractRows();
      sheet.append(h('h2', {}, 'Biro Kontrak'),
        h('p', { style: 'color:var(--muted);font-size:13px;margin:4px 0 12px' }, 'Opsional: penghasilan sampingan, tanpa kewajiban. Klien yang puas mau membayar perawatan harian. Ambil kontraknya, lalu kapan pun kamu sempat, sambung ke node awal misinya dan buka File Server: kredit hari-hari yang terlewat (maksimal 3) ikut masuk.'),
        ...(rows.length ? rows : [h('div', { class: 'empty' }, 'Belum ada kontrak.\nSelesaikan sebuah misi dulu — kliennya akan menawarkan kontrak di sini.')]),
        h('button', { class: 'act dim', onclick: close }, 'TUTUP'));
    } else if (o.kind === 'npcinfo') {
      const npc = npcById(o.id), st = npcState(this.profile, o.id), lv = levelOf(st.aff);
      sheet.append(h('h2', {}, npc.name),
        h('p', { style: 'color:var(--muted);font-size:13px;margin:4px 0 10px' }, `${npc.role} · ${LEVEL_NAMES[lv]}${lv < AFF_STEPS.length - 1 ? ` (${st.aff}/${AFF_STEPS[lv + 1]})` : ''}`),
        h('div', { class: 'rankbar' }, h('i', { style: `width:${Math.round(levelProgress(st.aff) * 100)}%` })),
        h('p', { style: 'color:var(--muted);font-size:12px;margin:10px 0 0' }, t('Favoritnya: {1}', ITEMS[npc.likes].name)),
        h('div', { class: 'section-h', style: 'margin-top:14px' }, 'Keuntungan'),
        ...npc.perks.map((perk, i) => h('div', { class: 'perk' + (lv > i ? ' on' : '') }, h('b', {}, LEVEL_NAMES[i + 1]), h('span', {}, perk))),
        h('button', { class: 'act dim', onclick: close }, 'TUTUP'));
    } else if (o.kind === 'safehouse') {
      const ev = perksFor(this.profile).event;
      sheet.append(h('h2', {}, 'Safehouse'),
        h('p', { style: 'color:var(--muted);font-size:13px;margin:4px 0 10px' }, t('{1} · Musim {2}', fmtDate(this.profile.day), seasonName(this.profile.day))),
        ev && h('div', { class: 'event-chip' }, h('b', {}, ev.name), h('small', {}, ev.desc)),
        eventFor(this.profile.day + 1) && h('p', { style: 'color:var(--muted);font-size:12px;margin:0 0 10px' }, t('Besok: ★ {1}', eventFor(this.profile.day + 1).name)),
        h('div', { class: 'focus-box' },
          h('div', { class: 'focus-top' }, h('b', {}, t('Fokus {1}', this.profile.focus)), h('span', { class: 'fo ' + focusState(this.profile.focus) }, FOCUS_LABEL[focusState(this.profile.focus)])),
          h('div', { class: 'rankbar' }, h('i', { style: `width:${Math.min(100, this.profile.focus)}%` })),
          h('small', {}, 'Makin lelah, aksi makin mahal dan loading makin lama. Tidur memulihkan 1 Fokus per menit (waktu nyata).')),
        h('button', { class: 'jackin', onclick: () => this.goSleep() }, '▸ TIDUR'),
        h('button', { class: 'act dim', onclick: close }, 'TUTUP'));
    } else if (o.kind === 'daystart') {
      const i = o.info, ev = perksFor(this.profile).event;
      sheet.append(h('h2', {}, 'Bangun tidur'),
        h('p', { style: 'color:var(--muted);font-size:13px;margin:4px 0 10px' }, t('{1} · Tidur {2} · Fokus pulih penuh', fmtDate(this.profile.day), fmtGameTime(i.slept))),
        ev && h('div', { class: 'event-chip' }, h('b', {}, ev.name), h('small', {}, ev.desc)),
        ...this.dueNotes(),
        h('button', { class: 'act', onclick: close }, 'MULAI'));
    } else if (o.kind === 'confirm') {
      sheet.append(h('h2', {}, o.title), h('p', { style: 'color:var(--muted);font-size:13px;margin:6px 0 12px' }, o.text),
        h('button', { class: 'act danger', onclick: () => { this.overlay = null; o.onOk(); } }, o.okLabel),
        h('button', { class: 'act dim', onclick: close }, 'BATAL'));
    } else if (o.kind === 'catalog') {
      if (!o.group) {
        sheet.append(h('h2', {}, 'Command'));
        const grid = h('div', { class: 'cat-grid' });
        for (const g of GROUPS) {
          const cmds = groupCommands(g.id);
          const avail = cmds.filter((c) => hasCmd(this.profile, c)).length;
          grid.append(h('button', { class: 'cat-group-btn', onclick: () => { o.group = g.id; this.render(); } },
            h('b', {}, g.name),
            h('small', {}, t('{1}/{2} command', avail, cmds.length))));
        }
        sheet.append(grid, h('button', { class: 'act dim', onclick: close }, 'TUTUP'));
      } else {
        const g = GROUPS.find((x) => x.id === o.group);
        sheet.append(h('button', { class: 'back-row', onclick: () => { o.group = null; this.render(); } }, this.ic('back'), ' Semua grup'),
          h('h2', {}, g.name));
        const grid = h('div', { class: 'cat-grid' });
        for (const cmd of groupCommands(g.id)) {
          const locked = !hasCmd(this.profile, cmd);
          grid.append(h('button', { class: 'cat-cmd' + (locked ? ' locked' : ''), title: CMD_META[cmd].desc,
            onclick: () => { if (locked) { this.toast('Terkunci. Beli di Pasar Gelap (peta, Selatan).'); return; } this.runCatalog(cmd); } },
            h('b', {}, cmd),
            locked ? h('span', { class: 'cat-lock' }, this.ic('lock')) : h('small', {}, CMD_META[cmd].desc)));
        }
        sheet.append(grid, h('button', { class: 'act dim', onclick: close }, 'TUTUP'));
      }
    } else if (o.kind === 'param') {
      sheet.append(h('h2', {}, o.cmd), h('p', { style: 'color:var(--muted);font-size:12px;margin:0 0 10px' }, 'Pilih sasaran:'));
      for (const tg of o.targets) {
        sheet.append(h('button', { class: 'cmd-row' + (tg.enabled ? '' : ' off'),
          onclick: () => { if (!tg.enabled) return; this.runFromCatalog(o.cmd, tg.target); } },
          h('b', {}, tg.label), tg.enabled ? h('span', {}, '▸') : h('small', { class: 'reason' }, tg.reason)));
      }
      sheet.append(h('button', { class: 'act dim', onclick: close }, 'BATAL'));
    } else if (o.kind === 'choose') {
      sheet.append(h('h2', {}, o.cmd));
      if (o.cmd === 'CONFIG') {
        sheet.append(h('p', { style: 'color:var(--muted);font-size:12px' }, 'Atur nilai lalu simpan. START layanan setelahnya.'));
        for (const field of o.choices) {
          o.config[field.key] = o.config[field.key] ?? field.value;
          sheet.append(h('div', { class: 'section-h' }, field.label));
          for (const opt of field.options)
            sheet.append(h('button', { class: 'opt' + (o.config[field.key] === opt ? ' cur' : ''), onclick: () => { o.config[field.key] = opt; this.render(); } }, opt));
        }
        sheet.append(h('button', { class: 'act', onclick: () => this.applyConfig() }, 'SIMPAN KONFIGURASI'));
      } else {
        if (!o.choices.length) sheet.append(h('p', { class: 'reason' }, 'Belum ada pilihan. Kumpulkan petunjuk dulu.'));
        for (const c of o.choices) sheet.append(h('button', { class: 'opt' + (c.current ? ' cur' : ''), onclick: () => this.applyChoice(c.value) }, c.label, c.current && h('small', {}, 'status sekarang')));
        sheet.append(h('button', { class: 'act dim', onclick: close }, 'BATAL'));
      }
    } else if (o.kind === 'result') {
      const reward = h('b', { class: 'fx-count' }, String(o.res.reward));
      const rep = h('b', { class: 'fx-count' }, String(o.res.rep));
      if (this.enterCls('result', this.idOf(o), 'x')) requestAnimationFrame(() => { vfx.countUp(reward, 0, o.res.reward, 900); vfx.countUp(rep, 0, o.res.rep, 900); });
      sheet.append(h('div', { class: 'fx-stamp' }, 'SELESAI'), h('h2', { style: 'color:var(--green)' }, 'TARGET SELESAI'),
        h('div', { class: 'file' }, o.res.text),
        h('p', { style: 'color:var(--amber)' }, '+', reward, ' ◆   ·   +', rep, ' rep'),
        o.res.unlocked.length && h('p', { style: 'color:var(--cyan)' }, t('Tool terbuka: {1}', o.res.unlocked.map((id) => TOOLS[id].name).join(', '))),
        Object.keys(o.res.items || {}).length && h('p', { style: 'color:var(--ink)' }, t('Dapat: {1}', Object.entries(o.res.items).map(([id, n]) => `${tr(ITEMS[id].name)} ×${n}`).join(', '))),
        ...(o.res.notes || []).map((note) => h('p', { style: 'color:var(--cyan);font-size:12px' }, note)),
        h('p', { style: 'color:var(--muted);font-size:12px' }, 'Klien menawarkan kontrak perawatan harian — cek di Biro Kontrak.'),
        h('button', { class: 'act', onclick: close }, 'LANJUT'));
    }
    return h('div', { class: 'overlay' + (o.kind === 'daystart' ? ' fx-sunrise' : ''), onclick: close }, sheet);
  }
}
