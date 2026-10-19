// "Surat Tanpa Pengirim" — first SENTINEL clue. The letter is held by the mail filter
// (STOP it at guest level), then TRACE (needs the Tracer tool) reveals where it came from:
// the industrial district. A decoy mail teaches that TRACE only answers for the file you pick.
import { N, offer } from '../game/dlg.js';

const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const filterOn = (r) => r.devices.s11_kotak.procs.find((p) => p.id === 's11_filter')?.running;

export default {
  id: 's11',
  code: 'S-11',
  title: 'Surat Tanpa Pengirim',
  client: 'Pak Hadi, Lurah Kelurahan',
  reward: 260,
  brief:
    'Pagi tadi sebuah surat elektronik masuk ke kotak surat kelurahan tanpa nama pengirim, hanya ditandatangani "SENTINEL". Isinya peringatan soal kelemahan sistem kota. ' +
    'Pak Hadi ingin tahu dari mana surat itu dikirim. Surat tertahan oleh filter surat; hentikan filternya, lalu lacak asalnya dengan TRACE. ' +
    'Butuh tool Tracer (◆140, beli di Pasar Gelap, Selatan).',
  entry: ['s11_kotak'],
  world: {
    devices: {
      s11_kotak: {
        id: 's11_kotak', name: 'Kotak Surat Kelurahan', kind: 'Server', addr: '10.0.50.40', online: true, open: 'guest',
        inspect:
          'Server surat elektronik kantor kelurahan. Tamu bisa melihat daftar surat masuk.\n' +
          'Filter surat menahan satu pesan yang dianggap mencurigakan. Pesan itu bisa dilacak asalnya, tetapi hanya dengan tool Tracer.',
        files: [
          { id: 's11_daftar', name: 'daftar_surat.txt', minAccess: 'guest',
            content:
              'DAFTAR SURAT MASUK HARI INI\n\n' +
              '1. promo_toko_online.txt — diterima 07.10\n' +
              '2. surat_peringatan.txt — diterima 07.42 — DITAHAN FILTER (pengirim tidak dikenal)\n' +
              '3. undangan_rapat_rt.txt — diterima 08.05 (sudah dibaca)' },
          { id: 's11_promo', name: 'promo_toko_online.txt', minAccess: 'guest',
            content: 'TOKO ONLINE SERBA ADA\n\nDiskon 70% hanya hari ini! Klik tautan di bawah.\n(Pesan massal, dikirim ke ribuan alamat.)',
            trace: { text: 'LEMBAR LACAK\n\nAsal: layanan surat massal pemasaran, kantor di luar kota.\nSifat: iklan biasa, tidak berbahaya.\nKaitan dengan SENTINEL: tidak ada.' } },
          { id: 's11_peringatan', name: 'surat_peringatan.txt', minAccess: 'guest', keep: true,
            content:
              'KEPADA PIHAK KELURAHAN\n\n' +
              'Papan iklan alun-alun memakai sandi bawaan pabrik. Printer kantor kehilangan berkas karena spool tak terlindungi.\n' +
              'Loket bus membayar sopir yang tak pernah berangkat. Saya hanya menguji; tidak ada yang saya rusak.\n' +
              'Perbaiki sebelum orang lain yang menemukannya.\n\n' +
              '— SENTINEL',
            trace: {
              text:
                'LEMBAR LACAK — surat_peringatan.txt\n\n' +
                'Pengirim tertulis: SENTINEL (tanpa alamat)\n' +
                'Jalur 1: kotak surat kelurahan <- relay surat kota\n' +
                'Jalur 2: relay surat kota <- gerbang kawasan industri (10.80.x.x)\n' +
                'Jaringan 10.80.x.x tidak tersambung ke kota; hanya bisa dicapai lewat relay selatan.\n\n' +
                'Kesimpulan: surat dikirim dari kawasan industri.',
              fx: { flags: ['sentinel_industri'], clues: ['s11_asal'], reveal: ['menara_relay'] }
            },
            onDownload: { flags: ['s11_arsip'] } }
        ],
        procs: [
          { id: 's11_filter', name: 'filter_surat', desc: 'Menahan surat mencurigakan. Sedang menahan surat_peringatan.txt.', running: true, control: 'guest', locks: ['s11_peringatan'],
            onStop: { flags: ['s11_filter_henti'] } }
        ]
      }
    }
  },
  creds: {},
  clues: {
    s11_asal: { title: 'Asal surat SENTINEL', text: 'Lembar lacak: surat dikirim dari jaringan kawasan industri, yang hanya terjangkau lewat Menara Relay Selatan.' }
  },
  patches: {
    kelurahan_nas: {
      files: [
        { id: 's11_pesan_lurah', name: 'pesan_lurah.txt', minAccess: 'guest',
          content: 'PESAN PAK HADI\n\nSurat elektronik tak bertanda masuk ke kotak surat kantor.\nTolong periksa dari NAS ini, tersambung ke Kotak Surat Kelurahan. Jangan beritahu warga dulu.',
          onRead: { reveal: ['s11_kotak'] } }
      ]
    }
  },
  edges: [['kelurahan_nas', 's11_kotak']],
  place: { s11_kotak: [3, 4, 'tengah'] },
  objectives: [
    { id: 'filter', text: 'Hentikan filter surat yang menahan pesan', done: (r) => !filterOn(r) },
    { id: 'baca', text: 'Baca surat_peringatan.txt', done: (r) => r.read.includes('s11_peringatan') },
    { id: 'lacak', text: 'Lacak asal surat dengan TRACE', main: true, done: (r) => r.flags.includes('sentinel_industri') },
    { id: 'arsip', text: '(Bonus) Salin surat_peringatan.txt sebagai arsip', bonus: true, done: (r) => hasLocal(r, 's11_peringatan') }
  ],
  hints: [
    { when: (r, p) => !p.tools.tracer, text: 'Kamu butuh tool Tracer (◆140) untuk TRACE. Beli di Pasar Gelap (peta, Selatan).' },
    { when: (r) => r.devices.s11_kotak.access === 'none', text: 'CONNECT ke NAS Kantor Kelurahan, baca pesan_lurah.txt, lalu CONNECT ke Kotak Surat Kelurahan.' },
    { when: (r) => !!filterOn(r), text: 'Surat ditahan filter. Buka tab SISTEM dan STOP filter_surat. Akses tamu cukup.' },
    { when: (r) => !r.read.includes('s11_peringatan'), text: 'Baca surat_peringatan.txt untuk tahu isinya.' },
    { when: (r) => !r.flags.includes('sentinel_industri'), text: 'Pilih surat_peringatan.txt lalu TRACE. Bukan promo_toko_online.txt — itu bukan SENTINEL.' },
    { when: (r) => !hasLocal(r, 's11_peringatan'), text: 'Bonus: DOWNLOAD surat_peringatan.txt sebagai arsip untuk Pak Hadi.' }
  ],
  endings: [
    { id: 'lapor', label: 'Laporkan hasil lacak ke Pak Hadi', reward: 260,
      requires: (r) => r.flags.includes('sentinel_industri'),
      text: 'Pak Hadi menatap lembar lacak lama sekali. "Kawasan industri... Nak, jaringan itu sudah lama tidak dipakai." Ia meminta kamu merahasiakan dulu. SENTINEL kini punya alamat, walau belum punya wajah.' }
  ],
  meta: { giver: 'hadi', minLevel: 1, district: 'Tengah', difficulty: 2, repReward: 80, short: 'Kotak surat kelurahan — pesan misterius bertanda SENTINEL.', requires: ['s08'] },
  dialogue: {
    offer: offer(
      [
        N('Nak, ada hal yang membuat saya tidak tenang. Pagi tadi masuk surat elektronik tanpa nama, hanya ditandatangani "SENTINEL".', 'worried'),
        N('Isinya menyebut papan iklan, printer, dan loket bus. Persis hal-hal yang belakangan kamu bereskan. Saya tidak menuduhmu, hanya ingin tahu siapa yang sebenarnya menulis.', 'serious'),
        N('Surat itu ditahan filter di kotak surat kantor. Kamu perlu alat khusus untuk melacaknya: Tracer, kalau tidak salah namanya.')
      ],
      'Akan saya lacak, Pak.',
      'Mohon maaf, nanti dulu.',
      [N('Terima kasih, Nak. Kotak surat itu bisa dicapai lewat NAS kantor kelurahan. Mohon dirahasiakan dulu.', 'serious')],
      [N('Baik. Tapi saya tidak bisa tidur sebelum tahu siapa dia.')]
    ),
    turnIn: [
      N('Kawasan industri. Nak, itu daerah yang sudah bertahun-tahun ditinggalkan.', 'worried'),
      N('Terima kasih. Kamu menjaga kepercayaan yang saya titipkan. Kita lanjutkan perlahan, tanpa ribut dulu.', 'serious')
    ]
  }
};
