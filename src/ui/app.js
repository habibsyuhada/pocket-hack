import { MISSIONS, missionById } from '../missions/index.js';
import { newProfile, newRun, TOOLS, toggleTool, ramUsed, toolActive, LEVEL_LABEL, atLeast, device, visibleFiles, reachable } from '../engine/core.js';
import { getActions, getChoices, exec, objectives, hint, endings, finish } from '../engine/actions.js';
import { saveProfile, loadProfile, clearProfile, buzz } from '../platform/storage.js';

const ICON = { Router: '📶', Printer: '🖨️', Gateway: '🚪', Workstation: '💻', Server: '🗄️', NAS: '💾', file: '📄', proc: '⚙️', control: '🎛️' };

export class App {
  constructor(root) {
    this.root = root;
    this.profile = newProfile();
    this.view = 'menu';
    this.ctx = null;
    this.tab = 'net';
    this.sel = { type: 'rig' };
    this.showHint = false;
    this.overlay = null;
  }

  async boot() {
    const saved = await loadProfile();
    if (saved) this.profile = { ...newProfile(), ...saved };
    this.render();
  }

  persist() { saveProfile(this.profile); }

  // ---------- navigation ----------
  go(view) { this.view = view; this.overlay = null; this.render(); }

  startMission(id) {
    const m = missionById(id);
    this.ctx = { mission: m, run: newRun(m), profile: this.profile };
    this.tab = 'net';
    this.sel = { type: 'rig' };
    this.showHint = false;
    this.view = 'play';
    this.render();
  }

  // ---------- command handling ----------
  runCommand(cmd, target) {
    const choosers = ['LOGIN', 'CRACK', 'DECRYPT', 'COMPARE', 'CONFIG', 'CONTROL'];
    if (choosers.includes(cmd)) { this.openChooser(cmd, target); return; }
    const { sheet } = exec(this.ctx, cmd, target);
    buzz('light');
    if (sheet) this.overlay = { kind: 'read', sheet };
    this.afterAction(target);
  }

  afterAction(target) {
    // keep selection valid; if we connected/disconnected, reset to rig/device
    if (target?.type === 'device' && this.ctx.run.current === target.id) this.sel = { type: 'device', id: target.id };
    this.checkEnd();
    this.render();
  }

  openChooser(cmd, target) {
    const choices = getChoices(this.ctx, cmd, target);
    this.overlay = { kind: 'choose', cmd, target, choices, config: {} };
    this.render();
  }

  applyChoice(value) {
    const o = this.overlay;
    const { sheet } = exec(this.ctx, o.cmd, o.target, value);
    buzz('light');
    this.overlay = sheet ? { kind: 'read', sheet } : null;
    this.afterAction(o.target);
  }

  applyConfig() {
    const o = this.overlay;
    for (const [key, value] of Object.entries(o.config)) exec(this.ctx, 'CONFIG', o.target, [key, value]);
    buzz('light');
    this.overlay = null;
    this.afterAction(o.target);
  }

  checkEnd() {
    const main = objectives(this.ctx).filter((o) => o.main);
    if (main.length && main.every((o) => o.done) && !this.ctx.run._notified) {
      this.ctx.run._notified = true;
    }
  }

  submitMission(endingId) {
    const res = finish(this.ctx, endingId);
    this.persist();
    this.overlay = { kind: 'result', res };
    buzz('heavy');
    this.render();
  }

  resetGame() {
    this.profile = newProfile();
    clearProfile();
    this.go('menu');
  }

  // ---------- rendering ----------
  render() {
    const el = document.createElement('div');
    el.className = 'screen';
    if (this.view === 'menu') el.append(this.vMenu());
    else if (this.view === 'contracts') el.append(this.vContracts());
    else if (this.view === 'play') el.append(this.vPlay());
    if (this.overlay) el.append(this.vOverlay());
    this.root.replaceChildren(el);
  }

  h(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v;
      else if (k === 'onclick') e.addEventListener('click', v);
      else if (k === 'html') e.innerHTML = v;
      else if (v !== null && v !== false) e.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
    return e;
  }

