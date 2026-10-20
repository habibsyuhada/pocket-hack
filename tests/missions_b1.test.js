import { describe, it, expect } from 'vitest';
import { device, visibleFiles } from '../src/engine/core.js';
import { exec, finish, getActions } from '../src/engine/actions.js';
import { game, accept, mission, dev, file, proc, control, done, go, walk, must } from './helpers/city.js';

const fin = (ctx, id, ending) => finish({ ...ctx, mission: mission(id) }, ending);
const fl = (ctx) => ctx.run.flags;
const objDone = (ctx, mid, oid) => mission(mid).objectives.find((o) => o.id === oid).done(ctx.run);
const cmds = (ctx, target) => getActions(ctx, target).filter((a) => a.enabled).map((a) => a.cmd);
const avail = (ctx, mid, eid) => mission(mid).endings.find((e) => e.id === eid).requires(ctx.run);

describe('B-07 / s07 Papan Iklan Dibajak', () => {
  const sisip = proc('s07_papan', 's07_sisip'), jad = proc('s07_papan', 's07_penjadwal');

  it('solves from isp_core: default password from the guard post, stop the right process', () => {
    const ctx = game(); accept(ctx, 's07');
    walk(ctx, 'isp_core', 'tengah_hub');
    go(ctx, 'pos_satpam');
    must(ctx, 'READ', file('pos_satpam', 's07_serah_terima'));
    expect(ctx.run.creds).toContain('s07_operator');
    exec(ctx, 'SCAN', dev('pos_satpam'));
    go(ctx, 's07_papan');
    must(ctx, 'LOGIN', dev('s07_papan'), 's07_operator');
    expect(device(ctx.run, 's07_papan').access).toBe('admin');
    expect(done(ctx, 's07')).toBe(false);
    must(ctx, 'STOP', sisip);
    must(ctx, 'DOWNLOAD', file('s07_papan', 's07_jejak'));
    expect(done(ctx, 's07')).toBe(true);
    expect(objDone(ctx, 's07', 'resmi')).toBe(false);
    must(ctx, 'CONTROL', control('s07_papan', 's07_layar'), 'JADWAL RESMI');
    expect(objDone(ctx, 's07', 'resmi')).toBe(true);
    expect(avail(ctx, 's07', 'pulih')).toBe(true);
    expect(fin(ctx, 's07', 'pulih').reward).toBe(150);
  });

  it('cannot be skipped: no access, no files, no stopping without the login', () => {
    const ctx = game(); accept(ctx, 's07');
    walk(ctx, 'isp_core', 'tengah_hub', 'pos_satpam');
    go(ctx, 's07_papan');
    expect(device(ctx.run, 's07_papan').access).toBe('none');
    expect(cmds(ctx, dev('s07_papan'))).not.toContain('LOGIN');
    expect(getActions(ctx, sisip).find((a) => a.cmd === 'STOP').enabled).toBe(false);
    expect(done(ctx, 's07')).toBe(false);
    expect(avail(ctx, 's07', 'pulih')).toBe(false);
  });

  it('trap: stopping the legit scheduler blanks the screen; it can be restarted, the mission is not lost', () => {
    const ctx = game(); accept(ctx, 's07');
    walk(ctx, 'isp_core', 'tengah_hub', 'pos_satpam');
    must(ctx, 'READ', file('pos_satpam', 's07_serah_terima'));
    go(ctx, 's07_papan');
    must(ctx, 'LOGIN', dev('s07_papan'), 's07_operator');
    const r = must(ctx, 'STOP', jad);
    expect(r.out.some((o) => /hitam/.test(o.text))).toBe(true);
    expect(fl(ctx)).toContain('s07_layar_kosong');
    // the intruder log is still locked until the right process is stopped
    expect(getActions(ctx, file('s07_papan', 's07_jejak')).find((a) => a.cmd === 'DOWNLOAD').enabled).toBe(false);
    must(ctx, 'START', jad);
    must(ctx, 'STOP', sisip);
    must(ctx, 'DOWNLOAD', file('s07_papan', 's07_jejak'));
    expect(done(ctx, 's07')).toBe(true);
  });
});

