// NPC contacts: they roam between a few map spots by day, like gifts, and
// open perks as the friendship grows. Pure logic — the UI lives in ui/app.js.
import { addItem, removeItem, countOf } from './items.js';
import { WORLD_NODES, nodeState } from './world.js';

// affinity needed for levels 0..4
export const AFF_STEPS = [0, 10, 25, 45, 70];
export const LEVEL_NAMES = ['Asing', 'Kenal', 'Teman', 'Dekat', 'Sahabat'];
export const TALK_GAIN = 3;
export const GIFT_LIKED = 8;
export const GIFT_OTHER = 3;
export const MISSION_GAIN = 10;

export const NPCS = [
  {
    id: 'laras', name: 'Bu Laras', role: 'Pemilik Kafe Senja', site: 's00', unlockRep: 0, likes: 'kue',
    spots: [{ x: 130, y: 1350 }, { x: 480, y: 1045 }, { x: 800, y: 1400 }],
    perks: ['Kopi gratis tiap kali ngobrol', 'Fokus harian +10', 'Pendapatan kontrak +20%', 'Kopi memulihkan Fokus ×1,5'],
    lines: [
      ['Oh, kamu yang membereskan printer kafe? Duduk dulu. Kalau Fokusmu habis, tidur di Safehouse — jangan dipaksa.',
       'Kerjaan kecil juga ada hasilnya. Setelah misi selesai, klien biasanya menawarkan kontrak perawatan harian.',
       'Aku jarang lihat orang sesabar kamu di depan terminal.'],
      ['Nih, kopi buatan sendiri. Jangan bilang-bilang resepnya.', 'Pelanggan bilang Wi-Fi-nya makin cepat. Ulahmu ya?', 'Mampir lagi besok, aku bikin kue lapis.'],
      ['Kamu sudah seperti keluarga di sini.', 'Kalau ada masalah di jaringan kafe, aku langsung ingat kamu.', 'Hati-hati di luar sana, ya.'],
      ['Aku selalu sisihkan kursi di pojok buat kamu.', 'Kontrak perawatan itu kecil, tapi rutin — itu rahasia dapur yang stabil.', 'Ibuku dulu bilang: orang yang telaten pasti jadi.'],
      ['Kafe ini berdiri karena orang-orang seperti kamu.', 'Apa pun yang kamu butuhkan, bilang saja.', 'Kopi spesial hari ini khusus buatmu.']
    ]
  },
  {
    id: 'rani', name: 'Rani', role: 'Jurnalis lepas', site: 's02', unlockRep: 30, likes: 'dokumen',
    spots: [{ x: 150, y: 300 }, { x: 700, y: 250 }, { x: 120, y: 1060 }],
    perks: ['Diskon 25% untuk intel', 'Satu intel lokasi gratis', 'Hint hanya ◆5', 'Reputasi misi +25%'],
    lines: [
      ['Aku tidak biasa ngobrol dengan orang asing. Tapi plat-plat parkir itu... kamu yang urus, kan?',
       'Jurnalis hidup dari sumber. Aku belum tahu kamu bisa dipercaya atau tidak.', 'Jangan khawatir, namamu tidak akan kutulis.'],
      ['Buktimu rapi. Jarang ada yang mendokumentasikan sebaik itu.', 'Ada kabar soal lab arsip di barat. Aku masih menggali.', 'Kalau lihat dokumen aneh, simpan salinannya.'],
      ['Kita satu tim sekarang, ya? Tidak resmi, tapi begitu.', 'Aku bisa kasih tahu lokasi yang belum muncul di peta.', 'Sumberku bilang ada bursa yang membukukan angka palsu.'],
      ['Beritaku naik karena datamu. Terima kasih.', 'Aku mulai percaya kamu lebih dari redaksiku sendiri.', 'Hint dariku sekarang murah. Anggap kolega.'],
      ['Kalau suatu hari aku hilang, kamu orang pertama yang kuhubungi.', 'Kamu mengubah cara kerjaku.', 'Reputasimu di kalangan pers sedang menanjak.']
    ]
  },
  {
    id: 'dimas', name: 'Dimas', role: 'Teknisi warnet', site: 's01', unlockRep: 60, likes: 'komponen',
    spots: [{ x: 250, y: 1750 }, { x: 700, y: 1750 }, { x: 1200, y: 1800 }],
    perks: ['Diskon 15% Overclock', 'Loading −15%', 'Biaya Fokus −15%', 'Biaya Fokus −30% & Overclock 40%'],
    lines: [
      ['Warnet ini sudah tua, tapi rignya masih bandel. Kamu bawa apa?', 'Jangan injak kabel itu. Serius.', 'Kamu bukan dari dinas, kan? Santai saja.'],
      ['Rig-mu bisa kupercepat. Aku tahu triknya.', 'Kemarin ada yang minta kabel LAN sepanjang pagar. Aneh.', 'Bawa komponen bekas kalau ada, aku suka.'],
      ['Tahu nggak? Loading itu kebanyakan soal sabar, bukan mesin.', 'Aku kenal "Arsitek" dari lab arsip. Orangnya misterius.', 'Duduk, minum kopi sambil aku solder.'],
      ['Rigmu sekarang hampir sehalus punyaku.', 'Fokus itu juga soal kebiasaan. Biar tubuh yang hafal.', 'Kalau kamu butuh suku cadang, kabari.'],
      ['Kita sudah seperti tim bengkel sekarang.', 'Rig-mu salah satu yang terbaik yang pernah lewat sini.', 'Jangan sungkan minta apa pun.']
    ]
  },
  {
    id: 'gun', name: 'Mbah Gun', role: 'Broker pasar gelap', site: 's03', unlockRep: 120, likes: 'rongsok',
    spots: [{ x: 1250, y: 300 }, { x: 1300, y: 700 }, { x: 1300, y: 1000 }],
    perks: ['Diskon 10% command & tool', 'SEARCH gratis', 'Diskon 25% command & tool', 'Kredit misi +20%'],
    lines: [
      ['Hmm. Wajah baru. Aku tidak menjawab pertanyaan, aku menjual jawaban.', 'Di pasar ini semua ada harganya. Kecuali kepercayaan.', 'Kamu bawa sesuatu yang menarik?'],
      ['Barang langka itu nilainya naik tiap tahun, kamu tahu?', 'Aku dengar kamu bantu kolektif Saldo Balik. Hmph.', 'Diskon kecil buat pelanggan setia.'],
      ['Aku punya satu hadiah: SEARCH, tanpa bayar. Jangan bilang siapa-siapa.', 'Orang jujur itu langka. Kamu hampir jadi langka.', 'Duduklah.'],
      ['Harga untukmu sekarang tinggal separuhnya. Hampir.', 'Aku sudah lama tidak percaya orang. Kamu pengecualian.', 'Pasar ini lebih tenang sejak kamu sering mampir.'],
      ['Kamu pewaris tokoku, kalau aku pensiun.', 'Klien yang kamu bawa selalu membayar lebih. Aku tahu itu dari kamu.', 'Anggap rumah sendiri, Nak.']
    ]
  }
];

