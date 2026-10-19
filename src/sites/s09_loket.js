// "Absensi Loket Bus" — a deduction puzzle. Read a week of attendance sheets (loket) and
// the toll-gate log (gate_tol), find the "ghost" driver, then freeze that one salary.
// A decoy (a driver who really was sick on Wednesday) punishes guessing from one source.
import { N, offer } from '../game/dlg.js';

const DAYS = ['s09_senin', 's09_selasa', 's09_rabu', 's09_kamis', 's09_jumat'];
const readDays = (r) => DAYS.filter((d) => r.read.includes(d)).length;
const tahan = (r) => r.devices.s09_payroll.controls[0].state;
const proven = (r) => readDays(r) >= 5 && r.read.includes('s09_log_gardu');
const hasLocal = (run, id) => run.local.some((f) => f.id === id);

const sheet = (hari, summary, rows) => `ABSENSI ${hari} — ${summary}\n\n${rows.join('\n')}`;

export default {
  id: 's09',
  code: 'U-09',
  title: 'Absensi Loket Bus',
  client: 'Rani, jurnalis (liputan gaji loket bus)',
  reward: 200,
  brief:
    'Seorang narasumber Rani curiga ada sopir "siluman" di loket bus Terminal Utara: namanya digaji tiap bulan tapi tak pernah terlihat. ' +
    'Cocokkan lembar absensi seminggu dengan catatan gerbang tol, temukan siapa yang tidak pernah benar-benar bertugas, lalu tahan gajinya di server gaji. ' +
    'Perintah SEARCH (◆70, Pasar Gelap) boleh dipakai untuk memindai cepat, tapi tidak wajib.',
  entry: ['s09_loket'],
  world: {
    devices: {
      s09_loket: {
        id: 's09_loket', name: 'PC Loket Bus Utara', kind: 'Workstation', addr: '10.20.16.4', online: true,
        inspect: 'Komputer loket bus antarkota. Terkunci untuk tamu — butuh akun petugas.\nBerisi lembar absensi sopir tiap hari kerja.',
        files: [
          { id: 's09_senin', name: 'absensi_senin.txt', minAccess: 'user',
            content: sheet('SENIN', '4 petugas hadir', [
              'Darto   · B 1432 SA · 05.48 – 13.52', 'Sri     · B 2208 KL · 06.05 – 14.10',
              'Hendra  · B 5090 RM · 05.30 – 13.35', 'Wawan   · B 7711 YA · 05.00 – 13.00']) },
          { id: 's09_selasa', name: 'absensi_selasa.txt', minAccess: 'user',
            content: sheet('SELASA', '4 petugas hadir', [
              'Darto   · B 1432 SA · 05.52 – 13.47', 'Sri     · B 2208 KL · 06.12 – 14.05',
              'Hendra  · B 5090 RM · 05.41 – 13.30', 'Wawan   · B 7711 YA · 05.00 – 13.00']) },
          { id: 's09_rabu', name: 'absensi_rabu.txt', minAccess: 'user',
            content: sheet('RABU', '3 hadir, 1 izin sakit', [
              'Darto   · IZIN SAKIT (surat dokter terlampir)', 'Sri     · B 2208 KL · 06.02 – 14.00',
              'Hendra  · B 5090 RM · 05.35 – 13.40', 'Wawan   · B 7711 YA · 05.00 – 13.00']) },
          { id: 's09_kamis', name: 'absensi_kamis.txt', minAccess: 'user',
            content: sheet('KAMIS', '4 petugas hadir', [
              'Darto   · B 1432 SA · 05.44 – 13.50', 'Sri     · B 2208 KL · 06.20 – 14.15',
              'Hendra  · B 5090 RM · 05.38 – 13.33', 'Wawan   · B 7711 YA · 05.00 – 13.00']) },
          { id: 's09_jumat', name: 'absensi_jumat.txt', minAccess: 'user',
            content: sheet('JUMAT', '4 petugas hadir', [
              'Darto   · B 1432 SA · 05.50 – 13.45', 'Sri     · B 2208 KL · 06.08 – 14.02',
              'Hendra  · B 5090 RM · 05.33 – 13.37', 'Wawan   · B 7711 YA · 05.00 – 13.00']) },
          { id: 's09_info_gaji', name: 'info_penggajian.txt', minAccess: 'user',
            content:
              'INFO PENGGAJIAN\n\nGaji sopir dibayar dari server gaji terpisah. Server itu masih memakai firmware lama (v1.2) dan belum ditambal.\n' +
              'Petugas boleh menahan gaji satu nama bila ada selisih absen — pilih nama yang benar-benar bermasalah, jangan asal.',
            onRead: { reveal: ['s09_payroll'] } }
        ]
      },
      s09_payroll: {
        id: 's09_payroll', name: 'Server Gaji Loket', kind: 'Server', addr: '10.20.16.9', online: true,
        inspect: 'Server penggajian loket bus. Firmware v1.2 — celah lamanya sudah dikenal dan belum ditambal.\nTamu tidak boleh masuk. Cobalah EXPLOIT.',
        exploit: { level: 'admin', text: 'Celah firmware v1.2 dimanfaatkan: sesi administrator terbuka tanpa sandi.' },
        files: [
          { id: 's09_gaji_catatan', name: 'catatan_gaji.txt', minAccess: 'admin',
            content: 'CATATAN GAJI\n\nGaji bulan ini siap dibayar untuk 4 sopir: Darto, Sri, Hendra, Wawan.\nPembayaran bisa ditahan satu nama lewat kontrol "Tahan gaji untuk".\nMenahan gaji orang yang benar bertugas = pelanggaran. Pastikan dulu.' }
        ],
        controls: [
          { id: 's09_tahan', label: 'Tahan gaji untuk', minAccess: 'admin',
            states: ['(belum ada)', 'Darto', 'Sri', 'Hendra', 'Wawan'], state: '(belum ada)',
            on: {
              Darto: { log: 'Gaji Darto ditahan. Tunggu: dia izin sakit di hari Rabu dengan surat dokter, dan melintas gerbang di hari lainnya. Itu bukan orangnya. Pilih ulang.' },
              Sri: { log: 'Gaji Sri ditahan. Tapi platnya tercatat melintas gerbang setiap hari kerja. Pilih ulang.' },
              Hendra: { log: 'Gaji Hendra ditahan. Tapi platnya tercatat di gerbang setiap hari kerja. Pilih ulang.' },
              Wawan: { flags: ['s09_hantu_ditahan'], log: 'Gaji Wawan ditahan. Jam absennya selalu persis 05.00 – 13.00 dan platnya tak pernah melintas gerbang.' }
            } }
        ]
      }
    }
  },
  creds: {
    s09_petugas: { label: 'petugas @ PC Loket Bus Utara', account: 'petugas', device: 's09_loket', level: 'user' }
  },
  clues: {
    s09_petugas: { title: 'Akun petugas loket bus', text: 'Catatan shift gerbang tol memuat akun petugas loket yang belum diganti.' },
    s09_pola: { title: 'Pola absen siluman', text: 'Bandingkan absensi loket dengan catatan gerbang: cari plat yang tak pernah lewat dan jam yang tak pernah berubah.' }
  },
  patches: {
    gate_tol: {
      files: [
        { id: 's09_shift', name: 'catatan_shift.txt', minAccess: 'guest',
          content:
            'CATATAN SHIFT GERBANG\n\nLoket bus di sebelah gerbang pakai komputer bersama. Akun "petugas", sandi "loket-utara-7". Belum diganti sejak 2022.\n' +
            'Catatan plat bus antarkota yang melintas ada di berkas log_gardu_bus.txt.',
          onRead: { creds: ['s09_petugas'], clues: ['s09_petugas'], reveal: ['s09_loket'] } },
        { id: 's09_log_gardu', name: 'log_gardu_bus.txt', minAccess: 'guest',
          content:
            'LOG GARDU BUS ANTARKOTA — plat yang melintas minggu ini\n\n' +
            'SEN  05.58 B 1432 SA · 05.40 B 5090 RM · 06.15 B 2208 KL\n' +
            'SEL  05.55 B 1432 SA · 05.47 B 5090 RM · 06.22 B 2208 KL\n' +
            'RAB  05.41 B 5090 RM · 06.12 B 2208 KL\n' +
            'KAM  05.50 B 1432 SA · 05.44 B 5090 RM · 06.30 B 2208 KL\n' +
            'JUM  05.56 B 1432 SA · 05.39 B 5090 RM · 06.17 B 2208 KL\n\n' +
            'Catatan: gerbang mencatat semua plat bus antarkota yang keluar terminal.',
          onRead: { clues: ['s09_pola'] } }
      ]
    }
  },
  edges: [['gate_tol', 's09_loket'], ['s09_loket', 's09_payroll']],
  place: { s09_loket: [6, 1, 'utara'], s09_payroll: [7, 1, 'utara'] },
  objectives: [
    { id: 'login', text: 'Masuk ke PC Loket Bus sebagai petugas', done: (r) => r.devices.s09_loket.access === 'user' || r.devices.s09_loket.access === 'admin' },
    { id: 'baca', text: 'Baca absensi lima hari dan log gerbang', done: (r) => proven(r) },
    { id: 'gaji', text: 'Buka akses admin di Server Gaji Loket', done: (r) => r.devices.s09_payroll.access === 'admin' },
    { id: 'tahan', text: 'Tahan gaji sopir siluman', main: true, done: (r) => tahan(r) === 'Wawan' && proven(r) },
    { id: 'bukti', text: '(Bonus) Salin log_gardu_bus.txt sebagai bukti untuk Rani', bonus: true, done: (r) => hasLocal(r, 's09_log_gardu') }
  ],
  hints: [
    { when: (r) => !r.read.includes('s09_shift'), text: 'Dari Hotspot Terminal Utara, CONNECT ke Gerbang Tol Utara dan baca catatan_shift.txt. Tidak ada tool wajib; SEARCH (◆70) hanya opsional untuk memindai cepat.' },
    { when: (r) => r.devices.s09_loket.access === 'none', text: 'CONNECT ke PC Loket Bus Utara lalu LOGIN dengan akun petugas.' },
    { when: (r) => readDays(r) < 5, text: 'Buka tab FILE dan baca absensi lima hari. Perhatikan jam masuk dan plat tiap sopir.' },
    { when: (r) => !r.read.includes('s09_log_gardu'), text: 'Bandingkan dengan log_gardu_bus.txt di Gerbang Tol Utara: plat siapa yang tak pernah lewat? Hati-hati, ada sopir yang memang sakit.' },
    { when: (r) => r.devices.s09_payroll.access !== 'admin', text: 'Baca info_penggajian.txt, lalu CONNECT ke Server Gaji Loket dan coba EXPLOIT.' },
    { when: (r) => tahan(r) !== 'Wawan', text: 'Di Server Gaji, pakai CONTROL "Tahan gaji untuk" pada nama yang tak pernah tercatat di gerbang dan jam absennya selalu sama. Kalau salah, pilih ulang.' },
    { when: (r) => !hasLocal(r, 's09_log_gardu'), text: 'Bonus: DOWNLOAD log_gardu_bus.txt dari Gerbang Tol sebagai bukti untuk Rani.' }
  ],
  endings: [
    { id: 'liput', label: 'Serahkan temuan ke Rani', reward: 200,
      requires: (r) => tahan(r) === 'Wawan' && proven(r),
      text: 'Rani menulis liputan dengan judul "Sopir yang Tak Pernah Berangkat". Pengelola loket berjanji memeriksa ulang daftar gaji. "Kerja rapi," katanya sambil tersenyum tipis.' }
  ],
  meta: { giver: 'rani', minLevel: 1, district: 'Utara', difficulty: 2, repReward: 60, short: 'Loket bus — sopir siluman di daftar gaji.' },
  items: { dokumen: 1 },
  drop: 'dokumen',
  dialogue: {
    offer: offer(
      [
        N('Aku dapat bisikan dari dalam loket bus Terminal Utara. Ada nama di daftar gaji yang katanya tak pernah terlihat naik bus.', 'serious'),
        N('Tapi aku tidak mau menuduh orang yang salah. Bisa saja ada yang memang sakit atau libur. Perlu bukti dari dua sisi.'),
        N('Absensi ada di komputer loket, catatan plat ada di gerbang tol. Mau mencocokkannya?')
      ],
      'Aku cocokkan datanya.',
      'Aku pikir dulu.',
      [N('Bagus. Mulai dari Gerbang Tol Utara. Teliti dan sabar, ya. Satu nama salah itu fatal.', 'serious')],
      [N('Baiklah. Tapi jangan kelamaan, narasumberku mulai gelisah.')]
    ),
    turnIn: [
      N('Wawan? Plat tak pernah lewat, jamnya persis 05.00 sampai 13.00 setiap hari? Dan Darto memang sakit hari Rabu. Kamu tidak asal tuduh. Itu yang aku suka.', 'happy'),
      N('Ini salinan dokumen untuk arsipmu. Liputan ini tidak akan lahir tanpa kamu.', 'happy')
    ]
  }
};
