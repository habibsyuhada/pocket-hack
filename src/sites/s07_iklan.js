// "Papan Iklan Dibajak" — clue lives on a city node (pos_satpam): the factory-default
// password was never changed. LOGIN, then STOP the right process (the wrong one
// blanks the whole board — a trap that teaches you to read process descriptions).
import { N, offer } from '../game/dlg.js';

const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const procOn = (r, id) => r.devices.s07_papan.procs.find((p) => p.id === id)?.running;

export default {
  id: 's07',
  code: 'P-07',
  title: 'Papan Iklan Dibajak',
  client: 'Bu Laras (atas permintaan pengelola papan iklan Alun-Alun)',
  reward: 150,
  brief:
    'Papan iklan digital di Alun-Alun tiba-tiba memutar tulisan aneh dan iklan penipuan. Pengelolanya bingung dan Bu Laras tidak enak hati pada pelanggan kafe. ' +
    'Cari tahu dari mana teknisinya biasa masuk, hentikan proses yang membajak layar, lalu salin catatan jejaknya sebagai bukti. ' +
    'Semua bisa dikerjakan dengan perintah bawaan.',
  entry: ['s07_papan'],
  world: {
    devices: {
      s07_papan: {
        id: 's07_papan', name: 'Papan Iklan Alun-Alun', kind: 'Gateway', addr: '10.0.52.8', online: true,
        links: [],
        inspect:
          'Pengendali papan iklan digital di sisi timur alun-alun. Terkunci untuk tamu: butuh akun operator.\n' +
          'Layar sedang memutar tulisan yang bukan milik pengelola. Ada dua proses utama di sini — baca keterangannya sebelum menghentikan apa pun.',
        files: [
          { id: 's07_jadwal', name: 'jadwal_tayang.txt', minAccess: 'user',
            content: 'JADWAL TAYANG PAPAN ALUN-ALUN\n\n06.00 Pengumuman kelurahan\n08.00 Iklan Kopi Senja (kontrak Bu Laras)\n12.00 Info bus kota\n18.00 Iklan Toko Bangunan Makmur\n\nCatatan: jadwal ini dibuat oleh proses "penjadwal". Jangan dimatikan sembarangan.' },
          { id: 's07_jejak', name: 'jejak_penyusup.log', minAccess: 'user', keep: true,
            content:
              '[02:11] login operator dari 10.0.52.99 (sandi bawaan pabrik)\n' +
              '[02:12] proses "sisip_iklan" dipasang\n' +
              '[02:12] layar: mengganti playlist dengan "TRANSFER SEKARANG, HADIAH MENUNGGU"\n' +
              '[02:40] sisip_iklan menahan jejak_penyusup.log (menulis ulang tiap menit)\n' +
              '[02:41] catatan: tidak ada upaya merusak perangkat, hanya mengganti tayangan.',
            onDownload: { flags: ['s07_bukti'] } }
        ],
        procs: [
          { id: 's07_penjadwal', name: 'penjadwal', desc: 'Menjalankan jadwal tayang resmi pengelola. Layar akan kosong kalau ini dimatikan.', running: true, control: 'admin',
            onStop: { flags: ['s07_layar_kosong'], log: 'Layar papan mendadak hitam. Itu proses jadwal resmi! Nyalakan lagi dengan START.' },
            onStart: { flags: ['s07_penjadwal_hidup'] } },
          { id: 's07_sisip', name: 'sisip_iklan', desc: 'Proses asing yang menyisipkan iklan penipuan. Sedang menahan jejak_penyusup.log.', running: true, control: 'admin', locks: ['s07_jejak'],
            onStop: { flags: ['s07_penyusup_henti'] } }
        ],
        controls: [
          { id: 's07_layar', label: 'Mode layar', minAccess: 'admin', states: ['TAYANGAN ASING', 'JADWAL RESMI'], state: 'TAYANGAN ASING',
            on: { 'JADWAL RESMI': { flags: ['s07_layar_resmi'] } } }
        ]
      }
    }
  },
  creds: {
    s07_operator: { label: 'operator @ Papan Iklan Alun-Alun', account: 'operator', device: 's07_papan', level: 'admin' }
  },
  clues: {
    s07_default: { title: 'Sandi bawaan pabrik papan iklan', text: 'Buku serah terima satpam: akun "operator" papan iklan masih memakai sandi bawaan pabrik.' }
  },
  patches: {
    pos_satpam: {
      files: [
        { id: 's07_serah_terima', name: 'serah_terima_teknisi.txt', minAccess: 'guest',
          content:
            'SERAH TERIMA TEKNISI PAPAN IKLAN\n\n' +
            'Papan iklan baru dipasang Senin lalu. Teknisi menitipkan catatan di pos:\n' +
            '- Akun pengelola: "operator", sandi masih bawaan pabrik (papan-0000). Belum sempat diganti.\n' +
            '- Tolong ganti sandi setelah Pak Teknisi kembali dari luar kota.\n' +
            '- Jangan matikan proses "penjadwal", nanti layar kosong.\n\n' +
            '(Satpam: catatan ini ditempel di dinding, jangan difoto.)',
          onRead: { creds: ['s07_operator'], clues: ['s07_default'], reveal: ['s07_papan'] } }
      ]
    }
  },
  edges: [['pos_satpam', 's07_papan']],
  place: { s07_papan: [3, 5, 'tengah'] },
  objectives: [
    { id: 'note', text: 'Temukan catatan sandi papan iklan di pos satpam', done: (r) => r.creds.includes('s07_operator') },
    { id: 'login', text: 'Masuk ke papan iklan sebagai operator', done: (r) => r.devices.s07_papan.access === 'admin' },
    { id: 'stop', text: 'Hentikan proses yang menyisipkan iklan penipuan', done: (r) => !procOn(r, 's07_sisip') },
    { id: 'bukti', text: 'Salin jejak_penyusup.log ke perangkatmu', main: true, done: (r) => hasLocal(r, 's07_jejak') },
    { id: 'resmi', text: '(Bonus) Kembalikan layar ke JADWAL RESMI', bonus: true,
      done: (r) => r.devices.s07_papan.controls[0].state === 'JADWAL RESMI' && !!procOn(r, 's07_penjadwal') }
  ],
  hints: [
    { when: (r) => !r.read.includes('s07_serah_terima'), text: 'Teknisi biasanya menitipkan catatan di pos jaga. Dari Hotspot Alun-Alun, CONNECT ke Pos Satpam dan baca serah_terima_teknisi.txt. Tidak perlu tool tambahan.' },
    { when: (r) => r.devices.s07_papan.access === 'none', text: 'CONNECT ke Papan Iklan Alun-Alun (tersambung dari Pos Satpam), lalu LOGIN dengan akun operator.' },
    { when: (r) => !!procOn(r, 's07_sisip'), text: 'Buka tab SISTEM. Hentikan proses yang asing: sisip_iklan. Jangan "penjadwal" — itu milik pengelola.' },
    { when: (r) => !hasLocal(r, 's07_jejak'), text: 'Buka tab FILE dan DOWNLOAD jejak_penyusup.log.' },
    { when: (r) => !procOn(r, 's07_penjadwal'), text: 'Layar masih hitam: START proses penjadwal lagi.' },
    { when: (r) => r.devices.s07_papan.controls[0].state !== 'JADWAL RESMI', text: 'Bonus: CONTROL mode layar ke JADWAL RESMI. Atau kembali ke Bu Laras.' }
  ],
  endings: [
    { id: 'pulih', label: 'Laporkan ke Bu Laras', reward: 150,
      requires: (r) => hasLocal(r, 's07_jejak') && !procOn(r, 's07_sisip'),
      text: 'Papan iklan kembali menayangkan Iklan Kopi Senja. Pengelola menempel catatan baru: "Sandi sudah diganti, terima kasih!" Bu Laras menyelipkan sepotong kue lapis untukmu.' }
  ],
  meta: { giver: 'laras', minLevel: 2, district: 'Tengah', difficulty: 1, repReward: 50, short: 'Papan iklan Alun-Alun — layar dibajak iklan penipuan.' },
  items: { kue: 1 },
  drop: 'kue',
  dialogue: {
    offer: offer(
      [
        N('Nak, papan iklan di Alun-Alun itu tiba-tiba memutar tulisan aneh. Katanya "transfer sekarang, hadiah menunggu".', 'worried'),
        N('Padahal di jam delapan itu jadwal iklan kafeku. Pelanggan sampai tanya, apa kafeku ikut-ikutan penipuan?'),
        N('Pengelolanya bilang teknisi menitipkan catatan di pos satpam. Coba kamu lihat ke sana, ya.')
      ],
      'Aku periksa, Bu.',
      'Nanti ya, Bu.',
      [N('Terima kasih, Nak. Pos Satpam ada di dekat Hotspot Alun-Alun. Hati-hati, jangan matikan yang bukan milik mereka.', 'happy')],
      [N('Iya, tidak apa-apa. Tapi layar itu dilihat seluruh kota, lho.')]
    ),
    turnIn: [
      N('Sudah beres? Aku lewat tadi, layarnya sudah menayangkan iklan kafeku lagi!', 'happy'),
      N('Dan kamu menyalin jejaknya, kata pengelola. Pintar sekali, Nak. Nih, kue lapis buatku sendiri.', 'happy')
    ]
  }
};
