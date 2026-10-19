// "Gudang Pendingin" — a sensor feeds the cold store false readings and the compressor is
// offline. DOWNLOAD the right vendor patch, UPLOAD it to the sensor (UPLOAD ◆110), which brings
// the compressor online, then CONTROL it to NORMAL (not TURBO). Wrong patch = harmless but noisy.
import { N, Y, offer } from '../game/dlg.js';

const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const komp = (r) => r.devices.s20_kompresor.controls.find((c) => c.id === 's20_komp_daya');
const dingin = (r) => r.flags.includes('s20_patched') && komp(r).state === 'NORMAL';

export default {
  id: 's20',
  code: 'I-20',
  title: 'Gudang Pendingin',
  client: 'Mbah Gun, mewakili pedagang Pasar Selatan',
  reward: 640,
  brief:
    'Gudang pendingin kawasan pabrik menyimpan ikan, sayur, dan obat milik separuh pasar. Sensornya membaca suhu palsu dan kompresornya padam. ' +
    'Ambil patch sensor yang benar dari server vendor, kirim ke sensor (UPLOAD ◆110 dari Pasar Gelap — wajib), lalu hidupkan kompresor pada mode NORMAL. ' +
    'Mbah Gun menitipkan kunci gudang sebagai upah.',
  entry: ['s20_panel'],
  world: {
    devices: {
      s20_panel: {
        id: 's20_panel', name: 'Panel Gudang Pendingin', kind: 'Gateway', addr: '10.80.14.1', online: true, open: 'guest',
        links: ['s20_vendor', 's20_sensor'],
        inspect: 'Panel luar gudang pendingin. Layarnya menampilkan suhu −4 °C — padahal pintu dingin terasa hangat.\nSensor ada di perangkat sebelah; server vendor menyimpan patch-nya.',
        files: [
          { id: 's20_tiket', name: 'tiket_servis.txt', minAccess: 'guest',
            content:
              'TIKET SERVIS #2207\n\nKeluhan: suhu di layar -4 °C, tapi ikan mulai berbau. Kompresor tidak terdeteksi di jaringan.\n' +
              'Dugaan teknisi vendor: sensor tipe SN-200 membaca +6 derajat salah. Perlu patch v2 dari server vendor.\n' +
              'Jangan pakai patch v1, itu untuk sensor lama.\n' +
              'Akses sensor: akun "servis", sandi "dingin-2207" (sementara, nanti dihapus).',
            onRead: { creds: ['s20_servis'], clues: ['s20_tiket'] } }
        ]
      },
      s20_vendor: {
        id: 's20_vendor', name: 'Server Vendor Sensor', kind: 'NAS', addr: '10.80.14.20', online: true, open: 'guest',
        inspect: 'Server berkas vendor sensor. Patch firmware untuk beberapa tipe sensor tersimpan di sini, terbuka untuk teknisi.',
        files: [
          { id: 's20_vendor_info', name: 'daftar_patch.txt', minAccess: 'guest',
            content: 'DAFTAR PATCH SENSOR\n\npatch_sensor_v1.bin  -> SN-100 (lama, kalibrasi -/+0)\npatch_sensor_v2.bin  -> SN-200 (baru, koreksi +6 derajat)\n\nSalah patch tidak merusak, tapi sensor akan membaca salah.' },
          { id: 's20_patch', name: 'patch_sensor_v2.bin', minAccess: 'guest',
            content: '[patch binar — SN-200 v2: koreksi kalibrasi suhu]' },
          { id: 's20_patch_lama', name: 'patch_sensor_v1.bin', minAccess: 'guest',
            content: '[patch binar — SN-100 v1: kalibrasi lama]' }
        ]
      },
      s20_sensor: {
        id: 's20_sensor', name: 'Sensor Suhu SN-200', kind: 'Server', addr: '10.80.14.12', online: true, links: ['s20_kompresor'],
        inspect: 'Sensor suhu SN-200 gudang pendingin. Terkunci — butuh akun servis.\nFirmware-nya menerima patch lewat UPLOAD.',
        files: [
          { id: 's20_sensor_log', name: 'sensor.log', minAccess: 'user',
            content: '[01:30] suhu asli -17.8 °C\n[01:31] data masuk dari luar: -4.0 °C (sumber: SENTINEL v0.9)\n[01:31] sensor memakai data luar. Kompresor menganggap gudang sudah dingin, lalu padam.' }
        ],
        uploads: [
          { file: 's20_patch', minAccess: 'user',
            text: 'Patch v2 terpasang. Sensor kembali membaca suhu asli dan kompresor muncul lagi di jaringan.',
            fx: { flags: ['s20_patched'], online: ['s20_kompresor'], clues: ['s20_sentinel'], log: 'Kompresor terdeteksi: Kompresor Gudang. Kamu bisa CONNECT.' } },
          { file: 's20_patch_lama', minAccess: 'user',
            text: 'Patch v1 terpasang, tapi untuk sensor tipe lama. Pembacaan suhu bergeser. Sensor masih salah — pakai patch v2.',
            fx: { flags: ['s20_patch_salah'] } }
        ]
      },
      s20_kompresor: {
        id: 's20_kompresor', name: 'Kompresor Gudang', kind: 'Workstation', addr: '10.80.14.30', online: false, open: 'user',
        inspect: 'Pengendali kompresor gudang pendingin. Ada tiga mode: MATI, NORMAL, TURBO.\nTURBO boros dan membuat mesin cepat aus; pakai NORMAL.',
        files: [
          { id: 's20_suhu', name: 'suhu_gudang.log', minAccess: 'user',
            content: 'SUHU GUDANG\n\n02:00 -4.0 (palsu)\n03:00 +2.0\n04:00 +6.0  <- ikan mulai berbau\n(Menunggu kompresor menyala NORMAL: target -18 °C.)' }
        ],
        controls: [
          { id: 's20_komp_daya', label: 'Mode Kompresor', minAccess: 'user', states: ['MATI', 'NORMAL', 'TURBO'], state: 'MATI',
            on: {
              NORMAL: { flags: ['s20_normal'], log: 'Kompresor mengalir tenang. Suhu mulai turun ke -18 °C.' },
              TURBO: { flags: ['s20_turbo'], log: 'Kompresor meraung dan getarannya terasa. Terlalu keras — kembalikan ke NORMAL.' }
            } }
        ]
      }
    }
  },
  creds: {
    s20_servis: { label: 'servis @ Sensor Suhu SN-200', account: 'servis', device: 's20_sensor', level: 'user' }
  },
  clues: {
    s20_tiket: { title: 'Tiket servis #2207', text: 'Sensor tipe SN-200 butuh patch v2, bukan v1. Akun servis ada di tiket.' },
    s20_sentinel: { title: 'Data suntikan SENTINEL', text: 'Log sensor menunjukkan data suhu palsu disuntikkan oleh SENTINEL v0.9 — uji apakah operator memeriksa sensornya.' }
  },
  edges: [['industri_hub', 's20_panel']],
  place: { s20_panel: [9, 14, 'industri'], s20_vendor: [8, 14, 'industri'], s20_sensor: [9, 15, 'industri'], s20_kompresor: [10, 15, 'industri'] },
  items: { kunci_dingin: 1 },
  objectives: [
    { id: 'patch', text: 'Salin patch sensor SN-200 (v2) ke perangkatmu', done: (r) => hasLocal(r, 's20_patch') },
    { id: 'upload', text: 'Kirim patch ke sensor lewat UPLOAD', done: (r) => r.flags.includes('s20_patched') },
    { id: 'dingin', text: 'Hidupkan kompresor pada mode NORMAL', main: true, done: (r) => dingin(r) },
    { id: 'senyap', text: '(Bonus) Selesai tanpa pernah memakai mode TURBO atau patch lama', bonus: true,
      done: (r) => dingin(r) && !r.flags.includes('s20_turbo') && !r.flags.includes('s20_patch_salah') }
  ],
  hints: [
    { when: (r) => !r.read.includes('s20_tiket'), text: 'Kamu butuh UPLOAD (◆110, Pasar Gelap) untuk mengirim patch. Mulai dari Panel Gudang Pendingin: baca tiket_servis.txt.' },
    { when: (r) => !hasLocal(r, 's20_patch'), text: 'Di Server Vendor Sensor ada dua patch. Tiketnya menyebut sensor SN-200: ambil patch_sensor_v2.bin dengan DOWNLOAD.' },
    { when: (r) => r.devices.s20_sensor.access === 'none', text: 'CONNECT ke Sensor Suhu SN-200, lalu LOGIN dengan akun servis dari tiket.' },
    { when: (r) => !r.flags.includes('s20_patched'), text: 'Sudah di sensor? Pilih patch_sensor_v2.bin di perangkatmu lalu UPLOAD. Patch lama hanya bikin sensor salah baca.' },
    { when: (r) => !r.devices.s20_kompresor.online, text: 'Coba PING kompresor — kalau belum menjawab, patch belum masuk.' },
    { when: (r) => komp(r).state !== 'NORMAL', text: 'CONNECT ke Kompresor Gudang, lalu CONTROL → Mode Kompresor → NORMAL. Hindari TURBO.' }
  ],
  endings: [
    { id: 'dingin', label: 'Kembalikan gudang yang dingin kepada Mbah Gun', reward: 640,
      requires: (r) => dingin(r),
      text: 'Suhu gudang turun ke -18 °C. Ikan, sayur, dan obat selamat. Mbah Gun menepuk bahumu sekali, lalu menaruh kunci dingin di telapak tanganmu.' }
  ],
  meta: { giver: 'gun', minLevel: 3, district: 'Industri', difficulty: 4, repReward: 190, short: 'Gudang pendingin — patch sensor dan hidupkan kompresor.', requires: ['s17'] },
  dialogue: {
    offer: offer(
      [
        N('Nak. Gudang dingin di pabrik itu... isinya titipan pasar. Ikan, sayur, obat.', 'serious'),
        N('Sensornya bohong. Kompresornya mati. Ikan mulai bau, Nak.', 'worried'),
        N('Aku tidak tanya kamu dapat jalannya dari mana. Aku cuma minta dinginkan.')
      ],
      'Saya urus, Mbah.', 'Nanti dulu, Mbah.',
      [N('Hm. Bagus. Patch yang benar, jangan yang lama. Aku pernah lihat sensor tua salah baca.', 'normal')],
      [N('...Ya. Tapi ikannya tidak menunggu, Nak.', 'worried')]
    ),
    turnIn: [
      N('Dingin lagi. Bagus. Ini kunci gudang. Simpan baik-baik.', 'happy'),
      N('Orang yang menyuntik data palsu itu... dia pandai. Tapi dia tidak mencuri apa-apa. Aneh. Aku curiga, Nak.', 'serious')
    ]
  }
};
