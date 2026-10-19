import { describe, it, expect } from 'vitest';
import { visibleFiles } from '../src/engine/core.js';
import { exec, finish, endings, getActions, hint } from '../src/engine/actions.js';
import { game, accept, mission, dev, file, local, proc, control, done, go, walk, route, must } from './helpers/city.js';

const ctxOf = (ctx, id) => ({ ...ctx, mission: mission(id) });
const act = (ctx, target, cmd) => getActions(ctx, target).find((x) => x.cmd === cmd);
const avail = (ctx, id, eid) => endings(ctxOf(ctx, id)).find((e) => e.id === eid).available;

describe('s12 Klinik: Jadwal Obat Kacau', () => {
  function toFarmasi(ctx) {
    accept(ctx, 's12');
    walk(ctx, 'isp_core', 'timur_hub', 'klinik_ws');
    must(ctx, 'READ', file('klinik_ws', 's12_catatan_meja'));
    must(ctx, 'DOWNLOAD', file('klinik_ws', 's12_jadwal_dokter'));
    go(ctx, 's12_farmasi');
    must(ctx, 'LOGIN', dev('s12_farmasi'), 's12_apoteker');
  }

  it('full solution: login, stop autosync, COMPARE, EDIT, dispenser', () => {
    const ctx = game(); ctx.profile.cmds.push('EDIT');
    toFarmasi(ctx);
    must(ctx, 'STOP', proc('s12_farmasi', 's12_autosync'));
    const f = file('s12_farmasi', 's12_jadwal_farmasi');
    must(ctx, 'READ', f);
    const r = must(ctx, 'COMPARE', f, 's12_jadwal_dokter');
    expect(r.sheet.content).toMatch(/DOSIS BERLEBIH/);
    must(ctx, 'EDIT', f, 'Pak Anto — Metformin 500 mg: 2x sehari, sesudah makan');
    expect(done(ctx, 's12')).toBe(true);
    exec(ctx, 'SCAN', dev('s12_farmasi'));
    go(ctx, 's12_dispenser');
    must(ctx, 'CONTROL', control('s12_dispenser', 's12_mode'), 'OTOMATIS');
    expect(mission('s12').objectives.find((o) => o.bonus).done(ctx.run)).toBe(true);
    expect(avail(ctx, 's12', 'jadwal')).toBe(true);
    expect(finish(ctxOf(ctx, 's12'), 'jadwal').reward).toBe(320);
  });

  it('is gated: no login without the note, no reading while autosync runs, EDIT is a paid command', () => {
    const ctx = game(); accept(ctx, 's12');
    walk(ctx, 'isp_core', 'timur_hub', 'klinik_ws');
    go(ctx, 's12_farmasi');
    expect(act(ctx, dev('s12_farmasi'), 'LOGIN').enabled).toBe(false);
    expect(visibleFiles(ctx.run, 's12_farmasi').map((f) => f.id)).not.toContain('s12_jadwal_farmasi');   // guests see nothing
    must(ctx, 'READ', file('klinik_ws', 's12_catatan_meja')); go(ctx, 'klinik_ws'); go(ctx, 's12_farmasi');
    must(ctx, 'LOGIN', dev('s12_farmasi'), 's12_apoteker');
    expect(act(ctx, file('s12_farmasi', 's12_jadwal_farmasi'), 'READ').enabled).toBe(false);
    expect(act(ctx, file('s12_farmasi', 's12_jadwal_farmasi'), 'READ').reason).toMatch(/autosync/);
    must(ctx, 'STOP', proc('s12_farmasi', 's12_autosync'));
    expect(act(ctx, file('s12_farmasi', 's12_jadwal_farmasi'), 'EDIT').enabled).toBe(false);   // EDIT not bought
    expect(done(ctx, 's12')).toBe(false);
    expect(avail(ctx, 's12', 'jadwal')).toBe(false);
  });

  it('a wrong EDIT option changes nothing and can be retried', () => {
    const ctx = game(); ctx.profile.cmds.push('EDIT'); toFarmasi(ctx);
    must(ctx, 'STOP', proc('s12_farmasi', 's12_autosync'));
    const f = file('s12_farmasi', 's12_jadwal_farmasi');
    must(ctx, 'EDIT', f, 'Pak Anto — Metformin 500 mg: 1x sehari, pagi');
    expect(done(ctx, 's12')).toBe(false);
    expect(act(ctx, f, 'EDIT').enabled).toBe(true);
    must(ctx, 'EDIT', f, 'Pak Anto — Metformin 500 mg: 2x sehari, sesudah makan');
    expect(done(ctx, 's12')).toBe(true);
  });

  it('the first hint names the paid command', () => {
    const ctx = game(); accept(ctx, 's12');
    expect(hint(ctxOf(ctx, 's12'))).toMatch(/EDIT/);
  });
});

