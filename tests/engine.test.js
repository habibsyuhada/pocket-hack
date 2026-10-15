import { describe, it, expect, beforeEach } from 'vitest';
import { newProfile, newRun, atLeast, device, visibleFiles, reachable } from '../src/engine/core.js';
import { getActions, getChoices, exec, objectives, finish, endings } from '../src/engine/actions.js';
import m00 from '../src/sites/s00_kafe.js';
import m01 from '../src/sites/s01_blueprint.js';
import s03 from '../src/sites/s03_vault.js';

function ctxFor(mission, profile = newProfile()) {
  return { mission, run: newRun(mission), profile };
}
const action = (ctx, cmd, target) => getActions(ctx, target).find((a) => a.cmd === cmd);

describe('core', () => {
  it('access ordering', () => {
    expect(atLeast('admin', 'user')).toBe(true);
    expect(atLeast('guest', 'admin')).toBe(false);
    expect(atLeast('none', 'guest')).toBe(false);
  });

  it('fresh profile owns keyloom + mender, not cipher', () => {
    const p = newProfile();
    expect(p.tools.keyloom).toBe(true);
    expect(p.tools.mender).toBe(true);
    expect(p.tools.cipher).toBe(false);
  });
});

describe('m00 tutorial path', () => {
  let ctx;
  beforeEach(() => { ctx = ctxFor(m00); });

  it('scan from rig reveals router', () => {
    exec(ctx, 'SCAN', { type: 'rig' });
    expect(device(ctx.run, 'router').discovered).toBe(true);
    expect(device(ctx.run, 'printer').discovered).toBe(false);
  });

  it('full solve to main objective', () => {
    exec(ctx, 'SCAN', { type: 'rig' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'router' });
    expect(device(ctx.run, 'router').access).toBe('guest');
    exec(ctx, 'READ', { type: 'file', device: 'router', id: 'wifi_info' });
    expect(ctx.run.creds).toContain('printer_servis');
    exec(ctx, 'SCAN', { type: 'device', id: 'router' });
    expect(device(ctx.run, 'printer').discovered).toBe(true);
    exec(ctx, 'CONNECT', { type: 'device', id: 'printer' });
    exec(ctx, 'LOGIN', { type: 'device', id: 'printer' }, 'printer_servis');
    expect(device(ctx.run, 'printer').access).toBe('admin');
    // file is locked by spooler until stopped
    expect(visibleFiles(ctx.run, 'printer').some((f) => f.id === 'menu_baru')).toBe(true);
    const dl = action(ctx, 'DOWNLOAD', { type: 'file', device: 'printer', id: 'menu_baru' });
    expect(dl.enabled).toBe(false); // locked by spooler
    exec(ctx, 'STOP', { type: 'proc', device: 'printer', id: 'spooler' });
    exec(ctx, 'DOWNLOAD', { type: 'file', device: 'printer', id: 'menu_baru' });
    const main = objectives(ctx).find((o) => o.main);
    expect(main.done).toBe(true);
  });

  it('core firmware proc cannot be stopped', () => {
    exec(ctx, 'SCAN', { type: 'rig' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'router' });
    exec(ctx, 'READ', { type: 'file', device: 'router', id: 'wifi_info' });
    exec(ctx, 'SCAN', { type: 'device', id: 'router' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'printer' });
    exec(ctx, 'LOGIN', { type: 'device', id: 'printer' }, 'printer_servis');
    const a = action(ctx, 'STOP', { type: 'proc', device: 'printer', id: 'fw' });
    expect(a.enabled).toBe(false);
  });

  it('finish rewards and unlocks cipher', () => {
    exec(ctx, 'SCAN', { type: 'rig' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'router' });
    exec(ctx, 'READ', { type: 'file', device: 'router', id: 'wifi_info' });
    exec(ctx, 'SCAN', { type: 'device', id: 'router' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'printer' });
    exec(ctx, 'LOGIN', { type: 'device', id: 'printer' }, 'printer_servis');
    exec(ctx, 'STOP', { type: 'proc', device: 'printer', id: 'spooler' });
    exec(ctx, 'DOWNLOAD', { type: 'file', device: 'printer', id: 'menu_baru' });
    const res = finish(ctx, 'deliver');
    expect(res.reward).toBe(150);
    expect(ctx.profile.tools.cipher).toBe(true);
    expect(ctx.profile.archive.some((a) => a.id === 'menu_baru')).toBe(true);
  });
});

