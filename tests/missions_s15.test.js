import { describe, it, expect } from 'vitest';
import { exec, finish, getActions, endings } from '../src/engine/actions.js';
import { game, accept, mission, dev, file, local, walk, go, must, done } from './helpers/city.js';

function toArchive(ctx) {
  accept(ctx, 's15');
  walk(ctx, 'isp_core', 'barat_hub', 's15_portal');
  must(ctx, 'READ', file('s15_portal', 's15_pengumuman'));
  go(ctx, 's15_situs');
  must(ctx, 'READ', file('s15_situs', 's15_profil'));
  go(ctx, 's15_portal');
  go(ctx, 's15_sekre');
  must(ctx, 'CRACK', dev('s15_sekre'), 'nasi-kucing');
  must(ctx, 'READ', file('s15_sekre', 's15_notulen'));
  must(ctx, 'READ', file('s15_sekre', 's15_piagam'));
  go(ctx, 's15_arsip');
  must(ctx, 'DOWNLOAD', file('s15_arsip', 's15_arsip_enc'));
}

describe('s15 Server Himpunan', () => {
  it('solusi lengkap dari isp_core', () => {
    const ctx = game(); ctx.profile.tools.cipher = true;
    toArchive(ctx);
    must(ctx, 'DECRYPT', local('s15_arsip_enc'), 'HIMAKOM2011');
    expect(done(ctx, 's15')).toBe(true);
    const c = { ...ctx, mission: mission('s15') };
    expect(endings(c).find((e) => e.id === 'serahkan').available).toBe(true);
    expect(endings(c).find((e) => e.id === 'serahkan_surat').available).toBe(false);
    expect(finish(c, 'serahkan').reward).toBe(400);
  });

  it('ending bonus setelah membaca surat ketua lama', () => {
    const ctx = game(); ctx.profile.tools.cipher = true;
    toArchive(ctx);
    go(ctx, 's15_portal'); go(ctx, 's15_situs');
    must(ctx, 'READ', file('s15_situs', 's15_surat'));
    must(ctx, 'DECRYPT', local('s15_arsip_enc'), 'HIMAKOM2011');
    const c = { ...ctx, mission: mission('s15') };
    expect(endings(c).find((e) => e.id === 'serahkan_surat').available).toBe(true);
    expect(finish(c, 'serahkan_surat').reward).toBe(440);
  });

  it('kunci salah (tahun pelantikan, tahun kampus) ditolak dan tidak ada jalan buntu', () => {
    const ctx = game(); ctx.profile.tools.cipher = true;
    toArchive(ctx);
    for (const k of ['HIMAKOM2016', 'HIMAKOM1998', 'HIMKOM2011']) {
      exec(ctx, 'DECRYPT', local('s15_arsip_enc'), k);
      expect(done(ctx, 's15')).toBe(false);
    }
    must(ctx, 'DECRYPT', local('s15_arsip_enc'), 'HIMAKOM2011');
    expect(done(ctx, 's15')).toBe(true);
  });

  it('tidak bisa dilewati: arsip tertutup tanpa sandi sekretariat; DECRYPT butuh Cipher', () => {
    const ctx = game(); accept(ctx, 's15');
    walk(ctx, 'isp_core', 'barat_hub', 's15_portal');
    const a = getActions(ctx, dev('s15_arsip')).find((x) => x.cmd === 'CONNECT');
    expect(a.enabled).toBe(false);
    exec(ctx, 'CRACK', dev('s15_sekre'), 'sekre123');
    expect(ctx.run.devices.s15_sekre.access).toBe('none');
    const ctx2 = game();
    toArchive(ctx2);
    const d = getActions(ctx2, local('s15_arsip_enc')).find((x) => x.cmd === 'DECRYPT');
    expect(d.enabled).toBe(false);
  });
});
