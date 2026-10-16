import { SITES, siteById } from '../sites/index.js';
import { newProfile, newRun, TOOLS, LEVEL_LABEL, atLeast, device, visibleFiles } from '../engine/core.js';
import { getActions, getChoices, exec, objectives, hint, endings, finish, LOCAL_CAP } from '../engine/actions.js';
import { CMD_META, GROUPS, groupCommands, commandTargets } from '../engine/commands.js';
import { hasCmd } from '../game/profile.js';
import { CITY, WORLD_NODES, DIFF_LABEL, nodeFor, worldNodes, nodeState } from '../game/world.js';
import { MARKET, buy, canBuy, owned } from '../game/market.js';
import { rankFor, nextRank, rankProgress } from '../game/progression.js';
import { saveProfile, loadProfile, clearProfile, buzz } from '../platform/storage.js';
import { iconSvg } from './icons.js';

const TAB_ICON = { map: 'map', terminal: 'terminal', goals: 'target', market: 'market', profile: 'profile' };
const MAPW = 900, MAPH = 1400, CLUSTER = 440; // big map canvas (px) + node cluster spread
const TABS = [['map', 'Peta'], ['terminal', 'Terminal'], ['goals', 'Goals'], ['market', 'Pasar'], ['profile', 'Profil']];

export class App {
  constructor(root) {
    this.root = root;
    this.profile = newProfile();
    this.ctx = null;                 // active target run, or null when roaming
    this.view = 'map';               // map | terminal | goals | market | profile | files | system
    this.sel = { type: 'rig' };
    this.selSite = null;
    this.showHint = false;
    this.overlay = null;
    this.intro = false;
    this.mapView = null;             // { x, y, scale } pan/zoom, lazily centered
    this._dragged = false;
  }

  async boot() {
    const saved = await loadProfile();
    if (saved) this.profile = { ...newProfile(), ...saved };
    this.intro = !saved;
    this.render();
  }

  persist() { saveProfile(this.profile); }
  get cur() { return this.ctx?.run.current || null; }

  // ---------- transitions ----------
  jackIn(siteId) {
    const site = siteById(siteId);
    if (!site) return;
    this.profile.discovered[siteId] = true;
    this.ctx = { mission: site, run: newRun(site), profile: this.profile };
    this.mapView = null;
    for (const id of site.entry) { const d = this.ctx.run.devices[id]; if (d) d.discovered = true; }
    this.view = 'map';
    this.sel = { type: 'rig' };
    this.showHint = false;
    this.overlay = null;
    buzz('heavy');
    this.render();
  }

  jackOut() {
    this.ctx = null;
    this.mapView = null;
    this.view = 'map';
    this.overlay = null;
    this.persist();
    this.render();
  }

  // ---------- commands ----------
  runCommand(cmd, target) {
    const choosers = ['LOGIN', 'CRACK', 'DECRYPT', 'COMPARE', 'CONFIG', 'CONTROL'];
    if (choosers.includes(cmd)) { this.openChooser(cmd, target); return; }
    const { sheet } = exec(this.ctx, cmd, target);
    buzz('light');
    if (cmd === 'CONNECT' && this.cur) this.sel = { type: 'device', id: this.cur };
    if (cmd === 'DISCONNECT' && (this.view === 'files' || this.view === 'system')) this.view = 'map';
    this.overlay = sheet ? { kind: 'read', sheet } : null;
    this.render();
  }

  openChooser(cmd, target) {
    this.overlay = { kind: 'choose', cmd, target, choices: getChoices(this.ctx, cmd, target), config: {} };
    this.render();
  }

  applyChoice(value) {
    const o = this.overlay;
    const { sheet } = exec(this.ctx, o.cmd, o.target, value);
    buzz('light');
    this.overlay = sheet ? { kind: 'read', sheet } : null;
    this.render();
  }

  applyConfig() {
    const o = this.overlay;
    for (const [key, value] of Object.entries(o.config)) exec(this.ctx, 'CONFIG', o.target, [key, value]);
    buzz('light');
    this.overlay = null;
    this.render();
  }

