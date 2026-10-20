import { t, tr } from '../i18n/index.js';
import { enterNode, leaveNode, lockSeconds } from './trace.js';
import { hasCmd } from '../game/profile.js';
import {
  LEVEL_LABEL, TOOLS, atLeast, applyEffects, configValid, device, findFile,
  fileVisible, lockingProc, reachable, visibleFiles
} from './core.js';

// Contextual command model: the player picks an object, the game offers the
// commands that make sense for it. Disabled commands carry a reason so the
// player learns what is missing instead of guessing.

const A = (cmd, enabled, reason = '', choose = false) => ({ cmd, enabled, reason, choose });

// How many files the rig can hold locally at once — forces the player to
// choose what to exfiltrate instead of grabbing everything.
export const LOCAL_CAP = 6;

const lockedCmd = (profile, cmd) => (hasCmd(profile, cmd) ? '' : t('{1} terkunci. Beli di Pasar Gelap (peta, Selatan).', cmd));

function needTool(profile, id) {
  return profile.tools[id] ? '' : t('Butuh tool {1}. Beli di Pasar Gelap (peta, Selatan).', TOOLS[id].name);
}

export function getActions(ctx, target) {
  const { run, mission, profile } = ctx;
  const out = [];

  if (target.type === 'rig') {
    out.push(A('SCAN', true));
    if (run.current) out.push(A('DISCONNECT', true));
    return out;
  }

  if (target.type === 'device') {
    const d = device(run, target.id);
    const here = run.current === d.id;
    out.push(A('INSPECT', true));
    // ROUTE: hop through the node you are on to a network that is not wired to it
    const src = run.current ? device(run, run.current) : null;
    if (src?.routes?.includes(d.id)) {
      let why = lockedCmd(profile, 'ROUTE');
      if (!why && !atLeast(src.access, src.routeAccess || 'guest')) why = t('Butuh akses {1} di {2}.', LEVEL_LABEL[src.routeAccess], src.name);
      if (!why && !d.online) why = 'Perangkat sedang offline.';
      if (!why && lockSeconds(run, d.id) > 0) why = t('{1} memblokirmu (terlacak). Tunggu {2} detik.', d.name, lockSeconds(run, d.id));
      out.push(A('ROUTE', !why, why));
    }
    // SCAN a node once you hold access to it (reachable from the net map).
    if (atLeast(d.access, 'guest')) out.push(A('SCAN', true));
    if (!here) {
      let why = '';
      if (!d.online) why = 'Perangkat sedang offline.';
      else if (lockSeconds(run, d.id) > 0) why = t('{1} memblokirmu (terlacak). Tunggu {2} detik.', d.name, lockSeconds(run, d.id));
      else if (!reachable(run, mission, d.id)) why = 'Belum ada jalur. Kuasai perangkat yang terhubung dulu.';
      out.push(A('CONNECT', !why, why));
    }
    if (here) {
      const credOk = run.creds.some((c) => mission.creds[c]?.device === d.id);
      out.push(A('LOGIN', credOk, 'Belum punya kredensial untuk perangkat ini.', true));
      if (d.crack && !atLeast(d.access, d.crack.level)) {
        out.push(A('CRACK', !needTool(profile, 'keyloom'), needTool(profile, 'keyloom'), true));
      }
      if (d.exploit && !atLeast(d.access, d.exploit.level)) {
        out.push(A('EXPLOIT', true));
      }
      if (d.elevate && d.access !== d.elevate.to) {
        const why = !atLeast(d.access, d.elevate.from) ? t('Butuh akses {1} dulu.', LEVEL_LABEL[d.elevate.from]) : '';
        out.push(A('ELEVATE', !why, why));
      }
    }
    return out;
  }

  if (target.type === 'file') {
    const f = findFile(run, target);
    if (!f) return out;
    if (target.local) {
      out.push(A('READ', !f.encrypted, 'File terenkripsi.'));
      if (f.encrypted) out.push(A('DECRYPT', !needTool(profile, 'cipher'), needTool(profile, 'cipher'), true));
      if (f.compare && !f.encrypted) out.push(A('COMPARE', true, '', true));
      if (f.trace && !run.flags.includes(`traced_${f.id}`)) {
        const why = lockedCmd(profile, 'TRACE') || needTool(profile, 'tracer');
        out.push(A('TRACE', !why, why));
      }
      const cur = run.current ? device(run, run.current) : null;
      const slot = cur?.uploads?.find((u) => u.file === f.id);
      if (slot) {
        let why = lockedCmd(profile, 'UPLOAD');
        if (!why && slot.done) why = 'Sudah terkirim.';
        if (!why && !atLeast(cur.access, slot.minAccess || 'user')) why = t('Butuh akses {1}.', LEVEL_LABEL[slot.minAccess || 'user']);
        out.push(A('UPLOAD', !why, why));
      }
      out.push(A('DELETE', true));
      return out;
    }
    const d = device(run, target.device);
    const lock = lockingProc(d, f);
    let readWhy = '';
    if (f.deleted) readWhy = 'File terhapus. Pulihkan dengan RECOVER.';
    else if (f.corrupt) readWhy = 'File rusak. Pulihkan dengan RECOVER.';
    else if (lock) readWhy = t('Dikunci proses {1}.', lock.name);
    else if (f.encrypted) readWhy = 'Terenkripsi. DOWNLOAD lalu DECRYPT di perangkatmu.';
    out.push(A('READ', !readWhy, readWhy));
    if (!f.noDownload) {
      let dlWhy = '';
      if (f.deleted || f.corrupt) dlWhy = 'Pulihkan dulu.';
      else if (lock) dlWhy = t('Dikunci proses {1}.', lock.name);
      else if (run.local.some((l) => l.id === f.id)) dlWhy = 'Sudah ada salinan lokal.';
      else if (run.local.length >= LOCAL_CAP) dlWhy = t('Penyimpanan lokal penuh ({1}/{2}). Hapus salinan dulu.', LOCAL_CAP, LOCAL_CAP);
      out.push(A('DOWNLOAD', !dlWhy, dlWhy));
    }
    if (f.deleted || f.corrupt) out.push(A('RECOVER', !needTool(profile, 'mender'), needTool(profile, 'mender')));
    if (f.compare && !readWhy) out.push(A('COMPARE', true, '', true));
    if (f.edit && !f.edited) {
      const why = lockedCmd(profile, 'EDIT') || readWhy || (atLeast(d.access, f.edit.minAccess || 'admin') ? '' : t('Butuh akses {1}.', LEVEL_LABEL[f.edit.minAccess || 'admin']));
      out.push(A('EDIT', !why, why, true));
    }
    if (f.trace && !run.flags.includes(`traced_${f.id}`)) {
      const why = lockedCmd(profile, 'TRACE') || needTool(profile, 'tracer') || readWhy;
      out.push(A('TRACE', !why, why));
    }
    return out;
  }

  if (target.type === 'proc') {
    const d = device(run, target.device);
    const p = d.procs.find((x) => x.id === target.id);
    const ctrl = atLeast(d.access, p.control || 'admin');
    const why = ctrl ? '' : t('Butuh akses {1}.', LEVEL_LABEL[p.control || 'admin']);
    if (p.running) out.push(A('STOP', ctrl && p.stoppable !== false, why || 'Proses inti, tidak boleh dihentikan.'));
    else out.push(A('START', ctrl, why));
    if (p.config) {
      out.push(A('CONFIG', ctrl && !p.running, why || 'Hentikan layanan sebelum mengubah konfigurasi.', true));
      out.push(A('RESTORE', ctrl && !p.running, why || 'Hentikan layanan dulu.'));
    }
    return out;
  }

  if (target.type === 'control') {
    const d = device(run, target.device);
    const c = d.controls.find((x) => x.id === target.id);
    const ok = atLeast(d.access, c.minAccess || 'admin');
    out.push(A('CONTROL', ok, t('Butuh akses {1}.', LEVEL_LABEL[c.minAccess || 'admin']), true));
  }
  return out;
}

