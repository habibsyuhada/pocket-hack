// Small inventory: things found on missions / contracts, used as gifts or
// consumed. Stored on profile.items as { itemId: count }.
export const ITEMS = {
  kopi: { id: 'kopi', name: 'Kopi Susu', desc: 'Pulihkan Fokus +25.', usable: true },
  kue: { id: 'kue', name: 'Kue Lapis', desc: 'Oleh-oleh hangat. Cocok jadi hadiah.' },
  komponen: { id: 'komponen', name: 'Komponen Bekas', desc: 'Kartu jaringan dan kabel. Suku cadang.' },
  dokumen: { id: 'dokumen', name: 'Salinan Dokumen', desc: 'Berkas yang bisa jadi bahan liputan.' },
  rongsok: { id: 'rongsok', name: 'Barang Langka', desc: 'Perangkat tua yang dicari kolektor.' },
  teh: { id: 'teh', name: 'Teh Manis', desc: 'Pulihkan Fokus +10.', usable: true, focus: 10 },
  nasi: { id: 'nasi', name: 'Nasi Kotak', desc: 'Pulihkan Fokus +40. Hadiah favorit Pak Hadi.', usable: true, focus: 40 },
  obat: { id: 'obat', name: 'Obat Herbal', desc: 'Ramuan jamu pereda lelah. Hadiah favorit dr. Wulan.' },
  peta: { id: 'peta', name: 'Peta Pelabuhan', desc: 'Peta laut bergambar tangan. Hadiah favorit Kapten Sari.' },
  usb: { id: 'usb', name: 'USB Bekas', desc: 'Flashdisk dengan stiker kampus. Hadiah favorit Vira.' },
  // key items: given by missions, never sold, never gifted
  kartu_industri: { id: 'kartu_industri', name: 'Kartu Akses Industri', desc: 'Kartu magnetik kawasan pabrik. Tanda kamu dipercaya.', key: true },
  kunci_dingin: { id: 'kunci_dingin', name: 'Kunci Gudang Dingin', desc: 'Kunci cadangan gudang pendingin.', key: true },
  sertifikat: { id: 'sertifikat', name: 'Sertifikat Lurah', desc: 'Surat tanda terima kasih resmi dari Pak Hadi.', key: true }
};

export const KOPI_FOCUS = 25;
export const isKey = (id) => !!ITEMS[id]?.key;
export const KOPI_PRICE = 10;

// What a first clear of each site hands out, and what its contract can drop.
export const MISSION_ITEMS = {
  s00: { kue: 2, kopi: 1 },
  s01: { dokumen: 2 },
  s02: { komponen: 2 },
  s03: { rongsok: 1, dokumen: 1 }
};
export const CONTRACT_DROP = { s00: 'kue', s01: 'dokumen', s02: 'komponen', s03: 'rongsok' };

import { siteById } from '../sites/index.js';
// New missions list their rewards / contract drop in their own file (`items`, `drop`).
export const missionItems = (id) => MISSION_ITEMS[id] || siteById(id)?.items || null;

export const countOf = (profile, id) => profile.items?.[id] || 0;

export function addItem(profile, id, n = 1) {
  if (!ITEMS[id] || n <= 0) return false;
  const items = (profile.items ||= {});
  items[id] = (items[id] || 0) + n;
  return true;
}

export function removeItem(profile, id, n = 1) {
  if (countOf(profile, id) < n) return false;
  profile.items[id] -= n;
  if (!profile.items[id]) delete profile.items[id];
  return true;
}

export function addAll(profile, bundle) {
  for (const [id, n] of Object.entries(bundle || {})) addItem(profile, id, n);
}

// Contracts drop their site's item every other day (deterministic, no RNG).
export function contractDrop(siteId, day) {
  const id = CONTRACT_DROP[siteId] || siteById(siteId)?.drop;
  return id && day % 2 === 0 ? id : null;
}
