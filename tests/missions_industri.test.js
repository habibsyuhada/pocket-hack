import { describe, it, expect } from 'vitest';
import { exec, getActions, getChoices, endings, finish } from '../src/engine/actions.js';
import { game, accept, mission, dev, file, local, proc, control, done, go, walk, route, must } from './helpers/city.js';

// s17 may not be finished while these run: hand the player admin on the relay directly,
// but still walk the real graph up to it and use the real ROUTE rule.
function industri(extra = {}) {
  const ctx = game();
  ctx.profile.cmds.push('ROUTE');
  Object.assign(ctx.profile.tools, extra.tools || {});
  for (const c of extra.cmds || []) ctx.profile.cmds.push(c);
  walk(ctx, 'isp_core', 'selatan_hub', 'menara_relay');
  ctx.run.devices.menara_relay.access = 'admin';
  route(ctx, 'industri_hub');
  exec(ctx, 'SCAN', dev('industri_hub'));
  return ctx;
}
const fin = (ctx, id, ending) => finish({ ...ctx, mission: mission(id) }, ending);
const P = (d, id) => proc(d, id);
const flagIdx = (ctx, f) => ctx.run.flags.indexOf(f);
const act = (ctx, target, cmd) => getActions(ctx, target).find((x) => x.cmd === cmd);

describe('Industri is cut off from the city', () => {
  it('industri_hub cannot be CONNECTed from the city; only ROUTE from the relay', () => {
    const ctx = game(); walk(ctx, 'isp_core', 'selatan_hub', 'menara_relay');
    expect(act(ctx, dev('industri_hub'), 'CONNECT').enabled).toBe(false);
    expect(act(ctx, dev('industri_hub'), 'ROUTE').enabled).toBe(false);
  });
  it('mission nodes of s18-s21 hang off industri_hub', () => {
    const ctx = industri();
    for (const [id, n] of [['s18', 's18_panel'], ['s19', 's19_gerbang'], ['s20', 's20_panel'], ['s21', 's21_gerbang']]) {
      accept(ctx, id);
      expect(mission(id).entry).toEqual([n]);
      expect(act(ctx, dev(n), 'CONNECT').enabled).toBe(true);
    }
  });
});

describe('s18 Gardu Listrik', () => {
  const toScada = (ctx) => {
    go(ctx, 's18_panel');
    must(ctx, 'READ', file('s18_panel', 's18_sop'));
    exec(ctx, 'SCAN', dev('s18_panel'));
    go(ctx, 's18_pos');
    must(ctx, 'READ', file('s18_pos', 's18_shift'));
    go(ctx, 's18_panel'); go(ctx, 's18_scada');
    must(ctx, 'LOGIN', dev('s18_scada'), 's18_operator');
  };
  const S = (id) => P('s18_scada', id);

  it('correct order: genset, release load, trafo off, feeder back — no alarm, full reward', () => {
    const ctx = industri(); accept(ctx, 's18'); toScada(ctx);
    must(ctx, 'START', S('s18_genset'));
    must(ctx, 'STOP', S('s18_feeder'));
    must(ctx, 'STOP', S('s18_trafo'));
    must(ctx, 'DOWNLOAD', file('s18_scada', 's18_log_uji'));
    must(ctx, 'START', S('s18_feeder'));
    expect(done(ctx, 's18')).toBe(true);
    const e = endings({ ...ctx, mission: mission('s18') });
    expect(e.find((x) => x.id === 'rapi').available).toBe(true);
    expect(e.find((x) => x.id === 'alarm').available).toBe(false);
    expect(mission('s18').objectives.find((o) => o.bonus).done(ctx.run)).toBe(true);
    expect(fin(ctx, 's18', 'rapi').reward).toBe(560);
  });

  it('wrong order raises the alarm but is never a dead end', () => {
    const ctx = industri(); accept(ctx, 's18'); toScada(ctx);
    must(ctx, 'STOP', S('s18_trafo'));                     // trafo before genset / load release
    expect(flagIdx(ctx, 's18_trafo_off')).toBeGreaterThanOrEqual(0);
    must(ctx, 'START', S('s18_genset'));
    must(ctx, 'STOP', S('s18_feeder'));
    must(ctx, 'DOWNLOAD', file('s18_scada', 's18_log_uji'));
    must(ctx, 'START', S('s18_feeder'));
    expect(done(ctx, 's18')).toBe(true);
    const e = endings({ ...ctx, mission: mission('s18') });
    expect(e.find((x) => x.id === 'alarm').available).toBe(true);
    expect(e.find((x) => x.id === 'rapi').available).toBe(false);
    expect(mission('s18').objectives.find((o) => o.bonus).done(ctx.run)).toBe(false);
    expect(fin(ctx, 's18', 'alarm').reward).toBe(460);
  });

  it('switching off the protection relay also rings the alarm; log stays locked while the trafo runs', () => {
    const ctx = industri(); accept(ctx, 's18'); toScada(ctx);
    must(ctx, 'START', S('s18_genset'));
    expect(act(ctx, file('s18_scada', 's18_log_uji'), 'DOWNLOAD').enabled).toBe(false);   // locked by trafo
    expect(act(ctx, file('s18_scada', 's18_log_uji'), 'DOWNLOAD').reason).toMatch(/trafo_utama/);
    must(ctx, 'STOP', S('s18_proteksi'));
    expect(ctx.run.flags).toContain('s18_proteksi_off');
  });

  it('cannot be skipped: no admin without the operator account, and the log is hidden without the genset', () => {
    const ctx = industri(); accept(ctx, 's18');
    go(ctx, 's18_panel'); go(ctx, 's18_scada');
    expect(act(ctx, dev('s18_scada'), 'LOGIN').enabled).toBe(false);
    expect(act(ctx, S('s18_genset'), 'START').enabled).toBe(false);
    expect(done(ctx, 's18')).toBe(false);
  });
});

