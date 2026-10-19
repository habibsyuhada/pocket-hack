// "Klinik: Jadwal Obat Kacau" — COMPARE jadwal dokter (di PC pendaftaran) dengan
// jadwal farmasi, lalu EDIT baris yang salah. Proses sinkron mengunci berkas
// farmasi sampai dihentikan; akun apoteker ditempel di meja pendaftaran.
import { N, Y, offer } from '../game/dlg.js';

const JADWAL_BENAR =
  'JADWAL FARMASI — OBAT PASIEN RAWAT\n\n' +
  'Bu Yanti — Amlodipin 5 mg: 1x sehari, pagi\n' +
  'Pak Anto — Metformin 500 mg: 2x sehari, sesudah makan\n' +
  'Bu Yuli — Amoksisilin 500 mg: 3x sehari, tiap 8 jam';

export default {
  id: 's12',
  code: 'K-12',
  title: 'Klinik: Jadwal Obat Kacau',
  client: 'dr. Wulan, Klinik Pratama Pelabuhan Timur',
  reward: 320,
  brief:
    'Jadwal minum obat di farmasi klinik tidak sama dengan resep dokter, dan dispenser obat otomatis mengikuti jadwal farmasi. ' +
    'Bandingkan jadwal dokter dengan jadwal farmasi (COMPARE), lalu betulkan baris yang salah (EDIT, ◆130 — beli di Pasar Gelap). ' +
    'Sistem farmasi butuh akun apoteker dan ada proses sinkron yang mengunci berkasnya.',
  entry: ['s12_farmasi'],
  world: {
    devices: {
      s12_farmasi: {
        id: 's12_farmasi', name: 'Server Farmasi Klinik', kind: 'Server', addr: '10.40.6.10', online: true, links: ['s12_dispenser'],
        inspect: 'Server farmasi klinik. Tertutup untuk tamu — butuh akun apoteker.\nAda proses "autosync" yang menyalin jadwal ke dispenser dan menahan berkasnya.',
        files: [
          { id: 's12_jadwal_farmasi', name: 'jadwal_farmasi.txt', minAccess: 'user', compare: 's12jadwal',
            content:
              'JADWAL FARMASI — OBAT PASIEN RAWAT\n\n' +
              'Bu Yanti — Amlodipin 5 mg: 1x sehari, pagi\n' +
              'Pak Anto — Metformin 500 mg: 3x sehari, sesudah makan\n' +
              'Bu Yuli — Amoksisilin 500 mg: 3x sehari, tiap 8 jam',
            edit: {
              minAccess: 'user',
              options: [
                'Pak Anto — Metformin 500 mg: 1x sehari, pagi',
                'Pak Anto — Metformin 500 mg: 2x sehari, sesudah makan',
                'Bu Yanti — Amlodipin 5 mg: 2x sehari, pagi',
                'Bu Yuli — Amoksisilin 500 mg: 2x sehari, tiap 8 jam'
              ],
              answer: 'Pak Anto — Metformin 500 mg: 2x sehari, sesudah makan',
              result: { content: JADWAL_BENAR },
              onDone: { flags: ['s12_fixed'], log: 'Jadwal farmasi kini sama dengan resep dokter.' }
            } },
          { id: 's12_log_farmasi', name: 'log_farmasi.txt', minAccess: 'user',
            content:
              'LOG FARMASI\n\n[06:00] autosync: menyalin jadwal ke dispenser\n[06:01] autosync: menahan jadwal_farmasi.txt (sedang disalin)\n' +
              '[06:40] apoteker: ada pasien tanya, kok dosis Pak Anto beda dengan di buku dokter?\n[06:41] apoteker: nanti dicek, belum sempat.' }
        ],
        procs: [
          { id: 's12_autosync', name: 'autosync', desc: 'Menyalin jadwal ke dispenser. Sedang menahan jadwal_farmasi.txt.', running: true, control: 'user', locks: ['s12_jadwal_farmasi'] }
        ]
      },
      s12_dispenser: {
        id: 's12_dispenser', name: 'Dispenser Obat Otomatis', kind: 'Workstation', addr: '10.40.6.11', online: true, open: 'user',
        inspect: 'Dispenser obat di ruang rawat. Mode MANUAL: perawat mengeluarkan obat sendiri.\nMode OTOMATIS mengikuti jadwal farmasi — nyalakan hanya kalau jadwalnya sudah benar.',
        files: [
          { id: 's12_catatan_dispenser', name: 'catatan_dispenser.txt', minAccess: 'guest',
            content: 'CATATAN DISPENSER\n\nMode OTOMATIS membaca jadwal_farmasi.txt tiap pagi.\nSejak ada selisih dosis, perawat mengeluarkan obat manual dari buku dokter.\nKalau jadwal sudah dibetulkan, pindahkan ke OTOMATIS.' }
        ],
        controls: [
          { id: 's12_mode', label: 'Mode Dispenser', minAccess: 'user', states: ['MANUAL', 'OTOMATIS'], state: 'MANUAL',
            on: { OTOMATIS: { flags: ['s12_auto'], log: 'Dispenser kini mengikuti jadwal farmasi. Pastikan jadwal itu sudah benar.' } } }
        ]
      }
    }
  },
  creds: {
    s12_apoteker: { label: 'apoteker @ Server Farmasi Klinik', account: 'apoteker', device: 's12_farmasi', level: 'user' }
  },
  clues: {
    s12_apoteker: { title: 'Akun apoteker klinik', text: 'Catatan di meja pendaftaran memuat akun apoteker untuk server farmasi.' },
    s12_beda: { title: 'Selisih dosis', text: 'Dosis Metformin Pak Anto di farmasi (3x) berbeda dari resep dokter (2x).' }
  },
  diffs: {
    's12_jadwal_dokter|s12_jadwal_farmasi': {
      text:
        'PERBEDAAN DITEMUKAN\n\n' +
        '1. Judul berkas — hanya penulisan, tidak berpengaruh.\n' +
        '2. Pak Anto — Metformin 500 mg:\n   dokter  : 2x sehari, sesudah makan\n   farmasi : 3x sehari, sesudah makan   <-- DOSIS BERLEBIH\n' +
        '3. Baris lain sama persis.',
      onRead: { flags: ['s12_terbukti'], clues: ['s12_beda'] }
    }
  },
  patches: {
    klinik_ws: {
      files: [
        { id: 's12_catatan_meja', name: 'catatan_meja.txt', minAccess: 'guest',
          content:
            'CATATAN MEJA PENDAFTARAN\n\n- Stok masker menipis, pesan lagi.\n' +
            '- Server farmasi: kalau apoteker cuti, pakai akun "apoteker" sandi "puskes2024".\n  (Jangan difoto, ya.)\n- Ganti galon, Jumat.',
          onRead: { creds: ['s12_apoteker'], clues: ['s12_apoteker'] } },
        { id: 's12_jadwal_dokter', name: 'jadwal_obat_dokter.txt', minAccess: 'guest', compare: 's12jadwal',
          content:
            'RESEP DOKTER — OBAT PASIEN RAWAT\n\n' +
            'Bu Yanti — Amlodipin 5 mg: 1x sehari, pagi\n' +
            'Pak Anto — Metformin 500 mg: 2x sehari, sesudah makan\n' +
            'Bu Yuli — Amoksisilin 500 mg: 3x sehari, tiap 8 jam' }
      ]
    }
  },
  edges: [['klinik_ws', 's12_farmasi']],
  place: { s12_farmasi: [6, 7, 'timur'], s12_dispenser: [6, 8, 'timur'] },
  objectives: [
    { id: 'login', text: 'Masuk ke server farmasi sebagai apoteker', done: (r) => r.devices.s12_farmasi.access === 'user' },
    { id: 'beda', text: 'Buktikan selisih dosis dengan COMPARE', done: (r) => r.flags.includes('s12_terbukti') },
    { id: 'fix', text: 'Betulkan jadwal_farmasi.txt dengan EDIT', main: true, done: (r) => r.flags.includes('s12_fixed') },
    { id: 'auto', text: '(Bonus) Pindahkan dispenser ke mode OTOMATIS', bonus: true, done: (r) => r.flags.includes('s12_fixed') && r.flags.includes('s12_auto') }
  ],
  hints: [
    { when: (r) => !r.read.includes('s12_catatan_meja') && r.devices.s12_farmasi.access === 'none',
      text: 'Kamu butuh EDIT (◆130, beli di Pasar Gelap) untuk membetulkan jadwal. Akun farmasi ada di catatan meja PC Klinik Pratama.' },
    { when: (r) => r.devices.s12_farmasi.access === 'none', text: 'CONNECT ke Server Farmasi Klinik lalu LOGIN dengan akun apoteker.' },
    { when: (r) => !!r.devices.s12_farmasi.procs.find((p) => p.id === 's12_autosync')?.running, text: 'Jadwal farmasi terkunci. Buka Service Server dan STOP proses autosync.' },
    { when: (r) => !r.local.some((f) => f.id === 's12_jadwal_dokter') && !r.flags.includes('s12_terbukti'),
      text: 'DOWNLOAD jadwal_obat_dokter.txt dari PC Klinik, lalu COMPARE dengan jadwal_farmasi.txt di server farmasi.' },
    { when: (r) => !r.flags.includes('s12_terbukti'), text: 'Di server farmasi, pilih jadwal_farmasi.txt → COMPARE → jadwal_obat_dokter.txt.' },
    { when: (r) => !r.flags.includes('s12_fixed'), text: 'EDIT jadwal_farmasi.txt: pilih baris Pak Anto dengan dosis yang sama seperti resep dokter. Salah pilih tidak merusak apa pun.' },
    { when: (r) => !r.flags.includes('s12_auto'), text: 'Bonus: sambungkan ke Dispenser Obat Otomatis lalu CONTROL → Mode → OTOMATIS.' }
  ],
  endings: [
    { id: 'jadwal', label: 'Laporkan ke dr. Wulan: jadwal sudah benar', reward: 320,
      requires: (r) => r.flags.includes('s12_fixed'),
      text: 'dr. Wulan memeriksa jadwal satu per satu, lalu mengangguk pelan. Pak Anto mendapat dosis yang tepat sejak malam itu, dan perawat tidur lebih tenang.' }
  ],
  meta: { giver: 'wulan', minLevel: 0, district: 'Timur', difficulty: 3, repReward: 90, short: 'Klinik — jadwal obat farmasi tidak sama dengan resep dokter.' },
  items: { obat: 1 },
  drop: 'obat',
  dialogue: {
    offer: offer(
      [
        N('Ada yang tidak beres di farmasi. Jadwal obat di sana tidak sama dengan resep saya.', 'worried'),
        N('Satu pasien sudah bertanya soal dosisnya. Saya belum tahu sumber salahnya.'),
        N('Bandingkan jadwal dokter dengan jadwal farmasi, lalu betulkan. Kamu butuh perintah EDIT dari Pasar Gelap.', 'serious')
      ],
      'Saya periksa, Dok.', 'Nanti dulu, Dok.',
      [N('Terima kasih. Pelan-pelan saja, tapi jangan terlalu lama.')],
      [N('Baik. Kabari saya kalau berubah pikiran.')]
    ),
    turnIn: [
      N('Sudah sama persis. Dosis Pak Anto kembali dua kali sehari.'),
      N('Terima kasih. Obat herbal ini buat kamu — untuk malam-malam panjang.', 'happy')
    ]
  }
};
