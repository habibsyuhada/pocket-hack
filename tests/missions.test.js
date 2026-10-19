import { describe, it, expect } from 'vitest';
import { newProfile, newRun, device } from '../src/engine/core.js';
import { exec, finish } from '../src/engine/actions.js';
import { CITY, START_NODES } from '../src/city/index.js';
import { SITES } from '../src/sites/index.js';

const mission = (id) => SITES.find((s) => s.id === id);

// A fresh game: shared city run, only the starting hotspot known.
function game() {
  const profile = newProfile();
  const run = newRun(CITY);
  for (const id of START_NODES) run.devices[id].discovered = true;
  return { mission: CITY, run, profile };
}
// Accepting a mission reveals its start node(s) — no rig scan needed.
function accept(ctx, id) { for (const e of mission(id).entry) ctx.run.devices[e].discovered = true; }
const dev = (id) => ({ type: 'device', id });
const file = (d, id) => ({ type: 'file', device: d, id });
const done = (ctx, id) => mission(id).objectives.find((o) => o.main).done(ctx.run);

describe('city missions are solvable on the shared graph', () => {
  it('K-00 Antrean Cetak', () => {
    const ctx = game(); accept(ctx, 's00');
    exec(ctx, 'CONNECT', dev('router'));
    exec(ctx, 'READ', file('router', 'wifi_info'));
    exec(ctx, 'SCAN', dev('router'));
    exec(ctx, 'CONNECT', dev('printer'));
    exec(ctx, 'LOGIN', dev('printer'), 'printer_servis');
    exec(ctx, 'STOP', { type: 'proc', device: 'printer', id: 'spooler' });
    exec(ctx, 'DOWNLOAD', file('printer', 'menu_baru'));
    expect(done(ctx, 's00')).toBe(true);
    expect(finish({ ...ctx, mission: mission('s00') }, 'deliver').reward).toBe(150);
  });

  it('C-02 Mata Parkir', () => {
    const ctx = game(); accept(ctx, 's02');
    exec(ctx, 'CONNECT', dev('gw'));
    exec(ctx, 'READ', file('gw', 'note'));
    exec(ctx, 'SCAN', dev('gw'));
    exec(ctx, 'CONNECT', dev('dvr'));
    exec(ctx, 'EXPLOIT', dev('dvr'));
    exec(ctx, 'DOWNLOAD', file('dvr', 'clip'));
    exec(ctx, 'CONTROL', { type: 'control', device: 'dvr', id: 'cam_power' }, 'MATI');
    expect(done(ctx, 's02')).toBe(true);
    expect(ctx.run.flags).toContain('cam_off');
  });

  it('A-07 Blueprint Asli (server path)', () => {
    const ctx = game(); accept(ctx, 's01');
    exec(ctx, 'CONNECT', dev('gateway'));
    exec(ctx, 'READ', file('gateway', 'board'));
    exec(ctx, 'SCAN', dev('gateway'));
    exec(ctx, 'CONNECT', dev('teknisi'));
    exec(ctx, 'CRACK', dev('teknisi'), 'ARSIP07-2024');
    exec(ctx, 'CONNECT', dev('archive'));
    exec(ctx, 'CONFIG', { type: 'proc', device: 'archive', id: 'arcd' }, ['mode', 'rw']);
    exec(ctx, 'CONFIG', { type: 'proc', device: 'archive', id: 'arcd' }, ['sumber', '/vol/arsip07']);
    exec(ctx, 'START', { type: 'proc', device: 'archive', id: 'arcd' });
    exec(ctx, 'DOWNLOAD', file('archive', 'blueprint_asli'));
    expect(done(ctx, 's01')).toBe(true);
  });

  it('V-03 Brankas Dingin', () => {
    const ctx = game(); accept(ctx, 's03');
    ctx.profile.tools.cipher = true;
    exec(ctx, 'CONNECT', dev('edge'));
    exec(ctx, 'READ', file('edge', 'press'));
    exec(ctx, 'SCAN', dev('edge'));
    exec(ctx, 'CONNECT', dev('ops'));
    exec(ctx, 'CRACK', dev('ops'), 'RILIS-2025');
    exec(ctx, 'CONNECT', dev('cold'));
    exec(ctx, 'DOWNLOAD', file('cold', 'ledger'));
    exec(ctx, 'DECRYPT', { type: 'file', local: true, id: 'ledger' }, 'COLD640');
    expect(done(ctx, 's03')).toBe(true);
  });

  it('B-04 Kasir Ngadat — clue lives on another city node', () => {
    const ctx = game(); accept(ctx, 's04');
    expect(done(ctx, 's04')).toBe(false);
    exec(ctx, 'CONNECT', dev('tengah_hub'));
    exec(ctx, 'SCAN', dev('tengah_hub'));
    expect(device(ctx.run, 'halte_info').discovered).toBe(true);
    exec(ctx, 'CONNECT', dev('halte_info'));
    exec(ctx, 'READ', file('halte_info', 'tempelan_tini'));
    expect(ctx.run.creds).toContain('pos_kasir');
    exec(ctx, 'CONNECT', dev('warung_pos'));
    exec(ctx, 'LOGIN', dev('warung_pos'), 'pos_kasir');
    expect(device(ctx.run, 'warung_pos').access).toBe('admin');
    exec(ctx, 'STOP', { type: 'proc', device: 'warung_pos', id: 'sync' });
    exec(ctx, 'DOWNLOAD', file('warung_pos', 'laporan'));
    expect(done(ctx, 's04')).toBe(true);
    const bonus = mission('s04').objectives.find((o) => o.bonus);
    expect(bonus.done(ctx.run)).toBe(false);
    exec(ctx, 'START', { type: 'proc', device: 'warung_pos', id: 'sync' });
    expect(bonus.done(ctx.run)).toBe(true);
  });

  it('R-05 Siaran Gelap — crack, evidence, transmitter off', () => {
    const ctx = game(); accept(ctx, 's05');
    exec(ctx, 'CONNECT', dev('radio_server'));
    exec(ctx, 'READ', file('radio_server', 'catatan_operator'));
    exec(ctx, 'CRACK', dev('radio_server'), 'radio123');
    expect(device(ctx.run, 'radio_server').access).toBe('guest');
    exec(ctx, 'CRACK', dev('radio_server'), 'RADIO965');
    expect(device(ctx.run, 'radio_server').access).toBe('admin');
    exec(ctx, 'DOWNLOAD', file('radio_server', 'log_siaran'));
    expect(done(ctx, 's05')).toBe(true);
    exec(ctx, 'SCAN', dev('radio_server'));
    exec(ctx, 'CONNECT', dev('pemancar'));
    exec(ctx, 'CONTROL', { type: 'control', device: 'pemancar', id: 'tx' }, 'MATI');
    expect(ctx.run.flags).toContain('tx_off');
  });

  it('T-06 Arsip Sekolah — key hint on a different node, needs Cipher', () => {
    const ctx = game(); accept(ctx, 's06');
    ctx.profile.tools.cipher = true;
    exec(ctx, 'CONNECT', dev('tengah_hub'));
    exec(ctx, 'SCAN', { type: 'rig' }); // street scan picks up the Timur hotspot
    exec(ctx, 'CONNECT', dev('timur_hub'));
    exec(ctx, 'SCAN', dev('timur_hub'));
    exec(ctx, 'CONNECT', dev('balai_printer'));
    exec(ctx, 'READ', file('balai_printer', 'memo_reuni'));
    expect(ctx.run.clues).toContain('key_rapor');
    exec(ctx, 'CONNECT', dev('sekolah_nas'));
    exec(ctx, 'DOWNLOAD', file('sekolah_nas', 'rapor'));
    exec(ctx, 'DECRYPT', { type: 'file', local: true, id: 'rapor' }, 'SMP98ALUMNI');
    expect(done(ctx, 's06')).toBe(true);
  });
});

