// "Wi-Fi Asrama" — CRACK where the password is built from TWO clues on two different
// nodes (the flower name on the notice board, the opening year at the guard post).
// Single-clue and old-password candidates are rejected with a lesson.
import { N, offer } from '../game/dlg.js';

const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const mode = (r) => r.devices.s10_router.controls[0].state;

export default {
  id: 's10',
  code: 'W-10',
  title: 'Wi-Fi Asrama',
  client: 'Vira, mahasiswi sistem informasi (Asrama Kenanga)',
  reward: 220,
  brief:
    'Wi-Fi Asrama Kenanga melambat jadi 1 Mbps sejak ibu kos pergi umroh dan sandi admin router terlupa. ' +
    'Penghuni sudah dua minggu tidak bisa kuliah daring. Cari dua potongan petunjuk di jaringan asrama, susun sandi admin, lalu masuk ke router ' +
    'dan ambil konfigurasi cadangannya. Tidak perlu tool tambahan.',
  entry: ['s10_papan'],
  world: {
    devices: {
      s10_papan: {
        id: 's10_papan', name: 'Papan Pengumuman Asrama', kind: 'Gateway', addr: '172.16.20.2', online: true, open: 'guest',
        inspect: 'Layar pengumuman di lobi Asrama Kenanga. Terbuka untuk tamu.\nDi jaringan yang sama ada pos penjaga dan router asrama.',
        files: [
          { id: 's10_pengumuman', name: 'pengumuman_asrama.txt', minAccess: 'guest',
            content:
              'PENGUMUMAN ASRAMA KENANGA\n\n' +
              '- Lomba hias taman: bunga kenanga di depan lobi jadi juara tahun ini!\n' +
              '- Wi-Fi lambat? Sandi lama "asrama123" sudah TIDAK dipakai lagi.\n' +
              '- Aturan Bu Kos untuk sandi admin router: nama bunga asrama (huruf besar) digabung tahun peresmian gedung. Tanpa spasi.\n' +
              '- Tahun peresmian lihat plakat di lobi, atau tanya penjaga.',
            onRead: { clues: ['s10_aturan'] } }
        ]
      },
      s10_pos: {
        id: 's10_pos', name: 'Pos Penjaga Asrama', kind: 'Workstation', addr: '172.16.20.5', online: true, open: 'guest',
        inspect: 'Komputer pos penjaga. Hanya buku jaga yang terbuka untuk tamu.',
        files: [
          { id: 's10_buku_jaga', name: 'buku_jaga_asrama.txt', minAccess: 'guest',
            content:
              'BUKU JAGA ASRAMA\n\n' +
              '21.00 gerbang dikunci, lampu lobi dinyalakan.\n' +
              '21.30 tamu bertanya soal plakat: "Gedung Asrama diresmikan tahun 2003, waktu Bu Kos masih muda."\n' +
              '22.15 anak kamar 12 minta kunci cadangan, ditolak.',
            onRead: { clues: ['s10_tahun'] } }
        ]
      },
      s10_router: {
        id: 's10_router', name: 'Router Asrama Kenanga', kind: 'Router', addr: '172.16.20.1', online: true,
        inspect: 'Router utama Wi-Fi asrama. Terkunci sandi admin.\nCoba CRACK dengan kandidat yang kamu susun dari dua petunjuk berbeda.',
        crack: {
          level: 'admin', answer: 'KENANGA2003',
          options: ['asrama123', 'KENANGA', 'ASRAMA2003', 'KENANGA2003'],
          onSuccess: { flags: ['s10_router_buka'] }
        },
        files: [
          { id: 's10_konfig', name: 'konfigurasi_cadangan.txt', minAccess: 'admin', keep: true,
            content:
              'KONFIGURASI CADANGAN ROUTER\n\nSSID: Kenanga-Hunian\nBatas kecepatan per kamar: 20 Mbps\nMode darurat: AKTIF (1 Mbps) — otomatis menyala saat sandi admin salah 5 kali\n' +
              'Catatan: matikan mode darurat setelah masuk.',
            onDownload: { flags: ['s10_konfig_ambil'] } },
          { id: 's10_log', name: 'log_router.txt', minAccess: 'admin',
            content: '[minggu lalu] login admin gagal x5 -> mode darurat aktif\n[kemarin] login admin gagal x3 (mencoba "asrama123")\n[hari ini] sepi.' }
        ],
        controls: [
          { id: 's10_mode', label: 'Mode kecepatan', minAccess: 'admin', states: ['DARURAT 1 Mbps', 'NORMAL 20 Mbps'], state: 'DARURAT 1 Mbps',
            on: { 'NORMAL 20 Mbps': { flags: ['s10_normal'] } } }
        ]
      }
    }
  },
  creds: {},
  clues: {
    s10_aturan: { title: 'Aturan sandi admin router', text: 'Sandi admin = nama bunga asrama (huruf besar) + tahun peresmian gedung, tanpa spasi. Nama bunga: kenanga.' },
    s10_tahun: { title: 'Tahun peresmian asrama', text: 'Buku jaga: gedung asrama diresmikan tahun 2003.' }
  },
  edges: [['barat_hub', 's10_papan'], ['s10_papan', 's10_pos'], ['s10_papan', 's10_router']],
  place: { s10_router: [0, 4, 'barat'], s10_papan: [1, 4, 'barat'], s10_pos: [0, 5, 'barat'] },
  objectives: [
    { id: 'aturan', text: 'Temukan aturan penyusunan sandi admin', done: (r) => r.clues.includes('s10_aturan') },
    { id: 'tahun', text: 'Temukan tahun peresmian asrama', done: (r) => r.clues.includes('s10_tahun') },
    { id: 'masuk', text: 'Buka akses admin Router Asrama Kenanga', done: (r) => r.devices.s10_router.access === 'admin' },
    { id: 'konfig', text: 'Salin konfigurasi_cadangan.txt ke perangkatmu', main: true, done: (r) => hasLocal(r, 's10_konfig') },
    { id: 'normal', text: '(Bonus) Matikan mode darurat router', bonus: true, done: (r) => mode(r) === 'NORMAL 20 Mbps' }
  ],
  hints: [
    { when: (r) => !r.clues.includes('s10_aturan'), text: 'Dari Hotspot Kampus Barat, CONNECT ke Papan Pengumuman Asrama dan baca pengumuman_asrama.txt. Tidak butuh tool tambahan.' },
    { when: (r) => !r.clues.includes('s10_tahun'), text: 'Sandi butuh tahun peresmian. SCAN dari papan, lalu CONNECT ke Pos Penjaga dan baca buku_jaga_asrama.txt.' },
    { when: (r) => r.devices.s10_router.access !== 'admin', text: 'CONNECT ke Router Asrama Kenanga, pilih CRACK. Gabungkan nama bunga + tahun: bukan salah satunya saja, dan bukan sandi lama.' },
    { when: (r) => !hasLocal(r, 's10_konfig'), text: 'Buka tab FILE dan DOWNLOAD konfigurasi_cadangan.txt.' },
    { when: (r) => mode(r) !== 'NORMAL 20 Mbps', text: 'Bonus: CONTROL mode kecepatan ke NORMAL 20 Mbps supaya penghuni bisa kuliah daring.' }
  ],
  endings: [
    { id: 'normal', label: 'Kabari Vira', reward: 220,
      requires: (r) => hasLocal(r, 's10_konfig'),
      text: 'Vira mengirim emoji tepuk tangan di grup asrama. Esok pagi seisi Kenanga kuliah daring dengan lancar. "Utang kopi ya, Kak!"' }
  ],
  meta: { giver: 'vira', minLevel: 0, district: 'Barat', difficulty: 2, repReward: 60, short: 'Asrama Kenanga — sandi router terlupa.' },
  items: { usb: 1 },
  drop: 'usb',
  dialogue: {
    offer: offer(
      [
        N('Kak, kamu yang katanya jago jaringan itu, kan? Sini sebentar. Wi-Fi asramaku cuma 1 Mbps sejak dua minggu lalu!', 'worried'),
        N('Ibu kos lagi umroh, dan sandi admin router entah ke mana. Aku sudah coba "asrama123", ditolak terus. Malah mode darurat nyala.'),
        N('Katanya ada aturan menyusun sandi, tersebar di jaringan asrama. Kamu mau bantu? Janji kubayar, hehe.')
      ],
      'Oke, aku bantu.',
      'Maaf, lain kali ya.',
      [N('Asyik! Mulai dari papan pengumuman di Kampus Barat. Ada dua petunjuk berbeda, jangan kelewatan salah satunya!', 'happy')],
      [N('Yah... ya sudah. Aku tahan dulu pakai hotspot HP-ku.')]
    ),
    turnIn: [
      N('Wi-Fi-nya ngebut lagi! Dua belas kamar sekaligus bersorak, Kak!', 'happy'),
      N('Serius deh, kamu keren. Nih USB bekas, siapa tahu berguna. Jangan lupa mampir ke asrama.', 'happy')
    ]
  }
};
