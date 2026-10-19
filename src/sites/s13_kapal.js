// "Kapal Nelayan Hilang Sinyal" — PING menunjukkan modem kapal offline. Nyalakan
// layanan uplink di stasiun pantau (START), lalu ROUTE lewat Pemancar FM karena
// modem kapal tidak tertaut ke jaringan kota. Di kapal: hentikan loop GPS, ambil
// posisi, dan (bonus) atur kanal beacon darurat.
import { N, Y, offer } from '../game/dlg.js';

const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const procRunning = (r, dev, id) => !!r.devices[dev].procs.find((p) => p.id === id)?.running;

export default {
  id: 's13',
  code: 'P-13',
  title: 'Kapal Nelayan Hilang Sinyal',
  client: 'Kapten Sari, Kepala Syahbandar',
  reward: 340,
  brief:
    'KM Bahari 17 hilang kontak sejak badai dini hari. Modem kapalnya tidak menjawab, dan tidak tertaut ke jaringan kota. ' +
    'Nyalakan lagi layanan uplink di Stasiun Pantau, cek modemnya dengan PING, lalu jangkau lewat rute dari Pemancar FM ' +
    '(ROUTE, ◆90 — beli di Pasar Gelap). Ambil catatan posisi terakhir kapal.',
  entry: ['s13_stasiun'],
  world: {
    devices: {
      s13_stasiun: {
        id: 's13_stasiun', name: 'Stasiun Pantau Kapal', kind: 'Gateway', addr: '10.40.7.1', online: true, open: 'guest', links: ['s13_pelampung'],
        inspect: 'Stasiun pantau syahbandar: memantau modem kapal nelayan lewat layanan uplink.\nTamu hanya melihat daftar kapal. Layanan uplink dikendalikan akun operator.',
        files: [
          { id: 's13_daftar_kapal', name: 'daftar_kapal.txt', minAccess: 'guest',
            content:
              'DAFTAR KAPAL KELUAR\n\nKM Bahari 17 (Pak Jumadi + 4 awak) — berangkat 02.10, terakhir terpantau 03.12\n' +
              'KM Mutiara 3 — kembali 05.40, aman\nKM Rezeki 5 — sandar, perbaikan\n\n' +
              'Catatan jaga: tautan ke kapal diurus layanan "uplink" di stasiun ini. Sejak badai uplink mati; modem KM Bahari 17 tidak menjawab PING.\n' +
              'Modem kapal berdiri sendiri, tidak tertaut ke jaringan kota. Jalurnya hanya lewat menara Pemancar FM.' },
          { id: 's13_log_stasiun', name: 'log_stasiun.txt', minAccess: 'user',
            content:
              'LOG STASIUN\n\n[03:12] uplink: sinyal KM Bahari 17 melemah\n[03:15] uplink: berhenti (listrik padam akibat badai)\n' +
              '[03:20] operator: nyalakan lagi (START) setelah listrik pulih, lalu cek kapal dari menara.\n[05:50] operator: listrik sudah pulih. Uplink belum sempat dinyalakan.' }
        ],
        procs: [
          { id: 's13_uplink', name: 'uplink', desc: 'Tautan satelit ke kapal nelayan. Sedang mati.', running: false, control: 'user',
            onStart: { online: ['s13_modem'], log: 'Uplink menyala. Modem KM Bahari 17 mulai menjawab — tapi hanya lewat relay menara Pemancar FM.' } }
        ]
      },
      s13_pelampung: {
        id: 's13_pelampung', name: 'Pelampung Cuaca Tanjung', kind: 'Server', addr: '10.40.7.5', online: true, open: 'guest',
        inspect: 'Pelampung sensor cuaca di mulut dermaga. Catatannya terbuka untuk umum.',
        files: [
          { id: 's13_cuaca_log', name: 'cuaca_log.txt', minAccess: 'guest',
            content:
              'LOG CUACA\n\n02.40 angin 40 knot, ombak 3 m\n03.10 badai tepat di jalur nelayan timur-laut\n04.10 badai mereda\n\n' +
              'Pengingat radio: kanal 9 dipakai kapal kargo. Kanal darurat nelayan = 16.',
            onRead: { clues: ['s13_kanal'] } }
        ]
      },
      s13_modem: {
        id: 's13_modem', name: 'Modem Satelit KM Bahari 17', kind: 'Gateway', addr: '10.40.99.17', online: false, open: 'user',
        inspect: 'Modem satelit di kapal KM Bahari 17. Tidak tertaut ke jaringan kota — hanya terjangkau lewat rute dari menara.\nLoop GPS macet menahan catatan posisi; beacon darurat belum menyala.',
        files: [
          { id: 's13_posisi', name: 'posisi_terakhir.txt', minAccess: 'user', keep: true,
            content:
              'POSISI TERAKHIR KM BAHARI 17\n\n04.05 mesin mati, hanyut ke timur-laut\n04.30 titik 7°12\'S 113°41\'T, 11 mil dari pantai\n' +
              'Awak: 5 orang, semua selamat, lampu sorot masih menyala.',
            onDownload: { flags: ['s13_got_posisi'] } },
          { id: 's13_log_modem', name: 'log_modem.txt', minAccess: 'user',
            content:
              'LOG MODEM\n\n03.15 tautan ke stasiun terputus (uplink berhenti)\n03.40 mode hemat daya, beacon darurat dimatikan\n' +
              '04.00 beacon dicoba menyala di kanal 9 — gagal (kanal kargo, bukan kanal darurat)' }
        ],
        procs: [
          { id: 's13_gpsloop', name: 'gpsloop', desc: 'Loop GPS macet. Menahan posisi_terakhir.txt.', running: true, control: 'user', locks: ['s13_posisi'] },
          { id: 's13_beacon', name: 'beacon', desc: 'Beacon darurat kapal. Kanal harus kanal darurat nelayan.', running: false, control: 'user',
            failText: 'Beacon gagal menyala: kanal tidak sesuai. Cek kanal darurat nelayan.',
            config: { kanal: { label: 'kanal', value: '9', correct: '16', options: ['9', '16', '72'] } },
            onStart: { flags: ['s13_sos'], log: 'Beacon memancar di kanal 16. Tim SAR bisa menangkap sinyalnya.' } }
        ]
      }
    }
  },
  creds: {
    s13_operator: { label: 'operator @ Stasiun Pantau Kapal', account: 'operator', device: 's13_stasiun', level: 'user' }
  },
  clues: {
    s13_operator: { title: 'Akun operator stasiun', text: 'Tempelan di printer balai memuat akun operator Stasiun Pantau Kapal.' },
    s13_kanal: { title: 'Kanal darurat nelayan', text: 'Kanal darurat nelayan adalah 16 (kanal 9 untuk kapal kargo).' }
  },
  patches: {
    balai_printer: {
      files: [
        { id: 's13_tempelan_dermaga', name: 'tempelan_dermaga.txt', minAccess: 'guest',
          content:
            'TEMPELAN DERMAGA\n\n- Jual jaring bekas, tanya Pak Karto.\n' +
            '- Stasiun Pantau: kalau uplink mati, login akun "operator" sandi "dermaga17".\n  (Kunci pos jaga ada di bawah pot.)\n- Perahu Pak Udin dijual murah.',
          onRead: { creds: ['s13_operator'], clues: ['s13_operator'] } }
      ]
    },
    pemancar: {
      routes: ['s13_modem'],
      routeAccess: 'user',
      files: [
        { id: 's13_catatan_menara', name: 'catatan_menara.txt', minAccess: 'guest',
          content:
            'CATATAN MENARA\n\nAntena menara masih memancar ke laut. Modem kapal yang lepas dari jaringan kota tetap bisa dijangkau dengan ROUTE dari menara ini,\n' +
            'asal modem itu sudah menjawab (online) dan kamu punya akses user di sini.\nCek dulu dengan PING.' }
      ]
    }
  },
  edges: [['timur_hub', 's13_stasiun']],
  place: { s13_stasiun: [9, 5, 'timur'], s13_pelampung: [10, 5, 'timur'], s13_modem: [10, 6, 'timur'] },
  objectives: [
    { id: 'login', text: 'Masuk ke Stasiun Pantau sebagai operator', done: (r) => r.devices.s13_stasiun.access === 'user' },
    { id: 'uplink', text: 'Nyalakan layanan uplink (modem kapal online)', done: (r) => r.devices.s13_modem.online },
    { id: 'rute', text: 'Buka rute ke modem KM Bahari 17', done: (r) => r.devices.s13_modem.access !== 'none' },
    { id: 'posisi', text: 'Salin posisi_terakhir.txt ke perangkatmu', main: true, done: (r) => hasLocal(r, 's13_posisi') },
    { id: 'sos', text: '(Bonus) Nyalakan beacon darurat di kanal yang benar', bonus: true, done: (r) => procRunning(r, 's13_modem', 's13_beacon') }
  ],
  hints: [
    { when: (r) => !r.read.includes('s13_daftar_kapal') && r.devices.s13_stasiun.access === 'none',
      text: 'Kamu butuh ROUTE (◆90, beli di Pasar Gelap) untuk menjangkau modem kapal. Mulai dari Stasiun Pantau Kapal di Pelabuhan Timur.' },
    { when: (r) => r.devices.s13_stasiun.access !== 'user' && !r.creds.includes('s13_operator'), text: 'Akun operator ditempel di printer balai desa: baca tempelan_dermaga.txt di Printer Balai Desa.' },
    { when: (r) => r.devices.s13_stasiun.access !== 'user', text: 'CONNECT ke Stasiun Pantau Kapal lalu LOGIN sebagai operator.' },
    { when: (r) => !procRunning(r, 's13_stasiun', 's13_uplink') && !r.devices.s13_modem.online, text: 'Buka Service Server stasiun dan START uplink. Setelah itu PING modem untuk memastikan online.' },
    { when: (r) => r.devices.s13_modem.access === 'none', text: 'Modem kapal tidak tertaut. CONNECT ke Pemancar FM (akses user), lalu ROUTE ke Modem Satelit KM Bahari 17.' },
    { when: (r) => procRunning(r, 's13_modem', 's13_gpsloop'), text: 'Posisi terkunci loop GPS. Buka Service Server modem dan STOP gpsloop.' },
    { when: (r) => !hasLocal(r, 's13_posisi'), text: 'Buka File Server modem, lalu DOWNLOAD posisi_terakhir.txt.' },
    { when: (r) => !procRunning(r, 's13_modem', 's13_beacon'), text: 'Bonus: CONFIG beacon ke kanal darurat (cek cuaca_log di Pelampung Cuaca), lalu START beacon.' }
  ],
  endings: [
    { id: 'posisi', label: 'Serahkan posisi kapal ke Kapten Sari', reward: 340,
      requires: (r) => hasLocal(r, 's13_posisi'),
      text: 'Kapten Sari langsung mengirim kapal patroli ke titik itu. Menjelang siang, kelima awak KM Bahari 17 ditarik pulang dalam keadaan selamat.' }
  ],
  meta: { giver: 'sari', minLevel: 0, district: 'Timur', difficulty: 3, repReward: 100, short: 'Syahbandar — kapal nelayan hilang sinyal setelah badai.' },
  items: { peta: 1 },
  dialogue: {
    offer: offer(
      [
        N('KM Bahari 17 hilang kontak sejak badai. Lima orang di dalamnya.', 'worried'),
        N('Modem kapal mati dan tidak tertaut ke jaringan kota. Kamu cek dengan PING, hidupkan uplink, lalu masuk lewat Pemancar FM.'),
        N('Itu butuh ROUTE dari Pasar Gelap. Cepat ya. Saya butuh posisi mereka.', 'serious')
      ],
      'Saya berangkat sekarang.', 'Belum siap, Kapten.',
      [N('Bagus. Kabari begitu ada posisi.')],
      [N('Jangan lama-lama. Waktu mereka terbatas.')]
    ),
    turnIn: [
      N('Posisi diterima. Kapal patroli sudah jalan.'),
      N('Kamu memang cepat. Kalau butuh peta pelabuhan, saya punya. Terima kasih.', 'happy')
    ]
  }
};
