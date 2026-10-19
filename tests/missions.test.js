import { describe, it, expect } from 'vitest';
import { newProfile, newRun, device } from '../src/engine/core.js';
import { exec, finish, getActions } from '../src/engine/actions.js';
import { commandTargets } from '../src/engine/commands.js';
import { CITY, START_NODES } from '../src/city/index.js';
import { SITES } from '../src/sites/index.js';

const mission = (id) => SITES.find((s) => s.id === id);

// A fresh game: shared city run, only the rig's ISP uplink is known.
function game() {
  const profile = newProfile();
  const run = newRun(CITY);
  for (const id of START_NODES) run.devices[id].discovered = true;
  return { mission: CITY, run, profile };
}
// Accepting a mission reveals its start node(s) on the map (not a route to them).
function accept(ctx, id) { for (const e of mission(id).entry) ctx.run.devices[e].discovered = true; }
const dev = (id) => ({ type: 'device', id });
const file = (d, id) => ({ type: 'file', device: d, id });
const done = (ctx, id) => mission(id).objectives.find((o) => o.main).done(ctx.run);

// Moves are checked against the real rules: CONNECT must be an enabled option.
function go(ctx, id) {
  const a = getActions(ctx, dev(id)).find((x) => x.cmd === 'CONNECT');
  expect(a, `no CONNECT option for ${id}`).toBeTruthy();
  expect(a.enabled, `${id}: ${a.reason}`).toBe(true);
  exec(ctx, 'CONNECT', dev(id));
}
// connect + scan each hop, like a player walking the graph
function walk(ctx, ...ids) { for (const id of ids) { go(ctx, id); exec(ctx, 'SCAN', dev(id)); } }

describe('city missions are solvable by walking the shared graph', () => {
  it('K-00 Antrean Cetak', () => {
    const ctx = game(); accept(ctx, 's00');
    walk(ctx, 'isp_core', 'tengah_hub');
    go(ctx, 'router');
    exec(ctx, 'READ', file('router', 'wifi_info'));
    exec(ctx, 'SCAN', dev('router'));
    go(ctx, 'printer');
    exec(ctx, 'LOGIN', dev('printer'), 'printer_servis');
    exec(ctx, 'STOP', { type: 'proc', device: 'printer', id: 'spooler' });
    exec(ctx, 'DOWNLOAD', file('printer', 'menu_baru'));
    expect(done(ctx, 's00')).toBe(true);
    expect(finish({ ...ctx, mission: mission('s00') }, 'deliver').reward).toBe(150);
  });

  it('C-02 Mata Parkir', () => {
    const ctx = game(); accept(ctx, 's02');
    walk(ctx, 'isp_core', 'utara_hub');
    go(ctx, 'gw');
    exec(ctx, 'READ', file('gw', 'note'));
    exec(ctx, 'SCAN', dev('gw'));
    go(ctx, 'dvr');
    exec(ctx, 'EXPLOIT', dev('dvr'));
    exec(ctx, 'DOWNLOAD', file('dvr', 'clip'));
    exec(ctx, 'CONTROL', { type: 'control', device: 'dvr', id: 'cam_power' }, 'MATI');
    expect(done(ctx, 's02')).toBe(true);
    expect(ctx.run.flags).toContain('cam_off');
  });

  it('A-07 Blueprint Asli (server path)', () => {
    const ctx = game(); accept(ctx, 's01');
    walk(ctx, 'isp_core', 'barat_hub');
    go(ctx, 'gateway');
    exec(ctx, 'READ', file('gateway', 'board'));
    exec(ctx, 'SCAN', dev('gateway'));
    go(ctx, 'teknisi');
    exec(ctx, 'CRACK', dev('teknisi'), 'ARSIP07-2024');
    go(ctx, 'archive');
    exec(ctx, 'CONFIG', { type: 'proc', device: 'archive', id: 'arcd' }, ['mode', 'rw']);
    exec(ctx, 'CONFIG', { type: 'proc', device: 'archive', id: 'arcd' }, ['sumber', '/vol/arsip07']);
    exec(ctx, 'START', { type: 'proc', device: 'archive', id: 'arcd' });
    exec(ctx, 'DOWNLOAD', file('archive', 'blueprint_asli'));
    expect(done(ctx, 's01')).toBe(true);
  });

  it('V-03 Brankas Dingin', () => {
    const ctx = game(); accept(ctx, 's03');
    ctx.profile.tools.cipher = true;
    walk(ctx, 'isp_core', 'selatan_hub');
    go(ctx, 'edge');
    exec(ctx, 'READ', file('edge', 'press'));
    exec(ctx, 'SCAN', dev('edge'));
    go(ctx, 'ops');
    exec(ctx, 'CRACK', dev('ops'), 'RILIS-2025');
    go(ctx, 'cold');
    exec(ctx, 'DOWNLOAD', file('cold', 'ledger'));
    exec(ctx, 'DECRYPT', { type: 'file', local: true, id: 'ledger' }, 'COLD640');
    expect(done(ctx, 's03')).toBe(true);
  });

  it('B-04 Kasir Ngadat — clue lives on another city node', () => {
    const ctx = game(); accept(ctx, 's04');
    expect(done(ctx, 's04')).toBe(false);
    walk(ctx, 'isp_core', 'tengah_hub');
    expect(device(ctx.run, 'halte_info').discovered).toBe(true);
    go(ctx, 'halte_info');
    exec(ctx, 'READ', file('halte_info', 'tempelan_tini'));
    expect(ctx.run.creds).toContain('pos_kasir');
    go(ctx, 'warung_pos');
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
    walk(ctx, 'isp_core', 'timur_hub');
    go(ctx, 'radio_server');
    exec(ctx, 'READ', file('radio_server', 'catatan_operator'));
    exec(ctx, 'CRACK', dev('radio_server'), 'radio123');
    expect(device(ctx.run, 'radio_server').access).toBe('guest');
    exec(ctx, 'CRACK', dev('radio_server'), 'RADIO965');
    expect(device(ctx.run, 'radio_server').access).toBe('admin');
    exec(ctx, 'DOWNLOAD', file('radio_server', 'log_siaran'));
    expect(done(ctx, 's05')).toBe(true);
    exec(ctx, 'SCAN', dev('radio_server'));
    go(ctx, 'pemancar');
    exec(ctx, 'CONTROL', { type: 'control', device: 'pemancar', id: 'tx' }, 'MATI');
    expect(ctx.run.flags).toContain('tx_off');
  });

  it('T-06 Arsip Sekolah — key hint on a different node, needs Cipher', () => {
    const ctx = game(); accept(ctx, 's06');
    ctx.profile.tools.cipher = true;
    walk(ctx, 'isp_core', 'timur_hub');
    go(ctx, 'balai_printer');
    exec(ctx, 'READ', file('balai_printer', 'memo_reuni'));
    expect(ctx.run.clues).toContain('key_rapor');
    go(ctx, 'sekolah_nas');
    exec(ctx, 'DOWNLOAD', file('sekolah_nas', 'rapor'));
    exec(ctx, 'DECRYPT', { type: 'file', local: true, id: 'rapor' }, 'SMP98ALUMNI');
    expect(done(ctx, 's06')).toBe(true);
  });
});