  vMenu() {
    const h = this.h.bind(this);
    const done = Object.keys(this.profile.completed).length;
    return h('div', { class: 'menu' },
      h('h1', {}, 'POCKET'),
      h('h1', { style: 'margin-top:-14px' }, 'HACK'),
      h('p', { class: 'tag' }, 'Terminal investigasi // semua jaringan fiktif'),
      h('button', { class: 'big', onclick: () => this.go('contracts') },
        h('b', {}, '▸ KONTRAK'),
        h('small', {}, `${done}/${MISSIONS.length} selesai · ${this.profile.credits} kredit`)),
      h('button', { class: 'big', onclick: () => this.go('archive') },
        h('b', {}, '▸ MARKAS / ARSIP'),
        h('small', {}, `${this.profile.archive.length} file tersimpan`)),
      done > 0 && h('button', { class: 'linklike', onclick: () => confirm('Hapus semua progres?') && this.resetGame() }, 'reset progres')
    );
  }

  topbar(title, back) {
    const h = this.h.bind(this);
    return h('div', { class: 'topbar' },
      back && h('button', { onclick: back }, '‹'),
      h('span', { class: 'brand' }, title),
      h('span', { class: 'spacer' }),
      h('span', { class: 'chip' }, 'kredit ', h('b', {}, String(this.profile.credits))));
  }

  vContracts() {
    const h = this.h.bind(this);
    const list = h('div', { class: 'list' });
    for (const m of MISSIONS) {
      const done = this.profile.completed[m.id];
      const locked = m.id === 'm01' && !this.profile.completed['m00'] && !this.profile.tools.cipher;
      list.append(h('button', { class: 'card', onclick: () => locked ? alert('Selesaikan kontrak sebelumnya untuk membuka tool yang dibutuhkan.') : this.startMission(m.id) },
        h('div', { class: 'code' }, m.code),
        h('h3', {}, m.title),
        h('div', { class: 'client' }, m.client),
        h('p', {}, m.brief),
        h('div', { class: 'foot' },
          done && h('span', { class: 'badge' }, '✓ selesai'),
          locked && h('span', { class: 'badge', style: 'border-color:var(--amber);color:var(--amber)' }, '🔒 terkunci'),
          h('span', { class: 'reward' }, `+${m.reward} kredit`))));
    }
    return h('div', { style: 'display:flex;flex-direction:column;height:100%' },
      this.topbar('KONTRAK', () => this.go('menu')), list);
  }