describe('s19 Menara Air', () => {
  const pump = () => P('s19_hmi', 's19_pompa');
  const setAll = (ctx, t, d, m) => {
    exec(ctx, 'CONFIG', pump(), ['tekanan', t]); exec(ctx, 'CONFIG', pump(), ['debit', d]); exec(ctx, 'CONFIG', pump(), ['mode', m]);
  };
  const toHmi = (ctx) => {
    go(ctx, 's19_gerbang');
    must(ctx, 'READ', file('s19_gerbang', 's19_spek'));
    exec(ctx, 'SCAN', dev('s19_gerbang'));
    go(ctx, 's19_hmi');
  };

  it('solution: STOP, CONFIG to rev3 values, START, with chlorinator kept on', () => {
    const ctx = industri(); accept(ctx, 's19'); toHmi(ctx);
    expect(act(ctx, pump(), 'CONFIG').enabled).toBe(false);                    // pump still running
    expect(act(ctx, file('s19_hmi', 's19_laporan'), 'DOWNLOAD').enabled).toBe(false);
    must(ctx, 'STOP', pump());
    must(ctx, 'DOWNLOAD', file('s19_hmi', 's19_laporan'));
    setAll(ctx, '3.5 bar', '45 L/s', 'normal');
    must(ctx, 'START', pump());
    expect(done(ctx, 's19')).toBe(true);
    expect(endings({ ...ctx, mission: mission('s19') })[0].available).toBe(true);
    expect(fin(ctx, 's19', 'stabil').reward).toBe(600);
  });

  it('the old rev1 numbers are refused, and RESTORE puts the test values back', () => {
    const ctx = industri(); accept(ctx, 's19'); toHmi(ctx);
    must(ctx, 'STOP', pump());
    setAll(ctx, '6.0 bar', '80 L/s', 'normal');                                 // rev1: wrong
    const r = exec(ctx, 'START', pump());
    expect(r.out.some((l) => l.t === 'err')).toBe(true);
    expect(ctx.run.devices.s19_hmi.procs.find((p) => p.id === 's19_pompa').running).toBe(false);
    must(ctx, 'RESTORE', pump());
    const cfg = ctx.run.devices.s19_hmi.procs.find((p) => p.id === 's19_pompa').config;
    expect(cfg.tekanan.value).toBe('8.5 bar');
    expect(cfg.mode.value).toBe('uji-beban');
    expect(done(ctx, 's19')).toBe(false);
  });

  it('chlorinator off blocks the main objective until restarted', () => {
    const ctx = industri(); accept(ctx, 's19'); toHmi(ctx);
    must(ctx, 'STOP', pump()); setAll(ctx, '3.5 bar', '45 L/s', 'normal'); must(ctx, 'START', pump());
    go(ctx, 's19_gerbang'); go(ctx, 's19_tangki');
    must(ctx, 'STOP', P('s19_tangki', 's19_klorin'));
    expect(done(ctx, 's19')).toBe(false);
    must(ctx, 'START', P('s19_tangki', 's19_klorin'));
    expect(done(ctx, 's19')).toBe(true);
  });

  it('Sniffer is optional: it shows REV3 telemetry and completes the bonus', () => {
    const ctx = industri({ tools: { sniffer: true } }); accept(ctx, 's19');
    go(ctx, 's19_gerbang'); go(ctx, 's19_sensor');
    const r = exec(ctx, 'INSPECT', dev('s19_sensor'));
    expect(r.sheet.content).toMatch(/REV3/);
    expect(mission('s19').objectives.find((o) => o.bonus).done(ctx.run)).toBe(true);
    const plain = industri(); go(plain, 's19_gerbang'); go(plain, 's19_sensor');
    expect(exec(plain, 'INSPECT', dev('s19_sensor')).sheet.content).not.toMatch(/REV3/);
  });
});