describe('open-world rules', () => {
  it('connecting does not reveal neighbours; scanning does', () => {
    const ctx = game();
    exec(ctx, 'CONNECT', dev('tengah_hub'));
    expect(device(ctx.run, 'utara_hub').discovered).toBe(false);
    exec(ctx, 'SCAN', dev('tengah_hub'));
    expect(device(ctx.run, 'utara_hub').discovered).toBe(true);
  });

  it('a street scan finds hotspots only, so deep nodes need exploring', () => {
    const ctx = game();
    exec(ctx, 'SCAN', { type: 'rig' });
    expect(device(ctx.run, 'selatan_hub').discovered).toBe(true);
    expect(device(ctx.run, 'printer').discovered).toBe(false);
    expect(device(ctx.run, 'cold').discovered).toBe(false);
  });

  it('you can walk across districts through the backbone', () => {
    const ctx = game();
    exec(ctx, 'CONNECT', dev('tengah_hub'));
    exec(ctx, 'SCAN', dev('tengah_hub'));
    exec(ctx, 'CONNECT', dev('isp_core'));
    exec(ctx, 'SCAN', dev('isp_core'));
    exec(ctx, 'CONNECT', dev('selatan_hub'));
    exec(ctx, 'SCAN', dev('selatan_hub'));
    expect(device(ctx.run, 'edge').discovered).toBe(true);
    expect(device(ctx.run, 'pasar_pos').discovered).toBe(true);
  });
});
