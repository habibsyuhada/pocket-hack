import { describe, it, expect } from 'vitest';
import { exec, getActions, endings, finish } from '../src/engine/actions.js';
import { tickTrace } from '../src/engine/trace.js';
import { game, accept, mission, dev, file, local, control, done, go, walk, route, must } from './helpers/city.js';

// Each mission has more than one way through. These walk the alternate routes from the start of the
// game and check that they finish the mission (the primary routes live in the per-mission tests).
const act = (ctx, target, cmd) => getActions(ctx, target).find((x) => x.cmd === cmd);
const ends = (ctx, id) => Object.fromEntries(endings({ ...ctx, mission: mission(id) }).map((e) => [e.id, e.available]));
const fin = (ctx, id, e) => finish({ ...ctx, mission: mission(id) }, e);
const industri = (extra = {}) => {
  const ctx = game();
  ctx.profile.cmds.push('ROUTE', ...(extra.cmds || []));
  Object.assign(ctx.profile.tools, extra.tools || {});
  walk(ctx, 'isp_core', 'selatan_hub', 'menara_relay');
  ctx.run.devices.menara_relay.access = 'admin';
  route(ctx, 'industri_hub');
  exec(ctx, 'SCAN', dev('industri_hub'));
  return ctx;
};

describe('alternate routes', () => {
  it('s00: a damaged cache copy of the menu can be recovered instead of logging in', () => {
    const ctx = game(); accept(ctx, 's00');
    walk(ctx, 'isp_core', 'tengah_hub'); go(ctx, 'router');
    expect(done(ctx, 's00')).toBe(false);
    must(ctx, 'RECOVER', file('router', 's00_cache'));
    must(ctx, 'DOWNLOAD', file('router', 's00_cache'));
    expect(done(ctx, 's00')).toBe(true);
    expect(fin(ctx, 's00', 'deliver').reward).toBe(150);
  });

  it('s02: quiet login from the camera journal, or the loud exploit once you know the flaw', () => {
    const quiet = game(); accept(quiet, 's02');
    walk(quiet, 'isp_core', 'utara_hub', 'gw'); go(quiet, 'cam');
    must(quiet, 'READ', file('cam', 's02_servis'));
    go(quiet, 'dvr');
    must(quiet, 'LOGIN', dev('dvr'), 's02_servis');
    must(quiet, 'DOWNLOAD', file('dvr', 'clip'));
    expect(done(quiet, 's02')).toBe(true);
    expect(quiet.run.flags).not.toContain('alarm_dvr');

    const loud = game(); accept(loud, 's02');
    walk(loud, 'isp_core', 'utara_hub', 'gw'); go(loud, 'dvr');
    expect(act(loud, dev('dvr'), 'EXPLOIT').enabled).toBe(false);          // you have to know about the flaw first
    go(loud, 'gw'); must(loud, 'READ', file('gw', 'note')); go(loud, 'dvr');
    const before = loud.run.trace.left;
    must(loud, 'EXPLOIT', dev('dvr'));
    expect(loud.run.flags).toContain('alarm_dvr');
    expect(loud.run.trace.left).toBeLessThan(before);                      // the alarm cuts your Trace time
    expect(loud.run.trace.left).toBeLessThanOrEqual(0.4 * dev('dvr').trace * 1000 || 1e9);
    must(loud, 'DOWNLOAD', file('dvr', 'clip'));
    expect(done(loud, 's02')).toBe(true);
  });

  it('s03: EXPLOIT the ops portal after reading the vendor notes', () => {
    const ctx = game(); accept(ctx, 's03'); ctx.profile.tools.cipher = true;
    walk(ctx, 'isp_core', 'selatan_hub'); go(ctx, 'edge');
    must(ctx, 'READ', file('edge', 's03_vendor'));
    go(ctx, 'ops'); must(ctx, 'EXPLOIT', dev('ops'));
    must(ctx, 'READ', file('ops', 'memo_ops'));
    go(ctx, 'cold'); must(ctx, 'DOWNLOAD', file('cold', 'ledger'));
    must(ctx, 'DECRYPT', local('ledger'), 'COLD640');
    expect(done(ctx, 's03')).toBe(true);
  });

  it('s04: EXPLOIT the cashier service mode after reading its readme', () => {
    const ctx = game(); accept(ctx, 's04');
    walk(ctx, 'isp_core', 'tengah_hub', 'halte_info');
    must(ctx, 'READ', file('halte_info', 's04_readme'));
    go(ctx, 'warung_pos'); must(ctx, 'EXPLOIT', dev('warung_pos'));
    must(ctx, 'STOP', { type: 'proc', device: 'warung_pos', id: 'sync' });
    must(ctx, 'DOWNLOAD', file('warung_pos', 'laporan'));
    expect(done(ctx, 's04')).toBe(true);
  });

  it('s05: the transmitter log is a quick, partial proof with its own smaller ending', () => {
    const ctx = game(); accept(ctx, 's05');
    walk(ctx, 'isp_core', 'timur_hub'); go(ctx, 'radio_server'); go(ctx, 'pemancar');
    must(ctx, 'DOWNLOAD', file('pemancar', 's05_log_tx'));
    expect(done(ctx, 's05')).toBe(true);
    expect(ends(ctx, 's05')).toEqual({ siar: false, siar_sebagian: true });
    expect(fin(ctx, 's05', 'siar_sebagian').reward).toBeLessThan(300);
  });

  it('s06: the backup copy at the village hall has its own key', () => {
    const ctx = game(); accept(ctx, 's06'); ctx.profile.tools.cipher = true;
    walk(ctx, 'isp_core', 'timur_hub'); go(ctx, 'balai_printer');
    must(ctx, 'READ', file('balai_printer', 's06_catatan'));
    must(ctx, 'DOWNLOAD', file('balai_printer', 's06_cadangan'));
    must(ctx, 'DECRYPT', local('s06_cadangan'), 'NILAI1998');
    expect(done(ctx, 's06')).toBe(true);
    expect(ends(ctx, 's06').reuni).toBe(true);
  });

  it('s07: the Sniffer captures the operator login', () => {
    const ctx = game(); accept(ctx, 's07'); ctx.profile.tools.sniffer = true;
    walk(ctx, 'isp_core', 'tengah_hub', 'pos_satpam'); go(ctx, 's07_papan');
    expect(act(ctx, dev('s07_papan'), 'LOGIN').enabled).toBe(false);
    exec(ctx, 'INSPECT', dev('s07_papan'));
    expect(act(ctx, dev('s07_papan'), 'LOGIN').enabled).toBe(true);
  });

  it('s08: the recovered draft is a worse way out, never the full ending', () => {
    const ctx = game(); accept(ctx, 's08');
    walk(ctx, 'isp_core', 'tengah_hub', 'kelurahan_nas', 's08_printer', 's08_spool');
    must(ctx, 'RECOVER', file('s08_spool', 's08_draf')); must(ctx, 'DOWNLOAD', file('s08_spool', 's08_draf'));
    expect(ends(ctx, 's08')).toEqual({ cetak: false, cetak_draf: true });
    expect(fin(ctx, 's08', 'cetak_draf').reward).toBeLessThan(170);
  });

  it('s09: the treasurer note gives the payroll login, or EXPLOIT after reading the payroll info', () => {
    const ctx = game(); accept(ctx, 's09');
    walk(ctx, 'isp_core', 'utara_hub', 'gate_tol');
    must(ctx, 'READ', file('gate_tol', 's09_shift'));
    go(ctx, 's09_loket');
    must(ctx, 'LOGIN', dev('s09_loket'), 's09_petugas');
    must(ctx, 'READ', file('s09_loket', 's09_info_gaji'));
    exec(ctx, 'SCAN', dev('s09_loket'));
    expect(act(ctx, dev('s09_payroll'), 'CONNECT').enabled).toBe(true);
    must(ctx, 'READ', file('s09_loket', 's09_bendahara'));
    go(ctx, 's09_payroll');
    expect(act(ctx, dev('s09_payroll'), 'EXPLOIT').enabled).toBe(true);
    must(ctx, 'LOGIN', dev('s09_payroll'), 's09_bendahara');
    expect(ctx.run.devices.s09_payroll.access).toBe('admin');
    expect(ctx.run.flags).not.toContain('alarm_s09_payroll');
  });

  it('s10: EXPLOIT the router after the vendor bulletin', () => {
    const ctx = game(); accept(ctx, 's10');
    walk(ctx, 'isp_core', 'barat_hub', 's10_papan');
    must(ctx, 'READ', file('s10_papan', 's10_vendor'));
    go(ctx, 's10_router'); must(ctx, 'EXPLOIT', dev('s10_router'));
    must(ctx, 'DOWNLOAD', file('s10_router', 's10_konfig'));
    expect(done(ctx, 's10')).toBe(true);
  });

  it('s11: trace the mail archive copy without stopping the filter', () => {
    const ctx = game(); accept(ctx, 's11'); ctx.profile.cmds.push('TRACE'); ctx.profile.tools.tracer = true;
    walk(ctx, 'isp_core', 'tengah_hub', 'kelurahan_nas');
    must(ctx, 'READ', file('kelurahan_nas', 's11_salinan'));
    must(ctx, 'TRACE', file('kelurahan_nas', 's11_salinan'));
    expect(done(ctx, 's11')).toBe(true);
  });

  it('s12: the Sniffer captures the pharmacist login', () => {
    const ctx = game(); accept(ctx, 's12'); ctx.profile.tools.sniffer = true;
    walk(ctx, 'isp_core', 'timur_hub', 'klinik_ws'); go(ctx, 's12_farmasi');
    expect(act(ctx, dev('s12_farmasi'), 'LOGIN').enabled).toBe(false);
    exec(ctx, 'INSPECT', dev('s12_farmasi'));
    must(ctx, 'LOGIN', dev('s12_farmasi'), 's12_apoteker');
  });

  it('s13: the station estimate is a partial answer with its own smaller ending', () => {
    const ctx = game(); accept(ctx, 's13');
    walk(ctx, 'isp_core', 'timur_hub', 's13_stasiun');
    ctx.run.devices.s13_stasiun.access = 'user';
    must(ctx, 'DOWNLOAD', file('s13_stasiun', 's13_perkiraan'));
    expect(done(ctx, 's13')).toBe(true);
    expect(ends(ctx, 's13')).toEqual({ posisi: false, posisi_perkiraan: true });
    expect(fin(ctx, 's13', 'posisi_perkiraan').reward).toBeLessThan(340);
  });

  it('s14: EXPLOIT the customs system after the vendor notes', () => {
    const ctx = game(); accept(ctx, 's14');
    walk(ctx, 'isp_core', 'timur_hub', 's14_kantor'); go(ctx, 's14_timbang');
    must(ctx, 'READ', file('s14_timbang', 's14_vendor'));
    go(ctx, 's14_kantor'); ctx.run.devices.s14_arsip.access = 'user'; go(ctx, 's14_arsip'); go(ctx, 's14_bea');
    must(ctx, 'EXPLOIT', dev('s14_bea'));
    expect(ctx.run.devices.s14_bea.access).toBe('admin');
  });

  it('s15: EXPLOIT the secretariat PC after the forum post', () => {
    const ctx = game(); accept(ctx, 's15');
    walk(ctx, 'isp_core', 'barat_hub', 's15_portal'); go(ctx, 's15_situs');
    must(ctx, 'READ', file('s15_situs', 's15_forum'));
    go(ctx, 's15_portal'); go(ctx, 's15_sekre'); must(ctx, 'EXPLOIT', dev('s15_sekre'));
    expect(ctx.run.devices.s15_sekre.access).toBe('user');
  });

  it('s16: loudly bypass the two approvals', () => {
    const ctx = game(); accept(ctx, 's16');
    walk(ctx, 'isp_core', 'selatan_hub', 's16_loket');
    must(ctx, 'READ', file('s16_loket', 's16_umum')); must(ctx, 'READ', file('s16_loket', 's16_forum'));
    go(ctx, 's16_support'); must(ctx, 'CRACK', dev('s16_support'), 'beku-12');
    go(ctx, 's16_brankas'); must(ctx, 'EXPLOIT', dev('s16_brankas'));
    expect(done(ctx, 's16')).toBe(true);
    expect(ctx.run.flags).toContain('alarm_s16_brankas');
  });

  it('s17: take the relay tower directly, without the repair shop or UPLOAD', () => {
    const ctx = game(); accept(ctx, 's17'); ctx.profile.cmds.push('ROUTE');
    walk(ctx, 'isp_core', 'selatan_hub', 's17_gang');
    must(ctx, 'READ', file('s17_gang', 's17_forum'));
    go(ctx, 'selatan_hub'); go(ctx, 'menara_relay');
    must(ctx, 'EXPLOIT', dev('menara_relay'));
    expect(done(ctx, 's17')).toBe(true);
    expect(ctx.run.flags).toContain('alarm_menara_relay');
    route(ctx, 'industri_hub');
  });

  it('s18: the vendor account opens the control room without the operator login', () => {
    const ctx = industri(); accept(ctx, 's18');
    go(ctx, 's18_panel'); exec(ctx, 'SCAN', dev('s18_panel')); go(ctx, 's18_scada');
    expect(act(ctx, dev('s18_scada'), 'EXPLOIT').enabled).toBe(false);
    go(ctx, 's18_panel'); must(ctx, 'READ', file('s18_panel', 's18_vendor'));
    go(ctx, 's18_scada'); must(ctx, 'EXPLOIT', dev('s18_scada'));
    expect(ctx.run.devices.s18_scada.access).toBe('admin');
  });

  it('s19: the safe values are also on the tank placard', () => {
    const ctx = industri(); accept(ctx, 's19');
    go(ctx, 's19_gerbang'); go(ctx, 's19_tangki');
    const r = must(ctx, 'READ', file('s19_tangki', 's19_plakat'));
    expect(r.sheet.content).toMatch(/3\.5 bar/);
  });

  it('s20: force the compressor from the panel; a smaller ending and no warehouse key', () => {
    const ctx = industri(); accept(ctx, 's20');
    go(ctx, 's20_panel');
    must(ctx, 'CONTROL', control('s20_panel', 's20_bypass'), 'PAKSA');
    go(ctx, 's20_kompresor');
    must(ctx, 'CONTROL', control('s20_kompresor', 's20_komp_daya'), 'NORMAL');
    expect(done(ctx, 's20')).toBe(true);
    expect(ends(ctx, 's20')).toEqual({ dingin: false, dingin_darurat: true });
    const e = mission('s20').endings.find((x) => x.id === 'dingin_darurat');
    expect(e.noItems).toBe(true);
    expect(fin(ctx, 's20', 'dingin_darurat').reward).toBeLessThan(640);
  });

  it('the Trace timer still applies when you break in loudly', () => {
    const ctx = game(); accept(ctx, 's02');
    walk(ctx, 'isp_core', 'utara_hub', 'gw'); must(ctx, 'READ', file('gw', 'note')); go(ctx, 'dvr');
    must(ctx, 'EXPLOIT', dev('dvr'));
    const kick = tickTrace(ctx.run, 10 * 60000);
    expect(kick).toEqual({ id: 'dvr' });
  });
});