// Options for commands that need a second pick (no typing on mobile).
export function getChoices(ctx, cmd, target) {
  const { run, mission } = ctx;
  if (cmd === 'LOGIN') {
    return run.creds
      .filter((c) => mission.creds[c]?.device === target.id)
      .map((c) => ({ value: c, label: mission.creds[c].label }));
  }
  if (cmd === 'CRACK') {
    return (device(run, target.id).crack?.options || []).map((o) => ({ value: o, label: o }));
  }
  if (cmd === 'DECRYPT') {
    const f = findFile(run, target);
    return (f.encrypted?.keyOptions || []).map((k) => ({ value: k, label: k }));
  }
  if (cmd === 'COMPARE') {
    const f = findFile(run, target);
    const pool = [
      ...run.local.filter((l) => !l.encrypted).map((l) => ({ ref: { local: true, id: l.id }, f: l, where: 'lokal' })),
      ...(run.current
        ? device(run, run.current).files
          .filter((x) => fileVisible(run, device(run, run.current), x) && !x.deleted && !x.corrupt && !x.encrypted)
          .map((x) => ({ ref: { device: run.current, id: x.id }, f: x, where: device(run, run.current).name }))
        : [])
    ];
    const seen = new Set([f.id]);
    return pool
      .filter((p) => p.f.compare === f.compare && !seen.has(p.f.id) && seen.add(p.f.id))
      .map((p) => ({ value: p.f.id, label: `${p.f.name}  (${tr(p.where)})` }));
  }
  if (cmd === 'EDIT') {
    const f = findFile(run, target);
    return (f.edit?.options || []).map((o) => ({ value: o, label: o }));
  }
  if (cmd === 'CONFIG') {
    const p = device(run, target.device).procs.find((x) => x.id === target.id);
    return Object.entries(p?.config || {}).map(([key, field]) => ({ key, label: field.label, value: field.value, options: field.options }));
  }
  if (cmd === 'CONTROL') {
    const c = device(run, target.device).controls.find((x) => x.id === target.id);
    return (c?.states || []).map((s) => ({ value: s, label: s, current: s === c.state }));
  }
  return [];
}