describe('B-08 / s08 Printer Kelurahan', () => {
  it('solves via kelurahan_nas: RECOVER the FINAL invitation, then DOWNLOAD', () => {
    const ctx = game(); accept(ctx, 's08');
    walk(ctx, 'isp_core', 'tengah_hub', 'kelurahan_nas');
    must(ctx, 'READ', file('kelurahan_nas', 's08_info_it'));
    go(ctx, 's08_printer');
    must(ctx, 'READ', file('s08_printer', 's08_petugas'));
    exec(ctx, 'SCAN', dev('s08_printer'));
    go(ctx, 's08_spool');
    expect(done(ctx, 's08')).toBe(false);
    must(ctx, 'RECOVER', file('s08_spool', 's08_final'));
    must(ctx, 'DOWNLOAD', file('s08_spool', 's08_final'));
    expect(done(ctx, 's08')).toBe(true);
    expect(ctx.run.local.find((f) => f.id === 's08_final').content).toContain('Jumat');
    expect(objDone(ctx, 's08', 'daftar')).toBe(false);
    must(ctx, 'RECOVER', file('s08_spool', 's08_daftar'));
    must(ctx, 'DOWNLOAD', file('s08_spool', 's08_daftar'));
    expect(objDone(ctx, 's08', 'daftar')).toBe(true);
    expect(fin(ctx, 's08', 'cetak').reward).toBe(170);
  });

  it('cannot download a deleted file before RECOVER; the draft is a decoy with the wrong date', () => {
    const ctx = game(); accept(ctx, 's08');
    walk(ctx, 'isp_core', 'tengah_hub', 'kelurahan_nas', 's08_printer', 's08_spool');
    const dl = getActions(ctx, file('s08_spool', 's08_final')).find((a) => a.cmd === 'DOWNLOAD');
    expect(dl.enabled).toBe(false);
    must(ctx, 'RECOVER', file('s08_spool', 's08_draf'));
    must(ctx, 'DOWNLOAD', file('s08_spool', 's08_draf'));
    expect(ctx.run.local.find((f) => f.id === 's08_draf').content).toContain('Kamis');
    expect(done(ctx, 's08')).toBe(false);
    expect(avail(ctx, 's08', 'cetak')).toBe(false);
  });

  it('the printer cannot be reached without passing the NAS', () => {
    const ctx = game(); accept(ctx, 's08');
    walk(ctx, 'isp_core', 'tengah_hub');
    const a = getActions(ctx, dev('s08_printer')).find((x) => x.cmd === 'CONNECT');
    expect(a.enabled).toBe(false);
  });

  it('RECOVER needs the Mender tool', () => {
    const ctx = game(); accept(ctx, 's08');
    ctx.profile.tools.mender = false;
    walk(ctx, 'isp_core', 'tengah_hub', 'kelurahan_nas', 's08_printer', 's08_spool');
    expect(getActions(ctx, file('s08_spool', 's08_final')).find((a) => a.cmd === 'RECOVER').enabled).toBe(false);
  });
});

