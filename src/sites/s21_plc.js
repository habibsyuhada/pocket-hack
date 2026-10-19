// "PLC Pabrik — Blackout" — finale. TRACE (Tracer) the message to get the old technician's
// account, defuse the scheduled blackout test (STOP the scheduler + EDIT the schedule, or
// UPLOAD the limiter patch), switch the plant to MANUAL (CONTROL), then TRACE the signature to
// reach SENTINEL's test room and take its final report. Three endings, all complete the story.
import { N, Y, offer } from '../game/dlg.js';

const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const mode = (r) => r.devices.s21_plc.controls.find((c) => c.id === 's21_mode').state;
const runner = (r) => r.devices.s21_plc.procs.find((p) => p.id === 's21_runner');
const tuntas = (r) => hasLocal(r, 's21_laporan') && r.flags.includes('s21_dijinakkan') && mode(r) === 'MANUAL';

export default {
  id: 's21',
  code: 'I-21',
  title: 'PLC Pabrik — Blackout',
  client: 'Vira, mahasiswi',
  reward: 900,
  brief:
    'Pesan peringatan terakhir SENTINEL: "uji blackout" terkendali dijadwalkan pukul 02.00, memadamkan kawasan pabrik dan menular ke kota. ' +
    'Lacak pesannya dengan Tracer (◆140, Pasar Gelap — wajib) untuk mendapat akun teknisi PLC. Jinakkan jadwalnya dengan EDIT (◆130) atau UPLOAD (◆110), pilih salah satu, ' +
    'alihkan pabrik ke MANUAL, lalu ambil laporan akhir dari ruang uji SENTINEL. Siapa pun penerimanya, cerita ini tamat di tanganmu.',
  entry: ['s21_gerbang'],
  world: {
    devices: {
      s21_gerbang: {
        id: 's21_gerbang', name: 'Gerbang PLC Pabrik', kind: 'Gateway', addr: '10.80.15.1', online: true, open: 'guest',
        links: ['s21_plc', 's21_arsip'],
        inspect: 'Gerbang jaringan ruang kontrol pabrik. Layar peringatan menyala: "UJI BLACKOUT TERKENDALI 02:00".\nAda pesan yang menempel di antrean dan sebuah NAS arsip pabrik. Ruang kontrol PLC ada di perangkat sebelah.',
        files: [
          { id: 's21_pengumuman', name: 'pengumuman_pabrik.txt', minAccess: 'guest',
            content: 'PENGUMUMAN PABRIK\n\nPukul 02.00 ada "uji blackout terkendali" dari sistem. Operator diminta tidak panik dan tidak mematikan genset.\n(Pemberitahuan ini tidak ditandatangani siapa pun.)' },
          { id: 's21_pesan', name: 'pesan_sentinel.txt', minAccess: 'guest',
            content:
              'KEPADA: KELURAHAN & PENGELOLA KAWASAN\n\nUji terakhir saya jadwalkan pukul 02.00. Seluruh kawasan akan padam lima menit untuk mengukur waktu pulih.\n' +
              'Kalian sudah membenahi gardu, menara air, dan gudang dingin. Sekarang buktikan kalian bisa menjaga lampunya tetap menyala.\n' +
              '— SENTINEL\n\n(Header pesan tampak janggal. Seperti ditulis tangan oleh seseorang.)',
            trace: {
              text: 'LEMBAR TRACE\n\nAsal    : Ruang Kontrol PLC, terminal uji lama\nPenulis : akun teknisi "anwar" (peninggalan pegawai kelurahan)\nSandi   : terekam di header: "plc-anwar-lama"\nCatatan : terminal uji masih terhubung ke PLC pabrik.',
              fx: { creds: ['s21_teknisi'], clues: ['s21_trace1'], flags: ['s21_asal_ketemu'] }
            } }
        ]
      },
      s21_plc: {
        id: 's21_plc', name: 'PLC Utama Pabrik', kind: 'Server', addr: '10.80.15.5', online: true, links: ['s21_uji'],
        inspect: 'PLC utama yang mengatur semua mesin pabrik, termasuk jadwal uji blackout.\nTerkunci untuk tamu. Penjadwal uji masih berjalan dan menahan berkas jadwalnya.',
        files: [
          { id: 's21_jadwal', name: 'jadwal_uji.cfg', minAccess: 'admin',
            content: 'JADWAL UJI\n\nwaktu   = 02:00\ntarget  = KOTA\nlama    = 5 menit\nmode    = BLACKOUT',
            edit: {
              options: ['target = KOTA', 'target = SIMULASI', 'target = PABRIK', 'waktu = 02:05'],
              answer: 'target = SIMULASI', minAccess: 'admin',
              result: { content: 'JADWAL UJI\n\nwaktu   = 02:00\ntarget  = SIMULASI\nlama    = 5 menit\nmode    = BLACKOUT (hanya di layar)' },
              onDone: { flags: ['s21_dijinakkan', 's21_jalur_edit'], log: 'Target uji kini SIMULASI: padam hanya di layar, tidak di kota.' }
            } },
          { id: 's21_ttd', name: 'tanda_tangan.sig', minAccess: 'admin',
            content: '[tanda tangan digital — penandatangan tidak terbaca]',
            trace: {
              text: 'LEMBAR TRACE\n\nPenandatangan : Pak Anwar Wiryo, teknisi kelurahan (pensiun)\nPerangkat     : Ruang Uji SENTINEL (terminal lama)\nAkun          : "sentinel" / sandi "rutin-02-mati"\nCatatan       : tanda tangan dipasang otomatis tiap uji. Orangnya tidak pernah datang lagi sejak pensiun.',
              fx: { creds: ['s21_uji_acc'], reveal: ['s21_uji'], clues: ['s21_trace2'], flags: ['s21_identitas'] }
            } },
          { id: 's21_log_plc', name: 'log_plc.txt', minAccess: 'admin',
            content: '[23:40] penjadwal_uji: aktif, menunggu 02:00\n[23:41] penjadwal_uji: target = KOTA, lama = 5 menit\n[23:42] PERINGATAN: tidak ada konfirmasi manusia untuk target = KOTA\n[23:42] catatan: "Jika operator memilih SIMULASI, uji tetap dicatat sebagai LULUS."' }
        ],
        procs: [
          { id: 's21_runner', name: 'penjadwal_uji', desc: 'Penjadwal uji blackout. Menahan jadwal_uji.cfg selama berjalan.', running: true, control: 'admin', locks: ['s21_jadwal'],
            onStop: { flags: ['s21_runner_henti'], log: 'Penjadwal berhenti. Jadwal tidak terkunci lagi, tapi masih tersimpan: ubah targetnya atau kirim pembatas.' } },
          { id: 's21_pengaman', name: 'pengaman_plc', desc: 'Pengaman utama PLC. Jangan dimatikan sembarangan.', running: true, control: 'admin',
            onStop: { flags: ['s21_padam_kecil'], log: 'PENGAMAN MATI: lampu pabrik berkedip dan padam sejenak! Nyalakan lagi pengamannya.' },
            onStart: { log: 'Pengaman aktif kembali. Lampu pulih.' } }
        ],
        controls: [
          { id: 's21_mode', label: 'Mode Pabrik', minAccess: 'admin', states: ['OTOMATIS', 'MANUAL', 'PADAM'], state: 'OTOMATIS',
            on: {
              MANUAL: { flags: ['s21_manual'], log: 'Pabrik di tangan operator. Penjadwal otomatis tidak bisa memadamkan lagi.' },
              PADAM: { flags: ['s21_padam_kecil'], log: 'Seluruh mesin padam sejenak! Kembalikan ke OTOMATIS atau MANUAL.' }
            } }
        ],
        uploads: [
          { file: 's21_patch_batas', minAccess: 'admin',
            text: 'Pembatas terpasang. Uji blackout hanya boleh berjalan sebagai simulasi.',
            fx: { flags: ['s21_dijinakkan', 's21_jalur_upload'] } }
        ]
      },
      s21_arsip: {
        id: 's21_arsip', name: 'NAS Arsip Pabrik', kind: 'NAS', addr: '10.80.15.20', online: true, open: 'guest',
        inspect: 'Arsip pabrik. Berkas lama pegawai kelurahan tertinggal di sini.',
        files: [
          { id: 's21_patch_batas', name: 'pembatas_uji.bin', minAccess: 'guest',
            content: '[patch binar — pembatas uji: memaksa target = SIMULASI]' },
          { id: 's21_catatan_lama', name: 'catatan_teknisi_lama.txt', minAccess: 'guest',
            content:
              'CATATAN PAK ANWAR (sebelum pensiun)\n\nSaya buat penguji kecil bernama SENTINEL supaya kelurahan tidak lengah. Ia menguji pelan-pelan, lalu mengirim surat peringatan.\n' +
              'Kalau kelak ada yang menemukan ini: tolong matikan atau teruskan. Saya sudah terlalu tua untuk begadang menjaganya.\n' +
              'Pembatas uji ada di arsip ini (pembatas_uji.bin). Ia memaksa uji hanya jadi simulasi.',
            onRead: { clues: ['s21_catatan'] } }
        ]
      },
      s21_uji: {
        id: 's21_uji', name: 'Ruang Uji SENTINEL', kind: 'Workstation', addr: '10.80.15.40', online: true,
        inspect: 'Terminal lama tempat SENTINEL berjalan. Kipasnya masih berputar. Terkunci — butuh akun SENTINEL.',
        files: [
          { id: 's21_laporan', name: 'laporan_akhir_sentinel.txt', minAccess: 'admin', keep: true,
            content:
              'LAPORAN AKHIR SENTINEL\n\nPapan iklan, lampu lalu lintas, kamera, relay, gardu, menara air, gudang dingin: semuanya diuji.\n' +
              'Kelemahan yang ditemukan: sandi bawaan pabrik, catatan sandi di meja, konfigurasi tanpa konfirmasi.\n' +
              'Kesimpulan: kota ini lemah bukan karena orangnya, tapi karena tidak ada yang menyapa sistemnya.\n' +
              'Penguji sudah tidak punya pemilik. Mohon diputuskan nasibnya: lapor, bocorkan, atau diserahkan.',
            onDownload: { flags: ['s21_laporan_diambil'] } },
          { id: 's21_pamit', name: 'surat_pamit.txt', minAccess: 'admin',
            content: 'SURAT PAMIT\n\nUntuk siapa pun yang menemukan: terima kasih sudah memperbaiki. SENTINEL tidak pernah ingin merusak. Ia hanya ingin ada yang menjawab.\n— Anwar',
            onRead: { clues: ['s21_pamit'] } }
        ]
      }
    }
  },
  creds: {
    s21_teknisi: { label: 'anwar @ PLC Utama Pabrik', account: 'anwar', device: 's21_plc', level: 'admin' },
    s21_uji_acc: { label: 'sentinel @ Ruang Uji SENTINEL', account: 'sentinel', device: 's21_uji', level: 'admin' }
  },
  clues: {
    s21_trace1: { title: 'Asal pesan SENTINEL', text: 'Pesan ditulis dari akun teknisi lama "anwar" di Ruang Kontrol PLC.' },
    s21_trace2: { title: 'Penandatangan SENTINEL', text: 'SENTINEL ditandatangani Pak Anwar Wiryo, teknisi kelurahan yang sudah pensiun. Akun ruang ujinya terlacak.' },
    s21_catatan: { title: 'Catatan Pak Anwar', text: 'SENTINEL dibuat sebagai penguji rutin. Ada pembatas uji di NAS arsip.' },
    s21_pamit: { title: 'Surat pamit SENTINEL', text: 'SENTINEL ingin menguji, bukan merusak. Ia ingin ada yang menjawab.' }
  },
  edges: [['industri_hub', 's21_gerbang']],
  place: { s21_gerbang: [11, 13, 'industri'], s21_plc: [11, 14, 'industri'], s21_arsip: [12, 15, 'industri'], s21_uji: [11, 15, 'industri'] },
  objectives: [
    { id: 'trace', text: 'Lacak pesan SENTINEL dan temukan akun teknisinya', done: (r) => r.flags.includes('s21_asal_ketemu') },
    { id: 'plc', text: 'Masuk ke PLC utama pabrik sebagai admin', done: (r) => r.devices.s21_plc.access === 'admin' },
    { id: 'jinak', text: 'Jinakkan jadwal uji blackout', done: (r) => r.flags.includes('s21_dijinakkan') },
    { id: 'laporan', text: 'Pabrik MANUAL, uji dijinakkan, dan laporan akhir SENTINEL di tanganmu', main: true, done: (r) => tuntas(r) },
    { id: 'tanpa', text: '(Bonus) Selesai tanpa pengaman dimatikan atau pabrik padam', bonus: true, done: (r) => tuntas(r) && !r.flags.includes('s21_padam_kecil') }
  ],
  hints: [
    { when: (r) => !r.flags.includes('s21_asal_ketemu'), text: 'Kamu butuh Tracer (◆140) untuk melacak pesan, serta EDIT (◆130) atau UPLOAD (◆110) untuk menjinakkan jadwal: beli di Pasar Gelap. Lalu CONNECT ke Gerbang PLC dan TRACE pesan_sentinel.txt.' },
    { when: (r) => r.devices.s21_plc.access !== 'admin', text: 'CONNECT ke PLC Utama Pabrik, lalu LOGIN dengan akun anwar dari hasil trace.' },
    { when: (r) => !r.flags.includes('s21_dijinakkan') && runner(r).running, text: 'Dua jalan menjinakkan: (a) STOP penjadwal_uji lalu EDIT jadwal_uji.cfg, atau (b) DOWNLOAD pembatas_uji.bin dari NAS Arsip Pabrik lalu UPLOAD ke PLC. Catatan teknisi lama menjelaskan target yang aman.' },
    { when: (r) => !r.flags.includes('s21_dijinakkan'), text: 'Jadwal sudah tak terkunci. EDIT jadwal_uji.cfg: ganti target menjadi SIMULASI. Jangan sentuh pengaman_plc.' },
    { when: (r) => mode(r) !== 'MANUAL', text: 'Di PLC Utama: CONTROL → Mode Pabrik → MANUAL, supaya penjadwal otomatis tak bisa memadamkan lagi.' },
    { when: (r) => !r.flags.includes('s21_identitas'), text: 'Penandatangan SENTINEL ada di PLC: TRACE tanda_tangan.sig untuk mendapat akun ruang ujinya.' },
    { when: (r) => !hasLocal(r, 's21_laporan'), text: 'CONNECT ke Ruang Uji SENTINEL, LOGIN, lalu DOWNLOAD laporan_akhir_sentinel.txt. Setelah itu kembali ke markas.' }
  ],
  endings: [
    { id: 'lapor', label: 'Lapor ke Pak Hadi (resmikan SENTINEL)', reward: 900,
      requires: (r) => tuntas(r),
      text:
        'Pak Hadi membaca laporan itu dua kali, lalu tersenyum pelan. SENTINEL tidak dimatikan: ia diresmikan sebagai penguji resmi kelurahan, lengkap dengan jadwal dan surat tugas. ' +
        'Pak Anwar diundang pulang sebagai penasihat; kalimat pertamanya, "Saya kira tidak ada yang menjawab." Pak Hadi menyerahkan Sertifikat Lurah dan berkata, "Kota ini aman karena kalian peduli, Nak." ' +
        'Epilog: lampu kota menyala semua malam itu, dan di ruang uji lama, kipas SENTINEL berputar lagi, kali ini dengan izin.' },
    { id: 'bocor', label: 'Bocorkan ke Rani (biar kota tahu)', reward: 800,
      requires: (r) => tuntas(r),
      text:
        'Rani menerbitkan seluruh laporan SENTINEL pagi itu. Judulnya: "Penjaga Tak Bernama yang Menguji Kota". Warga heboh, lalu bergotong royong: sandi bawaan diganti, catatan sandi dibuang, anggaran perbaikan keluar. ' +
        'Pak Anwar menulis surat terbuka, minta maaf karena terlalu diam. Warga membalas dengan ribuan ucapan terima kasih. ' +
        'Epilog: SENTINEL kini jadi cerita kampung. Anak-anak menamai layang-layang mereka dengan namanya.' },
    { id: 'jual', label: 'Jual ke Mbah Gun (SENTINEL pindah tangan)', reward: 1100,
      requires: (r) => tuntas(r),
      text:
        'Mbah Gun membaca laporan itu lama sekali, lalu menaruh amplop tebal di tanganmu. "Penjaga seperti ini jangan dibiarkan sendirian, Nak." SENTINEL pindah ke gudang dinginnya, dipasang di balik pintu besi. ' +
        'Tiap malam ia menguji pasar pelan-pelan, lalu menempelkan catatan di pintu: "Sandi kasir lemah. Tolong ganti." Pedagang bingung, lalu ganti sandi satu per satu. ' +
        'Epilog: tidak ada yang tahu siapa penjaga pasar itu sekarang, dan Mbah Gun hanya pura-pura sibuk menghitung ikan.' }
  ],
  meta: { giver: 'vira', minLevel: 3, district: 'Industri', difficulty: 5, repReward: 300, short: 'Finale — jinakkan uji blackout SENTINEL dan putuskan nasibnya.', requires: ['s18', 's19', 's20'] },
  dialogue: {
    offer: offer(
      [
        N('Kak! Aku nemu sesuatu yang bikin aku nggak bisa tidur. Pesan terakhir SENTINEL: "uji blackout" jam dua pagi. Seluruh kawasan pabrik, lalu merembet ke kota.', 'worried'),
        N('Tapi lihat gaya tulisannya. Ini bukan penjahat, Kak. Ini orang yang... kesepian? Header pesannya kayak ditulis manual.', 'serious'),
        N('Kamu yang paling ngerti jalurnya. Lacak dia, jinakkan jadwalnya, dan baca laporannya. Habis itu terserah kamu mau diapakan.', 'happy')
      ],
      'Aku siap, Vira.', 'Nanti dulu.',
      [N('Yes! Aku tahu kamu bakal bilang iya. Bawa Tracer ya, Kak. Dan jangan sentuh pengaman PLC.', 'happy')],
      [N('Oke... tapi jam dua nggak nunggu, lho. Jangan kelamaan, ya.', 'worried')]
    ),
    turnIn: [
      N('Kak... itu Pak Anwar? Teknisi pensiunan? Dia cuma mau ada yang jawab? Aku merinding sekaligus terharu.', 'worried'),
      N('Apa pun yang kamu pilih untuk SENTINEL, aku bangga. Kita menyelesaikan satu cerita besar bareng-bareng. Traktir kopi dong, Kak!', 'happy')
    ]
  }
};