function readFile(ctx, f, out) {
  const { run, mission } = ctx;
  const sheet = { type: 'read', title: f.name, content: f.content };
  if (!run.read.includes(f.id)) {
    run.read.push(f.id);
    applyEffects(run, mission, f.onRead, out);
  }
  return sheet;
}

export function exec(ctx, cmd, target, arg) {
  const { run, mission, profile } = ctx;
  const out = [];
  let sheet = null;
  const d = target.device ? device(run, target.device) : target.type === 'device' ? device(run, target.id) : null;
  const label = target.type === 'device' ? d.name : target.type === 'rig' ? '' : (findFile(run, target)?.name || target.id);
  out.push({ t: 'cmd', text: `${cmd.toLowerCase()} ${tr(label)}`.trim() });

  switch (cmd) {
    case 'SCAN': {
      const from = target.type === 'rig' ? null : d;
      const ids = from ? from.links || [] : mission.rigScan || mission.entry;
      const found = ids.map((id) => device(run, id));
      if (!found.length) out.push({ t: 'out', text: 'Tidak ada perangkat lain yang terlihat dari sini.' });
      for (const x of found) {
        if (!x.discovered) x.discovered = true;
        out.push({ t: 'out', text: `${x.addr.padEnd(13)} ${tr(x.name)}  ${x.online ? '' : '[OFFLINE]'}`.trimEnd() });
      }
      if (from) applyEffects(run, mission, from.onScan, out);
      break;
    }
    case 'DISCONNECT':
      leaveNode(run);
      run.current = null;
      out.push({ t: 'out', text: 'Kembali ke rig lokal.' });
      break;
    case 'SEARCH': {
      const files = d ? visibleFiles(run, d.id) : [];
      if (!files.length) { out.push({ t: 'out', text: 'Tidak ada file untuk dipindai.' }); break; }
      out.push({ t: 'out', text: t('Memindai {1} file di {2}:', files.length, d.name) });
      for (const f of files) {
        const first = tr(String(f.content || '')).split('\n').find((l) => l.trim()) || t('(kosong)');
        out.push({ t: 'out', text: `  ${f.name} — ${first.slice(0, 40)}` });
      }
      break;
    }
    case 'INSPECT':
      sheet = { type: 'read', title: d.name, content: d.inspect };
      out.push({ t: 'out', text: t('{1} · akses kamu: {2}', d.kind, LEVEL_LABEL[d.access]) });
      applyEffects(run, mission, d.onInspect, out);
      if (d.sniff && profile.tools?.sniffer) {
        out.push({ t: 'ok', text: 'Sniffer menangkap lalu lintas jaringan node ini:' });
        out.push({ t: 'out', text: tr(d.sniff.text) });
        sheet = { type: 'read', title: d.name, content: `${d.inspect}\n\n— ${t('Hasil Sniffer')} —\n${d.sniff.text}` };
        applyEffects(run, mission, d.sniff.fx, out);
      }
      break;
    case 'ROUTE': {
      const via = device(run, run.current);
      run.current = d.id;
      enterNode(run, d);
      d.discovered = true;
      if (d.open && !atLeast(d.access, d.open)) d.access = d.open;
      out.push({ t: 'ok', text: t('Rute via {1} dibuka. Terhubung ke {2}. Akses: {3}.', via.name, d.name, LEVEL_LABEL[d.access]) });
      applyEffects(run, mission, d.onConnect, out);
      break;
    }
    case 'UPLOAD': {
      const cur = device(run, run.current);
      const slot = cur.uploads.find((u) => u.file === target.id);
      slot.done = true;
      out.push({ t: 'ok', text: tr(slot.text) || t('{1} terkirim ke {2}.', findFile(run, target).name, cur.name) });
      applyEffects(run, mission, slot.fx, out);
      break;
    }
    case 'EDIT': {
      const f = findFile(run, target);
      if (arg === f.edit.answer) {
        f.edited = true;
        if (f.edit.result) Object.assign(f, f.edit.result);
        out.push({ t: 'ok', text: t('{1} diperbarui: "{2}".', f.name, arg) });
        applyEffects(run, mission, f.edit.onDone, out);
      } else {
        out.push({ t: 'warn', text: t('Perubahan "{1}" tidak cocok dengan catatan. File dibiarkan seperti semula.', arg) });
      }
      break;
    }
    case 'TRACE': {
      const f = findFile(run, target);
      run.flags.push(`traced_${f.id}`);
      sheet = { type: 'read', title: `TRACE · ${f.name}`, content: f.trace.text };
      out.push({ t: 'ok', text: t('Jejak {1} berhasil dilacak.', f.name) });
      applyEffects(run, mission, f.trace.fx, out);
      break;
    }
    case 'CONNECT': {
      run.current = d.id;
      enterNode(run, d);
      if (d.open && !atLeast(d.access, d.open)) d.access = d.open;
      out.push({ t: 'ok', text: t('Terhubung ke {1}. Akses: {2}.', d.name, LEVEL_LABEL[d.access]) });
      applyEffects(run, mission, d.onConnect, out);
      break;
    }
    case 'LOGIN': {
      const c = mission.creds[arg];
      if (!atLeast(d.access, c.level)) d.access = c.level;
      out.push({ t: 'ok', text: t('Login sebagai {1}. Akses: {2}.', c.account, LEVEL_LABEL[d.access]) });
      break;
    }
    case 'CRACK': {
      if (arg === d.crack.answer) {
        d.access = d.crack.level;
        out.push({ t: 'ok', text: t('Kandidat "{1}" cocok. Akses: {2}.', arg, LEVEL_LABEL[d.access]) });
        applyEffects(run, mission, d.crack.onSuccess, out);
      } else {
        out.push({ t: 'warn', text: t('Kandidat "{1}" ditolak. Cari petunjuk lain lalu coba lagi.', arg) });
      }
      break;
    }
    case 'EXPLOIT':
      d.access = d.exploit.level;
      out.push({ t: 'ok', text: tr(d.exploit.text) });
      out.push({ t: 'ok', text: t('Akses: {1}.', LEVEL_LABEL[d.access]) });
      break;
    case 'ELEVATE': {
      const need = d.elevate.requires || [];
      if (need.every((f) => run.flags.includes(f))) {
        d.access = d.elevate.to;
        out.push({ t: 'ok', text: tr(d.elevate.text) });
        out.push({ t: 'ok', text: t('Akses: {1}.', LEVEL_LABEL[d.access]) });
      } else {
        out.push({ t: 'warn', text: tr(d.elevate.failText) });
      }
      break;
    }
    case 'READ': {
      const f = findFile(run, target);
      sheet = readFile(ctx, f, out);
      break;
    }
    case 'DOWNLOAD': {
      const f = findFile(run, target);
      if (run.local.length >= LOCAL_CAP) { out.push({ t: 'warn', text: t('Penyimpanan lokal penuh ({1}/{2}). Hapus salinan dulu.', LOCAL_CAP, LOCAL_CAP) }); break; }
      run.local.push({ ...structuredClone(f), from: d.name });
      out.push({ t: 'ok', text: t('{1} disalin ke perangkatmu ({2}/{3}).', f.name, run.local.length, LOCAL_CAP) });
      applyEffects(run, mission, f.onDownload, out);
      break;
    }
    case 'DELETE': {
      run.local = run.local.filter((l) => l.id !== target.id);
      out.push({ t: 'out', text: t('Salinan lokal dihapus ({1}/{2}).', run.local.length, LOCAL_CAP) });
      break;
    }
    case 'RECOVER': {
      const f = findFile(run, target);
      f.deleted = false;
      f.corrupt = false;
      if (f.recoverTo) Object.assign(f, f.recoverTo);
      out.push({ t: 'ok', text: t('{1} berhasil dipulihkan.', f.name) });
      break;
    }
    case 'DECRYPT': {
      const f = findFile(run, target);
      const enc = f.encrypted;
      if (arg === enc.key) {
        Object.assign(f, enc.result, { encrypted: null });
        out.push({ t: 'ok', text: t('Kunci cocok. {1} terbuka.', f.name) });
        applyEffects(run, mission, enc.onOpen, out);
      } else {
        out.push({ t: 'warn', text: t('Kunci "{1}" salah. Isi file tetap aman, coba simpulkan ulang.', arg) });
      }
      break;
    }
    case 'COMPARE': {
      const f = findFile(run, target);
      const key = [f.id, arg].sort().join('|');
      const diff = mission.diffs?.[key];
      if (diff) {
        sheet = { type: 'read', title: `COMPARE`, content: diff.text };
        applyEffects(run, mission, diff.onRead, out);
      } else {
        out.push({ t: 'out', text: 'Tidak ada perbedaan yang berarti.' });
      }
      break;
    }
    case 'STOP': {
      const p = d.procs.find((x) => x.id === target.id);
      p.running = false;
      out.push({ t: 'ok', text: t('{1} dihentikan.', p.name) });
      applyEffects(run, mission, p.onStop, out);
      break;
    }
    case 'START': {
      const p = d.procs.find((x) => x.id === target.id);
      if (p.config && !configValid(p)) {
        out.push({ t: 'err', text: tr(p.failText) || t('{1} gagal menyala. Periksa konfigurasi.', p.name) });
        break;
      }
      p.running = true;
      out.push({ t: 'ok', text: t('{1} berjalan.', p.name) });
      applyEffects(run, mission, p.onStart, out);
      break;
    }
    case 'CONFIG': {
      const p = d.procs.find((x) => x.id === target.id);
      const [key, value] = arg;
      p.config[key].value = value;
      out.push({ t: 'out', text: `${tr(p.config[key].label)} = ${value}` });
      break;
    }
    case 'RESTORE': {
      const p = d.procs.find((x) => x.id === target.id);
      p.config = structuredClone(p.snapshot);
      out.push({ t: 'out', text: t('Konfigurasi {1} dikembalikan ke versi tersimpan.', p.name) });
      break;
    }
    case 'CONTROL': {
      const c = d.controls.find((x) => x.id === target.id);
      c.state = arg;
      out.push({ t: 'ok', text: `${tr(c.label)}: ${tr(arg)}` });
      applyEffects(run, mission, c.on?.[arg], out);
      break;
    }
  }

  run.log.push(...out);
  return { out, sheet };
}