  tapObject(target) {
    this.sel = target;
    this.overlay = { kind: 'actions', target, acts: getActions(this.ctx, target) };
    this.render();
  }

  // ----- command catalog (CMDS) -----
  openCatalog() { this.overlay = { kind: 'catalog', group: null }; this.render(); }

  runCatalog(cmd) {
    if (!hasCmd(this.profile, cmd)) { alert('Command terkunci. Beli di Pasar.'); return; }
    const meta = CMD_META[cmd];
    const k = meta.kind;
    if (k === 'soon') { alert(`${cmd}: segera hadir di update berikutnya.`); return; }
    if (k === 'map') { this.overlay = null; this.view = 'map'; this.render(); return; }
    if (k === 'scan') { this.overlay = null; this.runCommand('SCAN', this.cur ? { type: 'device', id: this.cur } : { type: 'rig' }); return; }
    if (k === 'disconnect') { if (!this.cur) return alert('Belum terhubung ke node.'); this.overlay = null; this.runCommand('DISCONNECT', { type: 'rig' }); return; }
    if (k === 'files') { if (!this.cur) return alert('CONNECT ke node dulu.'); this.overlay = null; this.view = 'files'; this.render(); return; }
    if (k === 'system') { if (!this.cur) return alert('CONNECT ke node dulu.'); this.overlay = null; this.view = 'system'; this.render(); return; }
    if (k === 'search') {
      if (!this.cur) return alert('CONNECT ke node dulu.');
      this.overlay = null; this.view = 'terminal'; this.runCommand('SEARCH', { type: 'device', id: this.cur }); return;
    }
    // target-based: device / connect / file / proc / control
    const targets = commandTargets(this.ctx, cmd);
    if (!targets.length) { alert(this.cur ? `Tidak ada sasaran untuk ${cmd} di node ini.` : 'CONNECT ke node dulu.'); return; }
    if (targets.length === 1 && targets[0].enabled) { this.runFromCatalog(cmd, targets[0].target); return; }
    this.overlay = { kind: 'param', cmd, targets };
    this.render();
  }

  runFromCatalog(cmd, target) {
    const k = CMD_META[cmd]?.kind;
    if (k === 'file') this.view = 'files';
    else if (k === 'proc' || k === 'control') this.view = 'system';
    this.overlay = null;
    this.runCommand(cmd, target);
  }

  submitSite(endingId) {
    const node = nodeFor(this.ctx.mission.id);
    const res = finish(this.ctx, endingId, { repReward: node?.repReward || 0 });
    this.persist();
    this.overlay = { kind: 'result', res };
    buzz('heavy');
    this.render();
  }

  doBuy(itemId) {
    const r = buy(this.profile, itemId);
    if (r.ok) { this.persist(); buzz('light'); } else alert(r.msg);
    this.render();
  }

