// "Kasir Ngadat" — LOGIN with a credential found on a *different* city node,
// then STOP the process that locks the report. Uses city nodes: tengah_hub →
// halte_info (clue) → warung_pos.
const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const syncRunning = (r) => r.devices.warung_pos.procs.find((p) => p.id === 'sync')?.running;

export default {
  id: 's04',
  code: 'B-04',
  title: 'Kasir Ngadat',
  client: 'Bu Tini, pemilik Warung Tini (titipan Bu Laras)',
  reward: 180,
  brief:
    'Kasir digital Warung Tini macet dan laporan penjualan hari ini terkunci proses sinkronisasi yang nyangkut. ' +
    'Bu Tini butuh setoran malam ini. Cari akun kasirnya, hentikan prosesnya, lalu ambil laporan_hari.csv.',
  entry: ['warung_pos'],
  world: {
    devices: {
      warung_pos: {
        id: 'warung_pos', name: 'Kasir Warung Tini', kind: 'Workstation', addr: '10.0.9.4', online: true,
        inspect: 'Kasir digital Warung Tini. Terkunci untuk tamu — butuh akun kasir.\nAda proses "sync" yang menahan laporan harian.',
        files: [
          { id: 'laporan', name: 'laporan_hari.csv', minAccess: 'admin', keep: true,
            content: 'LAPORAN HARI INI\n\nNasi uduk 42 · Teh es 61 · Gorengan 88\nTotal: Rp 1.284.000',
            onDownload: { flags: ['got_laporan'] } },
          { id: 'sync_log', name: 'sync.log', minAccess: 'admin',
            content: '[19:02] sync: menunggu server pusat...\n[19:02] sync: antrean macet (timeout)\n[19:03] sync: menahan laporan_hari.csv' }
        ],
        procs: [
          { id: 'sync', name: 'sync', desc: 'Sinkronisasi ke pusat. Sedang menahan laporan_hari.csv.', running: true, control: 'admin', locks: ['laporan'] }
        ]
      }
    }
  },
  creds: {
    pos_kasir: { label: 'kasir @ Kasir Warung Tini', account: 'kasir', device: 'warung_pos', level: 'admin' }
  },
  clues: {
    pos_kasir: { title: 'Akun kasir Warung Tini', text: 'Tempelan warga di panel halte memuat akun kasir Warung Tini.' }
  },
  // Extra content dropped onto existing city nodes.
  patches: {
    halte_info: {
      files: [
        { id: 'tempelan_tini', name: 'tempelan_warga.txt', minAccess: 'guest',
          content:
            'TEMPELAN WARGA\n\n- Dicari: kucing oren, hilang dekat pasar.\n' +
            '- Warung Tini: kalau kasir ngadat, login akun "kasir" sandi "warungtini98".\n  (Titipan Bu Tini — tolong jangan disebar.)\n' +
            '- Les gitar tiap Sabtu sore.',
          onRead: { creds: ['pos_kasir'], clues: ['pos_kasir'] } }
      ]
    }
  },
  objectives: [
    { id: 'note', text: 'Temukan akun kasir Warung Tini', done: (r) => r.creds.includes('pos_kasir') },
    { id: 'login', text: 'Masuk ke kasir warung', done: (r) => r.devices.warung_pos.access === 'admin' },
    { id: 'laporan', text: 'Salin laporan_hari.csv ke perangkatmu', main: true, done: (r) => hasLocal(r, 'laporan') },
    { id: 'sync', text: '(Bonus) Nyalakan lagi proses sync', bonus: true, done: (r) => hasLocal(r, 'laporan') && !!syncRunning(r) }
  ],
  hints: [
    { when: (r) => !r.read.includes('tempelan_tini'), text: 'Cari Panel Info Halte di dekat Alun-Alun: CONNECT lalu baca tempelan_warga.txt.' },
    { when: (r) => r.devices.warung_pos.access === 'none', text: 'CONNECT ke Kasir Warung Tini lalu LOGIN dengan akun kasir.' },
    { when: (r) => !!syncRunning(r), text: 'Buka Service Server dan STOP proses sync supaya laporan tidak terkunci.' },
    { when: (r) => !hasLocal(r, 'laporan'), text: 'Buka File Server, lalu DOWNLOAD laporan_hari.csv.' },
    { when: (r) => !syncRunning(r), text: 'Bonus: START sync lagi supaya kasir kembali normal.' }
  ],
  endings: [
    { id: 'setor', label: 'Serahkan laporan ke Bu Tini', reward: 180,
      requires: (r) => hasLocal(r, 'laporan'),
      text: 'Bu Tini bisa setor malam ini. "Kamu penyelamat!" Ia menitipkan sebungkus nasi uduk untuk Bu Laras.' }
  ]
};