export const npcById = (id) => NPCS.find((n) => n.id === id);
export const npcForSite = (siteId) => NPCS.find((n) => n.site === siteId);

export const levelOf = (aff) => AFF_STEPS.reduce((lv, min, i) => (aff >= min ? i : lv), 0);

export function npcState(profile, id) {
  const all = (profile.npc ||= {});
  return (all[id] ||= { aff: 0, talkedDay: 0, giftDay: 0, claimed: 0 });
}
export const npcLevel = (profile, id) => levelOf(profile.npc?.[id]?.aff || 0);

// 0..1 progress toward the next friendship level
export function levelProgress(aff) {
  const lv = levelOf(aff);
  if (lv >= AFF_STEPS.length - 1) return 1;
  return (aff - AFF_STEPS[lv]) / (AFF_STEPS[lv + 1] - AFF_STEPS[lv]);
}

export const isVisible = (profile, npc) => profile.rep >= npc.unlockRep;

// Each NPC walks a 3-spot route, one spot per day.
export const npcSpot = (npc, day) => npc.spots[(day - 1) % npc.spots.length];

export const canTalk = (profile, id) => npcState(profile, id).talkedDay !== profile.day;
export const canGift = (profile, id) => npcState(profile, id).giftDay !== profile.day;

// One-time rewards the first time a friendship level is reached.
function claimLevelRewards(profile, npc, out) {
  const st = npcState(profile, npc.id);
  while (st.claimed < levelOf(st.aff)) {
    st.claimed += 1;
    out.push(`${npc.name}: ${LEVEL_NAMES[st.claimed]} — ${npc.perks[st.claimed - 1]}`);
    if (npc.id === 'rani' && st.claimed === 2) {
      const next = WORLD_NODES.filter((n) => nodeState(profile, n.id) === 'locked')
        .sort((a, b) => a.unlockRep - b.unlockRep)[0];
      if (next) { profile.intel[next.id] = true; out.push(`Rani membocorkan lokasi: ${next.short}`); }
    }
    if (npc.id === 'gun' && st.claimed === 2) {
      profile.cmds = profile.cmds || [];
      if (!profile.cmds.includes('SEARCH')) { profile.cmds.push('SEARCH'); out.push('Command SEARCH terbuka gratis.'); }
    }
  }
}

// Talk once per day. Returns { gain, line, kopi, notes } or null if already talked.
export function talk(profile, id, mods = {}) {
  const npc = npcById(id);
  if (!npc || !canTalk(profile, id)) return null;
  const st = npcState(profile, id);
  st.talkedDay = profile.day;
  const gain = TALK_GAIN + (mods.talkBonus || 0);
  st.aff += gain;
  const notes = [];
  claimLevelRewards(profile, npc, notes);
  const lv = levelOf(st.aff);
  let kopi = false;
  if (id === 'laras' && lv >= 1) { addItem(profile, 'kopi', 1); kopi = true; }
  const set = npc.lines[lv];
  return { gain, line: set[(profile.day + st.aff) % set.length], kopi, notes };
}

// Gift once per day. Returns { gain, liked, notes } or null.
export function gift(profile, id, itemId, mods = {}) {
  const npc = npcById(id);
  if (!npc || !canGift(profile, id) || !removeItem(profile, itemId)) return null;
  const st = npcState(profile, id);
  st.giftDay = profile.day;
  const liked = npc.likes === itemId;
  const gain = liked ? GIFT_LIKED : GIFT_OTHER;
  st.aff += gain;
  const notes = [];
  claimLevelRewards(profile, npc, notes);
  return { gain, liked, notes, line: liked ? 'Wah, ini favoritku! Terima kasih banyak.' : 'Terima kasih, aku hargai.' };
}

// Clearing a site for the first time warms up the NPC tied to it.
export function missionBond(profile, siteId) {
  const npc = npcForSite(siteId);
  if (!npc) return [];
  const st = npcState(profile, npc.id);
  st.aff += MISSION_GAIN;
  const notes = [];
  claimLevelRewards(profile, npc, notes);
  return notes;
}

export const hasItemFor = (profile, id) => countOf(profile, npcById(id)?.likes) > 0;
