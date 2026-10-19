import { describe, it, expect } from 'vitest';
import { exec, finish, getActions, endings } from '../src/engine/actions.js';
import { game, accept, mission, dev, file, control, walk, go, must, done } from './helpers/city.js';

function toWallet(ctx, { ops = true, audit = true } = {}) {
  accept(ctx, 's16');
  walk(ctx, 'isp_core', 'selatan_hub', 's16_loket');
  must(ctx, 'READ', file('s16_loket', 's16_umum'));
  go(ctx, 's16_support');
  must(ctx, 'CRACK', dev('s16_support'), 'beku-12');
  if (ops) must(ctx, 'READ', file('s16_support', 's16_izin_ops_f'));
  go(ctx, 's16_arsip');
  if (audit) must(ctx, 'READ', file('s16_arsip', 's16_izin_audit_f'));
  go(ctx, 's16_support');
  go(ctx, 's16_brankas');
}
const alokasi = (ctx, v) => must(ctx, 'CONTROL', control('s16_brankas', 's16_alokasi'), v);
const fin = (ctx, id) => finish({ ...ctx, mission: mission('s16') }, id);
const avail = (ctx) => Object.fromEntries(endings({ ...ctx, mission: mission('s16') }).map((e) => [e.id, e.available]));

describe('s16 Dompet Beku', () => {
  it('solusi lengkap: ELEVATE lalu tiap pilihan moral menamatkan dengan reward berbeda', () => {
    const rewards = {};
    for (const [choice, id] of [['KEMBALI KE KORBAN', 'kembali'], ['AMBIL UPAH', 'upah'], ['BAGI DUA', 'bagi']]) {
      const ctx = game();
      toWallet(ctx);
      must(ctx, 'ELEVATE', dev('s16_brankas'));
      expect(done(ctx, 's16')).toBe(true);
      expect(avail(ctx)).toEqual({ kembali: false, upah: false, bagi: false });
      alokasi(ctx, choice);
      expect(avail(ctx)).toEqual({ kembali: false, upah: false, bagi: false, [id]: true });
      rewards[id] = fin(ctx, id).reward;
    }
    expect(rewards).toEqual({ kembali: 380, upah: 560, bagi: 460 });
  });

  it('boleh mengganti keputusan sebelum melapor', () => {
    const ctx = game(); toWallet(ctx);
    must(ctx, 'ELEVATE', dev('s16_brankas'));
    alokasi(ctx, 'AMBIL UPAH'); alokasi(ctx, 'KEMBALI KE KORBAN');
    expect(avail(ctx).kembali).toBe(true);
    expect(avail(ctx).upah).toBe(false);
  });

  it('tidak bisa dilewati: ELEVATE ditolak tanpa dua izin, panel alokasi butuh admin', () => {
    const ctx = game(); toWallet(ctx, { ops: true, audit: false });
    exec(ctx, 'ELEVATE', dev('s16_brankas'));
    expect(ctx.run.devices.s16_brankas.access).toBe('user');
    expect(getActions(ctx, control('s16_brankas', 's16_alokasi')).find((a) => a.cmd === 'CONTROL').enabled).toBe(false);
    go(ctx, 's16_support'); go(ctx, 's16_arsip');
    must(ctx, 'READ', file('s16_arsip', 's16_izin_audit_f'));
    go(ctx, 's16_support'); go(ctx, 's16_brankas');
    must(ctx, 'ELEVATE', dev('s16_brankas'));
    expect(done(ctx, 's16')).toBe(true);
  });

  it('sandi salah ditolak; PC layanan menutup jalan ke arsip dan dompet', () => {
    const ctx = game(); accept(ctx, 's16');
    walk(ctx, 'isp_core', 'selatan_hub', 's16_loket');
    exec(ctx, 'CRACK', dev('s16_support'), 'beku-17');
    expect(ctx.run.devices.s16_support.access).toBe('none');
    expect(getActions(ctx, dev('s16_brankas')).find((a) => a.cmd === 'CONNECT').enabled).toBe(false);
  });
});
