// s17 "Gang Belakang: Relay Gelap" — DOWNLOAD patch dari bengkel, UPLOAD ke modem gang, lalu ELEVATE admin
// di Menara Relay (patch node kota). Hasil: ROUTE ke Kawasan Industri terbuka.
import { N, Y, offer } from '../game/dlg.js';

const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const relayAdmin = (r) => r.devices.menara_relay.access === 'admin';

export default {
  id: 's17',
  code: 'V-17',
  title: 'Relay Gelap',
  client: 'Mbah Gun, Pasar Selatan',
  reward: 460,
  brief:
    'Di gang belakang pasar ada modem relay gelap yang menjadi kunci Menara Relay Selatan, satu-satunya jembatan ke kawasan industri. ' +
    'Mbah Gun mau menara itu dipegang orang yang bisa dipercaya. Ambil patch dari bengkel servis, kirim ke modem gang dengan UPLOAD (◆110, beli di Pasar Gelap), ' +
    'lalu naikkan aksesmu di menara jadi admin.',
  entry: ['s17_gang'],
  world: {
    devices: {
      s17_gang: {
        id: 's17_gang', name: 'Kios Servis Gang Belakang', kind: 'Workstation', addr: '10.9.60.2', online: true, open: 'guest',
        links: ['s17_bengkel'],
        inspect: 'PC kios servis HP di gang belakang. Tamu hanya melihat nota dan tempelan.',
        files: [
          { id: 's17_nota', name: 'nota_servis.txt', minAccess: 'guest',
            content:
              'NOTA SERVIS (BELUM DIAMBIL)\n\n- HP layar retak · Rp 150.000\n- Modem tua milik "orang menara" · selesai di-flash, menunggu patch kedua\n' +
              'Catatan montir: bahan-bahan ada di NAS bengkel. Akun bengkel: "montir", sandi "gangbelakang7". Jangan ditempel di depan, tolong!',
            onRead: { creds: ['s17_bengkel_montir'], clues: ['s17_bengkel_montir'] } }
        ]
      },
      s17_bengkel: {
        id: 's17_bengkel', name: 'NAS Bengkel Servis', kind: 'NAS', addr: '10.9.60.8', online: true, links: ['s17_modem'],
        inspect: 'Penyimpanan bengkel servis. Terkunci untuk tamu, butuh akun montir.',
        files: [
          { id: 's17_catatan_modem', name: 'catatan_modem.txt', minAccess: 'user',
            content:
              'CATATAN MODEM RELAY\n\nModem gang dipasang orang tak dikenal tahun lalu. Aku cuma merawatnya.\n' +
              'Login modem: akun "montir2", sandi "modem-gelap". Setelah login, kirim patch_relay.bin dengan UPLOAD supaya modem menyalakan token admin menara.\n' +
              'Awas: patch_lama.bin itu untuk firmware sebelumnya, modem akan menolak.',
            onRead: { creds: ['s17_modem_montir'], clues: ['s17_modem_montir'] } },
          { id: 's17_patch', name: 'patch_relay.bin', minAccess: 'user',
            content: 'PATCH RELAY v2\n\nFirmware tambalan untuk modem gang. Mengaktifkan token admin menara bagi pemegang akun montir.' },
          { id: 's17_patch_lama', name: 'patch_lama.bin', minAccess: 'user',
            content: 'PATCH RELAY v1 (usang)\n\nUntuk firmware lama. Jangan dipakai di modem sekarang.' }
        ]
      },
      s17_modem: {
        id: 's17_modem', name: 'Modem Relay Gang', kind: 'Gateway', addr: '10.9.60.15', online: true,
        inspect: 'Modem relay tua di gang belakang. Terkunci akun montir.\nIa menunggu patch_relay.bin lewat UPLOAD.',
        uploads: [
          { file: 's17_patch', minAccess: 'user',
            text: 'Patch relay v2 terpasang. Modem menyala hijau dan mengirim token admin ke Menara Relay Selatan.',
            fx: { flags: ['s17_patched'], clues: ['s17_token'], log: 'Menara Relay kini menunggu pemegang token untuk ELEVATE.' } }
        ],
        files: [
          { id: 's17_log_modem', name: 'log_modem.txt', minAccess: 'user',
            content:
              'LOG MODEM\n\nTiap tengah malam ada kunjungan dari alamat "SENTINEL" yang menguji pintu menara, lalu pergi tanpa mengubah apa-apa.\n' +
              'Dia hanya mencatat: "Kalau pemegang menara tidak peduli, kawasan industri ikut terbuka."',
            onRead: { flags: ['s17_baca_sentinel'] } }
        ]
      }
    }
  },
  creds: {
    s17_bengkel_montir: { label: 'montir @ NAS Bengkel Servis', account: 'montir', device: 's17_bengkel', level: 'user' },
    s17_modem_montir: { label: 'montir2 @ Modem Relay Gang', account: 'montir2', device: 's17_modem', level: 'user' }
  },
  clues: {
    s17_bengkel_montir: { title: 'Akun bengkel', text: 'Nota servis menyebut akun bengkel: montir.' },
    s17_modem_montir: { title: 'Akun modem', text: 'Catatan bengkel memuat akun modem relay gang.' },
    s17_token: { title: 'Token menara', text: 'Modem sudah ditambal. ELEVATE di Menara Relay Selatan sekarang berhasil.' }
  },
  patches: {
    menara_relay: {
      elevate: {
        from: 'guest', to: 'admin', requires: ['s17_patched'],
        text: 'Token dari modem gang diterima. Kamu masuk sebagai admin Menara Relay. Rute ke kawasan industri siap dibuka dengan ROUTE.',
        failText: 'Menara menolak: belum ada token admin. Modem di Gang Belakang belum ditambal.'
      },
      files: [
        { id: 's17_relay_admin', name: 'catatan_admin_menara.txt', minAccess: 'admin',
          content: 'CATATAN ADMIN MENARA\n\nPemegang token boleh membuka rute ke jaringan kawasan industri.\nPakai ROUTE dari menara ini ke Hotspot Kawasan Industri. Hati-hati, di sana ada mesin sungguhan.' }
      ]
    }
  },
  objectives: [
    { id: 'montir', text: 'Masuk ke NAS Bengkel Servis dengan akun montir', done: (r) => r.devices.s17_bengkel.access !== 'none' },
    { id: 'patch', text: 'Salin patch_relay.bin ke perangkatmu', done: (r) => hasLocal(r, 's17_patch') },
    { id: 'kirim', text: 'Kirim patch ke Modem Relay Gang (UPLOAD)', done: (r) => r.flags.includes('s17_patched') },
    { id: 'admin', text: 'Jadi admin di Menara Relay Selatan', main: true, done: (r) => relayAdmin(r) },
    { id: 'sentinel', text: '(Bonus) Baca log modem tentang SENTINEL', bonus: true, done: (r) => r.flags.includes('s17_baca_sentinel') }
  ],
  hints: [
    { when: (r, p) => !(p.cmds || []).includes('UPLOAD'), text: 'Misi ini butuh perintah UPLOAD (◆110). Beli di Pasar Gelap (peta, Selatan), lalu CONNECT ke Kios Servis Gang Belakang lewat Hotspot Pasar Selatan.' },
    { when: (r) => !r.read.includes('s17_nota'), text: 'CONNECT ke Kios Servis Gang Belakang dan baca nota_servis.txt.' },
    { when: (r) => r.devices.s17_bengkel.access === 'none', text: 'LOGIN ke NAS Bengkel Servis dengan akun montir dari nota.' },
    { when: (r) => !r.read.includes('s17_catatan_modem'), text: 'Baca catatan_modem.txt di NAS Bengkel: ada akun modem dan petunjuk patch yang benar.' },
    { when: (r) => !hasLocal(r, 's17_patch'), text: 'DOWNLOAD patch_relay.bin (v2, bukan patch_lama.bin).' },
    { when: (r) => r.devices.s17_modem.access === 'none', text: 'CONNECT ke Modem Relay Gang lalu LOGIN dengan akun montir2.' },
    { when: (r) => !r.flags.includes('s17_patched'), text: 'Dari modem, UPLOAD patch_relay.bin yang ada di perangkatmu.' },
    { when: (r) => !relayAdmin(r), text: 'CONNECT ke Menara Relay Selatan dari Hotspot Pasar Selatan, lalu ELEVATE ke admin.' },
    { when: (r) => !r.flags.includes('s17_baca_sentinel'), text: 'Bonus: baca log_modem.txt di modem. Ada tamu tengah malam bernama SENTINEL.' }
  ],
  endings: [
    {
      id: 'menara', label: 'Serahkan kendali menara ke Mbah Gun', reward: 460,
      requires: (r) => relayAdmin(r),
      text: 'Menara itu kini di tangan yang bisa dipercaya. Mbah Gun mengangguk sekali. "Jalan ke pabrik sudah terbuka, Nak. Jangan masuk kalau belum siap."'
    },
    {
      id: 'menara_sentinel', label: 'Serahkan kendali menara beserta log SENTINEL', reward: 500,
      requires: (r) => relayAdmin(r) && r.flags.includes('s17_baca_sentinel'),
      text: 'Mbah Gun membaca log modem lama sekali. "Seseorang menguji kota ini diam-diam," katanya pelan. "Dan dia memakai pintu yang sama denganmu." Ia menambah bayaranmu tanpa banyak bicara.'
    }
  ],
  meta: {
    giver: 'gun', minLevel: 2, district: 'Selatan', difficulty: 4, repReward: 140,
    short: 'Tambal modem relay gelap di gang dan ambil alih Menara Relay menuju Industri.'
  },
  dialogue: {
    offer: offer(
      [
        N('Nak. Ke belakang pasar, ada modem gelap. Orang menara yang pasang, entah siapa.', 'serious'),
        N('Menara Relay di ujung pasar itu jembatan ke kawasan industri. Siapa yang pegang tokennya, pegang jalan ke sana.'),
        N('Ambil patch dari bengkel servis, kirim ke modemnya. Kamu butuh UPLOAD, belilah kalau belum punya. Jangan bilang siapa yang menyuruh.')
      ],
      'Aku tambal.', 'Aku belum siap.',
      [N('Hmph. Bagus. Hati-hati sama patch yang salah versi.', 'serious')],
      [N('Jalan itu tidak ke mana-mana. Kembali kalau kamu sudah mantap.')]
    ),
    turnIn: [
      N('Menaranya sudah mengenali kamu. Aku bisa merasakannya dari sini.'),
      Y('Tokennya aktif. Aku sekarang admin menara.'),
      N('Simpan baik-baik. Pabrik di seberang sana bukan taman bermain, Nak.', 'serious')
    ]
  },
  edges: [['selatan_hub', 's17_gang']],
  place: {
    s17_gang: [6, 12, 'selatan'],
    s17_bengkel: [6, 14, 'selatan'],
    s17_modem: [7, 12, 'selatan']
  }
};