export function objectives(ctx) {
  return ctx.mission.objectives.map((o) => ({ ...o, done: o.done(ctx.run) }));
}

export function hint(ctx) {
  const h = ctx.mission.hints.find((x) => x.when(ctx.run, ctx.profile));
  return h ? h.text : 'Kamu sudah menemukan semua yang dibutuhkan. Kembali ke markas dan serahkan hasilnya.';
}

export function endings(ctx) {
  return ctx.mission.endings.map((e) => ({ ...e, available: e.requires(ctx.run) }));
}

export function finish(ctx, endingId, opts = {}) {
  const { run, mission, profile } = ctx;
  const e = mission.endings.find((x) => x.id === endingId);
  run.ended = endingId;
  const first = !profile.cleared[mission.id];
  const reward = Math.round((first ? e.reward : Math.round(e.reward / 4)) * (opts.creditMult || 1));
  const repGain = Math.round((first ? (opts.repReward || 0) : Math.round((opts.repReward || 0) / 4)) * (opts.repMult || 1));
  profile.credits += reward;
  profile.rep += repGain;
  profile.cleared[mission.id] = endingId;
  for (const t of e.unlockTools || []) profile.tools[t] = true;
  for (const f of run.local) {
    if (f.keep && !profile.archive.some((a) => a.id === f.id)) profile.archive.push({ id: f.id, name: f.name, content: f.content });
  }
  return { reward, rep: repGain, text: e.text, unlocked: e.unlockTools || [] };
}