describe('U-09 / s09 Absensi Loket Bus', () => {
  const days = ['s09_senin', 's09_selasa', 's09_rabu', 's09_kamis', 's09_jumat'];
  const tahan = control('s09_payroll', 's09_tahan');
  function toPayroll(ctx) {
    walk(ctx, 'isp_core', 'utara_hub', 'gate_tol');
    must(ctx, 'READ', file('gate_tol', 's09_shift'));
    must(ctx, 'READ', file('gate_tol', 's09_log_gardu'));
    go(ctx, 's09_loket');
    must(ctx, 'LOGIN', dev('s09_loket'), 's09_petugas');
    for (const d of days) must(ctx, 'READ', file('s09_loket', d));
    must(ctx, 'READ', file('s09_loket', 's09_info_gaji'));
    exec(ctx, 'SCAN', dev('s09_loket'));
    go(ctx, 's09_payroll');
    must(ctx, 'EXPLOIT', dev('s09_payroll'));
  }

  it('solves from isp_core by cross-checking attendance and the toll gate log', () => {
    const ctx = game(); accept(ctx, 's09');
    toPayroll(ctx);
    expect(device(ctx.run, 's09_payroll').access).toBe('admin');
    expect(done(ctx, 's09')).toBe(false);
    must(ctx, 'CONTROL', tahan, 'Wawan');
    expect(fl(ctx)).toContain('s09_hantu_ditahan');
    expect(done(ctx, 's09')).toBe(true);
    expect(avail(ctx, 's09', 'liput')).toBe(true);
    // bonus: evidence copy
    go(ctx, 'gate_tol');
    must(ctx, 'DOWNLOAD', file('gate_tol', 's09_log_gardu'));
    expect(objDone(ctx, 's09', 'bukti')).toBe(true);
    expect(fin(ctx, 's09', 'liput').reward).toBe(200);
  });

  it('trap: freezing the sick driver (or anyone else) teaches and can be undone', () => {
    const ctx = game(); accept(ctx, 's09');
    toPayroll(ctx);
    const r = must(ctx, 'CONTROL', tahan, 'Darto');
    expect(r.out.some((o) => /izin sakit/.test(o.text))).toBe(true);
    expect(done(ctx, 's09')).toBe(false);
    expect(fl(ctx)).not.toContain('s09_hantu_ditahan');
    must(ctx, 'CONTROL', tahan, 'Wawan');
    expect(done(ctx, 's09')).toBe(true);
  });

  it('cannot be skipped: guessing without reading the evidence is not enough', () => {
    const ctx = game(); accept(ctx, 's09');
    walk(ctx, 'isp_core', 'utara_hub', 'gate_tol');
    must(ctx, 'READ', file('gate_tol', 's09_shift'));
    go(ctx, 's09_loket');
    must(ctx, 'LOGIN', dev('s09_loket'), 's09_petugas');
    must(ctx, 'READ', file('s09_loket', 's09_info_gaji'));
    go(ctx, 's09_payroll');
    must(ctx, 'EXPLOIT', dev('s09_payroll'));
    must(ctx, 'CONTROL', tahan, 'Wawan');
    expect(done(ctx, 's09')).toBe(false);
    expect(avail(ctx, 's09', 'liput')).toBe(false);
  });

  it('the loket is locked and the payroll server is only reachable from the loket', () => {
    const ctx = game(); accept(ctx, 's09');
    walk(ctx, 'isp_core', 'utara_hub', 'gate_tol');
    go(ctx, 's09_loket');
    expect(device(ctx.run, 's09_loket').access).toBe('none');
    expect(cmds(ctx, dev('s09_loket'))).not.toContain('LOGIN');
    expect(getActions(ctx, dev('s09_payroll')).find((a) => a.cmd === 'CONNECT').enabled).toBe(false);
  });
});

