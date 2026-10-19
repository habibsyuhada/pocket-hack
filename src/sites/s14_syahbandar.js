// "Syahbandar: Manifest Palsu" — COMPARE manifest agen pelayaran (sistem bea)
// dengan catatan jembatan timbang. Dua akhir: lapor ke Kapten Sari dengan bukti
// utuh, atau EDIT manifest diam-diam supaya benar tanpa memperkarakan siapa pun.
import { N, Y, offer } from '../game/dlg.js';

const hasLocal = (run, id) => run.local.some((f) => f.id === id);
// bukti sah = salinan manifest yang masih berisi pernyataan palsu
const buktiManifest = (r) => r.local.some((f) => f.id === 's14_manifest_bea' && /Ikan beku 12 ton/.test(f.content));

const MANIFEST_BENAR =
  'MANIFEST KAPAL KM SAMUDRA 9 (diajukan agen pelayaran)\n\n' +
  'Kontainer KONT-4470: Beras 10 ton\n' +
  'Kontainer KONT-4471: Suku cadang elektronik 3 ton\n' +
  'Kontainer KONT-4472: Gula 8 ton\n\n' +
  'Tujuan akhir KONT-4471: gudang pendingin, kawasan industri.';

export default {
  id: 's14',
  code: 'P-14',
  title: 'Syahbandar: Manifest Palsu',
  client: 'Kapten Sari, Kepala Syahbandar',
  reward: 380,
  brief:
    'Ada kontainer di KM Samudra 9 yang beratnya tidak cocok dengan manifest. Kapten Sari curiga manifest di sistem bea diubah. ' +
    'Bandingkan manifest dengan catatan jembatan timbang (COMPARE). Kamu bisa melapor dengan bukti, atau membetulkan manifest ' +
    'lewat EDIT (◆130 — beli di Pasar Gelap). Sistem bea butuh akun petugas dan sandi admin.',
  entry: ['s14_kantor'],
  world: {
    devices: {
      s14_kantor: {
        id: 's14_kantor', name: 'PC Kantor Syahbandar', kind: 'Workstation', addr: '10.40.8.20', online: true, open: 'guest', links: ['s14_arsip', 's14_timbang'],
        inspect: 'Komputer kantor syahbandar. Tamu hanya melihat pengumuman dan catatan jaga.',
        files: [
          { id: 's14_pengumuman', name: 'pengumuman_kantor.txt', minAccess: 'guest',
            content: 'PENGUMUMAN KANTOR\n\nKapal KM Samudra 9 sandar Selasa pagi.\nSemua manifest wajib cocok dengan catatan jembatan timbang sebelum bongkar muat.\nPetugas shift malam: tolong isi buku jaga.' },
          { id: 's14_catatan_petugas', name: 'catatan_petugas.txt', minAccess: 'guest',
            content:
              'CATATAN SHIFT MALAM\n\n- Lampu dermaga 3 mati, sudah lapor.\n' +
              '- Arsip manifest: akun "petugas" sandi "dermaga07".\n  (Sementara, nanti diganti. Jangan dikasih ke agen!)\n- Kopi habis.',
            onRead: { creds: ['s14_petugas'], clues: ['s14_petugas'] } }
        ]
      },
      s14_arsip: {
        id: 's14_arsip', name: 'Arsip Manifest Syahbandar', kind: 'NAS', addr: '10.40.8.21', online: true, links: ['s14_bea'],
        inspect: 'Arsip manifest pelabuhan. Tertutup untuk tamu — butuh akun petugas.',
        files: [
          { id: 's14_log_akses', name: 'log_akses_bea.txt', minAccess: 'user',
            content:
              'LOG AKSES SISTEM BEA\n\n[Sel 22:14] admin bea login dari terminal agen\n[Sel 22:16] berkas manifest KM Samudra 9 diubah\n' +
              'Pengingat admin: sandi sistem bea = singkatan kantor + nomor loket, huruf besar tanpa tanda.\nKantor: SYBD. Loket: 07.',
            onRead: { clues: ['s14_pola'] } },
          { id: 's14_memo_lama', name: 'memo_lama.txt', minAccess: 'user',
            content: 'MEMO LAMA\n\nSandi bea lama: BEA2023 (sudah tidak berlaku sejak pergantian pimpinan).' }
        ]
      },
      s14_bea: {
        id: 's14_bea', name: 'Sistem Bea Pelabuhan', kind: 'Server', addr: '10.40.8.30', online: true,
        inspect: 'Sistem bea pelabuhan. Manifest resmi disimpan di sini.\nAkses admin dikunci sandi — petunjuknya ada di arsip syahbandar.',
        crack: { level: 'admin', answer: 'SYBD07', options: ['BEA2023', 'SYBD07', 'SYBD-07', 'syahbandar'], onSuccess: { clues: ['s14_bea_admin'] } },
        files: [
          { id: 's14_manifest_bea', name: 'manifest_samudra9.txt', minAccess: 'admin', compare: 's14man',
            content:
              'MANIFEST KAPAL KM SAMUDRA 9 (diajukan agen pelayaran)\n\n' +
              'Kontainer KONT-4470: Beras 10 ton\n' +
              'Kontainer KONT-4471: Ikan beku 12 ton\n' +
              'Kontainer KONT-4472: Gula 8 ton\n\n' +
              'Tujuan akhir KONT-4471: gudang pendingin, kawasan industri.',
            edit: {
              minAccess: 'admin',
              options: [
                'Kontainer KONT-4471: Ikan beku 3 ton',
                'Kontainer KONT-4471: Suku cadang elektronik 3 ton',
                'Kontainer KONT-4472: Gula 3 ton',
                'Kontainer KONT-4470: Beras 3 ton'
              ],
              answer: 'Kontainer KONT-4471: Suku cadang elektronik 3 ton',
              result: { content: MANIFEST_BENAR },
              onDone: { flags: ['s14_fixed'], log: 'Manifest di sistem bea kini sama dengan catatan timbang.' }
            } }
        ]
      },
      s14_timbang: {
        id: 's14_timbang', name: 'Jembatan Timbang Dermaga', kind: 'Server', addr: '10.40.8.40', online: true, open: 'guest',
        inspect: 'Jembatan timbang dermaga. Catatan beratnya otomatis, terbuka untuk petugas dan tamu.',
        files: [
          { id: 's14_timbang_log', name: 'timbang_samudra9.txt', minAccess: 'guest', keep: true, compare: 's14man',
            content:
              'CATATAN JEMBATAN TIMBANG — KM SAMUDRA 9\n\n' +
              'KONT-4470: 10,1 ton (karung beras)\n' +
              'KONT-4471: 3,2 ton (kemasan antistatik, kotak elektronik, TIDAK BERPENDINGIN)\n' +
              'KONT-4472: 8,0 ton (karung gula)',
            onDownload: { flags: ['s14_got_timbang'] } }
        ]
      }
    }
  },
  creds: {
    s14_petugas: { label: 'petugas @ Arsip Manifest Syahbandar', account: 'petugas', device: 's14_arsip', level: 'user' }
  },
  clues: {
    s14_petugas: { title: 'Akun petugas arsip', text: 'Catatan shift malam di PC kantor memuat akun petugas untuk arsip manifest.' },
    s14_pola: { title: 'Pola sandi bea', text: 'Sandi sistem bea = singkatan kantor (SYBD) + nomor loket (07), huruf besar tanpa tanda.' },
    s14_bea_admin: { title: 'Akses admin bea', text: 'Sandi SYBD07 cocok. Manifest resmi bisa dibaca dan diubah.' },
    s14_beda: { title: 'Manifest tidak cocok', text: 'KONT-4471 dilaporkan ikan beku 12 ton, tetapi ditimbang 3,2 ton elektronik tanpa pendingin.' }
  },
  diffs: {
    's14_manifest_bea|s14_timbang_log': {
      text:
        'PERBEDAAN DITEMUKAN\n\n' +
        'KONT-4470: manifest 10 ton, timbang 10,1 ton — wajar.\n' +
        'KONT-4472: manifest 8 ton, timbang 8,0 ton — cocok.\n' +
        'KONT-4471: manifest "Ikan beku 12 ton", timbang 3,2 ton kotak elektronik tanpa pendingin   <-- TIDAK COCOK\n\n' +
        'Isi dan berat kontainer ini dipalsukan di manifest. Tujuan akhirnya gudang pendingin kawasan industri.',
      onRead: { flags: ['s14_terbukti'], clues: ['s14_beda'] }
    }
  },
  edges: [['timur_hub', 's14_kantor']],
  place: { s14_kantor: [9, 7, 'timur'], s14_arsip: [9, 8, 'timur'], s14_bea: [10, 8, 'timur'], s14_timbang: [10, 9, 'timur'] },
  objectives: [
    { id: 'arsip', text: 'Masuk ke arsip manifest sebagai petugas', done: (r) => r.devices.s14_arsip.access === 'user' },
    { id: 'bea', text: 'Dapatkan akses admin Sistem Bea', done: (r) => r.devices.s14_bea.access === 'admin' },
    { id: 'bukti', text: 'Buktikan manifest dipalsukan dengan COMPARE', main: true, done: (r) => r.flags.includes('s14_terbukti') },
    { id: 'salin', text: 'Simpan kedua catatan sebagai bukti di perangkatmu', done: (r) => buktiManifest(r) && hasLocal(r, 's14_timbang_log') },
    { id: 'benahi', text: '(Bonus) Betulkan manifest dengan EDIT', bonus: true, done: (r) => r.flags.includes('s14_fixed') }
  ],
  hints: [
    { when: (r) => !r.read.includes('s14_catatan_petugas') && r.devices.s14_arsip.access === 'none',
      text: 'Kamu butuh EDIT (◆130, beli di Pasar Gelap) kalau mau membetulkan manifest sendiri. Mulai dari PC Kantor Syahbandar: baca catatan_petugas.txt.' },
    { when: (r) => r.devices.s14_arsip.access === 'none', text: 'CONNECT ke Arsip Manifest lalu LOGIN sebagai petugas.' },
    { when: (r) => !r.read.includes('s14_log_akses'), text: 'Baca log_akses_bea.txt di arsip: ada pola sandi sistem bea.' },
    { when: (r) => r.devices.s14_bea.access !== 'admin', text: 'CONNECT ke Sistem Bea lalu CRACK dengan sandi: singkatan kantor + nomor loket, huruf besar.' },
    { when: (r) => !hasLocal(r, 's14_timbang_log') && !r.flags.includes('s14_terbukti'), text: 'DOWNLOAD timbang_samudra9.txt dari Jembatan Timbang, lalu COMPARE dengan manifest_samudra9.txt di Sistem Bea.' },
    { when: (r) => !r.flags.includes('s14_terbukti'), text: 'Di Sistem Bea, pilih manifest_samudra9.txt → COMPARE → timbang_samudra9.txt.' },
    { when: (r) => !buktiManifest(r) && !r.flags.includes('s14_fixed'), text: 'Untuk melapor, DOWNLOAD manifest_samudra9.txt sebelum mengubah apa pun — salinan asli itu buktimu.' },
    { when: (r) => !r.flags.includes('s14_fixed'), text: 'Atau benahi diam-diam: EDIT manifest, pilih baris KONT-4471 yang cocok dengan hasil timbang. Pilihan salah tidak mengubah apa pun.' }
  ],
  endings: [
    { id: 'lapor', label: 'Lapor ke Kapten Sari dengan bukti lengkap', reward: 380,
      requires: (r) => r.flags.includes('s14_terbukti') && buktiManifest(r) && hasLocal(r, 's14_timbang_log'),
      text: 'Kapten Sari membaca kedua catatan itu tanpa bicara. Agen pelayaran dipanggil, kontainer ditahan, dan kantor syahbandar memperketat pemeriksaan. "Bersih dan sesuai aturan," katanya.' },
    { id: 'benahi', label: 'Betulkan manifest diam-diam', reward: 300,
      requires: (r) => r.flags.includes('s14_fixed'),
      text: 'Manifest kini cocok dengan timbangan, dan tidak ada yang dipanggil. Kapten Sari lega kontainernya aman, tapi ia mencatat: ada yang diubah tanpa laporan, dan itu masih mengganjal.' }
  ],
  meta: { giver: 'sari', minLevel: 1, district: 'Timur', difficulty: 3, repReward: 110, short: 'Syahbandar — manifest kapal tidak cocok dengan timbangan.' },
  items: { peta: 1 },
  drop: 'peta',
  dialogue: {
    offer: offer(
      [
        N('Ada kontainer di KM Samudra 9 yang beratnya aneh. Manifest bilang ikan beku, timbangan tidak sependapat.', 'serious'),
        N('Cari tahu siapa yang mengubah manifest. Bandingkan dengan catatan jembatan timbang.'),
        N('Kamu boleh lapor ke saya, atau membetulkan sendiri dengan EDIT dari Pasar Gelap. Pilihanmu. Tapi saya lebih suka laporan.')
      ],
      'Saya urus, Kapten.', 'Belum, Kapten.',
      [N('Bagus. Jangan sampai agennya tahu.')],
      [N('Baik. Tapi jangan terlalu lama, kapalnya akan bongkar muat.')]
    ),
    turnIn: [
      N('Saya sudah lihat hasilnya. Cukup jelas.'),
      N('Kamu bekerja rapi. Ini peta pelabuhan untukmu.', 'happy')
    ]
  }
};