describe('m01 two paths', () => {
  function solved(ctx) { return objectives(ctx).find((o) => o.main).done; }

  it('server path: crack teknisi, wrong candidate rejected', () => {
    const ctx = ctxFor(m01);
    exec(ctx, 'SCAN', { type: 'rig' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'gateway' });
    exec(ctx, 'READ', { type: 'file', device: 'gateway', id: 'board' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'teknisi' });
    exec(ctx, 'CRACK', { type: 'device', id: 'teknisi' }, 'kanvas2023');
    expect(device(ctx.run, 'teknisi').access).toBe('none');
    exec(ctx, 'CRACK', { type: 'device', id: 'teknisi' }, 'ARSIP07-2024');
    expect(device(ctx.run, 'teknisi').access).toBe('user');
  });

  it('server path: blueprint gated behind arcd service', () => {
    const ctx = ctxFor(m01);
    exec(ctx, 'SCAN', { type: 'rig' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'gateway' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'archive' });
    expect(device(ctx.run, 'archive').access).toBe('user');
    // blueprint hidden while arcd down
    expect(visibleFiles(ctx.run, 'archive').some((f) => f.id === 'blueprint_asli')).toBe(false);
    // wrong config => start fails, service stays down
    exec(ctx, 'START', { type: 'proc', device: 'archive', id: 'arcd' });
    expect(device(ctx.run, 'archive').procs[0].running).toBe(false);
    // correct config => starts
    exec(ctx, 'CONFIG', { type: 'proc', device: 'archive', id: 'arcd' }, ['mode', 'rw']);
    exec(ctx, 'CONFIG', { type: 'proc', device: 'archive', id: 'arcd' }, ['sumber', '/vol/arsip07']);
    exec(ctx, 'START', { type: 'proc', device: 'archive', id: 'arcd' });
    expect(device(ctx.run, 'archive').procs[0].running).toBe(true);
    expect(visibleFiles(ctx.run, 'archive').some((f) => f.id === 'blueprint_asli')).toBe(true);
    exec(ctx, 'DOWNLOAD', { type: 'file', device: 'archive', id: 'blueprint_asli' });
    expect(solved(ctx)).toBe(true);
  });

  it('backup path: recover then decrypt', () => {
    const ctx = ctxFor(m01);
    ctx.profile.tools.cipher = true;
    exec(ctx, 'SCAN', { type: 'rig' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'gateway' });
    exec(ctx, 'READ', { type: 'file', device: 'gateway', id: 'board' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'backup' });
    exec(ctx, 'RECOVER', { type: 'file', device: 'backup', id: 'blueprint_backup' });
    expect(device(ctx.run, 'backup').files.find((f) => f.id === 'blueprint_backup').corrupt).toBe(false);
    exec(ctx, 'DOWNLOAD', { type: 'file', device: 'backup', id: 'blueprint_backup' });
    const local = ctx.run.local.find((f) => f.id === 'blueprint_backup');
    expect(local.encrypted).toBeTruthy();
    exec(ctx, 'DECRYPT', { type: 'file', local: true, id: 'blueprint_backup' }, 'wrong');
    expect(ctx.run.local.find((f) => f.id === 'blueprint_backup').encrypted).toBeTruthy();
    exec(ctx, 'DECRYPT', { type: 'file', local: true, id: 'blueprint_backup' }, 'ARSARSIP072024');
    expect(ctx.run.local.find((f) => f.id === 'blueprint_backup').encrypted).toBeFalsy();
    expect(solved(ctx)).toBe(true);
  });

  it('expose ending needs tamper evidence', () => {
    const ctx = ctxFor(m01);
    expect(endings(ctx).find((e) => e.id === 'expose').available).toBe(false);
    ctx.run.flags.push('found_tamper');
    expect(endings(ctx).find((e) => e.id === 'expose').available).toBe(true);
  });
});

describe('s03 vault decrypt chooser (regression)', () => {
  it('DECRYPT chooser lists key options from f.encrypted.keyOptions', () => {
    const ctx = ctxFor(s03);
    ctx.profile.tools.cipher = true;
    exec(ctx, 'SCAN', { type: 'rig' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'edge' });
    exec(ctx, 'CONNECT', { type: 'device', id: 'cold' });
    exec(ctx, 'DOWNLOAD', { type: 'file', device: 'cold', id: 'ledger' });
    const target = { type: 'file', local: true, id: 'ledger' };
    const choices = getChoices(ctx, 'DECRYPT', target);
    expect(Array.isArray(choices)).toBe(true);
    expect(choices.map((c) => c.value)).toContain('COLD640');
    // and decrypting with the right key opens it
    exec(ctx, 'DECRYPT', target, 'COLD640');
    expect(ctx.run.local.find((f) => f.id === 'ledger').encrypted).toBeFalsy();
  });
});