describe('W-10 / s10 Wi-Fi Asrama', () => {
  const router = dev('s10_router');
  function clues(ctx) {
    walk(ctx, 'isp_core', 'barat_hub', 's10_papan');
    must(ctx, 'READ', file('s10_papan', 's10_pengumuman'));
    go(ctx, 's10_pos');
    must(ctx, 'READ', file('s10_pos', 's10_buku_jaga'));
    go(ctx, 's10_papan');
    go(ctx, 's10_router');
  }

  it('solves from isp_core: CRACK with a password combined from two nodes', () => {
    const ctx = game(); accept(ctx, 's10');
    walk(ctx, 'isp_core', 'barat_hub', 's10_papan');
    must(ctx, 'READ', file('s10_papan', 's10_pengumuman'));
    exec(ctx, 'SCAN', dev('s10_papan'));
    go(ctx, 's10_pos');
    must(ctx, 'READ', file('s10_pos', 's10_buku_jaga'));
    expect(ctx.run.clues).toEqual(expect.arrayContaining(['s10_aturan', 's10_tahun']));
    go(ctx, 's10_papan');
    go(ctx, 's10_router');
    must(ctx, 'CRACK', router, 'KENANGA2003');
    expect(device(ctx.run, 's10_router').access).toBe('admin');
    must(ctx, 'DOWNLOAD', file('s10_router', 's10_konfig'));
    expect(done(ctx, 's10')).toBe(true);
    must(ctx, 'CONTROL', control('s10_router', 's10_mode'), 'NORMAL 20 Mbps');
    expect(objDone(ctx, 's10', 'normal')).toBe(true);
    expect(fin(ctx, 's10', 'normal').reward).toBe(220);
  });

  it('traps: the old password and half-passwords are rejected and teach', () => {
    const ctx = game(); accept(ctx, 's10');
    clues(ctx);
    for (const bad of ['asrama123', 'KENANGA', 'ASRAMA2003']) {
      const r = must(ctx, 'CRACK', router, bad);
      expect(r.out.some((o) => o.t === 'warn')).toBe(true);
      expect(device(ctx.run, 's10_router').access).toBe('none');
    }
    expect(done(ctx, 's10')).toBe(false);
    must(ctx, 'CRACK', router, 'KENANGA2003');
    expect(device(ctx.run, 's10_router').access).toBe('admin');
  });

  it('cannot be skipped: the config is invisible and locked without the CRACK', () => {
    const ctx = game(); accept(ctx, 's10');
    clues(ctx);
    expect(visibleFiles(ctx.run, 's10_router')).toEqual([]);   // nothing listed until the password is cracked
    expect(done(ctx, 's10')).toBe(false);
    expect(avail(ctx, 's10', 'normal')).toBe(false);
  });

  it('the router hangs off the notice board only', () => {
    const ctx = game(); accept(ctx, 's10');
    walk(ctx, 'isp_core', 'barat_hub');
    expect(getActions(ctx, dev('s10_router')).find((a) => a.cmd === 'CONNECT').enabled).toBe(false);
  });
});

describe('S-11 / s11 Surat Tanpa Pengirim', () => {
  const letter = file('s11_kotak', 's11_peringatan');
  function toKotak(ctx) {
    walk(ctx, 'isp_core', 'tengah_hub', 'kelurahan_nas');
    must(ctx, 'READ', file('kelurahan_nas', 's11_pesan_lurah'));
    go(ctx, 's11_kotak');
  }

  it('solves from isp_core: STOP the filter, TRACE the letter (Tracer) -> SENTINEL in the industrial district', () => {
    const ctx = game(); accept(ctx, 's11');
    ctx.profile.tools.tracer = true;
    toKotak(ctx);
    must(ctx, 'STOP', proc('s11_kotak', 's11_filter'));
    must(ctx, 'READ', letter);
    expect(done(ctx, 's11')).toBe(false);
    const r = must(ctx, 'TRACE', letter);
    expect(r.sheet.content).toContain('kawasan industri');
    expect(fl(ctx)).toContain('sentinel_industri');
    expect(ctx.run.clues).toContain('s11_asal');
    expect(device(ctx.run, 'menara_relay').discovered).toBe(true);
    expect(done(ctx, 's11')).toBe(true);
    expect(getActions(ctx, letter).some((a) => a.cmd === 'TRACE')).toBe(false); // once per file
    must(ctx, 'DOWNLOAD', letter);
    expect(objDone(ctx, 's11', 'arsip')).toBe(true);
    expect(fin(ctx, 's11', 'lapor').reward).toBe(260);
  });

  it('cannot be skipped: no Tracer, no trace; the filter locks the letter; the promo is a decoy', () => {
    const ctx = game(); accept(ctx, 's11');
    toKotak(ctx);
    const trace = () => getActions(ctx, letter).find((a) => a.cmd === 'TRACE');
    expect(trace().enabled).toBe(false);                       // locked by the filter (and no Tracer)
    must(ctx, 'STOP', proc('s11_kotak', 's11_filter'));
    expect(trace().enabled).toBe(false);                       // still no Tracer
    expect(trace().reason).toMatch(/Tracer/);
    expect(done(ctx, 's11')).toBe(false);
    expect(avail(ctx, 's11', 'lapor')).toBe(false);
    ctx.profile.tools.tracer = true;
    must(ctx, 'TRACE', file('s11_kotak', 's11_promo'));        // wrong file: harmless, teaches
    expect(fl(ctx)).not.toContain('sentinel_industri');
    expect(done(ctx, 's11')).toBe(false);
    must(ctx, 'TRACE', letter);
    expect(done(ctx, 's11')).toBe(true);
  });

  it('mission is gated behind s08 and the mailbox is only reachable via the NAS', () => {
    expect(mission('s11').meta.requires).toEqual(['s08']);
    const ctx = game(); accept(ctx, 's11');
    walk(ctx, 'isp_core', 'tengah_hub');
    expect(getActions(ctx, dev('s11_kotak')).find((a) => a.cmd === 'CONNECT').enabled).toBe(false);
  });
});

