import { SITES, siteById } from '../sites/index.js';
import { newProfile, newRun, TOOLS, LEVEL_LABEL, atLeast, device, visibleFiles } from '../engine/core.js';
import { getActions, getChoices, exec, objectives, hint, endings, finish, LOCAL_CAP } from '../engine/actions.js';
import { CMD_META, GROUPS, groupCommands, commandTargets } from '../engine/commands.js';
import { hasCmd, loadMs } from '../game/profile.js';
import { DEFAULT_CMDS } from '../engine/commands.js';
import { CITY, WORLD_NODES, DIFF_LABEL, nodeFor, worldNodes, isAccepted } from '../game/world.js';
import { MARKET, buy, canBuy, owned, priceFor } from '../game/market.js';
import { ITEMS, KOPI_FOCUS, KOPI_PRICE, MISSION_ITEMS, addItem, addAll, removeItem, countOf, contractDrop } from '../game/items.js';
import { NPCS, LEVEL_NAMES, AFF_STEPS, npcById, npcState, levelOf, levelProgress, isVisible, npcSpot, canTalk, canGift, talk, gift, missionBond } from '../game/npc.js';
import { eventFor, focusCostFor, restoreFocus, loadingMult, spendFocus, sleep, focusState, FOCUS_LABEL, seasonName } from '../game/time.js';
import { perksFor } from '../game/perks.js';
import { canContract, startContract, hasContract, pendingDays, payout, collect } from '../game/retainer.js';
import { rankFor, nextRank, rankProgress } from '../game/progression.js';
import { saveProfile, loadProfile, clearProfile, buzz } from '../platform/storage.js';
import { iconSvg } from './icons.js';

const TAB_ICON = { map: 'map', terminal: 'terminal', goals: 'target', market: 'market', profile: 'profile' };
const MAPW = 1500, MAPH = 2000, CLUSTER = 420; // big open-world canvas (px) + per-site node cluster spread
const MIN_SCALE = 0.25, MAX_SCALE = 1.8;
// In-world messages when a command has nothing to act on (instead of a generic error).
const NO_TARGET = {
  CONNECT: 'Tidak ada perangkat lain yang terlihat. Jalankan SCAN dulu.',
  LOGIN: 'Belum punya kredensial untuk node ini.',
  CRACK: 'Tidak ada sandi di node ini yang bisa dipecahkan.',
  EXPLOIT: 'Tidak ada celah yang ditemukan di node ini.',
  ELEVATE: 'Tidak ada jalur untuk menaikkan hak akses di sini.',
  INSPECT: 'Tidak ada yang bisa diperiksa.',
  SEARCH: 'Tidak ada file untuk dipindai di node ini.'
};
const NOT_CONNECTED = {
  DEFAULT: 'Belum terhubung ke node mana pun. Jalankan CONNECT dulu.',
  FILES: 'Belum terhubung — tidak ada file server yang bisa dibuka.',
  SERVICES: 'Belum terhubung — tidak ada service server yang bisa dibuka.',
  CONTROL: 'Belum terhubung — tidak ada perangkat yang bisa dikontrol.',
  DISCONNECT: 'Kamu belum terhubung ke node mana pun.'
};
const notConnected = (cmd) => NOT_CONNECTED[cmd] || NOT_CONNECTED.DEFAULT;
const NODE_PAGES = ['files', 'system', 'control'];
const TABS = [['map', 'Peta'], ['terminal', 'Terminal'], ['goals', 'Goals'], ['market', 'Pasar'], ['profile', 'Profil']];

export class App {
  constructor(root) {
    this.root = root;
    this.profile = newProfile();
    this.runs = {};                  // siteId -> ctx; every site is live on the map, no jack-in
    this.ctx = null;                 // ctx of the site whose node was touched last
    this.goalSite = null;            // mission shown in the Goals tab
    this.view = 'map';               // map | terminal | goals | market | profile | files | system
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
    const last = this.profile.lastSite;
    if (last && siteById(last) && isAccepted(this.profile, last)) { this.ctx = this.ctxFor(last); this.goalSite = last; }
    this.render();
  }

  persist() { saveProfile(this.profile); }
  get cur() { return this.ctx?.run.current || null; }

  // ---------- sites ----------
  // Every site is live on the open-world map; its run is created lazily the
  // first time one of its nodes is touched (or its mission is opened).
  ctxFor(siteId) {
    if (!this.runs[siteId]) {
      const site = siteById(siteId);
      // restore the saved run if it still matches this site's layout
      const saved = this.profile.runs?.[siteId];
      const ok = saved && saved.missionId === site.id && Object.keys(site.world.devices).every((id) => saved.devices?.[id]);
      const ctx = { mission: site, run: ok ? saved : newRun(site), profile: this.profile };
      (this.profile.runs ||= {})[siteId] = ctx.run;
      if (ok) { this.runs[siteId] = ctx; return ctx; }
      for (const id of site.entry) { const d = ctx.run.devices[id]; if (d) d.discovered = true; }
      this.runs[siteId] = ctx;
    }
    return this.runs[siteId];
  }

  acceptMission(siteId) {
    this.profile.accepted[siteId] = true;
    this.focus(siteId);
    this._centerOn = siteId;
    this.mapView = null;
    this.overlay = null;
    this.view = 'map';
    this.persist();
    buzz('heavy');
    this.render();
  }

  focus(siteId) {
    this.ctx = this.ctxFor(siteId);
    this.profile.discovered[siteId] = true;
    this.goalSite = siteId;
    this.profile.lastSite = siteId;
  }