describe('s20 Gudang Pendingin', () => {
  const kc = () => control('s20_kompresor', 's20_komp_daya');
  const toSensor = (ctx) => {
    go(ctx, 's20_panel');
    must(ctx, 'READ', file('s20_panel', 's20_tiket'));
    exec(ctx, 'SCAN', dev('s20_panel'));
    go(ctx, 's20_vendor');
    must(ctx, 'DOWNLOAD', file('s20_vendor', 's20_patch'));
    go(ctx, 's20_panel'); go(ctx, 's20_sensor');
    must(ctx, 'LOGIN', dev('s20_sensor'), 's20_servis');
  };

  it('solution: patch v2 UPLOAD brings the compressor online; CONTROL NORMAL; key item reward', () => {
    const ctx = industri({ cmds: ['UPLOAD'] }); accept(ctx, 's20'); toSensor(ctx);
    expect(ctx.run.devices.s20_kompresor.online).toBe(false);
    expect(act(ctx, dev('s20_kompresor'), 'CONNECT').enabled).toBe(false);
    must(ctx, 'UPLOAD', local('s20_patch'));
    expect(ctx.run.devices.s20_kompresor.online).toBe(true);
    go(ctx, 's20_kompresor');
    must(ctx, 'CONTROL', kc(), 'NORMAL');
    expect(done(ctx, 's20')).toBe(true);
    expect(mission('s20').items).toEqual({ kunci_dingin: 1 });
    expect(fin(ctx, 's20', 'dingin').reward).toBe(640);
  });

  it('the old patch is a harmless trap; TURBO is noisy; neither blocks', () => {
    const ctx = industri({ cmds: ['UPLOAD'] }); accept(ctx, 's20'); toSensor(ctx);
    go(ctx, 's20_vendor'); must(ctx, 'DOWNLOAD', file('s20_vendor', 's20_patch_lama'));
    go(ctx, 's20_panel'); go(ctx, 's20_sensor');
    must(ctx, 'UPLOAD', local('s20_patch_lama'));
    expect(ctx.run.flags).toContain('s20_patch_salah');
    expect(ctx.run.devices.s20_kompresor.online).toBe(false);
    must(ctx, 'UPLOAD', local('s20_patch'));
    go(ctx, 's20_kompresor');
    must(ctx, 'CONTROL', kc(), 'TURBO');
    expect(done(ctx, 's20')).toBe(false);
    must(ctx, 'CONTROL', kc(), 'NORMAL');
    expect(done(ctx, 's20')).toBe(true);
    expect(mission('s20').objectives.find((o) => o.bonus).done(ctx.run)).toBe(false);
  });

  it('cannot be skipped: UPLOAD is locked without the command, sensor needs the service account', () => {
    const ctx = industri(); accept(ctx, 's20'); toSensor(ctx);
    expect(act(ctx, local('s20_patch'), 'UPLOAD').enabled).toBe(false);
    expect(act(ctx, local('s20_patch'), 'UPLOAD').reason).toMatch(/UPLOAD/);
    const c2 = industri({ cmds: ['UPLOAD'] }); go(c2, 's20_panel'); go(c2, 's20_sensor');
    expect(act(c2, dev('s20_sensor'), 'LOGIN').enabled).toBe(false);
  });
});