describe('s13 Kapal Nelayan Hilang Sinyal', () => {
  function toStation(ctx) {
    accept(ctx, 's13');
    walk(ctx, 'isp_core', 'timur_hub', 'balai_printer');
    must(ctx, 'READ', file('balai_printer', 's13_tempelan_dermaga'));
    go(ctx, 'timur_hub'); go(ctx, 's13_stasiun');
    must(ctx, 'LOGIN', dev('s13_stasiun'), 's13_operator');
  }

  it('full solution: uplink, PING, ROUTE via pemancar, stop gpsloop, download', () => {
    const ctx = game(); ctx.profile.cmds.push('ROUTE');
    toStation(ctx);
    expect(exec(ctx, 'PING', dev('s13_modem')).out.some((l) => /offline/.test(l.text))).toBe(true);
    must(ctx, 'START', proc('s13_stasiun', 's13_uplink'));
    expect(exec(ctx, 'PING', dev('s13_modem')).out.some((l) => /ms/.test(l.text))).toBe(true);
    go(ctx, 'timur_hub'); go(ctx, 'radio_server'); go(ctx, 'pemancar');
    route(ctx, 's13_modem');
    expect(ctx.run.current).toBe('s13_modem');
    must(ctx, 'STOP', proc('s13_modem', 's13_gpsloop'));
    must(ctx, 'DOWNLOAD', file('s13_modem', 's13_posisi'));
    expect(done(ctx, 's13')).toBe(true);
    expect(avail(ctx, 's13', 'posisi')).toBe(true);
    expect(finish(ctxOf(ctx, 's13'), 'posisi').reward).toBe(340);
  });

  it('bonus: beacon needs the right channel from the buoy log', () => {
    const ctx = game(); ctx.profile.cmds.push('ROUTE');
    toStation(ctx);
    must(ctx, 'START', proc('s13_stasiun', 's13_uplink'));
    go(ctx, 's13_pelampung');
    must(ctx, 'READ', file('s13_pelampung', 's13_cuaca_log'));
    go(ctx, 'timur_hub'); go(ctx, 'radio_server'); go(ctx, 'pemancar'); route(ctx, 's13_modem');
    const b = proc('s13_modem', 's13_beacon');
    must(ctx, 'START', b);                                          // wrong channel: refused
    expect(ctx.run.devices.s13_modem.procs.find((p) => p.id === 's13_beacon').running).toBe(false);
    must(ctx, 'CONFIG', b, ['kanal', '16']);
    must(ctx, 'START', b);
    expect(mission('s13').objectives.find((o) => o.bonus).done(ctx.run)).toBe(true);
  });

  it('cannot be skipped: offline modem, no plain CONNECT, no ROUTE for guests or without the command', () => {
    const ctx = game(); accept(ctx, 's13');
    walk(ctx, 'isp_core', 'timur_hub', 'radio_server', 'pemancar');
    expect(act(ctx, dev('s13_modem'), 'ROUTE').enabled).toBe(false);
    expect(act(ctx, dev('s13_modem'), 'ROUTE').reason).toMatch(/terkunci/);   // ROUTE not bought yet
  });
  it('ROUTE is blocked while the modem is offline, and CONNECT never reaches it', () => {
    const ctx = game(); ctx.profile.cmds.push('ROUTE'); accept(ctx, 's13');
    walk(ctx, 'isp_core', 'timur_hub', 'radio_server', 'pemancar');
    const r = act(ctx, dev('s13_modem'), 'ROUTE');
    expect(r.enabled).toBe(false);
    expect(r.reason).toMatch(/offline/);
    expect(act(ctx, dev('s13_modem'), 'CONNECT').enabled).toBe(false);
    expect(done(ctx, 's13')).toBe(false);
    expect(avail(ctx, 's13', 'posisi')).toBe(false);
  });
  it('the first hint names the paid command', () => {
    const ctx = game(); accept(ctx, 's13');
    expect(hint(ctxOf(ctx, 's13'))).toMatch(/ROUTE/);
  });
});

