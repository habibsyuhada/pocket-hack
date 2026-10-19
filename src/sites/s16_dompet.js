// s16 "Bursa: Dompet Beku" — ELEVATE dengan dua persetujuan, lalu pilihan moral lewat kontrol alokasi (3 ending).
import { N, Y, offer } from '../game/dlg.js';

const alok = (r) => r.devices.s16_brankas.controls.find((c) => c.id === 's16_alokasi')?.state;
const admin = (r) => r.devices.s16_brankas.access === 'admin';

export default {
  id: 's16',
  code: 'V-16',
  title: 'Dompet Beku',
  client: 'Mbah Gun, Pasar Selatan',
  reward: 420,
  brief:
    'Bursa kecil di gang belakang membekukan dompet DP-17 yang menampung uang dua belas warga korban "arisan koin". ' +
    'Mbah Gun ingin dompet itu dibuka dan isinya diurus. Cari dua persetujuan yang dibutuhkan, naikkan aksesmu jadi admin (ELEVATE), ' +
    'lalu putuskan sendiri ke mana dana itu mengalir. Tidak ada tool berbayar yang wajib.',
  entry: ['s16_loket'],
  world: {
    devices: {
      s16_loket: {
        id: 's16_loket', name: 'Loket Bursa Koinpasar', kind: 'Gateway', addr: '10.9.30.1', online: true, open: 'guest',
        links: ['s16_support'],
        inspect: 'Loket publik bursa kecil di gang belakang pasar. Tamu hanya melihat pengumuman dan keluhan.',
        files: [
          { id: 's16_umum', name: 'pengumuman_beku.txt', minAccess: 'guest',
            content:
              'PENGUMUMAN\n\nDompet nomor 17 dibekukan sementara karena 12 pengaduan nasabah.\n' +
              'Layanan nasabah shift malam memakai sandi: kata "beku" + tanda hubung + jumlah pengadu.\n(Mohon tidak disebar. Terima kasih.)',
            onRead: { clues: ['s16_sandi'] } },
          { id: 's16_keluhan', name: 'keluhan_warga.txt', minAccess: 'guest',
            content:
              'KELUHAN WARGA\n\n"Saya setor untuk arisan koin, katanya untung dua kali lipat. Sekarang tidak bisa ditarik." - Bu Ning\n' +
              '"Tabungan haji saya ikut masuk, Mbah." - Pak Sar\nTotal tercatat: 12 orang.'
          }
        ]
      },
      s16_support: {
        id: 's16_support', name: 'PC Layanan Nasabah', kind: 'Workstation', addr: '10.9.30.5', online: true, links: ['s16_brankas', 's16_arsip'],
        inspect: 'PC layanan nasabah. Terkunci sandi shift malam.',
        crack: { level: 'user', answer: 'beku-12', options: ['support123', 'beku-17', 'beku-12', 'koinpasar'],
          onSuccess: { clues: ['s16_dua_izin'] } },
        files: [
          { id: 's16_sop', name: 'sop_dompet_beku.txt', minAccess: 'user',
            content:
              'SOP DOMPET BEKU\n\nDompet beku hanya boleh dibuka admin setelah DUA persetujuan tertulis:\n' +
              '1. Izin operator jaga (lembar izin ada di PC ini).\n2. Izin auditor (lembar izin ada di Arsip Audit).\n' +
              'Setelah keduanya terbaca, naikkan akses di Server Dompet (ELEVATE). Belum lengkap? Sistem menolak.',
            onRead: { clues: ['s16_dua_izin'] } },
          { id: 's16_izin_ops_f', name: 'izin_operator.txt', minAccess: 'user',
            content: 'IZIN OPERATOR JAGA\n\nDompet 17 boleh dibuka untuk dikembalikan kepada pemilik sahnya.\nTtd: operator jaga malam (yang sudah ingin pulang dari tadi).',
            onRead: { flags: ['s16_izin_ops'] } }
        ]
      },
      s16_arsip: {
        id: 's16_arsip', name: 'Arsip Audit', kind: 'NAS', addr: '10.9.30.9', online: true, open: 'user',
        inspect: 'Arsip tim audit bursa. Berisi lembar izin dan daftar korban.',
        files: [
          { id: 's16_izin_audit_f', name: 'izin_auditor.txt', minAccess: 'user',
            content: 'IZIN AUDITOR\n\nSetelah diperiksa, saldo dompet 17 bukan milik bursa. Pembukaan disetujui.\nTtd: auditor lepas.',
            onRead: { flags: ['s16_izin_audit'] } },
          { id: 's16_korban', name: 'daftar_korban.txt', minAccess: 'user',
            content: 'DAFTAR KORBAN\n\n12 warga. Total setoran: Rp 24.000.000.\nBu Ning 3 jt · Pak Sar 5 jt · sepuluh lainnya 16 jt.' },
          { id: 's16_upah_f', name: 'kesepakatan_upah.txt', minAccess: 'user',
            content: 'KESEPAKATAN UPAH\n\nPemulih yang membuka dompet berhak atas upah 25% dari saldo, yaitu Rp 6.000.000.\n(Dituliskan oleh bursa. Apakah wajar, itu urusan hati nurani.)' }
        ]
      },
      s16_brankas: {
        id: 's16_brankas', name: 'Server Dompet DP-17', kind: 'Server', addr: '10.9.30.20', online: true, open: 'user',
        inspect: 'Server dompet beku. Tamu biasa hanya bisa lihat saldo. Mengalirkan dana butuh akses admin.\nAdmin hanya diberi setelah dua persetujuan tertulis.',
        elevate: {
          from: 'user', to: 'admin', requires: ['s16_izin_ops', 's16_izin_audit'],
          text: 'Dua persetujuan terverifikasi. Server dompet memberimu akses admin.',
          failText: 'Server menolak: persetujuan belum lengkap. Baca izin operator (PC Layanan) dan izin auditor (Arsip Audit) dulu.'
        },
        files: [
          { id: 's16_saldo', name: 'saldo_publik.txt', minAccess: 'user',
            content: 'SALDO DP-17\n\nTertahan: Rp 24.000.000 (beku).\nCoba ELEVATE bila izin sudah lengkap.' },
          { id: 's16_log', name: 'log_dompet.txt', minAccess: 'admin',
            content:
              'LOG DOMPET 17\n\nSetoran masuk dari 12 alamat warga. Tidak ada penarikan sah.\n' +
              'Panel alokasi di server ini bisa mengalirkan dana: ke korban, ke upahmu, atau dibagi. Pilihan bisa diubah sebelum kamu lapor.' }
        ],
        controls: [
          { id: 's16_alokasi', label: 'Alokasi dana DP-17', minAccess: 'admin',
            states: ['BEKU', 'KEMBALI KE KORBAN', 'AMBIL UPAH', 'BAGI DUA'], state: 'BEKU',
            on: {
              'KEMBALI KE KORBAN': { log: 'Dana Rp 24.000.000 dialirkan penuh kembali ke dua belas pemilik.' },
              'AMBIL UPAH': { log: 'Upah Rp 6.000.000 ditarik ke dompetmu, sisanya tetap di dompet beku.' },
              'BAGI DUA': { log: 'Upah dipotong separuh (Rp 3.000.000), sisanya dikembalikan ke korban.' }
            } }
        ]
      }
    }
  },
  creds: {},
  clues: {
    s16_sandi: { title: 'Pola sandi shift malam', text: 'Sandi = "beku" + tanda hubung + jumlah pengadu (12).' },
    s16_dua_izin: { title: 'Dua persetujuan', text: 'ELEVATE di Server Dompet butuh izin operator (PC Layanan) dan izin auditor (Arsip Audit).' }
  },
  objectives: [
    { id: 'masuk', text: 'Masuk ke PC Layanan Nasabah', done: (r) => r.devices.s16_support.access !== 'none' },
    { id: 'izin', text: 'Baca izin operator dan izin auditor', done: (r) => r.flags.includes('s16_izin_ops') && r.flags.includes('s16_izin_audit') },
    { id: 'admin', text: 'Dapatkan akses admin di Server Dompet (ELEVATE)', main: true, done: (r) => admin(r) },
    { id: 'putus', text: 'Putuskan ke mana dana mengalir (panel alokasi)', done: (r) => admin(r) && alok(r) !== 'BEKU' },
    { id: 'upah', text: '(Bonus) Baca kesepakatan upah', bonus: true, done: (r) => r.read.includes('s16_upah_f') }
  ],
  hints: [
    { when: (r) => !r.read.includes('s16_umum'), text: 'Mulai dari Hotspot Pasar Selatan: CONNECT ke Loket Bursa Koinpasar dan baca pengumuman_beku.txt. Tidak ada tool berbayar yang wajib.' },
    { when: (r) => r.devices.s16_support.access === 'none', text: 'CRACK PC Layanan Nasabah: sandinya kata "beku", tanda hubung, lalu jumlah pengadu.' },
    { when: (r) => !r.flags.includes('s16_izin_ops'), text: 'Baca izin_operator.txt di PC Layanan Nasabah.' },
    { when: (r) => !r.flags.includes('s16_izin_audit'), text: 'Satu izin lagi: baca izin_auditor.txt di Arsip Audit.' },
    { when: (r) => !admin(r), text: 'CONNECT ke Server Dompet DP-17, lalu ELEVATE ke admin.' },
    { when: (r) => alok(r) === 'BEKU', text: 'Buka panel alokasi (CONTROL) dan putuskan sendiri: kembalikan ke korban, ambil upah, atau bagi dua. Semua pilihan sah.' },
    { when: (r) => !r.read.includes('s16_upah_f'), text: 'Bonus: baca kesepakatan_upah.txt di Arsip Audit sebelum memutuskan.' }
  ],
  endings: [
    {
      id: 'kembali', label: 'Kembalikan semua dana ke korban', reward: 380,
      requires: (r) => admin(r) && alok(r) === 'KEMBALI KE KORBAN',
      text: 'Dua belas warga menerima uangnya kembali, sampai ke sen terakhir. Bu Ning menangis di depan warung. Mbah Gun hanya mendengus, tapi lama ia menatapmu. "Upahmu cuma terima kasih, Nak." Namamu harum di pasar, dompetmu tipis.'
    },
    {
      id: 'upah', label: 'Ambil upah penuh', reward: 560,
      requires: (r) => admin(r) && alok(r) === 'AMBIL UPAH',
      text: 'Kamu mengambil upah sesuai kesepakatan. Sah di atas kertas. Mbah Gun menghitung uangnya, tidak berkomentar. Tapi kabar tentang sisa dana yang tak pernah sampai ke warga beredar pelan di pasar. Dompetmu tebal, sambutan warga dingin.'
    },
    {
      id: 'bagi', label: 'Bagi dua: upah separuh, sisanya kembali', reward: 460,
      requires: (r) => admin(r) && alok(r) === 'BAGI DUA',
      text: 'Kamu mengambil separuh upah dan mengembalikan sisanya. Tidak ada yang menyebutmu pahlawan, tidak ada yang menyebutmu maling. "Jalan tengah," kata Mbah Gun. "Paling susah dijalani, Nak."'
    }
  ],
  meta: {
    giver: 'gun', minLevel: 1, district: 'Selatan', difficulty: 4, repReward: 120,
    short: 'Dompet bursa membeku berisi uang korban. Buka dan putuskan nasib dananya.'
  },
  dialogue: {
    offer: offer(
      [
        N('Duduk, Nak. Ada urusan di gang belakang. Bursa kecil itu membekukan satu dompet.', 'serious'),
        N('Isinya uang dua belas orang pasar. Tabungan haji, uang sekolah. Aku tidak tanya sumber, tapi yang ini... aku tahu pemiliknya.'),
        N('Buka dompetnya. Caranya ada aturan, dua izin. Setelah terbuka, kamu yang tentukan uangnya ke mana. Aku tidak akan mengatur.')
      ],
      'Aku kerjakan.', 'Aku pikir dulu.',
      [N('Hmph. Hati-hati, Nak. Uang itu paling pandai menguji orang.', 'serious')],
      [N('Terserah. Dompet itu tidak ke mana-mana, orangnya yang menunggu.')]
    ),
    turnIn: [
      N('Sudah selesai? Aku sudah dengar dari orang-orang.'),
      Y('Dompetnya terbuka, dan keputusannya sudah kuambil.'),
      N('Hmm. Apa pun pilihanmu, kamu yang menanggungnya. Nih bagianmu.', 'serious')
    ]
  },
  patches: {},
  edges: [['selatan_hub', 's16_loket']],
  place: {
    s16_loket: [1, 13, 'selatan'],
    s16_support: [1, 14, 'selatan'],
    s16_brankas: [2, 14, 'selatan'],
    s16_arsip: [0, 14, 'selatan']
  }
};
