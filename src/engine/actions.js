import {
  LEVEL_LABEL, TOOLS, atLeast, applyEffects, configValid, device, findFile,
  fileVisible, lockingProc, reachable
} from './core.js';

// Contextual command model: the player picks an object, the game offers the
// commands that make sense for it. Disabled commands carry a reason so the
// player learns what is missing instead of guessing.

const A = (cmd, enabled, reason = '', choose = false) => ({ cmd, enabled, reason, choose });

function needTool(profile, id) {
  return profile.tools[id] ? '' : `Butuh tool ${TOOLS[id].name}. Beli di Pasar.`;
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
    // SCAN a node once you hold access to it (reachable from the net map).
    if (atLeast(d.access, 'guest')) out.push(A('SCAN', true));
    if (!here) {
      let why = '';
      if (!d.online) why = 'Perangkat sedang offline.';
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
        const why = !atLeast(d.access, d.elevate.from) ? `Butuh akses ${LEVEL_LABEL[d.elevate.from]} dulu.` : '';
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
      return out;
    }
    const d = device(run, target.device);
    const lock = lockingProc(d, f);
    let readWhy = '';
    if (f.deleted) readWhy = 'File terhapus. Pulihkan dengan RECOVER.';
    else if (f.corrupt) readWhy = 'File rusak. Pulihkan dengan RECOVER.';
    else if (lock) readWhy = `Dikunci proses ${lock.name}.`;
    else if (f.encrypted) readWhy = 'Terenkripsi. DOWNLOAD lalu DECRYPT di perangkatmu.';
    out.push(A('READ', !readWhy, readWhy));
    let dlWhy = '';
    if (f.deleted || f.corrupt) dlWhy = 'Pulihkan dulu.';
    else if (lock) dlWhy = `Dikunci proses ${lock.name}.`;
    else if (run.local.some((l) => l.id === f.id)) dlWhy = 'Sudah ada salinan lokal.';
    out.push(A('DOWNLOAD', !dlWhy, dlWhy));
    if (f.deleted || f.corrupt) out.push(A('RECOVER', !needTool(profile, 'mender'), needTool(profile, 'mender')));
    if (f.compare && !readWhy) out.push(A('COMPARE', true, '', true));
    return out;
  }

  if (target.type === 'proc') {
    const d = device(run, target.device);
    const p = d.procs.find((x) => x.id === target.id);
    const ctrl = atLeast(d.access, p.control || 'admin');
    const why = ctrl ? '' : `Butuh akses ${LEVEL_LABEL[p.control || 'admin']}.`;
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
    out.push(A('CONTROL', ok, `Butuh akses ${LEVEL_LABEL[c.minAccess || 'admin']}.`, true));
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
    return device(run, target.id).crack.options.map((o) => ({ value: o, label: o }));
  }
  if (cmd === 'DECRYPT') {
    const f = findFile(run, target);
    return f.keyOptions.map((k) => ({ value: k, label: k }));
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
      .map((p) => ({ value: p.f.id, label: `${p.f.name}  (${p.where})` }));
  }
  if (cmd === 'CONFIG') {
    const p = device(run, target.device).procs.find((x) => x.id === target.id);
    return Object.entries(p.config).map(([key, field]) => ({ key, label: field.label, value: field.value, options: field.options }));
  }
  if (cmd === 'CONTROL') {
    const c = device(run, target.device).controls.find((x) => x.id === target.id);
    return c.states.map((s) => ({ value: s, label: s, current: s === c.state }));
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
  out.push({ t: 'cmd', text: `${cmd.toLowerCase()} ${label}`.trim() });

  switch (cmd) {
    case 'SCAN': {
      const from = target.type === 'rig' ? null : d;
      const ids = from ? from.links || [] : mission.entry;
      const found = ids.map((id) => device(run, id));
      if (!found.length) out.push({ t: 'out', text: 'Tidak ada perangkat lain yang terlihat dari sini.' });
      for (const x of found) {
        if (!x.discovered) x.discovered = true;
        out.push({ t: 'out', text: `${x.addr.padEnd(13)} ${x.name}  ${x.online ? '' : '[OFFLINE]'}`.trimEnd() });
      }
      if (from) applyEffects(run, mission, from.onScan, out);
      break;
    }
    case 'DISCONNECT':
      run.current = null;
      out.push({ t: 'out', text: 'Kembali ke rig lokal.' });
      break;
    case 'INSPECT':
      sheet = { type: 'read', title: d.name, content: d.inspect };
      out.push({ t: 'out', text: `${d.kind} · akses kamu: ${LEVEL_LABEL[d.access]}` });
      applyEffects(run, mission, d.onInspect, out);
      break;
    case 'CONNECT': {
      run.current = d.id;
      if (d.open && !atLeast(d.access, d.open)) d.access = d.open;
      out.push({ t: 'ok', text: `Terhubung ke ${d.name}. Akses: ${LEVEL_LABEL[d.access]}.` });
      // Connecting reveals the devices this node can see (auto-scan).
      for (const id of d.links || []) {
        const x = device(run, id);
        if (x && !x.discovered) { x.discovered = true; out.push({ t: 'out', text: `Terlihat: ${x.addr.padEnd(13)} ${x.name}${x.online ? '' : ' [OFFLINE]'}`.trimEnd() }); }
      }
      applyEffects(run, mission, d.onConnect, out);
      break;
    }
    case 'LOGIN': {
      const c = mission.creds[arg];
      if (!atLeast(d.access, c.level)) d.access = c.level;
      out.push({ t: 'ok', text: `Login sebagai ${c.account}. Akses: ${LEVEL_LABEL[d.access]}.` });
      break;
    }
    case 'CRACK': {
      if (arg === d.crack.answer) {
        d.access = d.crack.level;
        out.push({ t: 'ok', text: `Kandidat "${arg}" cocok. Akses: ${LEVEL_LABEL[d.access]}.` });
        applyEffects(run, mission, d.crack.onSuccess, out);
      } else {
        out.push({ t: 'warn', text: `Kandidat "${arg}" ditolak. Cari petunjuk lain lalu coba lagi.` });
      }
      break;
    }
    case 'EXPLOIT':
      d.access = d.exploit.level;
      out.push({ t: 'ok', text: d.exploit.text });
      out.push({ t: 'ok', text: `Akses: ${LEVEL_LABEL[d.access]}.` });
      break;
    case 'ELEVATE': {
      const need = d.elevate.requires || [];
      if (need.every((f) => run.flags.includes(f))) {
        d.access = d.elevate.to;
        out.push({ t: 'ok', text: d.elevate.text });
        out.push({ t: 'ok', text: `Akses: ${LEVEL_LABEL[d.access]}.` });
      } else {
        out.push({ t: 'warn', text: d.elevate.failText });
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
      run.local.push({ ...structuredClone(f), from: d.name });
      out.push({ t: 'ok', text: `${f.name} disalin ke perangkatmu.` });
      applyEffects(run, mission, f.onDownload, out);
      break;
    }
    case 'RECOVER': {
      const f = findFile(run, target);
      f.deleted = false;
      f.corrupt = false;
      if (f.recoverTo) Object.assign(f, f.recoverTo);
      out.push({ t: 'ok', text: `${f.name} berhasil dipulihkan.` });
      break;
    }
    case 'DECRYPT': {
      const f = findFile(run, target);
      const enc = f.encrypted;
      if (arg === enc.key) {
        Object.assign(f, enc.result, { encrypted: null });
        out.push({ t: 'ok', text: `Kunci cocok. ${f.name} terbuka.` });
        applyEffects(run, mission, enc.onOpen, out);
      } else {
        out.push({ t: 'warn', text: `Kunci "${arg}" salah. Isi file tetap aman, coba simpulkan ulang.` });
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
      out.push({ t: 'ok', text: `${p.name} dihentikan.` });
      applyEffects(run, mission, p.onStop, out);
      break;
    }
    case 'START': {
      const p = d.procs.find((x) => x.id === target.id);
      if (p.config && !configValid(p)) {
        out.push({ t: 'err', text: p.failText || `${p.name} gagal menyala. Periksa konfigurasi.` });
        break;
      }
      p.running = true;
      out.push({ t: 'ok', text: `${p.name} berjalan.` });
      applyEffects(run, mission, p.onStart, out);
      break;
    }
    case 'CONFIG': {
      const p = d.procs.find((x) => x.id === target.id);
      const [key, value] = arg;
      p.config[key].value = value;
      out.push({ t: 'out', text: `${p.config[key].label} = ${value}` });
      break;
    }
    case 'RESTORE': {
      const p = d.procs.find((x) => x.id === target.id);
      p.config = structuredClone(p.snapshot);
      out.push({ t: 'out', text: `Konfigurasi ${p.name} dikembalikan ke versi tersimpan.` });
      break;
    }
    case 'CONTROL': {
      const c = d.controls.find((x) => x.id === target.id);
      c.state = arg;
      out.push({ t: 'ok', text: `${c.label}: ${arg}` });
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
  const reward = first ? e.reward : Math.round(e.reward / 4);
  const repGain = first ? (opts.repReward || 0) : Math.round((opts.repReward || 0) / 4);
  profile.credits += reward;
  profile.rep += repGain;
  profile.cleared[mission.id] = endingId;
  for (const t of e.unlockTools || []) profile.tools[t] = true;
  for (const f of run.local) {
    if (f.keep && !profile.archive.some((a) => a.id === f.id)) profile.archive.push({ id: f.id, name: f.name, content: f.content });
  }
  return { reward, rep: repGain, text: e.text, unlocked: e.unlockTools || [] };
}
