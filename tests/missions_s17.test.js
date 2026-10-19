import { describe, it, expect } from 'vitest';
import { exec, finish, getActions, endings } from '../src/engine/actions.js';
import { game, accept, mission, dev, file, local, walk, go, must, route, done } from './helpers/city.js';

function toModem(ctx) {
  accept(ctx, 's17');
  walk(ctx, 'isp_core', 'selatan_hub', 's17_gang');
  must(ctx, 'READ', file('s17_gang', 's17_nota'));
  go(ctx, 's17_bengkel');
  must(ctx, 'LOGIN', dev('s17_bengkel'), 's17_bengkel_montir');
  must(ctx, 'READ', file('s17_bengkel', 's17_catatan_modem'));
  must(ctx, 'DOWNLOAD', file('s17_bengkel', 's17_patch'));
  go(ctx, 's17_modem');
  must(ctx, 'LOGIN', dev('s17_modem'), 's17_modem_montir');
}
const toRelay = (ctx) => { go(ctx, 's17_bengkel'); go(ctx, 's17_gang'); go(ctx, 'selatan_hub'); go(ctx, 'menara_relay'); };

describe('s17 Relay Gelap', () => {
  it('solusi lengkap: UPLOAD, ELEVATE admin menara, lalu ROUTE ke industri_hub', () => {
    const ctx = game();
    ctx.profile.cmds.push('UPLOAD', 'ROUTE');
    toModem(ctx);
    must(ctx, 'UPLOAD', local('s17_patch'));
    expect(ctx.run.flags).toContain('s17_patched');
    toRelay(ctx);
    must(ctx, 'ELEVATE', dev('menara_relay'));
    expect(done(ctx, 's17')).toBe(true);
    route(ctx, 'industri_hub');
    expect(ctx.run.current).toBe('industri_hub');
    const c = { ...ctx, mission: mission('s17') };
    expect(endings(c).find((e) => e.id === 'menara').available).toBe(true);
    expect(endings(c).find((e) => e.id === 'menara_sentinel').available).toBe(false);
    expect(finish(c, 'menara').reward).toBe(460);
  });

  it('ending bonus setelah membaca log modem', () => {
    const ctx = game(); ctx.profile.cmds.push('UPLOAD');
    toModem(ctx);
    must(ctx, 'READ', file('s17_modem', 's17_log_modem'));
    must(ctx, 'UPLOAD', local('s17_patch'));
    toRelay(ctx); must(ctx, 'ELEVATE', dev('menara_relay'));
    const c = { ...ctx, mission: mission('s17') };
    expect(endings(c).find((e) => e.id === 'menara_sentinel').available).toBe(true);
    expect(finish(c, 'menara_sentinel').reward).toBe(500);
  });

  it('ROUTE ke industri tertutup sebelum misi: tamu di menara tidak bisa ELEVATE', () => {
    const ctx = game(); ctx.profile.cmds.push('ROUTE');
    walk(ctx, 'isp_core', 'selatan_hub', 'menara_relay');
    expect(getActions(ctx, dev('industri_hub')).find((a) => a.cmd === 'ROUTE').enabled).toBe(false);
    exec(ctx, 'ELEVATE', dev('menara_relay'));
    expect(ctx.run.devices.menara_relay.access).toBe('guest');
    expect(getActions(ctx, dev('industri_hub')).find((a) => a.cmd === 'ROUTE').enabled).toBe(false);
  });

  it('patch lama ditolak (tidak ada UPLOAD), UPLOAD butuh perintahnya, dan jalan tidak buntu', () => {
    const ctx = game();
    toModem(ctx);
    go(ctx, 's17_bengkel');
    must(ctx, 'DOWNLOAD', file('s17_bengkel', 's17_patch_lama'));
    go(ctx, 's17_modem');
    expect(getActions(ctx, local('s17_patch_lama')).find((a) => a.cmd === 'UPLOAD')).toBeUndefined();
    expect(getActions(ctx, local('s17_patch')).find((a) => a.cmd === 'UPLOAD').enabled).toBe(false);   // belum beli UPLOAD
    ctx.profile.cmds.push('UPLOAD');
    must(ctx, 'UPLOAD', local('s17_patch'));
    expect(ctx.run.flags).toContain('s17_patched');
  });
});
