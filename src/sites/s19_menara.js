// "Menara Air" — the pump runs on test values. STOP it, CONFIG every field to the numbers
// on the current spec sheet (not the old one), START again. RESTORE undoes a bad edit.
// Optional: a Sniffer on the pressure sensor confirms which revision is live.
import { N, Y, offer } from '../game/dlg.js';

const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const pompa = (r) => r.devices.s19_hmi.procs.find((p) => p.id === 's19_pompa');
const klorin = (r) => r.devices.s19_tangki.procs.find((p) => p.id === 's19_klorin');
const aman = (r) => Object.values(pompa(r).config).every((f) => f.value === f.correct);

export default {
  id: 's19',
  code: 'I-19',
  title: 'Menara Air',
  client: 'dr. Wulan, Klinik Pratama',
  reward: 600,
  brief:
    'Tekanan air dari menara kawasan pabrik naik-turun dan alat sterilisasi klinik ikut terganggu. ' +
    'Pompa menara ternyata berjalan dengan nilai "uji" yang berbahaya. Hentikan pompa, setel ulang nilainya sesuai lembar spesifikasi ' +
    'yang berlaku, lalu nyalakan lagi. Sniffer (◆110, Pasar Gelap) opsional: membantu memastikan revisi spesifikasi mana yang dipakai.',
  entry: ['s19_gerbang'],
  world: {
    devices: {
      s19_gerbang: {
        id: 's19_gerbang', name: 'Gerbang Menara Air', kind: 'Gateway', addr: '10.80.12.1', online: true, open: 'guest',
        links: ['s19_hmi', 's19_sensor', 's19_tangki'],
        inspect: 'Gerbang jaringan menara air kawasan pabrik. Ada papan arsip lembar spesifikasi pompa di sini.\nDi menara ini ada panel pompa, sensor tekanan, dan tangki klorinasi.',
        files: [
          { id: 's19_spek_lama', name: 'spesifikasi_pompa_rev1.txt', minAccess: 'guest',
            content: 'SPESIFIKASI POMPA P-3 — REV 1 (2019, DIGANTI)\n\nTekanan maks : 6.0 bar\nDebit        : 80 L/s\nMode         : normal\nCatatan: pompa lama. Sudah diganti pipa baru yang lebih tipis; jangan dipakai lagi.' },
          { id: 's19_spek', name: 'spesifikasi_pompa_rev3.txt', minAccess: 'guest',
            content: 'SPESIFIKASI POMPA P-3 — REV 3 (BERLAKU)\n\nTekanan maks : 3.5 bar\nDebit        : 45 L/s\nMode         : normal\nCatatan: pipa baru, batas aman 4 bar. Mode "uji-beban" hanya untuk bengkel, bukan untuk menara beroperasi.',
            onRead: { clues: ['s19_spek'] } }
        ]
      },
      s19_hmi: {
        id: 's19_hmi', name: 'Panel Pompa Menara', kind: 'Server', addr: '10.80.12.5', online: true, open: 'user',
        inspect: 'Panel operator pompa menara air. Layar masuk otomatis sebagai user; tidak ada sandi.\nPompa P-3 sedang berjalan dengan nilai yang tidak biasa.',
        files: [
          { id: 's19_laporan', name: 'laporan_tekanan.csv', minAccess: 'user', keep: true,
            content: 'LAPORAN TEKANAN (jam: bar)\n\n20:00 3.4\n23:00 3.6\n01:00 5.9\n02:00 8.4  <- mode uji-beban aktif\n03:00 8.5\n(Pipa baru batas 4 bar. Klinik melaporkan sterilisator trip pukul 02:10.)',
            onDownload: { flags: ['s19_laporan_diambil'] } },
          { id: 's19_jurnal', name: 'jurnal_uji.txt', minAccess: 'user',
            content: 'JURNAL UJI OTOMATIS\n\n[01:45] penguji: SENTINEL v0.9\n[01:46] mengubah mode pompa -> uji-beban (tanpa konfirmasi operator)\n[01:46] catatan: "Apakah ada yang menyadari? Kita lihat berapa lama."',
            onRead: { clues: ['s19_sentinel'] } }
        ],
        procs: [
          {
            id: 's19_pompa', name: 'pompa_P3', desc: 'Pompa utama menara. Berjalan dengan nilai uji dan menahan laporan_tekanan.csv.', running: true, control: 'user',
            locks: ['s19_laporan'],
            failText: 'Pompa menolak start: nilai konfigurasi melebihi batas pipa. Cocokkan dengan lembar spesifikasi yang berlaku.',
            config: {
              tekanan: { label: 'tekanan_maks', value: '8.5 bar', correct: '3.5 bar', options: ['2.0 bar', '3.5 bar', '6.0 bar', '8.5 bar'] },
              debit: { label: 'debit', value: '120 L/s', correct: '45 L/s', options: ['20 L/s', '45 L/s', '80 L/s', '120 L/s'] },
              mode: { label: 'mode', value: 'uji-beban', correct: 'normal', options: ['normal', 'uji-beban', 'bypass'] }
            },
            onStop: { flags: ['s19_pompa_henti'], log: 'Pompa berhenti. Tekanan di pipa turun pelan. Sekarang konfigurasi bisa diubah.' },
            onStart: { flags: ['s19_pompa_nyala'], log: 'Pompa menyala dengan nilai baru. Tekanan stabil di kisaran aman.' }
          }
        ]
      },
      s19_sensor: {
        id: 's19_sensor', name: 'Sensor Tekanan Menara', kind: 'Workstation', addr: '10.80.12.9', online: true, open: 'guest',
        inspect: 'Sensor tekanan di pipa keluar menara. Mengirim data ke panel pompa tanpa sandi.\nKalau kamu punya Sniffer, lalu lintas datanya bisa kelihatan.',
        sniff: {
          text: 'telemetri: pompa=P-3  spek=REV3  pipa_baru=ya  batas=4.0bar  tekanan=8.5bar  mode=uji-beban',
          fx: { flags: ['s19_sniff'], clues: ['s19_telemetri'], log: 'Telemetri jelas menyebut spek REV3: lembar rev1 sudah tidak berlaku.' }
        },
        files: [
          { id: 's19_sensor_info', name: 'kalibrasi_sensor.txt', minAccess: 'guest', content: 'KALIBRASI SENSOR\n\nTerakhir dikalibrasi: bulan lalu.\nAkurasi: ±0.1 bar.\nSensor tidak bohong; yang bisa salah adalah nilai yang diset di pompa.' }
        ]
      },
      s19_tangki: {
        id: 's19_tangki', name: 'Tangki Klorinasi', kind: 'Workstation', addr: '10.80.12.14', online: true, open: 'user',
        inspect: 'Pengendali klorinasi air menara. Menjaga air tetap aman diminum.\nJangan dimatikan kecuali benar-benar perlu.',
        files: [
          { id: 's19_tangki_info', name: 'catatan_klorin.txt', minAccess: 'guest', content: 'CATATAN KLORINASI\n\nKlorinator harus menyala selama air mengalir ke pemukiman.\nKalau mati, air tidak lagi didesinfeksi.' }
        ],
        procs: [
          { id: 's19_klorin', name: 'klorinator', desc: 'Pemberi klorin otomatis. Harus tetap menyala.', running: true, control: 'user',
            onStop: { flags: ['s19_klorin_mati'], log: 'Klorinator berhenti. Air tidak lagi didesinfeksi — nyalakan lagi sebelum pompa jalan.' },
            onStart: { log: 'Klorinator menyala kembali.' } }
        ]
      }
    }
  },
  creds: {},
  clues: {
    s19_spek: { title: 'Spesifikasi pompa rev3', text: 'Nilai aman yang berlaku: 3.5 bar, 45 L/s, mode normal.' },
    s19_sentinel: { title: 'Jurnal SENTINEL', text: 'Seseorang (SENTINEL v0.9) mengganti mode pompa menjadi uji-beban tanpa konfirmasi.' },
    s19_telemetri: { title: 'Telemetri: spek REV3', text: 'Sniffer menangkap telemetri yang mengonfirmasi bahwa spesifikasi rev3 yang berlaku.' }
  },
  edges: [['industri_hub', 's19_gerbang']],
  place: { s19_gerbang: [12, 12, 'industri'], s19_hmi: [13, 12, 'industri'], s19_sensor: [13, 13, 'industri'], s19_tangki: [12, 14, 'industri'] },
  objectives: [
    { id: 'spek', text: 'Baca lembar spesifikasi pompa yang berlaku', done: (r) => r.read.includes('s19_spek') },
    { id: 'henti', text: 'Hentikan pompa supaya konfigurasinya bisa diubah', done: (r) => r.flags.includes('s19_pompa_henti') },
    { id: 'laporan', text: 'Salin laporan_tekanan.csv ke perangkatmu', done: (r) => hasLocal(r, 's19_laporan') },
    { id: 'stabil', text: 'Nyalakan pompa dengan nilai aman (klorinator tetap menyala)', main: true, done: (r) => pompa(r).running && aman(r) && klorin(r).running },
    { id: 'sniff', text: '(Bonus) Tangkap telemetri sensor dengan Sniffer', bonus: true, done: (r) => r.flags.includes('s19_sniff') }
  ],
  hints: [
    { when: (r) => !r.read.includes('s19_spek'), text: 'Mulai dari Gerbang Menara Air: baca lembar spesifikasi yang berlaku (rev3 vs rev1). Sniffer (◆110, Pasar Gelap) opsional untuk memastikan revisinya.' },
    { when: (r) => pompa(r).running && !r.flags.includes('s19_pompa_henti'), text: 'CONNECT ke Panel Pompa Menara, lalu STOP pompa_P3. Nilai hanya bisa diubah saat pompa mati.' },
    { when: (r) => !aman(r), text: 'Pakai CONFIG untuk tiap bidang: tekanan, debit, mode. Salah ubah? RESTORE mengembalikan semuanya ke nilai awal.' },
    { when: (r) => !hasLocal(r, 's19_laporan') && !pompa(r).running, text: 'Pompa sudah berhenti, jadi laporan_tekanan.csv tidak terkunci lagi. DOWNLOAD berkasnya sebelum menyalakan pompa.' },
    { when: (r) => !klorin(r).running, text: 'Klorinator di Tangki Klorinasi mati. START lagi: air tidak boleh mengalir tanpa klorin.' },
    { when: (r) => !pompa(r).running, text: 'Nilai sudah benar. START pompa_P3.' }
  ],
  endings: [
    { id: 'stabil', label: 'Kabari dr. Wulan: air sudah stabil', reward: 600,
      requires: (r) => pompa(r).running && aman(r) && klorin(r).running,
      text: 'Tekanan menara kembali tenang di 3,5 bar. Sterilisator klinik berdengung normal lagi. dr. Wulan mengangguk pendek: "Terima kasih. Pasien akan tidur nyenyak."' }
  ],
  meta: { giver: 'wulan', minLevel: 3, district: 'Industri', difficulty: 4, repReward: 180, short: 'Menara air — setel ulang pompa ke nilai aman.', requires: ['s17'] },
  dialogue: {
    offer: offer(
      [
        N('Tekanan air kami naik-turun, dan sterilisator klinik trip semalam. Aku periksa: sumbernya menara air di kawasan industri.', 'serious'),
        N('Pompanya berjalan dengan nilai yang bukan miliknya. Pipanya sudah baru dan tipis.', 'worried'),
        N('Kamu bisa setel ulang nilainya? Pakai lembar spesifikasi yang berlaku, bukan yang lama.')
      ],
      'Saya coba, dok.', 'Nanti dulu, dok.',
      [N('Terima kasih. Hati-hati dengan angkanya; satu digit salah bisa memecah pipa.', 'normal')],
      [N('Baik. Kabari kalau berubah pikiran. Pasien tidak bisa menunggu lama.', 'worried')]
    ),
    turnIn: [
      N('Tekanan stabil. Sterilisator tenang. Terima kasih.', 'happy'),
      N('Jurnalnya menyebut SENTINEL lagi. Dia tidak merusak. Dia menguji apakah kita memperhatikan. Menyebalkan, tapi benar.', 'serious')
    ]
  }
};