describe('s14 Syahbandar: Manifest Palsu', () => {
  function toBea(ctx) {
    accept(ctx, 's14');
    walk(ctx, 'isp_core', 'timur_hub', 's14_kantor');
    must(ctx, 'READ', file('s14_kantor', 's14_catatan_petugas'));
    go(ctx, 's14_arsip');
    must(ctx, 'LOGIN', dev('s14_arsip'), 's14_petugas');
    must(ctx, 'READ', file('s14_arsip', 's14_log_akses'));
    exec(ctx, 'SCAN', dev('s14_arsip'));
    go(ctx, 's14_bea');
    must(ctx, 'CRACK', dev('s14_bea'), 'SYBD07');
  }
  const compareAtBea = (ctx) => {
    go(ctx, 's14_kantor'); go(ctx, 's14_timbang');
    must(ctx, 'DOWNLOAD', file('s14_timbang', 's14_timbang_log'));
    go(ctx, 's14_kantor'); go(ctx, 's14_arsip'); go(ctx, 's14_bea');
    return must(ctx, 'COMPARE', file('s14_bea', 's14_manifest_bea'), 's14_timbang_log');
  };

  it('ending "lapor": download evidence, COMPARE, report', () => {
    const ctx = game(); toBea(ctx);
    must(ctx, 'DOWNLOAD', file('s14_bea', 's14_manifest_bea'));
    const r = compareAtBea(ctx);
    expect(r.sheet.content).toMatch(/TIDAK COCOK/);
    expect(done(ctx, 's14')).toBe(true);
    expect(avail(ctx, 's14', 'lapor')).toBe(true);
    expect(avail(ctx, 's14', 'benahi')).toBe(false);
    expect(finish(ctxOf(ctx, 's14'), 'lapor').reward).toBe(380);
  });

  it('ending "benahi": EDIT the manifest quietly (needs the paid command)', () => {
    const ctx = game(); toBea(ctx); compareAtBea(ctx);
    const f = file('s14_bea', 's14_manifest_bea');
    expect(act(ctx, f, 'EDIT').enabled).toBe(false);                 // EDIT not bought yet
    ctx.profile.cmds.push('EDIT');
    must(ctx, 'EDIT', f, 'Kontainer KONT-4471: Ikan beku 3 ton');    // wrong choice: nothing changes
    expect(avail(ctx, 's14', 'benahi')).toBe(false);
    must(ctx, 'EDIT', f, 'Kontainer KONT-4471: Suku cadang elektronik 3 ton');
    expect(avail(ctx, 's14', 'benahi')).toBe(true);
    expect(avail(ctx, 's14', 'lapor')).toBe(false);                  // no evidence copy of the forged manifest
    const fin = finish(ctxOf(ctx, 's14'), 'benahi');
    expect(fin.reward).toBe(300);
    expect(fin.text).not.toBe(mission('s14').endings.find((e) => e.id === 'lapor').text);
  });

  it('editing first and downloading after destroys the evidence for "lapor" but not "benahi"', () => {
    const ctx = game(); ctx.profile.cmds.push('EDIT'); toBea(ctx); compareAtBea(ctx);
    must(ctx, 'EDIT', file('s14_bea', 's14_manifest_bea'), 'Kontainer KONT-4471: Suku cadang elektronik 3 ton');
    must(ctx, 'DOWNLOAD', file('s14_bea', 's14_manifest_bea'));
    expect(avail(ctx, 's14', 'lapor')).toBe(false);
    expect(avail(ctx, 's14', 'benahi')).toBe(true);
  });

  it('cannot be skipped: archive needs the note, customs needs the right password', () => {
    const ctx = game(); accept(ctx, 's14');
    walk(ctx, 'isp_core', 'timur_hub', 's14_kantor');
    go(ctx, 's14_arsip');
    expect(act(ctx, dev('s14_arsip'), 'LOGIN').enabled).toBe(false);
    expect(act(ctx, dev('s14_bea'), 'CONNECT').enabled).toBe(false);
    must(ctx, 'READ', file('s14_kantor', 's14_catatan_petugas')); go(ctx, 's14_kantor'); go(ctx, 's14_arsip');
    must(ctx, 'LOGIN', dev('s14_arsip'), 's14_petugas');
    go(ctx, 's14_bea');
    expect(ctx.run.devices.s14_bea.access).toBe('none');
    must(ctx, 'CRACK', dev('s14_bea'), 'BEA2023');                   // old password from the memo: rejected
    expect(ctx.run.devices.s14_bea.access).toBe('none');
    expect(visibleFiles(ctx.run, 's14_bea').map((f) => f.id)).not.toContain('s14_manifest_bea');
    expect(done(ctx, 's14')).toBe(false);
    expect(avail(ctx, 's14', 'lapor')).toBe(false);
    expect(avail(ctx, 's14', 'benahi')).toBe(false);
  });
  it('the first hint names the paid command', () => {
    const ctx = game(); accept(ctx, 's14');
    expect(hint(ctxOf(ctx, 's14'))).toMatch(/EDIT/);
  });
});
