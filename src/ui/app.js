import { SITES, siteById } from '../sites/index.js';
import { newProfile, newRun, TOOLS, LEVEL_LABEL, atLeast, device, visibleFiles } from '../engine/core.js';
import { getActions, getChoices, exec, objectives, hint, endings, finish, LOCAL_CAP } from '../engine/actions.js';
import { CITY, WORLD_NODES, DIFF_LABEL, nodeFor, worldNodes, nodeState, availableJobs } from '../game/world.js';
import { MARKET, buy, canBuy, owned } from '../game/market.js';
import { rankFor, nextRank, rankProgress } from '../game/progression.js';
import { saveProfile, loadProfile, clearProfile, buzz } from '../platform/storage.js';

const KIND_ICON = { Router: '📶', Printer: '🖨️', Gateway: '🚪', Workstation: '💻', Server: '🗄️', NAS: '💾' };

export class App {
  constructor(root) {
    this.root = root;
    this.profile = newProfile();
    this.ctx = null;                 // null = world scene
    this.worldTab = 'map';
    this.netTab = 'net';
    this.devTab = 'term';
    this.sel = { type: 'rig' };
    this.selSite = null;             // highlighted site on world map
    this.showHint = false;
    this.overlay = null;
    this.intro = false;
  }

  async boot() {
    const saved = await loadProfile();
    if (saved) this.profile = { ...newProfile(), ...saved };
    this.intro = !saved;             // first run → show intro
    this.render();
  }

  persist() { saveProfile(this.profile); }

  get scene() {
    if (!this.ctx) return 'world';
    return this.ctx.run.current ? 'device' : 'net';
  }

  // ---------- scene transitions ----------
  jackIn(siteId) {
    const site = siteById(siteId);
    if (!site) return;
    this.profile.discovered[siteId] = true;
    this.ctx = { mission: site, run: newRun(site), profile: this.profile };
    this.netTab = 'net';
    this.sel = { type: 'rig' };
    this.showHint = false;
    this.overlay = null;
    buzz('heavy');
    this.render();
  }

  jackOut() {
    this.ctx = null;
    this.worldTab = 'map';
    this.overlay = null;
    this.persist();
    this.render();
  }

