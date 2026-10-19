import { TOOLS, LOAD_MS } from './profile.js';
import { siteById } from '../sites/index.js';
import { WORLD_NODES } from './world.js';
import { perksFor } from './perks.js';
import { addItem, KOPI_PRICE } from './items.js';

// Black-market catalog. Effects are applied to the persistent profile.
const RAW = [
  { id: 'buy_cipher', section: 'Tool & Command', name: 'Tool: Cipher', cost: 120, kind: 'tool', tool: 'cipher',
    desc: 'Membuka file terenkripsi (perintah DECRYPT).' },
  { id: 'intel_s01', section: 'Intel', name: 'Intel: Lab Barat', cost: 60, kind: 'intel', site: 's01',
    desc: 'Buka lokasi "Blueprint Asli" di peta lebih awal.' },
  { id: 'intel_s03', name: 'Intel: Bursa Selatan', cost: 90, kind: 'intel', site: 's03',
    desc: 'Buka lokasi "Brankas Dingin" di peta lebih awal.' },
  // Loading-speed upgrades: every command waits behind a loading screen
  { id: 'speed_1', section: 'Upgrade', name: 'Overclock I', cost: 70, kind: 'speed', level: 1,
    desc: `Loading perintah ${LOAD_MS[0] / 1000}s → ${LOAD_MS[1] / 1000}s.` },
  { id: 'speed_2', name: 'Overclock II', cost: 150, kind: 'speed', level: 2, needs: 'speed_1',
    desc: `Loading perintah ${LOAD_MS[1] / 1000}s → ${LOAD_MS[2] / 1000}s.` },
  { id: 'speed_3', name: 'Overclock III', cost: 280, kind: 'speed', level: 3, needs: 'speed_2',
    desc: `Loading perintah ${LOAD_MS[2] / 1000}s → ${LOAD_MS[3] / 1000}s.` },
  // Command unlocks (extra capabilities beyond the first 4 sites)
  { id: 'cmd_search', section: 'Tool & Command', name: 'Command: SEARCH', cost: 70, kind: 'cmd', cmd: 'SEARCH',
    desc: 'Cari kata kunci di seluruh file sebuah node.' },
  { id: 'cmd_upload', name: 'Command: UPLOAD', cost: 110, kind: 'cmd', cmd: 'UPLOAD',
    desc: 'Kirim file/program ke sistem target. (segera hadir)' },
  { id: 'cmd_edit', name: 'Command: EDIT', cost: 130, kind: 'cmd', cmd: 'EDIT',
    desc: 'Ubah bagian file yang interaktif. (segera hadir)' },
  { id: 'cmd_route', name: 'Command: ROUTE', cost: 90, kind: 'cmd', cmd: 'ROUTE',
    desc: 'Lewati perangkat perantara ke jaringan lain. (segera hadir)' },
  { id: 'cmd_automation', name: 'Paket: Automation', cost: 260, kind: 'cmd', cmds: ['TOOLS', 'RUN', 'QUEUE', 'SCRIPT'],
    desc: 'Buka TOOLS, RUN, QUEUE, SCRIPT. (segera hadir)' },
  // Goods: can be bought again and again. Coffee restores Fokus, the rest make gifts.
  { id: 'goods_kopi', section: 'Barang', name: 'Kopi Susu', cost: KOPI_PRICE, kind: 'goods', item: 'kopi',
    desc: 'Pulihkan Fokus +25. Minum dari menu Profil → Inventory.' },
  { id: 'goods_kue', name: 'Kue Lapis', cost: 15, kind: 'goods', item: 'kue', desc: 'Hadiah favorit Bu Laras.' },
  { id: 'goods_komponen', name: 'Komponen Bekas', cost: 25, kind: 'goods', item: 'komponen', desc: 'Hadiah favorit Dimas.' },
  { id: 'goods_dokumen', name: 'Salinan Dokumen', cost: 30, kind: 'goods', item: 'dokumen', desc: 'Hadiah favorit Rani.' },
  { id: 'goods_rongsok', name: 'Barang Langka', cost: 60, kind: 'goods', item: 'rongsok', desc: 'Hadiah favorit Mbah Gun.' }
];

// Shop sections, in display order. Every item inherits its section from its kind.
export const SECTIONS = ['Tool & Command', 'Intel', 'Upgrade', 'Barang'];
const SECTION_OF = { tool: 'Tool & Command', cmd: 'Tool & Command', intel: 'Intel', speed: 'Upgrade', goods: 'Barang' };
export const MARKET = SECTIONS.flatMap((sec) => RAW.filter((i) => SECTION_OF[i.kind] === sec).map((i) => ({ ...i, section: sec })));

// Price after Dimas / Rani / Mbah Gun perks and today's market event.
export function priceFor(profile, item) {
  const p = perksFor(profile);
  const kindDisc = item.kind === 'speed' ? p.speedDiscount : item.kind === 'intel' ? p.intelDiscount : item.kind === 'goods' ? 0 : p.cmdDiscount;
  const disc = Math.min(0.6, kindDisc + p.marketDiscount);
  return Math.max(1, Math.round(item.cost * (1 - disc)));
}

export function owned(profile, item) {
  if (item.kind === 'tool') return !!profile.tools[item.tool];
  if (item.kind === 'intel') return !!profile.intel[item.site];
  if (item.kind === 'speed') return (profile.speed || 0) >= item.level;
  if (item.kind === 'cmd') return (item.cmds || [item.cmd]).every((c) => (profile.cmds || []).includes(c));
  return false;
}

export function canBuy(profile, item) {
  if (owned(profile, item)) return { ok: false, reason: 'Sudah dimiliki.' };
  if (item.needs && !profile.bought.includes(item.needs)) {
    const dep = MARKET.find((m) => m.id === item.needs);
    return { ok: false, reason: `Butuh "${dep?.name}" dulu.` };
  }
  if (profile.credits < priceFor(profile, item)) return { ok: false, reason: 'Kredit tidak cukup.' };
  return { ok: true };
}

export function buy(profile, itemId) {
  const item = MARKET.find((m) => m.id === itemId);
  if (!item) return { ok: false, msg: 'Item tidak ada.' };
  const c = canBuy(profile, item);
  if (!c.ok) return { ok: false, msg: c.reason };
  profile.credits -= priceFor(profile, item);
  if (item.kind !== 'goods') profile.bought.push(item.id);
  if (item.kind === 'tool') profile.tools[item.tool] = true;
  else if (item.kind === 'goods') addItem(profile, item.item, 1);
  else if (item.kind === 'speed') profile.speed = item.level;
  else if (item.kind === 'intel') profile.intel[item.site] = true;
  else if (item.kind === 'cmd') { profile.cmds = profile.cmds || []; for (const c of item.cmds || [item.cmd]) if (!profile.cmds.includes(c)) profile.cmds.push(c); }
  return { ok: true, msg: `Dibeli: ${item.name}.` };
}