  // ----- play -----
  vPlay() {
    const h = this.h.bind(this);
    const objs = objectives(this.ctx);
    const unmet = objs.some((o) => o.main && !o.done);
    const wrap = h('div', { style: 'display:flex;flex-direction:column;height:100%' });
    wrap.append(this.topbar(this.ctx.mission.code, () => confirm('Keluar dari kontrak? Progres operasi hilang.') && this.go('contracts')));

    const anyMain = objs.filter((o) => o.main).every((o) => o.done);
    wrap.append(h('div', { class: 'tabs' },
      ...[['net', 'JARINGAN'], ['dev', 'PERANGKAT'], ['term', 'TERMINAL'], ['rig', 'RIG'], ['obj', 'MISI']].map(([id, lbl]) =>
        h('button', { class: this.tab === id ? 'on' : '', onclick: () => { this.tab = id; this.render(); } },
          lbl, id === 'obj' && anyMain && h('span', { class: 'dot', style: 'background:var(--green)' })))));

    const pane = h('div', { class: 'pane' + (this.tab === 'term' ? ' term' : '') });
    if (this.tab === 'net') pane.append(...this.paneNet());
    else if (this.tab === 'dev') pane.append(...this.paneDevice());
    else if (this.tab === 'term') pane.append(this.paneTerm());
    else if (this.tab === 'rig') pane.append(...this.paneRig());
    else if (this.tab === 'obj') pane.append(...this.paneObjectives(objs, anyMain));
    wrap.append(pane);

    if (this.showHint) wrap.append(h('div', { class: 'hint' }, '💡 ', hint(this.ctx)));
    wrap.append(this.cmdBar());
    return wrap;
  }

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
      const node = h('button', { class: 'node' + (cur ? ' cur' : '') + (d.online ? '' : ' off'), style: `left:${d.x}%;top:${d.y}%`,
        onclick: () => { this.sel = { type: 'device', id: d.id }; this.tab = cur ? 'dev' : 'net'; this.render(); } },
        h('div', { class: 'nm' }, ICON[d.kind] || '🔌', ' ' + d.name),
        h('div', { class: 'ad' }, d.addr),
        h('div', { class: 'st ' + (d.access !== 'none' ? 'a' : d.online && !d.statusText ? '' : 'o') },
          d.access !== 'none' ? LEVEL_LABEL[d.access] : !d.online ? 'OFFLINE' : d.statusText || 'TERLIHAT'));
      map.append(node);
    }
    const out = [map];
    if (!devs.length) out.push(h('div', { class: 'empty' }, 'Belum ada perangkat.\nPilih RIG di bawah lalu SCAN.'));
    out.push(h('div', { class: 'section-h' }, 'Perangkat'));
    for (const d of devs) {
      const cur = run.current === d.id;
      out.push(h('button', { class: 'obj', onclick: () => { this.sel = { type: 'device', id: d.id }; if (cur) this.tab = 'dev'; this.render(); } },
        h('div', { class: 'ic' }, ICON[d.kind] || '🔌'),
        h('div', { class: 'main' }, h('b', {}, d.name), h('small', {}, `${d.kind} · ${d.addr}`)),
        h('div', { class: 'tag-r' }, cur ? 'TERHUBUNG' : d.access !== 'none' ? LEVEL_LABEL[d.access] : '')));
    }
    return out;
  }

  paneDevice() {
    const h = this.h.bind(this);
    const run = this.ctx.run;
    if (!run.current) return [h('div', { class: 'empty' }, 'Belum terhubung ke perangkat.\nDi tab JARINGAN, pilih perangkat lalu CONNECT.')];
    const d = device(run, run.current);
    const out = [h('div', { class: 'section-h' }, `${d.name} · ${LEVEL_LABEL[d.access]}`)];

    const files = visibleFiles(run, d.id);
    out.push(h('div', { class: 'section-h' }, '📁 File'));
    if (!files.length) out.push(h('div', { class: 'empty' }, 'Tidak ada file yang bisa diakses pada level ini.'));
    for (const f of files) {
      out.push(h('button', { class: 'obj' + (f.corrupt || f.deleted || f.encrypted ? ' locked' : ''),
        onclick: () => { this.sel = { type: 'file', device: d.id, id: f.id }; this.render(); } },
        h('div', { class: 'ic' }, '📄'),
        h('div', { class: 'main' }, h('b', {}, f.name),
          h('small', {}, f.deleted ? 'terhapus' : f.corrupt ? 'rusak' : f.encrypted ? 'terenkripsi' : run.read.includes(f.id) ? 'sudah dibaca' : 'belum dibaca')),
        this.selMark({ type: 'file', device: d.id, id: f.id })));
    }

    if (d.procs?.length) {
      out.push(h('div', { class: 'section-h' }, '⚙️ Proses & Layanan'));
      for (const p of d.procs) {
        out.push(h('button', { class: 'obj', onclick: () => { this.sel = { type: 'proc', device: d.id, id: p.id }; this.render(); } },
          h('div', { class: 'ic' }, '⚙️'),
          h('div', { class: 'main' }, h('b', {}, p.name), h('small', {}, p.desc)),
          h('div', { class: 'tag-r', style: p.running ? 'color:var(--green)' : 'color:var(--muted)' }, p.running ? 'RUN' : 'STOP')));
      }
    }
    if (d.controls?.length) {
      out.push(h('div', { class: 'section-h' }, '🎛️ Kontrol Perangkat'));
      for (const c of d.controls) {
        out.push(h('button', { class: 'obj', onclick: () => { this.sel = { type: 'control', device: d.id, id: c.id }; this.render(); } },
          h('div', { class: 'ic' }, '🎛️'),
          h('div', { class: 'main' }, h('b', {}, c.label), h('small', {}, 'status: ' + c.state))));
      }
    }
    return out;
  }

  selMark(t) {
    if (JSON.stringify(this.sel) === JSON.stringify(t)) return this.h('div', { class: 'tag-r', style: 'color:var(--green)' }, '●');
    return null;
  }

  paneTerm() {
    const h = this.h.bind(this);
    const log = h('div', { class: 'log' });
    for (const e of this.ctx.run.log) log.append(h('div', { class: 'entry ' + e.t }, e.text));
    setTimeout(() => { const p = this.root.querySelector('.pane'); if (p) p.scrollTop = p.scrollHeight; }, 0);
    return log;
  }

  paneRig() {
    const h = this.h.bind(this);
    const p = this.profile;
    const used = ramUsed(p);
    const slots = h('div', { class: 'slots' });
    for (let i = 0; i < p.ram; i++) slots.append(h('div', { class: 'slot' + (i < used ? ' full' : '') }));
    const out = [h('div', { class: 'ram' },
      h('div', { class: 'top' }, h('b', {}, `${used}/${p.ram}`), h('span', { style: 'color:var(--muted)' }, 'RAM terpakai')),
      slots,
      h('p', { style: 'color:var(--muted);font-size:12px;margin:10px 0 0' }, 'Aktifkan tool yang kamu perlukan. RAM membatasi jumlah tool aktif, bukan setiap tindakan.'))];
    for (const t of Object.values(TOOLS)) {
      const owned = p.tools[t.id];
      const active = toolActive(p, t.id);
      out.push(h('div', { class: 'tool' + (owned ? '' : ' locked') },
        h('div', { class: 'hd' }, h('b', {}, t.name), h('span', { class: 'cost' }, `${t.ram} RAM · ${t.cmd}`)),
        h('p', {}, owned ? t.desc : '🔒 Belum dimiliki. Buka lewat kontrak.'),
        owned && h('button', { class: active ? '' : 'off', onclick: () => { const r = toggleTool(p, t.id); if (!r.ok) alert(r.msg); this.persist(); this.render(); } },
          active ? 'AKTIF — tutup' : 'aktifkan')));
    }
    return out;
  }

  paneObjectives(objs, anyMain) {
    const h = this.h.bind(this);
    const out = [h('div', { class: 'section-h' }, 'Tujuan'),
      h('div', { style: 'color:var(--muted);font-size:13px;margin-bottom:14px' }, this.ctx.mission.brief)];
    for (const o of objs) {
      out.push(h('div', { class: 'obj' },
        h('div', { class: 'ic', style: o.done ? 'color:var(--green);border-color:var(--green-dim)' : '' }, o.done ? '✓' : '○'),
        h('div', { class: 'main' }, h('b', { style: o.done ? 'color:var(--green)' : '' }, o.text),
          h('small', {}, o.bonus ? 'bonus' : o.main ? 'utama' : ''))));
    }
    if (anyMain) {
      out.push(h('div', { class: 'section-h', style: 'margin-top:18px' }, 'Selesaikan kontrak'));
      for (const e of endings(this.ctx)) {
        out.push(h('button', { class: 'card', disabled: !e.available, onclick: () => e.available && this.submitMission(e.id) },
          h('h3', {}, e.label),
          h('div', { class: 'foot' }, h('span', { class: 'reward' }, `+${this.profile.completed[this.ctx.mission.id] ? Math.round(e.reward / 4) : e.reward} kredit`))));
      }
    }
    return out;
  }

  cmdBar() {
    const h = this.h.bind(this);
    const bar = h('div', { class: 'cmdbar' });
    bar.append(h('button', { class: 'fab', style: 'margin:0 0 10px;width:100%', onclick: () => { this.showHint = !this.showHint; this.render(); } },
      this.showHint ? '✕ sembunyikan petunjuk' : '💡 petunjuk langkah berikutnya'));
    const label = this.selLabel();
    bar.append(h('div', { class: 'sel' }, 'terpilih: ', h('b', {}, label)));
    const acts = getActions(this.ctx, this.sel);
    const grid = h('div', { class: 'cmds' });
    if (!acts.length) grid.append(h('div', { class: 'linklike' }, 'Pilih objek untuk melihat perintah.'));
    for (const a of acts) {
      grid.append(h('button', { class: 'cmdbtn', disabled: !a.enabled, title: a.reason,
        onclick: () => a.enabled ? this.runCommand(a.cmd, this.sel) : alert(a.reason) }, a.cmd));
    }
    bar.append(grid);
    return bar;
  }

  selLabel() {
    const s = this.sel;
    if (s.type === 'rig') return 'RIG lokal';
    if (s.type === 'device') return device(this.ctx.run, s.id).name;
    if (s.type === 'file') { const f = (s.local ? this.ctx.run.local : device(this.ctx.run, s.device).files).find((x) => x.id === s.id); return f?.name || s.id; }
    if (s.type === 'proc') return device(this.ctx.run, s.device).procs.find((x) => x.id === s.id)?.name;
    if (s.type === 'control') return device(this.ctx.run, s.device).controls.find((x) => x.id === s.id)?.label;
    return '—';
  }

  // ----- overlays -----
  vOverlay() {
    const h = this.h.bind(this);
    const o = this.overlay;
    const close = () => { this.overlay = null; this.render(); };
    const sheet = h('div', { class: 'sheet', onclick: (e) => e.stopPropagation() }, h('div', { class: 'grab' }));

    if (o.kind === 'read') {
      sheet.append(h('h2', {}, o.sheet.title), h('div', { class: 'file' }, o.sheet.content),
        h('button', { class: 'act', onclick: close }, 'TUTUP'));
    } else if (o.kind === 'choose') {
      sheet.append(h('h2', {}, o.cmd));
      if (o.cmd === 'CONFIG') {
        sheet.append(h('p', { class: 'reason', style: 'color:var(--muted)' }, 'Atur nilai lalu simpan. START layanan setelahnya.'));
        for (const field of o.choices) {
          o.config[field.key] = o.config[field.key] ?? field.value;
          sheet.append(h('div', { class: 'section-h' }, field.label));
          for (const opt of field.options) {
            const btn = h('button', { class: 'opt' + (o.config[field.key] === opt ? ' cur' : ''),
              onclick: () => { o.config[field.key] = opt; this.render(); } }, opt);
            sheet.append(btn);
          }
        }
        sheet.append(h('button', { class: 'act', onclick: () => this.applyConfig() }, 'SIMPAN KONFIGURASI'));
      } else {
        if (!o.choices.length) sheet.append(h('p', { class: 'reason' }, 'Belum ada pilihan. Kumpulkan petunjuk dulu.'));
        for (const c of o.choices) sheet.append(h('button', { class: 'opt' + (c.current ? ' cur' : ''),
          onclick: () => this.applyChoice(c.value) }, c.label, c.current && h('small', {}, 'status sekarang')));
        sheet.append(h('button', { class: 'act', onclick: close, style: 'border-color:var(--line);color:var(--muted)' }, 'BATAL'));
      }
    } else if (o.kind === 'result') {
      sheet.append(h('h2', { style: 'color:var(--green)' }, 'KONTRAK SELESAI'),
        h('div', { class: 'file' }, o.res.text),
        h('p', { style: 'color:var(--amber)' }, `+${o.res.reward} kredit`),
        o.res.unlocked.length && h('p', { style: 'color:var(--cyan)' }, 'Tool terbuka: ' + o.res.unlocked.map((t) => TOOLS[t].name).join(', ')),
        h('button', { class: 'act', onclick: () => this.go('contracts') }, 'KEMBALI KE KONTRAK'));
    } else if (o.kind === 'archiveFile') {
      sheet.append(h('h2', {}, o.file.name), h('div', { class: 'file' }, o.file.content), h('button', { class: 'act', onclick: close }, 'TUTUP'));
    }
    return h('div', { class: 'overlay', onclick: close }, sheet);
  }
}

// Archive view is small; handle it by reusing contracts-style list.
App.prototype.go = function go(view) {
  if (view === 'archive') { this.view = 'archive'; this.overlay = null; this.renderArchive(); return; }
  this.view = view; this.overlay = null; this.render();
};
App.prototype.renderArchive = function renderArchive() {
  const h = this.h.bind(this);
  const el = h('div', { class: 'screen' });
  const list = h('div', { class: 'list' });
  if (!this.profile.archive.length) list.append(h('div', { class: 'empty' }, 'Belum ada file tersimpan.\nFile penting yang kamu DOWNLOAD akan tersimpan di sini setelah kontrak selesai.'));
  for (const f of this.profile.archive) {
    list.append(h('button', { class: 'card', onclick: () => { this.overlay = { kind: 'archiveFile', file: f }; this.view = 'archive'; this.renderArchive(); } },
      h('h3', {}, '📄 ' + f.name)));
  }
  el.append(this.topbar('MARKAS / ARSIP', () => this.go('menu')), list);
  if (this.overlay) el.append(this.vOverlay());
  this.root.replaceChildren(el);
};