describe('s21 PLC Pabrik — Blackout', () => {
  const rig = (cmds) => industri({ tools: { tracer: true }, cmds: ['TRACE', ...cmds] });
  const traceAndLogin = (ctx) => {
    go(ctx, 's21_gerbang');
    must(ctx, 'READ', file('s21_gerbang', 's21_pengumuman'));
    exec(ctx, 'SCAN', dev('s21_gerbang'));
    must(ctx, 'READ', file('s21_gerbang', 's21_pesan'));
    must(ctx, 'TRACE', file('s21_gerbang', 's21_pesan'));
    go(ctx, 's21_plc');
    must(ctx, 'LOGIN', dev('s21_plc'), 's21_teknisi');
  };
  const finale = (ctx) => {
    must(ctx, 'CONTROL', control('s21_plc', 's21_mode'), 'MANUAL');
    must(ctx, 'TRACE', file('s21_plc', 's21_ttd'));
    go(ctx, 's21_uji');
    must(ctx, 'LOGIN', dev('s21_uji'), 's21_uji_acc');
    must(ctx, 'DOWNLOAD', file('s21_uji', 's21_laporan'));
  };

  it('EDIT path: trace, login, STOP scheduler, EDIT to SIMULASI, MANUAL, report; all 3 endings available', () => {
    const ctx = rig(['EDIT']); accept(ctx, 's21'); traceAndLogin(ctx);
    expect(act(ctx, file('s21_plc', 's21_jadwal'), 'EDIT').enabled).toBe(false);       // locked by running scheduler
    must(ctx, 'STOP', P('s21_plc', 's21_runner'));
    expect(getChoices(ctx, 'EDIT', file('s21_plc', 's21_jadwal')).length).toBe(4);
    exec(ctx, 'EDIT', file('s21_plc', 's21_jadwal'), 'target = PABRIK');
    expect(ctx.run.flags).not.toContain('s21_dijinakkan');                              // wrong choice, try again
    must(ctx, 'EDIT', file('s21_plc', 's21_jadwal'), 'target = SIMULASI');
    expect(ctx.run.flags).toContain('s21_jalur_edit');
    expect(done(ctx, 's21')).toBe(false);
    finale(ctx);
    expect(done(ctx, 's21')).toBe(true);
    const e = endings({ ...ctx, mission: mission('s21') });
    expect(e.map((x) => x.id)).toEqual(['lapor', 'bocor', 'jual']);
    expect(e.every((x) => x.available)).toBe(true);
    expect(mission('s21').objectives.find((o) => o.bonus).done(ctx.run)).toBe(true);
    expect(new Set(e.map((x) => x.text)).size).toBe(3);
  });

  it('UPLOAD path with the limiter patch, then the three endings pay differently', () => {
    const rewards = [];
    for (const id of ['lapor', 'bocor', 'jual']) {
      const ctx = rig(['UPLOAD']); accept(ctx, 's21'); traceAndLogin(ctx);
      go(ctx, 's21_gerbang'); go(ctx, 's21_arsip');
      must(ctx, 'DOWNLOAD', file('s21_arsip', 's21_patch_batas'));
      go(ctx, 's21_gerbang'); go(ctx, 's21_plc');
      must(ctx, 'UPLOAD', local('s21_patch_batas'));
      expect(ctx.run.flags).toContain('s21_jalur_upload');
      finale(ctx);
      expect(done(ctx, 's21')).toBe(true);
      rewards.push(fin(ctx, 's21', id).reward);
    }
    expect(rewards).toEqual([900, 800, 1100]);
  });

  it('cannot be skipped: no Tracer means no account, and the endings stay locked until the plant is safe', () => {
    const ctx = industri({ cmds: ['TRACE'] }); accept(ctx, 's21');
    go(ctx, 's21_gerbang');
    expect(act(ctx, file('s21_gerbang', 's21_pesan'), 'TRACE').enabled).toBe(false);
    go(ctx, 's21_plc');
    expect(act(ctx, dev('s21_plc'), 'LOGIN').enabled).toBe(false);
    expect(endings({ ...ctx, mission: mission('s21') }).some((e) => e.available)).toBe(false);
  });

  it('shutting the PLC safety down is a harmless bonus miss', () => {
    const ctx = rig(['EDIT']); accept(ctx, 's21'); traceAndLogin(ctx);
    must(ctx, 'STOP', P('s21_plc', 's21_pengaman'));
    must(ctx, 'STOP', P('s21_plc', 's21_runner'));
    must(ctx, 'EDIT', file('s21_plc', 's21_jadwal'), 'target = SIMULASI');
    finale(ctx);
    expect(done(ctx, 's21')).toBe(true);
    expect(mission('s21').objectives.find((o) => o.bonus).done(ctx.run)).toBe(false);
  });
});