  // ---------- commands ----------
  runCommand(cmd, target) {
    const choosers = ['LOGIN', 'CRACK', 'DECRYPT', 'COMPARE', 'CONFIG', 'CONTROL'];
    if (choosers.includes(cmd)) { this.openChooser(cmd, target); return; }
    const prevInside = !!this.ctx.run.current;
    const { sheet } = exec(this.ctx, cmd, target);
    buzz('light');
    // CONNECT/DISCONNECT change scene → set a sensible default tab
    if (!prevInside && this.ctx.run.current) { this.devTab = 'term'; this.sel = { type: 'device', id: this.ctx.run.current }; }
    if (prevInside && !this.ctx.run.current) { this.netTab = 'net'; this.sel = { type: 'rig' }; }
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

  // open the full command sheet for a tapped object
  tapObject(target) {
    this.sel = target;
    const acts = getActions(this.ctx, target);
    this.overlay = { kind: 'actions', target, acts };
    this.render();
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
    if (r.ok) { this.persist(); buzz('light'); } else { alert(r.msg); }
    this.render();
  }

  resetGame() { this.profile = newProfile(); clearProfile(); this.ctx = null; this.intro = true; this.render(); }

  // ---------- DOM helper ----------
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

  // ---------- render root ----------
  render() {
    const el = this.h('div', { class: 'screen' });
    if (this.intro) { el.append(this.vIntro()); this.root.replaceChildren(el); return; }
    el.append(this.statusStrip());
    const pane = this.h('div', { class: 'pane' + (this.curTab() === 'term' ? ' term' : '') });
    pane.append(...this.currentPane());
    el.append(pane);
    if (this.showHint && this.ctx) el.append(this.h('div', { class: 'hint' }, '💡 ', hint(this.ctx)));
    el.append(this.dock());
    if (this.overlay) el.append(this.vOverlay());
    this.root.replaceChildren(el);
  }

  curTab() {
    return this.scene === 'world' ? this.worldTab : this.scene === 'net' ? this.netTab : this.devTab;
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
    if (this.scene === 'world') {
      const rank = rankFor(this.profile.rep);
      return h('div', { class: 'statusbar' },
        h('span', { class: 'loc' }, '◉ ', CITY.name.toUpperCase()),
        h('span', { class: 'spacer' }),
        h('span', { class: 'cr' }, '◈ ', String(this.profile.credits)),
        h('span', { class: 'rk' }, rank.name));
    }
    const site = this.ctx.mission;
    if (this.scene === 'net') {
      const node = nodeFor(site.id);
      return h('div', { class: 'statusbar' },
        h('button', { class: 'back', title: 'Jack out', onclick: () => this.jackOut() }, '‹'),
        h('span', { class: 'loc' }, site.code, ' ', site.title),
        h('span', { class: 'spacer' }),
        h('span', { class: 'df' }, DIFF_LABEL[node?.difficulty || 1]),
        this.hintBtn());
    }
    const d = device(this.ctx.run, this.ctx.run.current);
    return h('div', { class: 'statusbar' },
      h('button', { class: 'back', onclick: () => this.runCommand('DISCONNECT', { type: 'rig' }) }, '‹'),
      h('span', { class: 'loc' }, d.name),
      h('span', { class: 'addr' }, d.addr),
      h('span', { class: 'spacer' }),
      h('span', { class: 'lv' }, LEVEL_LABEL[d.access]),
      this.hintBtn());
  }

  hintBtn() {
    return this.h('button', { class: 'hintbtn' + (this.showHint ? ' on' : ''), onclick: () => { this.showHint = !this.showHint; this.render(); } }, '💡');
  }

  // ---------- panes ----------
  currentPane() {
    if (this.scene === 'world') {
      if (this.worldTab === 'map') return this.paneWorld();
      if (this.worldTab === 'jobs') return this.paneJobs();
      if (this.worldTab === 'market') return this.paneMarket();
      return this.paneProfile();
    }
    if (this.scene === 'net') {
      if (this.netTab === 'obj') return this.paneObjectives();
      if (this.netTab === 'term') return this.paneTerminal();
      return this.paneNet();
    }
    if (this.devTab === 'files') return this.paneFiles();
    if (this.devTab === 'sys') return this.paneSystem();
    return this.paneTerminal();
  }

  // ===== WORLD =====
  paneWorld() {
    const h = this.h.bind(this);
    const map = h('div', { class: 'worldmap' });
    for (const n of worldNodes(this.profile)) {
      const sel = this.selSite === n.id;
      const cls = 'site-pin ' + n.state + (sel ? ' sel' : '');
      map.append(h('button', { class: cls, style: `left:${n.x}%;top:${n.y}%`,
        onclick: () => { if (n.state === 'locked') { alert('Sinyal lemah. Naikkan reputasi atau beli intel untuk membuka lokasi ini.'); return; } this.selSite = n.id; this.render(); } },
        h('span', { class: 'pin-dot' }, n.state === 'cleared' ? '✓' : n.state === 'locked' ? '?' : '◉'),
        h('span', { class: 'pin-nm' }, n.state === 'locked' ? '???' : n.site.title)));
    }
    const out = [h('div', { class: 'section-h' }, 'Peta Kota — pilih target lalu JACK IN'), map];
    const n = this.selSite ? nodeFor(this.selSite) : null;
    if (n) {
      const st = nodeState(this.profile, n.id);
      out.push(h('div', { class: 'site-card' },
        h('div', { class: 'code' }, n.site.code, ' · ', n.district, ' · ', DIFF_LABEL[n.difficulty]),
        h('h3', {}, n.site.title),
        h('p', {}, n.short),
        h('div', { class: 'foot' },
          st === 'cleared' && h('span', { class: 'badge' }, '✓ selesai'),
          h('span', { class: 'reward' }, `+${n.site.reward} ◈ · +${n.repReward} rep`)),
        h('button', { class: 'jackin', onclick: () => this.jackIn(n.id) }, '▸ JACK IN')));
    } else {
      out.push(h('div', { class: 'empty' }, 'Ketuk sebuah pin di peta untuk melihat targetnya.'));
    }
    return out;
  }

  paneJobs() {
    const h = this.h.bind(this);
    const out = [h('div', { class: 'section-h' }, 'Papan Job')];
    for (const j of availableJobs(this.profile)) {
      out.push(h('button', { class: 'card', onclick: () => { this.selSite = j.siteId; this.worldTab = 'map'; this.render(); } },
        h('div', { class: 'code' }, j.code, ' · ', j.district, ' · ', DIFF_LABEL[j.difficulty]),
        h('h3', {}, j.title),
        h('div', { class: 'client' }, j.client),
        h('p', {}, j.brief),
        h('div', { class: 'foot' },
          j.done && h('span', { class: 'badge' }, '✓ selesai'),
          h('span', { class: 'reward' }, `+${j.reward} ◈ · +${j.repReward} rep`))));
    }
    return out;
  }

  paneMarket() {
    const h = this.h.bind(this);
    const out = [h('div', { class: 'section-h' }, `Pasar Gelap · ◈ ${this.profile.credits}`)];
    for (const item of MARKET) {
      const have = owned(this.profile, item);
      const c = canBuy(this.profile, item);
      out.push(h('div', { class: 'market-row' + (have ? ' owned' : '') },
        h('div', { class: 'main' }, h('b', {}, item.name), h('small', {}, item.desc)),
        have
          ? h('span', { class: 'tag-r', style: 'color:var(--green)' }, 'DIMILIKI')
          : h('button', { class: 'buy' + (c.ok ? '' : ' off'), onclick: () => c.ok ? this.doBuy(item.id) : alert(c.reason) }, `◈ ${item.cost}`)));
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
        h('div', { class: 'stat' }, h('b', {}, String(Object.values(this.profile.tools).filter(Boolean).length)), h('small', {}, 'tool dimiliki'))),
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
        h('div', { class: 'ic' }, '📄'), h('div', { class: 'main' }, h('b', {}, f.name))));
    }
    out.push(h('button', { class: 'linklike', onclick: () => confirm('Hapus semua progres?') && this.resetGame() }, 'reset progres'));
    return out;
  }

  // ===== NET =====
  paneNet() {
    const h = this.h.bind(this);
    const run = this.ctx.run;
    const devs = Object.values(run.devices).filter((d) => d.discovered);
    const map = h('div', { class: 'map' });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'edge');
    for (const d of devs) for (const l of d.links || []) {
      const t = run.devices[l];
      if (!t?.discovered) continue;
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', d.x + '%'); ln.setAttribute('y1', d.y + '%');
      ln.setAttribute('x2', t.x + '%'); ln.setAttribute('y2', t.y + '%');
      svg.append(ln);
    }
    map.append(svg);
    for (const d of devs) {
      const cur = run.current === d.id;
      map.append(h('button', { class: 'node' + (cur ? ' cur' : '') + (d.online ? '' : ' off'), style: `left:${d.x}%;top:${d.y}%`,
        onclick: () => this.tapObject({ type: 'device', id: d.id }) },
        h('div', { class: 'nm' }, (KIND_ICON[d.kind] || '🔌') + ' ' + d.name),
        h('div', { class: 'ad' }, d.addr),
        h('div', { class: 'st ' + (d.access !== 'none' ? 'a' : d.online && !d.statusText ? '' : 'o') },
          d.access !== 'none' ? LEVEL_LABEL[d.access] : !d.online ? 'OFFLINE' : d.statusText || 'TERLIHAT')));
    }
    const rigCard = h('button', { class: 'devhead rig', onclick: () => this.tapObject({ type: 'rig' }) },
      h('div', { class: 'ic' }, '📟'),
      h('div', { class: 'main' }, h('b', {}, 'Rig lokal'), h('small', {}, 'ketuk untuk SCAN jaringan')),
      h('div', { class: 'tag-r', style: 'color:var(--green)' }, 'SCAN'));
    const out = [rigCard, map];
    if (!devs.length) out.push(h('div', { class: 'empty' }, 'Belum ada perangkat.\nKetuk kartu "Rig lokal" lalu SCAN.'));
    out.push(h('div', { class: 'section-h' }, 'Perangkat ditemukan'));
    for (const d of devs) {
      const cur = run.current === d.id;
      out.push(h('button', { class: 'obj', onclick: () => this.tapObject({ type: 'device', id: d.id }) },
        h('div', { class: 'ic' }, KIND_ICON[d.kind] || '🔌'),
        h('div', { class: 'main' }, h('b', {}, d.name), h('small', {}, `${d.kind} · ${d.addr}`)),
        h('div', { class: 'tag-r' }, cur ? 'TERHUBUNG' : d.access !== 'none' ? LEVEL_LABEL[d.access] : '')));
    }
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
          h('div', { class: 'foot' }, h('span', { class: 'reward' }, `+${cr} ◈ · +${first ? (node?.repReward || 0) : Math.round((node?.repReward || 0) / 4)} rep`))));
      }
    }
    return out;
  }

  // ===== DEVICE =====
  deviceHeader() {
    const h = this.h.bind(this);
    const d = device(this.ctx.run, this.ctx.run.current);
    const acts = getActions(this.ctx, { type: 'device', id: d.id }).filter((a) => a.cmd !== 'CONNECT');
    const extra = acts.filter((a) => !['INSPECT'].includes(a.cmd)).map((a) => a.cmd);
    return h('button', { class: 'devhead', onclick: () => this.tapObject({ type: 'device', id: d.id }) },
      h('div', { class: 'ic' }, KIND_ICON[d.kind] || '🔌'),
      h('div', { class: 'main' },
        h('b', {}, d.name),
        h('small', {}, extra.length ? 'perintah: ' + extra.join(' · ') : 'INSPECT perangkat')),
      h('div', { class: 'tag-r', style: 'color:var(--green)' }, LEVEL_LABEL[d.access]));
  }

  paneFiles() {
    const h = this.h.bind(this);
    const run = this.ctx.run;
    const d = device(run, run.current);
    const files = visibleFiles(run, d.id);
    const out = [this.deviceHeader(), h('div', { class: 'section-h' }, `File · ${LEVEL_LABEL[d.access]}`)];
    if (!files.length) out.push(h('div', { class: 'empty' }, 'Tidak ada file yang bisa diakses pada level ini.'));
    for (const f of files) {
      out.push(h('button', { class: 'obj' + (f.corrupt || f.deleted || f.encrypted ? ' locked' : ''),
        onclick: () => this.tapObject({ type: 'file', device: d.id, id: f.id }) },
        h('div', { class: 'ic' }, '📄'),
        h('div', { class: 'main' }, h('b', {}, f.name),
          h('small', {}, f.deleted ? 'terhapus' : f.corrupt ? 'rusak' : f.encrypted ? 'terenkripsi' : run.read.includes(f.id) ? 'sudah dibaca' : 'belum dibaca')),
        h('div', { class: 'tag-r', style: f.noDownload ? 'color:var(--faint)' : 'color:var(--green-dim)' }, f.noDownload ? 'sistem' : '⬇')));
    }
    out.push(h('div', { class: 'section-h' }, `💾 Salinan lokal · ${run.local.length}/${LOCAL_CAP}`));
    if (!run.local.length) out.push(h('div', { class: 'empty' }, 'Belum ada file yang diunduh.\nPenyimpanan rig terbatas — pilih yang penting.'));
    for (const f of run.local) {
      out.push(h('button', { class: 'obj', onclick: () => this.tapObject({ type: 'file', local: true, id: f.id }) },
        h('div', { class: 'ic' }, '💾'),
        h('div', { class: 'main' }, h('b', {}, f.name), h('small', {}, f.encrypted ? 'terenkripsi' : 'siap dibaca')),
        h('div', { class: 'tag-r' }, 'ketuk: hapus/baca')));
    }
    return out;
  }

  paneSystem() {
    const h = this.h.bind(this);
    const d = device(this.ctx.run, this.ctx.run.current);
    const out = [this.deviceHeader()];
    out.push(h('div', { class: 'section-h' }, '⚙️ Proses & Layanan'));
    if (!d.procs?.length) out.push(h('div', { class: 'empty' }, 'Tidak ada proses pada perangkat ini.'));
    for (const p of d.procs || []) {
      out.push(h('button', { class: 'obj', onclick: () => this.tapObject({ type: 'proc', device: d.id, id: p.id }) },
        h('div', { class: 'ic' }, '⚙️'),
        h('div', { class: 'main' }, h('b', {}, p.name), h('small', {}, p.desc)),
        h('div', { class: 'tag-r', style: p.running ? 'color:var(--green)' : 'color:var(--muted)' }, p.running ? 'RUN' : 'STOP')));
    }
    if (d.controls?.length) {
      out.push(h('div', { class: 'section-h' }, '🎛️ Kontrol Perangkat'));
      for (const c of d.controls) {
        out.push(h('button', { class: 'obj', onclick: () => this.tapObject({ type: 'control', device: d.id, id: c.id }) },
          h('div', { class: 'ic' }, '🎛️'),
          h('div', { class: 'main' }, h('b', {}, c.label), h('small', {}, 'status: ' + c.state))));
      }
    }
    return out;
  }

  // Terminal tab: live log + tappable command chips (Null Byte style).
  paneTerminal() {
    const h = this.h.bind(this);
    const log = h('div', { class: 'log' });
    for (const e of this.ctx.run.log) log.append(h('div', { class: 'entry ' + e.t }, e.text));
    setTimeout(() => { if (log.isConnected) log.scrollTop = log.scrollHeight; }, 0);

    // Command chips for the current context: the connected device's own
    // commands when inside a node, or the rig's SCAN when still on the net.
    const target = this.ctx.run.current ? { type: 'device', id: this.ctx.run.current } : { type: 'rig' };
    const acts = getActions(this.ctx, target);
    const chips = h('div', { class: 'termchips' });
    for (const a of acts) {
      chips.append(h('button', { class: 'termchip' + (a.enabled ? '' : ' off'), title: a.reason,
        onclick: () => a.enabled ? this.runCommand(a.cmd, target) : alert(a.reason) }, a.cmd));
    }
    const hintRow = h('div', { class: 'term-hint' },
      this.ctx.run.current ? 'Perintah di atas untuk node ini · buka tab File / Sistem untuk aksi per-objek'
        : 'Pilih perangkat di tab Node untuk CONNECT');
    return [log, chips, hintRow];
  }

  // ---------- dock (flat tab bar) ----------
  dock() {
    const h = this.h.bind(this);
    // _exit* entries are actions, not tabs.
    const tabs = this.scene === 'world'
      ? [['map', '🗺️', 'Peta'], ['jobs', '📡', 'Job'], ['market', '🛒', 'Pasar'], ['profile', '👤', 'Profil']]
      : this.scene === 'net'
        ? [['net', '🌐', 'Node'], ['term', '📟', 'Terminal'], ['obj', '🎯', 'Misi'], ['_exitMission', '⏏', 'Keluar']]
        : [['term', '📟', 'Terminal'], ['files', '📁', 'File'], ['sys', '⚙️', 'Sistem'], ['_exitNode', '⏏', 'Keluar']];
    const active = this.curTab();
    const onTab = (id) => {
      if (id === '_exitNode') { this.runCommand('DISCONNECT', { type: 'rig' }); return; }
      if (id === '_exitMission') { this.jackOut(); return; }
      if (this.scene === 'world') this.worldTab = id;
      else if (this.scene === 'net') this.netTab = id;
      else this.devTab = id;
      this.render();
    };
    const row = h('div', { class: 'dock' });
    for (const [id, icon, label] of tabs) {
      const exit = id.startsWith('_exit');
      row.append(h('button', { class: 'dock-btn' + (id === active ? ' on' : '') + (exit ? ' exit' : ''), onclick: () => onTab(id) },
        h('span', { class: 'di' }, icon), h('span', { class: 'dl' }, label)));
    }
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
        h('p', { style: 'color:var(--amber)' }, `+${o.res.reward} ◈   ·   +${o.res.rep} rep`),
        o.res.unlocked.length && h('p', { style: 'color:var(--cyan)' }, 'Tool terbuka: ' + o.res.unlocked.map((t) => TOOLS[t].name).join(', ')),
        h('button', { class: 'act', onclick: () => this.jackOut() }, 'KEMBALI KE KOTA'));
    }
    return h('div', { class: 'overlay', onclick: close }, sheet);
  }
}
