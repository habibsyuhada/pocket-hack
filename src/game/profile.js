// Persistent player profile for the open-world game. Saved across sessions.
export const TOOLS = {
  keyloom: { id: 'keyloom', name: 'KeyLoom', ram: 2, cmd: 'CRACK', desc: 'Menyusun kandidat kata sandi dari petunjuk yang kamu kumpulkan.' },
  mender: { id: 'mender', name: 'Mender', ram: 1, cmd: 'RECOVER', desc: 'Memulihkan file terhapus atau rusak.' },
  cipher: { id: 'cipher', name: 'Cipher', ram: 1, cmd: 'DECRYPT', desc: 'Membuka file terkunci dengan kunci yang kamu simpulkan.' }
};

export function newProfile() {
  return {
    v: 1,
    credits: 80,
    rep: 0,
    ram: 4,
    upgrades: [],
    tools: { keyloom: true, mender: true, cipher: false },
    active: ['keyloom'],
    bought: [],
    archive: [],
    discovered: { s00: true },  // first site visible from the start
    cleared: {},
    intel: {},                  // siteId -> true (bought scouting intel)
    location: 'tengah'
  };
}

export function ramUsed(profile) {
  return profile.active.reduce((sum, id) => sum + (TOOLS[id]?.ram || 0), 0);
}

export function toggleTool(profile, id) {
  if (!profile.tools[id]) return { ok: false, msg: 'Tool belum dimiliki. Beli di Pasar.' };
  if (profile.active.includes(id)) {
    profile.active = profile.active.filter((t) => t !== id);
    return { ok: true, msg: `${TOOLS[id].name} ditutup.` };
  }
  if (ramUsed(profile) + TOOLS[id].ram > profile.ram) {
    return { ok: false, msg: `RAM tidak cukup (${ramUsed(profile)}/${profile.ram}). Tutup tool lain dulu.` };
  }
  profile.active.push(id);
  return { ok: true, msg: `${TOOLS[id].name} aktif.` };
}

export const toolActive = (profile, id) => profile.active.includes(id);
