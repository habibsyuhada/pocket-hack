// Command catalog for the Terminal CMDS palette (Null Byte style).
// Grouped commands; each has a kind that drives how it picks a parameter.
// Ownership lives on the profile (profile.cmds). Commands used by the first
// four sites are all in DEFAULT_CMDS so they're never locked.
import { atLeast, device, visibleFiles } from './core.js';
import { getActions } from './actions.js';
import { t, tr } from '../i18n/index.js';

export const CMD_META = {
  // Eksplorasi
  SCAN: { group: 'explore', kind: 'scan', desc: 'Pindai jaringan dari sini.' },
  CONNECT: { group: 'explore', kind: 'connect', desc: 'Hubungkan ke perangkat.' },
  INSPECT: { group: 'explore', kind: 'device', desc: 'Periksa perangkat terhubung.' },
  MAP: { group: 'explore', kind: 'map', desc: 'Buka peta jaringan.' },
  ROUTE: { group: 'explore', kind: 'route', desc: 'Lompat lewat relay ke jaringan lain.' },
  // Akses
  LOGIN: { group: 'access', kind: 'device', desc: 'Masuk dengan kredensial.' },
  CRACK: { group: 'access', kind: 'device', desc: 'Pecahkan sandi via puzzle.' },
  EXPLOIT: { group: 'access', kind: 'device', desc: 'Manfaatkan celah layanan.' },
  ELEVATE: { group: 'access', kind: 'device', desc: 'Naikkan hak akses.' },
  DISCONNECT: { group: 'access', kind: 'disconnect', desc: 'Putus dari perangkat.' },
  // Server: one entry command per node page; the old file/service commands
  // (LS, READ, DOWNLOAD, ..., PS, STOP, START, ...) are features inside those pages.
  FILES: { group: 'server', kind: 'files', desc: 'Buka file server node.' },
  SERVICES: { group: 'server', kind: 'system', desc: 'Buka service server node.' },
  // Fitur halaman file
  LS: { group: 'feature', kind: 'files', desc: 'Lihat daftar file.' },
  READ: { group: 'feature', kind: 'file', desc: 'Baca isi file.' },
  DOWNLOAD: { group: 'feature', kind: 'file', desc: 'Salin file ke rig.' },
  RECOVER: { group: 'feature', kind: 'file', desc: 'Pulihkan file rusak/terhapus.' },
  DECRYPT: { group: 'feature', kind: 'file', desc: 'Buka file terenkripsi.' },
  COMPARE: { group: 'feature', kind: 'file', desc: 'Bandingkan dua file.' },
  SEARCH: { group: 'feature', kind: 'search', desc: 'Cari kata kunci di file node.' },
  UPLOAD: { group: 'feature', kind: 'file', desc: 'Kirim file lokal ke node yang terhubung.' },
  EDIT: { group: 'feature', kind: 'file', desc: 'Ubah bagian file yang interaktif.' },
  TRACE: { group: 'feature', kind: 'file', desc: 'Lacak asal pesan atau koneksi (butuh tool Tracer).' },
  // Fitur halaman service
  PS: { group: 'feature', kind: 'system', desc: 'Lihat proses & layanan.' },
  STOP: { group: 'feature', kind: 'proc', desc: 'Hentikan proses.' },
  START: { group: 'feature', kind: 'proc', desc: 'Jalankan layanan.' },
  CONFIG: { group: 'feature', kind: 'proc', desc: 'Atur konfigurasi layanan.' },
  RESTORE: { group: 'feature', kind: 'proc', desc: 'Kembalikan konfigurasi.' },
  CONTROL: { group: 'server', kind: 'controlpage', desc: 'Buka halaman kontrol perangkat.' },
  // Automation
  TOOLS: { group: 'auto', kind: 'soon', desc: 'Koleksi program milikmu.' },
  RUN: { group: 'auto', kind: 'soon', desc: 'Jalankan tool pada objek.' },
  QUEUE: { group: 'auto', kind: 'soon', desc: 'Susun urutan tindakan.' },
  SCRIPT: { group: 'auto', kind: 'soon', desc: 'Automation blok visual.' }
};

export const GROUPS = [
  { id: 'explore', name: 'Eksplorasi' },
  { id: 'access', name: 'Akses' },
  { id: 'server', name: 'Server' },
  { id: 'auto', name: 'Automation' }
];

// Everything the 4 sites need, plus free navigation helpers — never locked.
export const DEFAULT_CMDS = [
  'SCAN', 'INSPECT', 'MAP', 'TRACE', 'CONNECT', 'LOGIN', 'CRACK', 'EXPLOIT', 'ELEVATE', 'DISCONNECT',
  'FILES', 'SERVICES', 'LS', 'READ', 'DOWNLOAD', 'RECOVER', 'DECRYPT', 'COMPARE',
  'PS', 'STOP', 'START', 'CONFIG', 'RESTORE', 'CONTROL'
];

export const groupCommands = (groupId) => Object.keys(CMD_META).filter((c) => CMD_META[c].group === groupId);

// Enumerate valid parameter targets for a command, reusing getActions so the
// enabled/disabled rules stay in one place.
export function commandTargets(ctx, cmd) {
  const { run } = ctx;
  const meta = CMD_META[cmd];
  const find = (target) => getActions(ctx, target).find((a) => a.cmd === cmd);
  const row = (target, label) => { const a = find(target); return a ? { target, label, enabled: a.enabled, reason: a.reason, choose: a.choose } : null; };
  const out = [];
  const cur = run.current;

  if (meta.kind === 'route') {
    if (cur) for (const id of device(run, cur).routes || []) {
      const d = run.devices[id]; if (!d) continue;
      const r = row({ type: 'device', id }, `${d.name} · ${d.addr}`); if (r) out.push(r);
    }
  } else if (meta.kind === 'connect' || meta.kind === 'ping') {
    // Only nodes wired to where you are now. Off the network, only the rig's uplink.
    const ids = new Set();
    if (cur) {
      for (const l of device(run, cur).links || []) ids.add(l);
      for (const d of Object.values(run.devices)) if (d.links?.includes(cur)) ids.add(d.id);
    } else {
      for (const e of ctx.mission.rigScan || ctx.mission.entry || []) ids.add(e);
    }
    for (const id of ids) {
      const d = run.devices[id];
      if (!d?.discovered || cur === id) continue;
      const r = row({ type: 'device', id: d.id }, `${d.name} · ${d.addr}`);
      if (r) out.push(r);
    }
  } else if (meta.kind === 'device') {
    // access-level commands act on the currently connected node only
    if (cur) { const r = row({ type: 'device', id: cur }, device(run, cur).name); if (r) out.push(r); }
  } else if (meta.kind === 'file') {
    if (cur) {
      for (const f of visibleFiles(run, cur)) { const r = row({ type: 'file', device: cur, id: f.id }, f.name); if (r) out.push(r); }
      for (const f of run.local) { const r = row({ type: 'file', local: true, id: f.id }, t('{1} (lokal)', f.name)); if (r) out.push(r); }
    }
  } else if (meta.kind === 'proc') {
    if (cur) for (const p of device(run, cur).procs || []) { const r = row({ type: 'proc', device: cur, id: p.id }, p.name); if (r) out.push(r); }
  } else if (meta.kind === 'control') {
    if (cur) for (const c of device(run, cur).controls || []) { const r = row({ type: 'control', device: cur, id: c.id }, c.label); if (r) out.push(r); }
  }
  return out;
}