  resetGame() { this.profile = newProfile(); clearProfile(); this.ctx = null; this.view = 'map'; this.intro = true; this.render(); }

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
    if (this.showHint && this.ctx) el.append(this.h('div', { class: 'hint' }, '💡 ', hint(this.ctx)));
    el.append(this.dock());
    if (this.overlay) el.append(this.vOverlay());
    this.root.replaceChildren(el);
    if (this.view === 'map') this.setupMap();
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
    if (!this.ctx) {
      const rank = rankFor(this.profile.rep);
      return h('div', { class: 'statusbar' },
        h('span', { class: 'loc' }, '◉ ', CITY.name.toUpperCase()),
        h('span', { class: 'spacer' }),
        h('span', { class: 'cr' }, '◆ ', String(this.profile.credits)),
        h('span', { class: 'rk' }, rank.name));
    }
    if (this.view === 'files' || this.view === 'system') {
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
      h('span', { class: 'df' }, DIFF_LABEL[node?.difficulty || 1]),
      h('button', { class: 'jackoutbtn', title: 'Jack out', onclick: () => this.jackOut() }, this.ic('exit')),
      this.hintBtn());
  }

  hintBtn() {
    return this.h('button', { class: 'hintbtn' + (this.showHint ? ' on' : ''), onclick: () => { this.showHint = !this.showHint; this.render(); } }, this.ic('hint'));
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
    return this.paneMap();
  }

  emptyNeedJack() {
    const h = this.h.bind(this);
    return [h('div', { class: 'empty', style: 'margin-top:40px' },
      'Belum ada operasi aktif.\nBuka tab Peta, pilih target, lalu JACK IN.'),
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

  // One big pannable/zoomable canvas showing every target AND, for the active
  // target, its network nodes clustered around it — all on the same map.
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

    const targets = worldNodes(this.profile);
    const tpos = {};
    for (const n of targets) tpos[n.id] = { x: (n.x / 100) * MAPW, y: (n.y / 100) * MAPH };
    const xs = targets.map((n) => tpos[n.id].x), ys = targets.map((n) => tpos[n.id].y), pad = 90;
    this._mapBounds = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };

    // active target's nodes clustered around its pin
    let dpos = null, rigPos = null, active = null;
    if (this.ctx) {
      active = this.ctx.mission;
      const base = tpos[active.id] || { x: MAPW / 2, y: MAPH / 2 };
      const run = this.ctx.run;
      dpos = (d) => ({ x: base.x + ((d.x - 50) / 100) * CLUSTER, y: base.y + ((d.y - 50) / 100) * CLUSTER });
      rigPos = { x: base.x, y: base.y + CLUSTER * 0.66 };
      const devs = Object.values(run.devices).filter((d) => d.discovered);
      for (const d of devs) for (const l of d.links || []) { const t = run.devices[l]; if (t?.discovered) line(dpos(d), dpos(t)); }
      for (const id of active.entry) { const d = run.devices[id]; if (d?.discovered) { line(base, dpos(d), true); line(rigPos, dpos(d), true); } }
      this._mapCenter = base;
    } else {
      this._mapCenter = { x: MAPW / 2, y: MAPH * 0.55 };
    }

    // target cards (always)
    for (const n of targets) {
      const locked = n.state === 'locked', cleared = n.state === 'cleared', isActive = active && n.id === active.id;
      inner.append(this.nodeCardPx({
        cls: 'node-target' + (locked ? ' off' : '') + (cleared ? ' done' : '') + (isActive ? ' live' : ''),
        cx: tpos[n.id].x, cy: tpos[n.id].y, icon: 'target',
        title: locked ? '???' : n.site.title,
        sub: locked ? 'sinyal lemah' : n.district,
        st: isActive ? 'AKTIF' : locked ? 'TERKUNCI' : cleared ? 'SELESAI' : DIFF_LABEL[n.difficulty],
        stCls: (isActive || cleared) ? 'a' : '',
        onclick: () => {
          if (locked) { alert('Sinyal lemah. Naikkan reputasi atau beli intel untuk membuka lokasi ini.'); return; }
          if (isActive) { this.view = 'goals'; this.render(); return; }
          this.overlay = { kind: 'site', id: n.id }; this.render();
        }
      }));
    }

    // active target's device nodes + rig
    if (this.ctx) {
      const run = this.ctx.run;
      for (const d of Object.values(run.devices).filter((x) => x.discovered)) {
        const cur = run.current === d.id;
        const p = dpos(d);
        inner.append(this.nodeCardPx({
          cls: (cur ? 'cur' : '') + (d.online ? '' : ' off'),
          cx: p.x, cy: p.y, icon: d.kind, title: d.name, sub: d.addr,
          st: d.access !== 'none' ? LEVEL_LABEL[d.access] : !d.online ? 'OFFLINE' : d.statusText || 'TERLIHAT',
          stCls: d.access !== 'none' ? 'a' : d.online && !d.statusText ? '' : 'o',
          onclick: () => cur ? (this.view = 'files', this.render()) : this.tapObject({ type: 'device', id: d.id })
        }));
      }
      inner.append(this.nodeCardPx({ cls: 'rig-node', cx: rigPos.x, cy: rigPos.y, icon: 'rig', title: 'RIG', sub: 'ketuk: SCAN',
        onclick: () => this.tapObject({ type: 'rig' }) }));
    }

    const vp = h('div', { class: 'worldmap pan' }, inner,
      h('div', { class: 'zoom-btns' },
        h('button', { class: 'zoom-btn', onclick: () => this.zoomBy(1.25) }, '+'),
        h('button', { class: 'zoom-btn', onclick: () => this.zoomBy(0.8) }, '−')),
      h('div', { class: 'map-tag' }, this.ctx ? `${this.ctx.mission.code} · ${this.ctx.mission.title}` : `◉ ${CITY.name}`));
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
    this.mapView.scale = Math.max(0.45, Math.min(1.8, this.mapView.scale * f));
    this.mapView.x = mx - wx * this.mapView.scale; this.mapView.y = my - wy * this.mapView.scale;
    this.applyMapT(vp.querySelector('.map-inner'));
  }

  setupMap() {
    const vp = this.root.querySelector('.worldmap.pan'); if (!vp) return;
    const inner = vp.querySelector('.map-inner');
    if (!this.mapView) {
      const r = vp.getBoundingClientRect();
      if (this.ctx) {
        const s = 0.95, c = this._mapCenter || { x: MAPW / 2, y: MAPH / 2 };
        this.mapView = { scale: s, x: r.width / 2 - c.x * s, y: r.height / 2 - c.y * s };
      } else {
        const bnd = this._mapBounds || { x: 0, y: 0, w: MAPW, h: MAPH };
        const s = Math.max(0.45, Math.min(1.15, Math.min((r.width - 20) / bnd.w, (r.height - 20) / bnd.h)));
        const cx = bnd.x + bnd.w / 2, cy = bnd.y + bnd.h / 2;
        this.mapView = { scale: s, x: r.width / 2 - cx * s, y: r.height / 2 - cy * s };
      }
    }
    this.applyMapT(inner);
    this.bindPanZoom(vp, inner);
  }

  bindPanZoom(vp, inner) {
    const pts = new Map(); let st = null;
    const clampScale = (s) => Math.max(0.45, Math.min(1.8, s));
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const apply = () => this.applyMapT(inner);
    vp.addEventListener('pointerdown', (e) => {
      // never interfere with a press that starts on a node/button
      if (e.target.closest('.node, .zoom-btn')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this._dragged = false;
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
    const out = [h('div', { class: 'section-h' }, `Pasar Gelap · ◆ ${this.profile.credits}`)];
    for (const item of MARKET) {
      const have = owned(this.profile, item);
      const c = canBuy(this.profile, item);
      out.push(h('div', { class: 'market-row' + (have ? ' owned' : '') },
        h('div', { class: 'main' }, h('b', {}, item.name), h('small', {}, item.desc)),
        have
          ? h('span', { class: 'tag-r', style: 'color:var(--green)' }, 'DIMILIKI')
          : h('button', { class: 'buy' + (c.ok ? '' : ' off'), onclick: () => c.ok ? this.doBuy(item.id) : alert(c.reason) }, `◆ ${item.cost}`)));
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
    out.push(h('div', { class: 'section-h' }, 'Arsip (file tersimpan)'));
    if (!this.profile.archive.length) out.push(h('div', { class: 'empty' }, 'Belum ada file tersimpan.'));
    for (const f of this.profile.archive) {
      out.push(h('button', { class: 'obj', onclick: () => { this.overlay = { kind: 'read', sheet: { title: f.name, content: f.content } }; this.render(); } },
        h('div', { class: 'ic' }, this.ic('doc')), h('div', { class: 'main' }, h('b', {}, f.name))));
    }
    out.push(h('button', { class: 'linklike', onclick: () => confirm('Hapus semua progres?') && this.resetGame() }, 'reset progres'));
    return out;
  }

  paneObjectives() {
    const h = this.h.bind(this);
    const objs = objectives(this.ctx);
    const anyMain = objs.filter((o) => o.main).every((o) => o.done);
    const out = [h('div', { class: 'section-h' }, 'Tujuan'),
      h('div', { style: 'color:var(--muted);font-size:13px;margin-bottom:14px' }, this.ctx.mission.brief)];
    for (const o of objs) {
      out.push(h('div', { class: 'obj' },
        h('div', { class: 'ic', style: o.done ? 'color:var(--green);border-color:var(--green-dim)' : '' }, o.done ? '✓' : '○'),
        h('div', { class: 'main' }, h('b', { style: o.done ? 'color:var(--green)' : '' }, o.text),
          h('small', {}, o.bonus ? 'bonus' : o.main ? 'utama' : ''))));
    }
    if (anyMain) {
      out.push(h('div', { class: 'section-h', style: 'margin-top:18px' }, 'Selesaikan & serahkan'));
      const first = !this.profile.cleared[this.ctx.mission.id];
      for (const e of endings(this.ctx)) {
        const node = nodeFor(this.ctx.mission.id);
        const cr = first ? e.reward : Math.round(e.reward / 4);
        out.push(h('button', { class: 'card', disabled: !e.available, onclick: () => e.available && this.submitSite(e.id) },
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
    const out = [this.deviceHeader(), h('div', { class: 'section-h' }, `File · ${LEVEL_LABEL[d.access]}`)];
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
    const out = [this.deviceHeader(), h('div', { class: 'section-h' }, 'Proses & Layanan')];
    if (!d.procs?.length) out.push(h('div', { class: 'empty' }, 'Tidak ada proses pada perangkat ini.'));
    for (const p of d.procs || []) {
      out.push(h('button', { class: 'obj', onclick: () => this.tapObject({ type: 'proc', device: d.id, id: p.id }) },
        h('div', { class: 'ic' }, this.ic('proc')),
        h('div', { class: 'main' }, h('b', {}, p.name), h('small', {}, p.desc)),
        h('div', { class: 'tag-r', style: p.running ? 'color:var(--green)' : 'color:var(--muted)' }, p.running ? 'RUN' : 'STOP')));
    }
    if (d.controls?.length) {
      out.push(h('div', { class: 'section-h' }, 'Kontrol Perangkat'));
      for (const c of d.controls) {
        out.push(h('button', { class: 'obj', onclick: () => this.tapObject({ type: 'control', device: d.id, id: c.id }) },
          h('div', { class: 'ic' }, this.ic('control')),
          h('div', { class: 'main' }, h('b', {}, c.label), h('small', {}, 'status: ' + c.state))));
      }
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
    const active = (this.view === 'files' || this.view === 'system') ? 'terminal' : this.view;
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
    } else if (o.kind === 'site') {
      const n = nodeFor(o.id);
      const st = nodeState(this.profile, n.id);
      sheet.append(
        h('div', { class: 'code', style: 'color:var(--green);font-size:12px;font-family:var(--mono)' }, n.site.code, ' · ', n.district, ' · ', DIFF_LABEL[n.difficulty]),
        h('h2', {}, n.site.title),
        h('p', { style: 'color:var(--muted);font-size:13px;margin:6px 0 2px' }, n.site.client),
        h('p', { style: 'color:var(--ink);font-size:13px;margin:8px 0' }, n.site.brief),
        h('div', { style: 'display:flex;align-items:center;gap:10px;margin:8px 0' },
          st === 'cleared' && h('span', { class: 'badge' }, '✓ selesai'),
          h('span', { style: 'color:var(--amber);font-weight:600;margin-left:auto' }, `+${n.site.reward} ◆ · +${n.repReward} rep`)),
        h('button', { class: 'jackin', onclick: () => this.jackIn(n.id) }, '▸ JACK IN'));
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
            onclick: () => { if (locked) { alert('Terkunci. Beli di Pasar.'); return; } this.runCatalog(cmd); } },
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
        h('button', { class: 'act', onclick: () => this.jackOut() }, 'KEMBALI KE KOTA'));
    }
    return h('div', { class: 'overlay', onclick: close }, sheet);
  }
}
