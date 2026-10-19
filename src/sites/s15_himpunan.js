// s15 "Server Himpunan" — DECRYPT dengan kunci yang disimpulkan dari dua file di dua node berbeda
// (singkatan resmi di Situs Himpunan + tahun pendirian di piagam Sekretariat).
import { N, Y, offer } from '../game/dlg.js';

const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const opened = (r) => { const f = r.local.find((x) => x.id === 's15_arsip_enc'); return !!f && !f.encrypted; };

export default {
  id: 's15',
  code: 'B-15',
  title: 'Server Himpunan',
  client: 'Vira, Himpunan Mahasiswa Komputasi',
  reward: 400,
  brief:
    'Arsip laporan pertanggungjawaban Himpunan Mahasiswa Komputasi (Himakom) terkunci, dan ketua lama sudah wisuda tanpa meninggalkan kuncinya. ' +
    'Batas pengumpulan tinggal beberapa hari. Telusuri server himpunan, simpulkan kuncinya dari dua petunjuk di dua tempat berbeda, ' +
    'lalu buka arsipnya. Kamu butuh tool Cipher (◆120, beli di Pasar Gelap).',
  entry: ['s15_portal'],
  world: {
    devices: {
      s15_portal: {
        id: 's15_portal', name: 'Portal Himpunan', kind: 'Gateway', addr: '172.16.11.1', online: true, open: 'guest',
        links: ['s15_situs', 's15_sekre'],
        inspect: 'Gerbang jaringan sekretariat Himakom. Tamu bisa membaca papan pengumuman.\nTerlihat situs himpunan dan PC sekretariat (terkunci sandi).',
        files: [
          { id: 's15_pengumuman', name: 'papan_pengumuman.txt', minAccess: 'guest',
            content:
              'PAPAN PENGUMUMAN HIMAKOM\n\n- Rapat pengurus tiap Jumat sore, ditutup makan nasi kucing (tradisi!).\n' +
              '- PC sekretariat dipakai bergantian. Sandinya sama dengan menu rapat favorit, ditulis pakai tanda hubung. Jangan disebar ke adik tingkat.\n' +
              '- Batas LPJ tahunan: minggu depan. Arsip lama ada di server arsip, dienkripsi oleh ketua periode lalu.',
            onRead: { clues: ['s15_sandi_sekre'] } }
        ]
      },
      s15_situs: {
        id: 's15_situs', name: 'Situs Himpunan', kind: 'Server', addr: '172.16.11.8', online: true, open: 'guest',
        inspect: 'Server situs web himpunan. Isinya profil, galeri kegiatan, dan beberapa tulisan lama.',
        files: [
          { id: 's15_profil', name: 'profil_himpunan.txt', minAccess: 'guest',
            content:
              'PROFIL HIMPUNAN\n\nHimpunan Mahasiswa Komputasi, disingkat HIMAKOM.\n(Orang-orang sering menyebutnya "Himpunan Kom" atau "Himkom", tetapi singkatan RESMI hanya satu.)\n' +
              'Kampus induk kami berdiri tahun 1998.\nMotto: "Belajar, bantu, bercanda."',
            onRead: { clues: ['s15_singkatan'] } },
          { id: 's15_surat', name: 'surat_ketua_lama.txt', minAccess: 'guest',
            content:
              'SURAT UNTUK PENGURUS BARU\n\nKalau kalian membaca ini, berarti kalian lebih rajin dariku. Maaf soal kuncinya, aku keburu wisuda.\n' +
              'Satu hal: tiap malam ada program uji otomatis bernama SENTINEL yang mengetuk-ngetuk server kita. Titipan kakak tingkat entah siapa. ' +
              'Jangan dimatikan, dia tidak jahat. Dia cuma suka mengingatkan kalau ada pintu yang lupa dikunci.',
            onRead: { flags: ['s15_baca_surat'] } }
        ]
      },
      s15_sekre: {
        id: 's15_sekre', name: 'PC Sekretariat', kind: 'Workstation', addr: '172.16.11.4', online: true, links: ['s15_arsip'],
        inspect: 'PC sekretariat Himakom. Terkunci sandi. Sandinya konon sama dengan menu rapat favorit.',
        crack: { level: 'user', answer: 'nasi-kucing', options: ['himakom', 'nasi-kucing', 'sekre123', 'nasi-goreng'],
          onSuccess: { clues: ['s15_aturan'] } },
        files: [
          { id: 's15_notulen', name: 'notulen_serah_terima.txt', minAccess: 'user',
            content:
              'NOTULEN SERAH TERIMA\n\nKunci arsip disepakati bersama supaya tak ada yang lupa:\nSINGKATAN RESMI himpunan (huruf besar) + TAHUN PENDIRIAN himpunan.\n' +
              'Singkatan lihat profil di situs. Tahun pendirian lihat piagam di lemari sekretariat. Awas, tahun pelantikan itu BUKAN tahun pendirian.',
            onRead: { clues: ['s15_aturan'] } },
          { id: 's15_piagam', name: 'piagam_pendirian.txt', minAccess: 'user',
            content:
              'PIAGAM PENDIRIAN\n\nDengan ini Himpunan Mahasiswa Komputasi didirikan pada 14 Maret 2011.\n' +
              'Catatan tambahan di sudut kertas: pelantikan pengurus periode terakhir pada 2016.',
            onRead: { clues: ['s15_tahun'] } }
        ]
      },
      s15_arsip: {
        id: 's15_arsip', name: 'Server Arsip Himakom', kind: 'NAS', addr: '172.16.11.20', online: true, open: 'user',
        inspect: 'Server arsip himpunan. Berkas LPJ tahunan disimpan terenkripsi.\nUnduh lalu DECRYPT dengan kunci yang kamu simpulkan.',
        files: [
          { id: 's15_manifest', name: 'daftar_arsip.txt', minAccess: 'user',
            content: 'DAFTAR ARSIP\n\n- arsip_lpj.enc  (TERENKRIPSI oleh ketua periode lalu)\n- foto_kegiatan.zip (tidak penting)\nKunci: lihat notulen serah terima di PC sekretariat.' },
          { id: 's15_arsip_enc', name: 'arsip_lpj.enc', minAccess: 'user', keep: true,
            encrypted: {
              key: 'HIMAKOM2011',
              keyOptions: ['HIMAKOM1998', 'HIMAKOM2011', 'HIMAKOM2016', 'HIMKOM2011'],
              result: {
                content:
                  'LAPORAN PERTANGGUNGJAWABAN HIMAKOM\n\nKas awal tahun: Rp 1.850.000\nKas akhir tahun: Rp 2.350.000\n' +
                  'Kegiatan: 4 seminar, 2 lomba, 1 bakti sosial.\nSemua bukti kuitansi lengkap. Silakan dikumpulkan ke kemahasiswaan.'
              },
              onOpen: { flags: ['s15_terbuka'] }
            },
            content: '[terenkripsi]' }
        ]
      }
    }
  },
  creds: {},
  clues: {
    s15_sandi_sekre: { title: 'Sandi PC sekretariat', text: 'Sandi = menu rapat favorit (nasi kucing), ditulis pakai tanda hubung.' },
    s15_singkatan: { title: 'Singkatan resmi', text: 'Singkatan resmi himpunan: HIMAKOM.' },
    s15_aturan: { title: 'Aturan kunci arsip', text: 'Kunci = singkatan resmi (huruf besar) + tahun PENDIRIAN, bukan tahun pelantikan.' },
    s15_tahun: { title: 'Tahun pendirian', text: 'Piagam: himpunan didirikan 2011 (pelantikan 2016 bukan yang dimaksud).' }
  },
  objectives: [
    { id: 'sekre', text: 'Masuk ke PC Sekretariat', done: (r) => r.devices.s15_sekre.access !== 'none' },
    { id: 'petunjuk', text: 'Kumpulkan dua petunjuk kunci (singkatan dan tahun pendirian)', done: (r) => r.read.includes('s15_profil') && r.read.includes('s15_piagam') },
    { id: 'unduh', text: 'Salin arsip_lpj.enc ke perangkatmu', done: (r) => hasLocal(r, 's15_arsip_enc') },
    { id: 'buka', text: 'Buka arsip LPJ dengan DECRYPT', main: true, done: (r) => opened(r) },
    { id: 'surat', text: '(Bonus) Baca surat ketua lama di situs himpunan', bonus: true, done: (r) => r.flags.includes('s15_baca_surat') }
  ],
  hints: [
    { when: (r, p) => !p.tools.cipher, text: 'Arsip ini butuh tool Cipher (◆120). Beli di Pasar Gelap (peta, Selatan), lalu CONNECT ke Portal Himpunan lewat Hotspot Kampus Barat dan baca papan pengumumannya.' },
    { when: (r) => !r.read.includes('s15_pengumuman'), text: 'CONNECT ke Portal Himpunan lalu baca papan_pengumuman.txt.' },
    { when: (r) => r.devices.s15_sekre.access === 'none', text: 'CRACK PC Sekretariat. Sandinya menu rapat favorit, ditulis pakai tanda hubung.' },
    { when: (r) => !r.read.includes('s15_notulen'), text: 'Baca notulen_serah_terima.txt di PC Sekretariat: di situ aturan kuncinya.' },
    { when: (r) => !r.read.includes('s15_profil'), text: 'Singkatan resmi himpunan ada di profil_himpunan.txt, di Situs Himpunan (node lain).' },
    { when: (r) => !r.read.includes('s15_piagam'), text: 'Tahun pendirian ada di piagam_pendirian.txt di PC Sekretariat. Tahun pelantikan itu jebakan.' },
    { when: (r) => !hasLocal(r, 's15_arsip_enc'), text: 'CONNECT ke Server Arsip Himakom dan DOWNLOAD arsip_lpj.enc.' },
    { when: (r) => !opened(r), text: 'DECRYPT arsip_lpj.enc dari perangkatmu dengan kunci: singkatan huruf besar + tahun pendirian.' },
    { when: (r) => !r.flags.includes('s15_baca_surat'), text: 'Bonus: baca surat_ketua_lama.txt di Situs Himpunan.' }
  ],
  endings: [
    {
      id: 'serahkan', label: 'Serahkan LPJ ke Vira', reward: 400,
      requires: (r) => opened(r),
      text: 'Vira membekap mulut menahan tawa sekaligus lega. LPJ terkumpul tepat waktu, dan namamu jadi legenda kecil di himpunan.'
    },
    {
      id: 'serahkan_surat', label: 'Serahkan LPJ beserta surat ketua lama', reward: 440,
      requires: (r) => opened(r) && r.flags.includes('s15_baca_surat'),
      text: 'Vira membaca surat ketua lama keras-keras di depan pengurus. "Jadi SENTINEL itu hantu server kita?" Semua tertawa, tapi diam-diam mereka memasang kunci yang lebih baik. Bayaranmu ditambah.'
    }
  ],
  meta: {
    giver: 'vira', minLevel: 1, district: 'Barat', difficulty: 3, repReward: 110,
    short: 'Himpunan mahasiswa kehilangan kunci arsip LPJ. Kuncinya tersebar di dua tempat.'
  },
  dialogue: {
    offer: offer(
      [
        N('Kak! Kebetulan banget. Kakak jago buka-bukaan server, kan?', 'happy'),
        N('Ketua himpunanku yang lama wisuda, dan dia mengunci arsip LPJ kami. Katanya sih "gampang ditebak". Aku sudah tebak dua puluh kali, Kak.', 'worried'),
        N('Batasnya minggu depan. Kuncinya pasti ada di server kami, tersebar. Kakak butuh Cipher buat bukanya, ya. Jahilnya dia, kuncinya gabungan dua hal.')
      ],
      'Aku bantu cari.', 'Nanti dulu, ya.',
      [N('Yes! Portalnya lewat Hotspot Kampus Barat. Jangan kaget kalau sandi sekre-nya lucu.', 'happy')],
      [N('Yah... oke deh, Kak. Aku coba tebak lagi sambil nangis.', 'worried')]
    ),
    turnIn: [
      N('Kak!! Arsipnya kebuka! Kunci dua kata gabungan, ternyata seterang itu.', 'happy'),
      Y('Singkatan resmi plus tahun pendirian. Tahun pelantikan itu jebakan.'),
      N('Dasar ketua lama jahil. Makasih ya, Kak. Nih bayarannya, dan traktiran nasi kucing menyusul.', 'happy')
    ]
  },
  patches: {},
  edges: [['barat_hub', 's15_portal']],
  place: {
    s15_portal: [1, 11, 'barat'],
    s15_sekre: [0, 11, 'barat'],
    s15_situs: [2, 11, 'barat'],
    s15_arsip: [1, 12, 'barat']
  }
};
