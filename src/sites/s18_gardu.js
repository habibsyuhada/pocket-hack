// "Gardu Listrik" — SERVICES in the right order. Start the genset, release the load,
// then (and only then) switch off the main transformer. Wrong order raises an alarm
// (a permanent flag + a lower payout) but never blocks the mission.
import { N, Y, offer } from '../game/dlg.js';

const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const proc = (r, id) => r.devices.s18_scada.procs.find((p) => p.id === id);
const at = (r, f) => r.flags.indexOf(f);

// Alarm = relay proteksi dimatikan, atau trafo utama dilepas sebelum genset menyala / beban dilepas.
export const garduAlarm = (r) => {
  const t = at(r, 's18_trafo_off'), g = at(r, 's18_genset_on'), f = at(r, 's18_feeder_off');
  return r.flags.includes('s18_proteksi_off') || (t >= 0 && (g < 0 || g > t || f < 0 || f > t));
};
const beralih = (r) => proc(r, 's18_genset').running && !proc(r, 's18_trafo').running && proc(r, 's18_feeder').running;

export default {
  id: 's18',
  code: 'I-18',
  title: 'Gardu Listrik',
  client: 'Pak Hadi, Lurah Kelurahan',
  reward: 560,
  brief:
    'Gardu listrik kawasan pabrik terkena "uji beralih sumber daya" yang tidak pernah dijadwalkan siapa pun. ' +
    'Pak Hadi minta pabrik dipindahkan ke genset cadangan dengan urutan yang benar, lalu log ujinya diselamatkan. ' +
    'Kamu masuk lewat ROUTE dari Menara Relay. Baca SOP-nya dulu: salah urutan, alarm gardu berbunyi.',
  entry: ['s18_panel'],
  world: {
    devices: {
      s18_panel: {
        id: 's18_panel', name: 'Panel Gardu Pabrik', kind: 'Gateway', addr: '10.80.11.1', online: true, open: 'guest',
        links: ['s18_pos', 's18_scada'],
        inspect: 'Panel luar gardu listrik kawasan pabrik. Lampu indikatornya berkedip kuning.\nTamu hanya bisa membaca papan SOP. Ruang kontrolnya ada di perangkat sebelah.',
        files: [
          { id: 's18_sop', name: 'sop_gardu.txt', minAccess: 'guest',
            content:
              'SOP PINDAH KE GENSET (ditempel di panel)\n\n' +
              '1. NYALAKAN genset dulu. Tunggu sampai stabil.\n' +
              '2. LEPAS beban: hentikan penyulang pabrik.\n' +
              '3. Baru hentikan trafo utama (tanpa beban, tanpa percikan).\n' +
              '4. Hidupkan lagi penyulang pabrik — sekarang dari genset.\n\n' +
              'JANGAN pernah mematikan relay proteksi. Itu yang menjaga gardu kalau ada yang keliru.',
            onRead: { clues: ['s18_sop'] } }
        ]
      },
      s18_pos: {
        id: 's18_pos', name: 'Pos Jaga Gardu', kind: 'Workstation', addr: '10.80.11.8', online: true, open: 'guest',
        inspect: 'PC pos jaga gardu. Tidak ada orangnya malam ini; kursi kosong, teh sudah dingin.',
        files: [
          { id: 's18_shift', name: 'catatan_shift.txt', minAccess: 'guest',
            content:
              'CATATAN SHIFT MALAM — Pak Joko\n\nLampu indikator kuning sejak jam 9. Katanya "uji otomatis", tapi tidak ada surat tugas.\n' +
              'Kalau perlu masuk ruang kontrol: akun "operator", sandi "gardu-ok-77". Sandinya kutulis di sini\n' +
              'karena sering lupa. (Jangan difoto, ya.)\nKopi habis. Pulang dulu, anakku demam.',
            onRead: { creds: ['s18_operator'], clues: ['s18_note'] } }
        ]
      },
      s18_scada: {
        id: 's18_scada', name: 'Kontrol Gardu (SCADA)', kind: 'Server', addr: '10.80.11.5', online: true, links: ['s18_meter'],
        inspect: 'Ruang kontrol gardu. Terkunci untuk tamu — butuh akun operator.\nAda empat layanan penting: genset, penyulang pabrik, trafo utama, dan relay proteksi.',
        files: [
          { id: 's18_log_uji', name: 'log_uji_beralih.txt', minAccess: 'admin', keep: true, requiresProc: 's18_genset',
            content:
              'LOG UJI — pindah sumber daya\n\n[01:58] UJI-OTOMATIS: memeriksa kesiapan genset\n' +
              '[02:00] UJI-OTOMATIS: menunggu operator melepas beban dengan benar\n' +
              '[02:01] UJI-OTOMATIS: SOP diikuti? (dinilai dari urutan tindakan)\n' +
              '[02:01] penguji: SENTINEL v0.9\n[02:02] catatan: "Kalau gardu ini jatuh, pabrik gelap dan warga ikut."',
            onDownload: { flags: ['s18_log_diambil'], clues: ['s18_sentinel'] } }
        ],
        procs: [
          { id: 's18_genset', name: 'genset', desc: 'Genset cadangan pabrik. Mati; harus dinyalakan sebelum trafo dilepas.', running: false, control: 'admin',
            onStart: { flags: ['s18_genset_on'], log: 'Genset menyala dan stabil. Log uji kini terbaca.' } },
          { id: 's18_feeder', name: 'penyulang_pabrik', desc: 'Jalur beban ke pabrik. Sedang berjalan.', running: true, control: 'admin',
            onStop: { flags: ['s18_feeder_off'], log: 'Beban pabrik dilepas. Mesin-mesin berhenti pelan.' },
            onStart: { flags: ['s18_feeder_on'], log: 'Penyulang menyala. Beban pabrik masuk.' } },
          { id: 's18_trafo', name: 'trafo_utama', desc: 'Trafo utama gardu. Menahan berkas log uji selama masih menyala.', running: true, control: 'admin', locks: ['s18_log_uji'],
            onStop: { flags: ['s18_trafo_off'], log: 'Trafo utama dilepas.' },
            onStart: { flags: ['s18_trafo_on'], log: 'Trafo utama menyala lagi.' } },
          { id: 's18_proteksi', name: 'relay_proteksi', desc: 'Pengaman gardu. Jangan dimatikan.', running: true, control: 'admin',
            onStop: { flags: ['s18_proteksi_off'], log: 'PERINGATAN: relay proteksi mati! Sirene gardu meraung. Nyalakan lagi, lalu pelan-pelan saja.' },
            onStart: { log: 'Relay proteksi aktif kembali. Sirene berhenti.' } }
        ]
      },
      s18_meter: {
        id: 's18_meter', name: 'Meter Beban Pabrik', kind: 'Workstation', addr: '10.80.11.12', online: true, open: 'guest',
        inspect: 'Meter beban digital. Grafik naik-turun mengikuti shift pabrik.',
        files: [
          { id: 's18_grafik', name: 'grafik_beban.txt', minAccess: 'guest',
            content: 'GRAFIK BEBAN (kW)\n\n20.00  ████████ 820\n22.00  ██████   610\n01.00  ███      290\n02.00  ██       190  <- penyulang dilepas?\n(Beban 190 kW = hanya lampu darurat dan pompa kecil.)' }
        ]
      }
    }
  },
  creds: {
    s18_operator: { label: 'operator @ Kontrol Gardu', account: 'operator', device: 's18_scada', level: 'admin' }
  },
  clues: {
    s18_sop: { title: 'SOP pindah ke genset', text: 'Genset dulu, lepas beban, baru trafo. Relay proteksi jangan disentuh.' },
    s18_note: { title: 'Akun operator gardu', text: 'Catatan shift Pak Joko memuat akun dan sandi ruang kontrol.' },
    s18_sentinel: { title: 'Penguji bernama SENTINEL', text: 'Log uji gardu ditandatangani "SENTINEL v0.9": penguji otomatis yang menilai urutan tindakan operator.' }
  },
  edges: [['industri_hub', 's18_panel']],
  place: { s18_panel: [9, 11, 'industri'], s18_scada: [10, 11, 'industri'], s18_meter: [11, 11, 'industri'], s18_pos: [8, 12, 'industri'] },
  objectives: [
    { id: 'masuk', text: 'Masuk ke ruang kontrol gardu sebagai admin', done: (r) => r.devices.s18_scada.access === 'admin' },
    { id: 'beralih', text: 'Pindahkan pabrik ke genset (trafo utama berhenti, penyulang menyala)', done: (r) => beralih(r) },
    { id: 'log', text: 'Salin log_uji_beralih.txt ke perangkatmu', main: true, done: (r) => hasLocal(r, 's18_log_uji') },
    { id: 'bersih', text: '(Bonus) Selesai tanpa alarm gardu berbunyi', bonus: true, done: (r) => hasLocal(r, 's18_log_uji') && !garduAlarm(r) }
  ],
  hints: [
    { when: (r) => !r.read.includes('s18_sop'), text: 'Kamu sudah di kawasan industri. CONNECT ke Panel Gardu Pabrik lalu baca sop_gardu.txt — urutannya penting.' },
    { when: (r) => !r.creds.includes('s18_operator'), text: 'Ruang kontrol butuh akun. Cek Pos Jaga Gardu: petugas shift sering menulis catatan.' },
    { when: (r) => r.devices.s18_scada.access !== 'admin', text: 'CONNECT ke Kontrol Gardu lalu LOGIN sebagai operator.' },
    { when: (r) => !proc(r, 's18_genset').running, text: 'Buka SERVICES di Kontrol Gardu. Langkah pertama SOP: START genset.' },
    { when: (r) => proc(r, 's18_feeder').running && proc(r, 's18_trafo').running, text: 'Genset sudah menyala. STOP penyulang_pabrik (lepas beban), lalu STOP trafo_utama.' },
    { when: (r) => proc(r, 's18_trafo').running, text: 'Beban sudah lepas. Sekarang STOP trafo_utama.' },
    { when: (r) => !hasLocal(r, 's18_log_uji'), text: 'Trafo sudah berhenti dan genset menyala: DOWNLOAD log_uji_beralih.txt dari Kontrol Gardu.' },
    { when: (r) => !proc(r, 's18_feeder').running, text: 'Terakhir: START penyulang_pabrik supaya pabrik jalan dari genset.' },
    { when: (r) => !proc(r, 's18_proteksi').running, text: 'Nyalakan lagi relay_proteksi. Gardu tidak boleh dibiarkan tanpa pengaman.' }
  ],
  endings: [
    { id: 'rapi', label: 'Serahkan log ke Pak Hadi (tanpa alarm)', reward: 560,
      requires: (r) => hasLocal(r, 's18_log_uji') && !garduAlarm(r),
      text: 'Gardu berpindah ke genset semulus kopi dituang. Pak Hadi membaca log uji dan menggeleng pelan: "Siapa pun SENTINEL ini, dia menilai kita dengan adil."' },
    { id: 'alarm', label: 'Serahkan log ke Pak Hadi (alarm sempat bunyi)', reward: 460,
      requires: (r) => hasLocal(r, 's18_log_uji') && garduAlarm(r),
      text: 'Sirene sempat meraung, tapi gardu selamat dan log uji sudah di tangan. Pak Hadi tersenyum: "Tidak apa-apa, Nak. Yang penting kamu mau belajar urutannya."' }
  ],
  meta: { giver: 'hadi', minLevel: 3, district: 'Industri', difficulty: 4, repReward: 170, short: 'Gardu pabrik — pindah ke genset dengan urutan yang benar.', requires: ['s17'] },
  dialogue: {
    offer: offer(
      [
        N('Nak, ada kabar dari kawasan industri. Gardu listrik di sana sedang "diuji" oleh sesuatu yang tidak kami jadwalkan.', 'serious'),
        N('Lampunya kuning sejak malam. Kalau gardu itu jatuh, pabrik gelap dan separuh kelurahan ikut kena.', 'worried'),
        N('Aku mau kamu memindahkan pabrik ke genset dengan urutan yang benar, pelan-pelan, lalu selamatkan log ujinya.')
      ],
      'Saya urus, Pak.', 'Nanti dulu, Pak.',
      [N('Terima kasih, Nak. Bacalah SOP-nya dulu. Dalam urusan listrik, urutan itu nyawa.', 'happy')],
      [N('Baik, Nak. Tapi jangan lama-lama. Lampu kuning itu bikin tidurku tidak tenang.', 'worried')]
    ),
    turnIn: [
      N('Gardunya stabil. Pabrik jalan dari genset dan warga tidak merasakan apa-apa. Rapi sekali, Nak.', 'happy'),
      N('Nama SENTINEL ini mulai sering kudengar. Menarik: dia tidak merusak, dia menilai. Kita lihat ke mana jejaknya.', 'serious')
    ]
  }
};
