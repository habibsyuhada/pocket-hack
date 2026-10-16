// Command catalog for the Terminal CMDS palette (Null Byte style).
// Grouped commands; each has a kind that drives how it picks a parameter.
// Ownership lives on the profile (profile.cmds). Commands used by the first
// four sites are all in DEFAULT_CMDS so they're never locked.
import { atLeast, device, visibleFiles } from './core.js';
import { getActions } from './actions.js';

export const CMD_META = {
  // Eksplorasi
  SCAN: { group: 'explore', kind: 'scan', desc: 'Pindai jaringan dari sini.' },
  INSPECT: { group: 'explore', kind: 'device', desc: 'Periksa perangkat terhubung.' },
  MAP: { group: 'explore', kind: 'map', desc: 'Buka peta jaringan.' },
  ROUTE: { group: 'explore', kind: 'soon', desc: 'Lewati perangkat perantara.' },
  // Akses
  CONNECT: { group: 'access', kind: 'connect', desc: 'Hubungkan ke perangkat.' },
  LOGIN: { group: 'access', kind: 'device', desc: 'Masuk dengan kredensial.' },
  CRACK: { group: 'access', kind: 'device', desc: 'Pecahkan sandi via puzzle.' },
  EXPLOIT: { group: 'access', kind: 'device', desc: 'Manfaatkan celah layanan.' },
  ELEVATE: { group: 'access', kind: 'device', desc: 'Naikkan hak akses.' },
  DISCONNECT: { group: 'access', kind: 'disconnect', desc: 'Putus dari perangkat.' },
  // File
  LS: { group: 'file', kind: 'files', desc: 'Lihat daftar file.' },
  READ: { group: 'file', kind: 'file', desc: 'Baca isi file.' },
  DOWNLOAD: { group: 'file', kind: 'file', desc: 'Salin file ke rig.' },
  RECOVER: { group: 'file', kind: 'file', desc: 'Pulihkan file rusak/terhapus.' },
  DECRYPT: { group: 'file', kind: 'file', desc: 'Buka file terenkripsi.' },
  COMPARE: { group: 'file', kind: 'file', desc: 'Bandingkan dua file.' },
  SEARCH: { group: 'file', kind: 'search', desc: 'Cari kata kunci di file node.' },
  UPLOAD: { group: 'file', kind: 'soon', desc: 'Kirim file ke sistem.' },
  EDIT: { group: 'file', kind: 'soon', desc: 'Ubah bagian file interaktif.' },
  // Sistem
  PS: { group: 'system', kind: 'system', desc: 'Lihat proses & layanan.' },
  STOP: { group: 'system', kind: 'proc', desc: 'Hentikan proses.' },
  START: { group: 'system', kind: 'proc', desc: 'Jalankan layanan.' },
  CONFIG: { group: 'system', kind: 'proc', desc: 'Atur konfigurasi layanan.' },
  RESTORE: { group: 'system', kind: 'proc', desc: 'Kembalikan konfigurasi.' },
  CONTROL: { group: 'system', kind: 'control', desc: 'Operasikan perangkat fisik.' },
  // Automation
  TOOLS: { group: 'auto', kind: 'soon', desc: 'Koleksi program milikmu.' },
  RUN: { group: 'auto', kind: 'soon', desc: 'Jalankan tool pada objek.' },
  QUEUE: { group: 'auto', kind: 'soon', desc: 'Susun urutan tindakan.' },
  SCRIPT: { group: 'auto', kind: 'soon', desc: 'Automation blok visual.' }
};

export const GROUPS = [
  { id: 'explore', name: 'Eksplorasi' },
  { id: 'access', name: 'Akses' },
  { id: 'file', name: 'File' },
  { id: 'system', name: 'Sistem' },
  { id: 'auto', name: 'Automation' }
];

// Everything the 4 sites need, plus free navigation helpers — never locked.
export const DEFAULT_CMDS = [
  'SCAN', 'INSPECT', 'MAP', 'CONNECT', 'LOGIN', 'CRACK', 'EXPLOIT', 'ELEVATE', 'DISCONNECT',
  'LS', 'READ', 'DOWNLOAD', 'RECOVER', 'DECRYPT', 'COMPARE',
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

  if (meta.kind === 'connect') {
    for (const d of Object.values(run.devices)) {
      if (!d.discovered || run.current === d.id) continue;
      const r = row({ type: 'device', id: d.id }, `${d.name} · ${d.addr}`);
      if (r) out.push(r);
    }
  } else if (meta.kind === 'device') {
    // access-level commands act on the currently connected node only
    if (cur) { const r = row({ type: 'device', id: cur }, device(run, cur).name); if (r) out.push(r); }
  } else if (meta.kind === 'file') {
    if (cur) {
      for (const f of visibleFiles(run, cur)) { const r = row({ type: 'file', device: cur, id: f.id }, f.name); if (r) out.push(r); }
      for (const f of run.local) { const r = row({ type: 'file', local: true, id: f.id }, `${f.name} (lokal)`); if (r) out.push(r); }
    }
  } else if (meta.kind === 'proc') {
    if (cur) for (const p of device(run, cur).procs || []) { const r = row({ type: 'proc', device: cur, id: p.id }, p.name); if (r) out.push(r); }
  } else if (meta.kind === 'control') {
    if (cur) for (const c of device(run, cur).controls || []) { const r = row({ type: 'control', device: cur, id: c.id }, c.label); if (r) out.push(r); }
  }
  return out;
}
