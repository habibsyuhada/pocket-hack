import { TOOLS } from './profile.js';
import { siteById } from '../sites/index.js';
import { WORLD_NODES } from './world.js';

// Black-market catalog. Effects are applied to the persistent profile.
export const MARKET = [
  { id: 'buy_cipher', name: 'Tool: Cipher', cost: 120, kind: 'tool', tool: 'cipher',
    desc: 'Membuka file terenkripsi (perintah DECRYPT).' },
  { id: 'intel_s01', name: 'Intel: Lab Barat', cost: 60, kind: 'intel', site: 's01',
    desc: 'Buka lokasi "Blueprint Asli" di peta lebih awal.' },
  { id: 'intel_s03', name: 'Intel: Bursa Selatan', cost: 90, kind: 'intel', site: 's03',
    desc: 'Buka lokasi "Brankas Dingin" di peta lebih awal.' },
  // Command unlocks (extra capabilities beyond the first 4 sites)
  { id: 'cmd_search', name: 'Command: SEARCH', cost: 70, kind: 'cmd', cmd: 'SEARCH',
    desc: 'Cari kata kunci di seluruh file sebuah node.' },
  { id: 'cmd_upload', name: 'Command: UPLOAD', cost: 110, kind: 'cmd', cmd: 'UPLOAD',
    desc: 'Kirim file/program ke sistem target. (segera hadir)' },
  { id: 'cmd_edit', name: 'Command: EDIT', cost: 130, kind: 'cmd', cmd: 'EDIT',
    desc: 'Ubah bagian file yang interaktif. (segera hadir)' },
  { id: 'cmd_route', name: 'Command: ROUTE', cost: 90, kind: 'cmd', cmd: 'ROUTE',
    desc: 'Lewati perangkat perantara ke jaringan lain. (segera hadir)' },
  { id: 'cmd_automation', name: 'Paket: Automation', cost: 260, kind: 'cmd', cmds: ['TOOLS', 'RUN', 'QUEUE', 'SCRIPT'],
    desc: 'Buka TOOLS, RUN, QUEUE, SCRIPT. (segera hadir)' }
];

export function owned(profile, item) {
  if (item.kind === 'tool') return !!profile.tools[item.tool];
  if (item.kind === 'intel') return !!profile.intel[item.site];
  if (item.kind === 'cmd') return (item.cmds || [item.cmd]).every((c) => (profile.cmds || []).includes(c));
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
  else if (item.kind === 'intel') profile.intel[item.site] = true;
  else if (item.kind === 'cmd') { profile.cmds = profile.cmds || []; for (const c of item.cmds || [item.cmd]) if (!profile.cmds.includes(c)) profile.cmds.push(c); }
  return { ok: true, msg: `Dibeli: ${item.name}.` };
}