describe('open-world rules', () => {
  it('connecting does not reveal neighbours; scanning does', () => {
    const ctx = game();
    go(ctx, 'isp_core');
    expect(device(ctx.run, 'tengah_hub').discovered).toBe(false);
    exec(ctx, 'SCAN', dev('isp_core'));
    expect(device(ctx.run, 'tengah_hub').discovered).toBe(true);
  });

  it('a rig scan only sees the ISP uplink; deeper nodes need exploring', () => {
    const ctx = game();
    exec(ctx, 'SCAN', { type: 'rig' });
    expect(device(ctx.run, 'isp_core').discovered).toBe(true);
    expect(device(ctx.run, 'tengah_hub').discovered).toBe(false);
    expect(device(ctx.run, 'cold').discovered).toBe(false);
  });

  it('you cannot jump straight to a node you merely know about', () => {
    const ctx = game();
    ctx.run.devices.router.discovered = true; // e.g. mission accepted, but no route yet
    const a = getActions(ctx, dev('router')).find((x) => x.cmd === 'CONNECT');
    expect(a.enabled).toBe(false);
  });

  it('you can walk across districts through the backbone', () => {
    const ctx = game();
    walk(ctx, 'isp_core', 'selatan_hub');
    expect(device(ctx.run, 'edge').discovered).toBe(true);
    expect(device(ctx.run, 'pasar_pos').discovered).toBe(true);
  });
});

describe('CMDS · CONNECT picker lists only neighbours', () => {
  const names = (ctx) => commandTargets(ctx, 'CONNECT').map((t) => t.target.id).sort();

  it('off the network, only the ISP uplink is offered', () => {
    const ctx = game();
    ctx.run.devices.router.discovered = true; ctx.run.devices.tengah_hub.discovered = true;
    expect(names(ctx)).toEqual(['isp_core']);
  });

  it('connected, only the nodes linked to where you are', () => {
    const ctx = game();
    walk(ctx, 'isp_core');
    expect(names(ctx)).toEqual(['barat_hub', 'selatan_hub', 'tengah_hub', 'timur_hub', 'utara_hub']);
    go(ctx, 'tengah_hub'); exec(ctx, 'SCAN', dev('tengah_hub'));
    const here = names(ctx);
    expect(here).toContain('router');
    expect(here).toContain('isp_core');          // you can step back
    expect(here).not.toContain('selatan_hub');   // not wired to this node
    expect(here).not.toContain('tengah_hub');    // not yourself
  });

  it('undiscovered neighbours stay hidden until you scan', () => {
    const ctx = game();
    go(ctx, 'isp_core');
    expect(names(ctx)).toEqual([]);
    exec(ctx, 'SCAN', dev('isp_core'));
    expect(names(ctx).length).toBe(5);
  });
});
