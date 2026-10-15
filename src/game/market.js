import { TOOLS } from './profile.js';
import { siteById } from '../sites/index.js';
import { WORLD_NODES } from './world.js';

// Black-market catalog. Effects are applied to the persistent profile.
export const MARKET = [
  { id: 'buy_cipher', name: 'Tool: Cipher', cost: 120, kind: 'tool', tool: 'cipher',
    desc: 'Membuka file terenkripsi (perintah DECRYPT).' },
  { id: 'buy_skeleton', name: 'Tool: Skeleton Key', cost: 220, kind: 'tool', tool: 'skeleton',
    desc: 'Memanfaatkan celah layanan (perintah EXPLOIT).' },
  { id: 'ram_6', name: 'Upgrade RAM → 6', cost: 180, kind: 'ram', ram: 6,
    desc: 'Lebih banyak tool aktif sekaligus.' },
  { id: 'ram_8', name: 'Upgrade RAM → 8', cost: 320, kind: 'ram', ram: 8, needs: 'ram_6',
    desc: 'Kapasitas rig maksimum.' },
  { id: 'intel_s03', name: 'Intel: Bursa Selatan', cost: 90, kind: 'intel', site: 's03',
    desc: 'Buka lokasi "Brankas Dingin" di peta lebih awal.' }
];

export function owned(profile, item) {
  if (item.kind === 'tool') return !!profile.tools[item.tool];
  if (item.kind === 'ram') return profile.ram >= item.ram;
  if (item.kind === 'intel') return !!profile.intel[item.site];
  return false;
}

export function canBuy(profile, item) {
  if (owned(profile, item)) return { ok: false, reason: 'Sudah dimiliki.' };
  if (item.needs && !profile.bought.includes(item.needs)) {
    const dep = MARKET.find((m) => m.id === item.needs);
    return { ok: false, reason: `Butuh "${dep?.name}" dulu.` };
  }
  if (profile.credits < item.cost) return { ok: false, reason: 'Kredit tidak cukup.' };
  return { ok: true };
}

export function buy(profile, itemId) {
  const item = MARKET.find((m) => m.id === itemId);
  if (!item) return { ok: false, msg: 'Item tidak ada.' };
  const c = canBuy(profile, item);
  if (!c.ok) return { ok: false, msg: c.reason };
  profile.credits -= item.cost;
  profile.bought.push(item.id);
  if (item.kind === 'tool') profile.tools[item.tool] = true;
  else if (item.kind === 'ram') profile.ram = item.ram;
  else if (item.kind === 'intel') profile.intel[item.site] = true;
  return { ok: true, msg: `Dibeli: ${item.name}.` };
}