  // ---------- in-game notices (replace browser alert/confirm) ----------
  toast(msg, icon) {
    const id = (this._toastId = (this._toastId || 0) + 1);
    this.notice = { id, msg, icon: icon || (/terkunci/i.test(msg) ? 'lock' : 'hint') };
    buzz('light');
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

  // ---------- loading ----------
  // Every command runs behind a full-screen loading; Overclock upgrades shorten it.
  // Spends Fokus (never blocks) and slows down when tired. `opts` can override
  // the cost / duration (used by sleeping).
  withLoading(label, fn, opts = {}) {
    if (this.busy) return;
    const mods = perksFor(this.profile);
    const cost = opts.cost ?? focusCostFor(this.profile, label, mods);
    const ms = opts.ms ?? Math.round(loadMs(this.profile) * loadingMult(this.profile, mods));
    spendFocus(this.profile, cost);
    this.busy = { label, ms };
    this.render();
    setTimeout(() => { this.busy = null; fn(); }, ms);
  }

  supplyRows() {
    const h = this.h.bind(this);
    const kopi = countOf(this.profile, 'kopi');
    const price = Math.max(1, Math.round(KOPI_PRICE * (1 - perksFor(this.profile).marketDiscount)));
    return [h('div', { class: 'section-h' }, 'Warung'),
      h('div', { class: 'job' },
        h('b', {}, `Kopi Susu · punya ${kopi}`),
        h('p', { style: 'color:var(--muted);font-size:12px;margin:4px 0 8px' }, `Pulihkan Fokus +${Math.round(KOPI_FOCUS * perksFor(this.profile).kopiMult)}.`),
        h('div', { style: 'display:flex;gap:8px' },
          h('button', { class: 'act' + (kopi ? '' : ' dim'), style: 'margin:0', onclick: () => this.useKopi() }, 'MINUM'),
          h('button', { class: 'act', style: 'margin:0', onclick: () => this.buyKopi() }, `BELI ◆${price}`)))];
  }

  useKopi() {
    const mods = perksFor(this.profile);
    if (!countOf(this.profile, 'kopi')) return this.toast('Kamu tidak punya kopi.');
    if (this.profile.focus >= mods.focusMax) return this.toast('Fokus sudah penuh.');
    removeItem(this.profile, 'kopi');
    const before = this.profile.focus;
    restoreFocus(this.profile, Math.round(KOPI_FOCUS * mods.kopiMult), mods.focusMax);
    this.persist();
    this.render();
    this.toast(`Fokus +${this.profile.focus - before}. Segar lagi.`, 'hint');
  }

  buyKopi() {
    const price = Math.max(1, Math.round(KOPI_PRICE * (1 - perksFor(this.profile).marketDiscount)));
    if (this.profile.credits < price) return this.toast('Kredit tidak cukup untuk beli kopi.');
    this.profile.credits -= price;
    addItem(this.profile, 'kopi', 1);
    this.persist();
    this.render();
  }

  // ----- NPC actions -----
  doTalk(id) {
    if (!canTalk(this.profile, id)) return this.toast('Sudah ngobrol hari ini. Besok lagi.');
    this.overlay = null;
    this.withLoading('NGOBROL', () => {
      const r = talk(this.profile, id, perksFor(this.profile));
      this.persist();
      this.overlay = { kind: 'npc', id, line: r.line };
      this.render();
      const msgs = [...(r.kopi ? ['+1 Kopi Susu'] : []), ...r.notes];
      if (msgs.length) this.toast(msgs.join(' · '), 'hint');
    }, { cost: 2, ms: 700 });
  }

  doGift(id, itemId) {
    this.overlay = null;
    this.withLoading('HADIAH', () => {
      const r = gift(this.profile, id, itemId, perksFor(this.profile));
      this.persist();
      this.overlay = { kind: 'npc', id, line: r?.line };
      this.render();
      if (r?.notes.length) this.toast(r.notes.join(' · '), 'hint');
    }, { cost: 1, ms: 600 });
  }

  // Safehouse list: offers for cleared sites + today's chore for active contracts.
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
          h('b', {}, `Kontrak · ${site.title}`),
          h('p', { style: 'color:var(--muted);font-size:12px;margin:4px 0 0' },
            days ? `Tugas: sambung ke ${dev.name} lalu buka File Server. Imbalan ◆${payout(this.profile, n.id, site, perksFor(this.profile))}${days > 1 ? ` (${days} hari menumpuk)` : ''}.`
                 : '✓ Beres hari ini. Lanjut lagi besok.')));
      }
    }
    return rows.length ? [h('div', { class: 'section-h' }, 'Kontrak'), ...rows] : [];
  }

  dueNotes() {
    const h = this.h.bind(this);
    return WORLD_NODES.filter((n) => hasContract(this.profile, n.id) && pendingDays(this.profile, n.id) > 0)
      .map((n) => h('p', { style: 'color:var(--ink);font-size:13px;margin:6px 0' }, `📄 Kontrak ${siteById(n.id).title} menunggu: ◆${payout(this.profile, n.id, siteById(n.id), perksFor(this.profile))}`));
  }

  goSleep() {
    this.overlay = null;
    this.withLoading('TIDUR', () => {
      const info = sleep(this.profile, perksFor(this.profile).focusMax);
      this.persist();
      this.overlay = { kind: 'daystart', info };
      this.render();
    }, { cost: 0, ms: 1500 });
  }

  // Opening the file server on a contracted site's entry node is the daily chore.
  collectRetainer() {
    const site = this.ctx?.mission;
    if (!site || !hasContract(this.profile, site.id) || this.cur !== site.entry[0]) return null;
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
    this.toast(`Kontrak perawatan ${siteById(siteId).title} diambil. Buka file server node awalnya tiap hari.`, 'doc');
  }

  // Entering the file / service server runs LS / PS behind the loading screen.
  openPage(view, label) {
    this.withLoading(label, () => {
      this.view = view;
      const got = view === 'files' ? this.collectRetainer() : null;
      this.render();
      if (got) this.toast(`Kontrak ${got.title}: +◆${got.credits}${got.days > 1 ? ` (${got.days} hari)` : ''}${got.drop ? ` · dapat ${ITEMS[got.drop].name}` : ''}`, 'doc');
    });
  }

  // ---------- commands ----------
  runCommand(cmd, target) {
    const choosers = ['LOGIN', 'CRACK', 'DECRYPT', 'COMPARE', 'CONFIG', 'CONTROL'];
    if (choosers.includes(cmd)) { this.openChooser(cmd, target); return; }
    this.overlay = null;
    this.withLoading(cmd, () => this.finishCommand(cmd, target));
  }

  finishCommand(cmd, target) {
    const { sheet } = exec(this.ctx, cmd, target);
    buzz('light');
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
      const { sheet } = exec(this.ctx, o.cmd, o.target, value);
      buzz('light');
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
      buzz('light');
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
    if (!hasCmd(this.profile, cmd)) { this.toast('Command terkunci. Beli di Pasar.'); return; }
    const meta = CMD_META[cmd];
    const k = meta.kind;
    if (k === 'soon') { this.toast(`${cmd}: segera hadir di update berikutnya.`); return; }
    if (k === 'map') { this.overlay = null; this.view = 'map'; this.render(); return; }
    if (!this.ctx) { this.toast('Pilih node di peta dulu.'); return; }
    if (k === 'scan') { if (!this.ctx) return this.toast('Pilih node di peta dulu.'); this.overlay = null; this.runCommand('SCAN', this.cur ? { type: 'device', id: this.cur } : { type: 'rig' }); return; }
    if (k === 'disconnect') { if (!this.cur) return this.toast(notConnected('DISCONNECT')); this.overlay = null; this.runCommand('DISCONNECT', { type: 'rig' }); return; }
    if (k === 'files') { if (!this.cur) return this.toast(notConnected('FILES')); this.overlay = null; this.openPage('files', 'LS'); return; }
    if (k === 'system') { if (!this.cur) return this.toast(notConnected('SERVICES')); this.overlay = null; this.openPage('system', 'PS'); return; }
    if (k === 'controlpage') { if (!this.cur) return this.toast(notConnected('CONTROL')); this.overlay = null; this.openPage('control', 'CONTROL'); return; }
    if (k === 'search') {
      if (!this.cur) return this.toast(notConnected('SEARCH'));
      this.overlay = null; this.view = 'terminal'; this.runCommand('SEARCH', { type: 'device', id: this.cur }); return;
    }
    // target-based: device / connect / file / proc / control
    const targets = commandTargets(this.ctx, cmd);
    if (!targets.length) { this.toast(cmd === 'CONNECT' || this.cur ? (NO_TARGET[cmd] || 'Tidak ada yang bisa dilakukan di sini.') : notConnected(cmd)); return; }
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

  submitSite(ctx, endingId) {
    const node = nodeFor(ctx.mission.id);
    const first = !this.profile.cleared[ctx.mission.id];
    const mods = perksFor(this.profile);
    const res = finish(ctx, endingId, { repReward: node?.repReward || 0, creditMult: mods.creditMult, repMult: mods.repMult });
    if (first) {
      addAll(this.profile, MISSION_ITEMS[ctx.mission.id]);
      res.items = MISSION_ITEMS[ctx.mission.id] || {};
      res.notes = missionBond(this.profile, ctx.mission.id);
    }
    this.persist();
    this.overlay = { kind: 'result', res };
    buzz('heavy');
    this.render();
  }

  doBuy(itemId) {
    const r = buy(this.profile, itemId);
    if (r.ok) { this.persist(); buzz('light'); } else this.toast(r.msg);
    this.render();
  }

  resetGame() { this.profile = newProfile(); clearProfile(); this.runs = {}; this.ctx = null; this.goalSite = null; this.mapView = null; this.view = 'map'; this.intro = true; this.render(); }

  // ---------- DOM ----------
  ic(name) { return this.h('span', { class: 'ic-svg', html: iconSvg(name) }); }

  h(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v;
      else if (k === 'onclick') e.addEventListener('click', v);
      else if (k === 'html') e.innerHTML = v;
      else if (v !== null && v !== false && v !== undefined) e.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
    return e;
  }

  render() {
    const el = this.h('div', { class: 'screen' });
    if (this.intro) { el.append(this.vIntro()); this.root.replaceChildren(el); return; }
    el.append(this.statusStrip());
    const mapfull = this.view === 'map';
    const pane = this.h('div', { class: 'pane' + (this.view === 'terminal' ? ' term' : '') + (mapfull ? ' mapfull' : '') });
    pane.append(...this.viewPane());
    el.append(pane);
    if (this.showHint && this.ctx) el.append(this.h('div', { class: 'hint' }, '💡 ', this.hintText));
    el.append(this.dock());
    if (this.overlay) el.append(this.vOverlay());
    if (this.busy) el.append(this.vLoading());
    if (this.notice) el.append(this.vToast());
    this.root.replaceChildren(el);
    if (this.view === 'map') this.setupMap();
  }

  vToast() {
    const h = this.h.bind(this);
    return h('div', { class: 'toast', onclick: () => { this.notice = null; this.render(); } }, this.ic(this.notice.icon), h('span', {}, this.notice.msg));
  }

  vLoading() {
    const h = this.h.bind(this);
    return h('div', { class: 'loading' },
      h('div', { class: 'loading-box' },
        h('div', { class: 'loading-cmd' }, '> ', this.busy.label.toLowerCase(), h('span', { class: 'blink' }, '_')),
        h('div', { class: 'loading-bar' }, h('i', { style: `animation-duration:${this.busy.ms}ms` })),
        h('small', {}, 'memproses…')));
  }

  // ---------- intro ----------
  vIntro() {
    const h = this.h.bind(this);
    return h('div', { class: 'intro' },
      h('div', { class: 'intro-logo' }, 'POCKET', h('span', {}, 'HACK')),
      h('p', { class: 'intro-tag' }, `Kota ${CITY.name}. Sebuah terminal, sebuah rig, dan jaringan yang menunggu diselidiki.`),
      h('p', { class: 'intro-note' }, 'Semua jaringan, perangkat, dan celah di game ini fiktif. Ini puzzle investigasi, bukan alat peretasan nyata.'),
      h('button', { class: 'intro-go', onclick: () => { this.intro = false; this.persist(); this.render(); } }, '▸ MASUK KOTA'));
  }

  // ---------- status strip ----------
  statusStrip() {
    const h = this.h.bind(this);
    if (!this.ctx || this.view === 'map' || this.view === 'market' || this.view === 'profile') {
      return h('div', { class: 'statusbar' },
        h('span', { class: 'loc' }, '◉ ', CITY.name.toUpperCase()),
        h('span', { class: 'spacer' }),
        h('span', { class: 'day' }, `H${this.profile.day}`),
        this.focusPill(),
        h('span', { class: 'cr' }, '◆ ', String(this.profile.credits)));
    }
    if (NODE_PAGES.includes(this.view)) {
      const d = device(this.ctx.run, this.cur);
      return h('div', { class: 'statusbar' },
        h('button', { class: 'back', title: 'Kembali ke terminal', onclick: () => { this.view = 'terminal'; this.render(); } }, this.ic('back')),
        h('span', { class: 'loc' }, d.name),
        h('span', { class: 'addr' }, d.addr),
        h('span', { class: 'spacer' }),
        h('span', { class: 'lv' }, LEVEL_LABEL[d.access]),
        this.hintBtn());
    }
    const site = this.ctx.mission;
    const node = nodeFor(site.id);
    return h('div', { class: 'statusbar' },
      h('span', { class: 'loc' }, site.code, ' ', site.title),
      this.cur && h('span', { class: 'lv' }, LEVEL_LABEL[device(this.ctx.run, this.cur).access]),
      h('span', { class: 'spacer' }),
      this.focusPill(),
      h('span', { class: 'cr' }, '◆ ', String(this.profile.credits)),
      this.hintBtn());
  }

  focusPill() {
    return this.h('span', { class: 'fo ' + focusState(this.profile.focus), title: 'Fokus: ' + FOCUS_LABEL[focusState(this.profile.focus)] },
      '⚡', String(this.profile.focus));
  }

  hintBtn() {
    return this.h('button', { class: 'hintbtn' + (this.showHint ? ' on' : ''), onclick: () => this.toggleHint() },
      this.ic('hint'), !this.showHint && this.h('span', { class: 'hint-cost' }, `◆${perksFor(this.profile).hintCost}`));
  }

  // Hints cost credits; the text is fixed at the moment it is bought.
  toggleHint() {
    if (this.showHint) { this.showHint = false; this.render(); return; }
    if (!this.ctx) return this.toast('Terima misi dan pilih node dulu untuk meminta hint.');
    const cost = perksFor(this.profile).hintCost;
    if (this.profile.credits < cost) return this.toast(`Kredit tidak cukup. Hint butuh ◆ ${cost}.`);
    this.profile.credits -= cost;
    this.hintText = hint(this.ctx);
    this.showHint = true;
    this.persist();
    this.render();
  }

  // ---------- view router ----------
  viewPane() {
    if (this.view === 'market') return this.paneMarket();
    if (this.view === 'profile') return this.paneProfile();
    if (this.view === 'map') return this.paneMap();
    if (!this.ctx) return this.emptyNeedJack();
    if (this.view === 'terminal') return this.paneTerminal();
    if (this.view === 'goals') return this.paneObjectives();
    if (this.view === 'files') return this.paneFiles();
    if (this.view === 'system') return this.paneSystem();
    if (this.view === 'control') return this.paneControl();
    return this.paneMap();
  }

  emptyNeedJack() {
    const h = this.h.bind(this);
    return [h('div', { class: 'empty', style: 'margin-top:40px' },
      'Belum ada node dipilih.\nTerima sebuah misi di peta, lalu ketuk node-nya.'),
      h('button', { class: 'jackin', style: 'max-width:260px;margin:14px auto 0;display:block', onclick: () => { this.view = 'map'; this.render(); } }, '▸ KE PETA')];
  }

  // ===== unified map: city targets + (when jacked in) network nodes =====
  // One `.node` card in map-pixel coords; onclick is suppressed after a drag.
  nodeCardPx({ cls, cx, cy, icon, title, sub, st, stCls, onclick }) {
    const h = this.h.bind(this);
    return h('button', { class: 'node ' + cls, style: `left:${cx}px;top:${cy}px`,
      onclick: (e) => { if (this._dragged) { e.preventDefault(); return; } onclick(); } },
      h('div', { class: 'nm' }, this.ic(icon), title),
      sub && h('div', { class: 'ad' }, sub),
      st && h('div', { class: 'st ' + (stCls || '') }, st));
  }

  // One big pannable/zoomable open-world canvas. Every site's nodes live on it
  // at once — no jack-in. Missions are tracked in Goals, independent of the map.
  paneMap() {
    const h = this.h.bind(this);
    const inner = h('div', { class: 'map-inner', style: `width:${MAPW}px;height:${MAPH}px` });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'edge'); svg.setAttribute('width', MAPW); svg.setAttribute('height', MAPH);
    const line = (a, b, dashed) => {
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y); ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
      if (dashed) ln.setAttribute('stroke-dasharray', '4 6');
      svg.append(ln);
    };
    inner.append(svg);

    const sites = worldNodes(this.profile);
    const cards = [];
    let center = null;
    const SAFEHOUSE = { x: 750, y: 1000 };
    cards.push(this.nodeCardPx({ cls: 'node-target safehouse', cx: SAFEHOUSE.x, cy: SAFEHOUSE.y, icon: 'rig', title: 'SAFEHOUSE',
      sub: `Hari ${this.profile.day} · ${seasonName(this.profile.day)}`, st: 'ISTIRAHAT', stCls: 'a',
      onclick: () => { this.overlay = { kind: 'safehouse' }; this.render(); } }));
    for (const npc of NPCS) {
      if (!isVisible(this.profile, npc)) continue;
      const pos = npcSpot(npc, this.profile.day), lv = levelOf(npcState(this.profile, npc.id).aff);
      cards.push(this.nodeCardPx({ cls: 'node-target npc', cx: pos.x, cy: pos.y, icon: 'profile', title: npc.name, sub: npc.role,
        st: `${LEVEL_NAMES[lv]}${canTalk(this.profile, npc.id) ? ' · ●' : ''}`, stCls: canTalk(this.profile, npc.id) ? 'a' : '',
        onclick: () => { this.overlay = { kind: 'npc', id: npc.id }; this.render(); } }));
    }
    for (const n of sites) {
      const base = { x: (n.x / 100) * MAPW, y: (n.y / 100) * MAPH };
      const acc = isAccepted(this.profile, n.id), locked = n.state === 'locked', cleared = n.state === 'cleared';
      const mpos = { x: base.x, y: base.y - CLUSTER * 0.5 };   // mission node sits above its device cluster
      if (!center && !locked && !cleared) center = acc ? base : mpos;
      if (this._centerOn === n.id) center = base;
      // one node = one mission: the mission node sits at the heart of its site
      if (!cleared) cards.push(this.nodeCardPx({
        cls: 'node-target' + (locked ? ' off' : '') + (cleared ? ' done' : '') + (acc && !cleared ? ' live' : ''),
        cx: mpos.x, cy: mpos.y, icon: 'target',
        title: locked ? '???' : n.site.title,
        sub: locked ? 'sinyal lemah' : `${n.site.code} · ${n.district}`,
        st: locked ? 'TERKUNCI' : cleared ? 'SELESAI' : acc ? 'AKTIF' : 'MISI BARU',
        stCls: locked ? '' : 'a',
        onclick: () => {
          if (locked) { this.toast('Sinyal lemah. Naikkan reputasi atau beli intel untuk membuka misi ini.'); return; }
          if (acc) { this.focus(n.id); this.view = 'goals'; this.render(); return; }
          this.overlay = { kind: 'mission', id: n.id }; this.render();
        }
      }));
      if (!acc) continue;
      const ctx = this.ctxFor(n.id), run = ctx.run;
      const dpos = (d) => ({ x: base.x + ((d.x - 50) / 100) * CLUSTER, y: base.y + ((d.y - 50) / 100) * CLUSTER });
      const devs = Object.values(run.devices).filter((d) => d.discovered);
      for (const d of devs) for (const l of d.links || []) { const t = run.devices[l]; if (t?.discovered) line(dpos(d), dpos(t)); }
      if (!cleared) for (const id of n.site.entry) { const e = run.devices[id]; if (e?.discovered) line(mpos, dpos(e), true); }
      for (const d of devs) {
        const cur = run.current === d.id, p = dpos(d);
        const due = d.id === n.site.entry[0] && hasContract(this.profile, n.id) && pendingDays(this.profile, n.id) > 0;
        cards.push(this.nodeCardPx({
          cls: (cleared ? 'm-done' : 'm-active') + (cur ? ' cur' : '') + (d.online ? '' : ' off'),
          cx: p.x, cy: p.y, icon: d.kind, title: d.name, sub: d.addr,
          st: due ? `RUTIN ◆${payout(this.profile, n.id, n.site, perksFor(this.profile))}` : d.access !== 'none' ? LEVEL_LABEL[d.access] : !d.online ? 'OFFLINE' : d.statusText || 'TERLIHAT',
          stCls: due ? 'due' : d.access !== 'none' ? 'a' : d.online && !d.statusText ? '' : 'o',
          onclick: () => { this.focus(n.id); this.tapObject({ type: 'device', id: d.id }); }
        }));
      }
    }
    inner.append(...cards);
    this._mapCenter = center || { x: MAPW * 0.3, y: MAPH * 0.68 };

    const vp = h('div', { class: 'worldmap pan' }, inner,
      h('div', { class: 'zoom-btns' },
        h('button', { class: 'zoom-btn', onclick: () => this.zoomBy(1.25) }, '+'),
        h('button', { class: 'zoom-btn', onclick: () => this.zoomBy(0.8) }, '−')),
      h('div', { class: 'map-tag' }, `◉ ${CITY.name} · H${this.profile.day} · ${seasonName(this.profile.day)}`,
        perksFor(this.profile).event && h('b', { class: 'ev' }, `★ ${perksFor(this.profile).event.name}`)));
    return [vp];
  }

  applyMapT(inner) {
    if (inner && this.mapView) inner.style.transform = `translate(${this.mapView.x}px,${this.mapView.y}px) scale(${this.mapView.scale})`;
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
      const s = 0.8, c = this._mapCenter || { x: MAPW / 2, y: MAPH / 2 };
      this.mapView = { scale: s, x: r.width / 2 - c.x * s, y: r.height / 2 - c.y * s };
      this._centerOn = null;
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
    const out = [h('div', { class: 'section-h' }, `Pasar Gelap · ◆ ${this.profile.credits}`)];
    if (ev?.marketDiscount) out.push(h('div', { class: 'event-chip' }, h('b', {}, `★ ${ev.name}`), h('small', {}, ev.desc)));
    for (const item of MARKET) {
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

  paneProfile() {
    const h = this.h.bind(this);
    const rank = rankFor(this.profile.rep);
    const nxt = nextRank(this.profile.rep);
    const pct = Math.round(rankProgress(this.profile.rep) * 100);
    const cleared = Object.keys(this.profile.cleared).length;
    const out = [
      h('div', { class: 'section-h' }, 'Profil Operator'),
      h('div', { class: 'rankbox' },
        h('div', { class: 'rank-top' }, h('b', {}, rank.name), h('span', {}, `${this.profile.rep} rep`)),
        h('div', { class: 'rankbar' }, h('i', { style: `width:${pct}%` })),
        h('small', {}, nxt ? `${nxt.min - this.profile.rep} rep lagi → ${nxt.name}` : 'Rank tertinggi tercapai.')),
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', {}, String(this.profile.credits)), h('small', {}, 'kredit')),
        h('div', { class: 'stat' }, h('b', {}, `${cleared}/${WORLD_NODES.length}`), h('small', {}, 'target selesai')),
        h('div', { class: 'stat' }, h('b', {}, String((this.profile.cmds || []).length)), h('small', {}, 'command'))),
      h('div', { class: 'section-h' }, 'Tool (otomatis siap dipakai)')
    ];
    for (const t of Object.values(TOOLS)) {
      const ownd = this.profile.tools[t.id];
      out.push(h('div', { class: 'tool' + (ownd ? '' : ' locked') },
        h('div', { class: 'hd' }, h('b', {}, t.name), h('span', { class: 'cost' }, t.cmd)),
        h('p', {}, ownd ? t.desc : '🔒 Beli di Pasar.')));
    }
    out.push(h('div', { class: 'section-h' }, 'Tas'));
    const bag = Object.keys(ITEMS).filter((id) => countOf(this.profile, id) > 0);
    if (!bag.length) out.push(h('div', { class: 'empty' }, 'Tas kosong.'));
    for (const id of bag) {
      out.push(h('div', { class: 'market-row' }, h('div', { class: 'main' }, h('b', {}, `${ITEMS[id].name} ×${countOf(this.profile, id)}`), h('small', {}, ITEMS[id].desc)),
        ITEMS[id].usable && h('button', { class: 'buy', onclick: () => this.useKopi() }, 'PAKAI')));
    }
    out.push(h('div', { class: 'section-h' }, 'Kontak'));
    const known = NPCS.filter((n) => isVisible(this.profile, n));
    for (const n of known) {
      const st = npcState(this.profile, n.id), lv = levelOf(st.aff);
      out.push(h('div', { class: 'market-row' }, h('div', { class: 'main' }, h('b', {}, `${n.name} · ${LEVEL_NAMES[lv]}`), h('small', {}, n.perks[Math.max(0, lv - 1)] && lv > 0 ? n.perks[lv - 1] : n.role))));
    }
    out.push(h('div', { class: 'section-h' }, 'Arsip (file tersimpan)'));
    if (!this.profile.archive.length) out.push(h('div', { class: 'empty' }, 'Belum ada file tersimpan.'));
    for (const f of this.profile.archive) {
      out.push(h('button', { class: 'obj', onclick: () => { this.overlay = { kind: 'read', sheet: { title: f.name, content: f.content } }; this.render(); } },
        h('div', { class: 'ic' }, this.ic('doc')), h('div', { class: 'main' }, h('b', {}, f.name))));
    }
    out.push(h('button', { class: 'linklike', onclick: () => this.confirmBox('Hapus semua progres?', 'Semua kredit, rep, dan progres misi akan hilang.', 'HAPUS', () => this.resetGame()) }, 'reset progres'));
    return out;
  }

  paneObjectives() {
    const h = this.h.bind(this);
    const open = worldNodes(this.profile).filter((n) => isAccepted(this.profile, n.id));
    if (!open.length) return [this.h('div', { class: 'empty', style: 'margin-top:40px' }, 'Belum ada misi diterima.\nKetuk node misi di peta untuk menerimanya.')];
    if (!this.goalSite || !open.some((n) => n.id === this.goalSite)) this.goalSite = open[0]?.id;
    const ctx = this.ctxFor(this.goalSite);
    const tabs = h('div', { class: 'mission-tabs' });
    for (const n of open)
      tabs.append(h('button', { class: 'mission-tab' + (n.id === this.goalSite ? ' on' : ''), onclick: () => { this.goalSite = n.id; this.ctx = this.ctxFor(n.id); this.render(); } },
        n.site.code, n.state === 'cleared' && ' ✓'));
    const node = nodeFor(ctx.mission.id);
    const objs = objectives(ctx);
    const anyMain = objs.filter((o) => o.main).every((o) => o.done);
    const out = [tabs,
      h('div', { class: 'section-h' }, `${ctx.mission.title} · ${node.district} · ${DIFF_LABEL[node.difficulty]}`),
      h('div', { style: 'color:var(--muted);font-size:13px;margin-bottom:14px' }, ctx.mission.brief)];
    for (const o of objs) {
      out.push(h('div', { class: 'obj' },
        h('div', { class: 'ic', style: o.done ? 'color:var(--green);border-color:var(--green-dim)' : '' }, o.done ? '✓' : '○'),
        h('div', { class: 'main' }, h('b', { style: o.done ? 'color:var(--green)' : '' }, o.text),
          h('small', {}, o.bonus ? 'bonus' : o.main ? 'utama' : ''))));
    }
    if (anyMain) {
      out.push(h('div', { class: 'section-h', style: 'margin-top:18px' }, 'Selesaikan & serahkan'));
      const first = !this.profile.cleared[ctx.mission.id];
      for (const e of endings(ctx)) {
        const cr = first ? e.reward : Math.round(e.reward / 4);
        out.push(h('button', { class: 'card', disabled: !e.available, onclick: () => e.available && this.submitSite(ctx, e.id) },
          h('h3', {}, e.label),
          h('div', { class: 'foot' }, h('span', { class: 'reward' }, `+${cr} ◆ · +${first ? (node?.repReward || 0) : Math.round((node?.repReward || 0) / 4)} rep`))));
      }
    }
    return out;
  }

  // ===== DEVICE pages =====
  deviceHeader() {
    const h = this.h.bind(this);
    const d = device(this.ctx.run, this.cur);
    const acts = getActions(this.ctx, { type: 'device', id: d.id }).filter((a) => a.cmd !== 'CONNECT' && a.cmd !== 'INSPECT');
    return h('button', { class: 'devhead', onclick: () => this.tapObject({ type: 'device', id: d.id }) },
      h('div', { class: 'ic' }, this.ic(d.kind)),
      h('div', { class: 'main' }, h('b', {}, d.name),
        h('small', {}, acts.length ? 'perintah: ' + acts.map((a) => a.cmd).join(' · ') : 'ketuk untuk INSPECT')),
      h('div', { class: 'tag-r', style: 'color:var(--green)' }, LEVEL_LABEL[d.access]));
  }

  paneFiles() {
    const h = this.h.bind(this);
    const run = this.ctx.run;
    const d = device(run, this.cur);
    const files = visibleFiles(run, d.id);
    const out = [this.deviceHeader(), h('div', { class: 'section-h' }, `File Server · ${LEVEL_LABEL[d.access]}`),
      h('button', { class: 'obj' + (hasCmd(this.profile, 'SEARCH') ? '' : ' locked'),
        onclick: () => { if (!hasCmd(this.profile, 'SEARCH')) return this.toast('SEARCH terkunci. Beli di Pasar.'); this.view = 'terminal'; this.runCommand('SEARCH', { type: 'device', id: d.id }); } },
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
    out.push(h('div', { class: 'section-h' }, `Salinan lokal · ${run.local.length}/${LOCAL_CAP}`));
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
        h('div', { class: 'main' }, h('b', {}, c.label), h('small', {}, 'status: ' + c.state))));
    }
    return out;
  }

  // Terminal: log + big CMDS button opening the command catalog.
  paneTerminal() {
    const h = this.h.bind(this);
    const log = h('div', { class: 'log' });
    for (const e of this.ctx.run.log) log.append(h('div', { class: 'entry ' + e.t }, e.text));
    setTimeout(() => { if (log.isConnected) log.scrollTop = log.scrollHeight; }, 0);
    const bar = h('div', { class: 'termbar' },
      h('button', { class: 'cmds-btn', onclick: () => this.openCatalog() }, this.ic('terminal'), ' CMDS'),
      h('div', { class: 'term-ctx' }, this.cur ? `node: ${device(this.ctx.run, this.cur).name}` : 'belum terhubung'));
    return [log, bar];
  }

  // ---------- dock ----------
  dock() {
    const h = this.h.bind(this);
    const active = NODE_PAGES.includes(this.view) ? 'terminal' : this.view;
    const row = h('div', { class: 'dock' });
    for (const [id, label] of TABS)
      row.append(h('button', { class: 'dock-btn' + (id === active ? ' on' : ''), onclick: () => { this.view = id; this.overlay = null; this.render(); } },
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
    const sheet = h('div', { class: 'sheet', onclick: (e) => e.stopPropagation() }, h('div', { class: 'grab' }));
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
    } else if (o.kind === 'npc') {
      const npc = npcById(o.id), st = npcState(this.profile, o.id), lv = levelOf(st.aff);
      sheet.append(h('h2', {}, npc.name),
        h('p', { style: 'color:var(--muted);font-size:13px;margin:4px 0 10px' }, `${npc.role} · ${LEVEL_NAMES[lv]}${lv < AFF_STEPS.length - 1 ? ` (${st.aff}/${AFF_STEPS[lv + 1]})` : ''}`),
        h('div', { class: 'rankbar' }, h('i', { style: `width:${Math.round(levelProgress(st.aff) * 100)}%` })),
        h('div', { class: 'npc-line' }, `“${o.line || npc.lines[lv][0]}”`),
        h('button', { class: 'jackin' + (canTalk(this.profile, o.id) ? '' : ' off'), onclick: () => this.doTalk(o.id) },
          canTalk(this.profile, o.id) ? '▸ NGOBROL · ⚡2' : 'Sudah ngobrol hari ini'),
        h('button', { class: 'act' + (canGift(this.profile, o.id) ? '' : ' dim'), onclick: () => {
          if (!canGift(this.profile, o.id)) return this.toast('Sudah memberi hadiah hari ini.');
          this.overlay = { kind: 'gift', id: o.id }; this.render(); } }, canGift(this.profile, o.id) ? 'BERI HADIAH' : 'Sudah memberi hadiah hari ini'),
        h('div', { class: 'section-h', style: 'margin-top:14px' }, 'Keuntungan'),
        ...npc.perks.map((t, i) => h('div', { class: 'perk' + (lv > i ? ' on' : '') }, h('b', {}, LEVEL_NAMES[i + 1]), h('span', {}, t))),
        h('button', { class: 'act dim', onclick: close }, 'TUTUP'));
    } else if (o.kind === 'gift') {
      const npc = npcById(o.id);
      sheet.append(h('h2', {}, `Hadiah untuk ${npc.name}`),
        h('p', { style: 'color:var(--muted);font-size:12px;margin:4px 0 10px' }, `Favoritnya: ${ITEMS[npc.likes].name}`));
      const have = Object.keys(ITEMS).filter((id) => countOf(this.profile, id) > 0);
      if (!have.length) sheet.append(h('div', { class: 'empty' }, 'Tasmu kosong. Selesaikan misi atau kerjakan kontrak untuk dapat barang.'));
      for (const id of have)
        sheet.append(h('button', { class: 'opt', onclick: () => this.doGift(o.id, id) },
          `${ITEMS[id].name} ×${countOf(this.profile, id)}`, id === npc.likes && h('small', {}, '♥ favorit')));
      sheet.append(h('button', { class: 'act dim', onclick: () => { this.overlay = { kind: 'npc', id: o.id }; this.render(); } }, 'KEMBALI'));
    } else if (o.kind === 'safehouse') {
      const ev = perksFor(this.profile).event;
      sheet.append(h('h2', {}, 'Safehouse'),
        h('p', { style: 'color:var(--muted);font-size:13px;margin:4px 0 10px' }, `Hari ${this.profile.day} · Musim ${seasonName(this.profile.day)}`),
        ev && h('div', { class: 'event-chip' }, h('b', {}, ev.name), h('small', {}, ev.desc)),
        eventFor(this.profile.day + 1) && h('p', { style: 'color:var(--muted);font-size:12px;margin:0 0 10px' }, `Besok: ★ ${eventFor(this.profile.day + 1).name}`),
        h('div', { class: 'focus-box' },
          h('div', { class: 'focus-top' }, h('b', {}, `Fokus ${this.profile.focus}`), h('span', { class: 'fo ' + focusState(this.profile.focus) }, FOCUS_LABEL[focusState(this.profile.focus)])),
          h('div', { class: 'rankbar' }, h('i', { style: `width:${Math.min(100, this.profile.focus)}%` })),
          h('small', {}, 'Makin lelah, aksi makin mahal dan loading makin lama. Tidur memulihkan Fokus.')),
        ...this.supplyRows(),
        ...this.contractRows(),
        h('button', { class: 'jackin', onclick: () => this.goSleep() }, '▸ TIDUR · hari berikutnya'),
        h('button', { class: 'act dim', onclick: close }, 'TUTUP'));
    } else if (o.kind === 'daystart') {
      const i = o.info;
      sheet.append(h('h2', {}, `Hari ${i.day}`),
        h('p', { style: 'color:var(--muted);font-size:13px;margin:4px 0 10px' }, `Musim ${i.season} · Fokus pulih penuh`),
        i.event && h('div', { class: 'event-chip' }, h('b', {}, i.event.name), h('small', {}, i.event.desc)),
        ...this.dueNotes(),
        h('button', { class: 'act', onclick: close }, 'MULAI HARI'));
    } else if (o.kind === 'confirm') {
      sheet.append(h('h2', {}, o.title), h('p', { style: 'color:var(--muted);font-size:13px;margin:6px 0 12px' }, o.text),
        h('button', { class: 'act danger', onclick: () => { this.overlay = null; o.onOk(); } }, o.okLabel),
        h('button', { class: 'act dim', onclick: close }, 'BATAL'));
    } else if (o.kind === 'mission') {
      const n = nodeFor(o.id);
      sheet.append(
        h('div', { class: 'code', style: 'color:var(--green);font-size:12px;font-family:var(--mono)' }, n.site.code, ' · ', n.district, ' · ', DIFF_LABEL[n.difficulty]),
        h('h2', {}, n.site.title),
        h('p', { style: 'color:var(--muted);font-size:13px;margin:6px 0 2px' }, n.site.client),
        h('p', { style: 'color:var(--ink);font-size:13px;margin:8px 0' }, n.site.brief),
        h('div', { style: 'display:flex;align-items:center;gap:10px;margin:8px 0' },
          h('span', { style: 'color:var(--amber);font-weight:600;margin-left:auto' }, `+${n.site.reward} ◆ · +${n.repReward} rep`)),
        h('button', { class: 'jackin', onclick: () => this.acceptMission(n.id) }, '▸ TERIMA MISI'),
        h('button', { class: 'act dim', onclick: close }, 'NANTI'));
    } else if (o.kind === 'catalog') {
      if (!o.group) {
        sheet.append(h('h2', {}, 'Command'));
        const grid = h('div', { class: 'cat-grid' });
        for (const g of GROUPS) {
          const cmds = groupCommands(g.id);
          const avail = cmds.filter((c) => hasCmd(this.profile, c)).length;
          grid.append(h('button', { class: 'cat-group-btn', onclick: () => { o.group = g.id; this.render(); } },
            h('b', {}, g.name),
            h('small', {}, `${avail}/${cmds.length} command`)));
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
            onclick: () => { if (locked) { this.toast('Terkunci. Beli di Pasar.'); return; } this.runCatalog(cmd); } },
            h('b', {}, cmd),
            locked ? h('span', { class: 'cat-lock' }, this.ic('lock')) : h('small', {}, CMD_META[cmd].desc)));
        }
        sheet.append(grid, h('button', { class: 'act dim', onclick: close }, 'TUTUP'));
      }
    } else if (o.kind === 'param') {
      sheet.append(h('h2', {}, o.cmd), h('p', { style: 'color:var(--muted);font-size:12px;margin:0 0 10px' }, 'Pilih sasaran:'));
      for (const t of o.targets) {
        sheet.append(h('button', { class: 'cmd-row' + (t.enabled ? '' : ' off'),
          onclick: () => { if (!t.enabled) return; this.runFromCatalog(o.cmd, t.target); } },
          h('b', {}, t.label), t.enabled ? h('span', {}, '▸') : h('small', { class: 'reason' }, t.reason)));
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
      sheet.append(h('h2', { style: 'color:var(--green)' }, 'TARGET SELESAI'),
        h('div', { class: 'file' }, o.res.text),
        h('p', { style: 'color:var(--amber)' }, `+${o.res.reward} ◆   ·   +${o.res.rep} rep`),
        o.res.unlocked.length && h('p', { style: 'color:var(--cyan)' }, 'Tool terbuka: ' + o.res.unlocked.map((t) => TOOLS[t].name).join(', ')),
        Object.keys(o.res.items || {}).length && h('p', { style: 'color:var(--ink)' }, 'Dapat: ' + Object.entries(o.res.items).map(([id, n]) => `${ITEMS[id].name} ×${n}`).join(', ')),
        ...(o.res.notes || []).map((t) => h('p', { style: 'color:var(--cyan);font-size:12px' }, t)),
        h('p', { style: 'color:var(--muted);font-size:12px' }, 'Klien menawarkan kontrak perawatan harian — cek di Safehouse.'),
        h('button', { class: 'act', onclick: close }, 'LANJUT'));
    }
    return h('div', { class: 'overlay', onclick: close }, sheet);
  }
}