describe('Babak 1 mission data', () => {
  it('follows the allocation table', () => {
    const t = { s07: ['laras', 2, 1, 150, 50], s08: ['hadi', 0, 1, 170, 50], s09: ['rani', 1, 2, 200, 60], s10: ['vira', 0, 2, 220, 60], s11: ['hadi', 1, 2, 260, 80] };
    for (const [id, [giver, lvl, diff, reward, rep]] of Object.entries(t)) {
      const m = mission(id);
      expect([m.meta.giver, m.meta.minLevel, m.meta.difficulty, m.reward, m.meta.repReward]).toEqual([giver, lvl, diff, reward, rep]);
      expect(m.endings.every((e) => e.reward === reward)).toBe(true);
      expect(m.objectives.filter((o) => o.main).length).toBe(1);
      expect(m.objectives.length).toBeGreaterThanOrEqual(3);
      expect(m.objectives.length).toBeLessThanOrEqual(5);
      expect(m.objectives.filter((o) => o.bonus).length).toBeLessThanOrEqual(1);
      expect(m.dialogue.offer.lines.length).toBeGreaterThan(0);
      expect(m.dialogue.turnIn.length).toBeGreaterThan(0);
    }
  });

  it('every id is prefixed with its mission id', () => {
    for (const id of ['s07', 's08', 's09', 's10', 's11']) {
      const m = mission(id);
      for (const [nid, d] of Object.entries(m.world.devices)) {
        expect(nid.startsWith(`${id}_`), nid).toBe(true);
        const mine = (x) => !/^(fl|pr)_\d+$/.test(x.id);   // shared set-dressing has generated ids
        for (const f of (d.files || []).filter(mine)) expect(f.id.startsWith(`${id}_`), f.id).toBe(true);
        for (const p of (d.procs || []).filter(mine)) expect(p.id.startsWith(`${id}_`), p.id).toBe(true);
        for (const c of d.controls || []) expect(c.id.startsWith(`${id}_`), c.id).toBe(true);
      }
      for (const k of Object.keys(m.creds || {})) expect(k.startsWith(`${id}_`)).toBe(true);
      for (const k of Object.keys(m.clues || {})) expect(k.startsWith(`${id}_`)).toBe(true);
      for (const p of Object.values(m.patches || {})) for (const f of p.files || []) expect(f.id.startsWith(`${id}_`), f.id).toBe(true);
    }
  });

  it('hints are non-empty and the first hint names the paid requirement where there is one', () => {
    const fresh = () => { const c = game(); return c; };
    const first = (id) => mission(id).hints.find((h) => h.when(fresh().run, fresh().profile)).text;
    expect(first('s11')).toMatch(/Tracer/);
    expect(first('s11')).toMatch(/Pasar Gelap/);
  });

  it('briefs describe the problem, not the steps: no command names, tools or prices', () => {
    for (const id of ['s04', 's06', 's07', 's08', 's09', 's10', 's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20', 's21']) {
      expect(mission(id).brief, id).not.toMatch(/\b(SEARCH|TRACE|ROUTE|UPLOAD|EDIT|COMPARE|ELEVATE|DECRYPT|RECOVER|DOWNLOAD|Cipher|Tracer|Sniffer|Mender)\b|◆|Pasar Gelap/);
    }
  });
});
