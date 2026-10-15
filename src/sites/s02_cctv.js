// "Mata Parkir" — teaches EXPLOIT + CONTROL. Fictional parking-garage network.
const hasLocal = (run, id) => run.local.some((f) => f.id === id);

export default {
  id: 's02',
  code: 'C-02',
  title: 'Mata Parkir',
  client: 'Jurnalis lepas "Rani"',
  reward: 240,
  brief:
    'Sebuah gedung parkir memasang kamera yang diam-diam merekam plat nomor dan menjualnya. ' +
    'Ambil bukti rekaman (clip_bukti.mp4) dari perekam, lalu matikan kameranya.',
  entry: ['gw'],
  world: {
    devices: {
      gw: {
        id: 'gw', name: 'Panel Parkir', kind: 'Gateway', addr: '192.168.4.1', x: 50, y: 78,
        online: true, open: 'guest', links: ['dvr', 'cam'],
        inspect: 'Panel kontrol gerbang parkir.\nTerlihat dua perangkat: perekam (DVR) dan kamera.\nCatatan pemasang masih tertinggal.',
        files: [
          { id: 'note', name: 'pemasang.txt', minAccess: 'guest',
            content: 'CATATAN PEMASANG\n\nDVR firmware lama, ada celah "debug-port" yang belum ditutup.\nPakai mode debug untuk masuk admin tanpa sandi.\nKamera dikontrol dari DVR setelah admin.',
            onRead: { flags: ['know_flaw'], clues: ['flaw'] } }
        ]
      },
      dvr: {
        id: 'dvr', name: 'Perekam DVR', kind: 'Server', addr: '192.168.4.10', x: 28, y: 35,
        online: true, open: 'guest', links: ['cam'],
        inspect: 'Perekam video. Firmware fiktif DVR-9.\nAda celah debug-port (lihat catatan pemasang). Gunakan EXPLOIT.',
        exploit: { level: 'admin', requires: 'know_flaw', text: 'Debug-port terbuka. Kamu masuk sebagai admin DVR.' },
        files: [
          { id: 'clip', name: 'clip_bukti.mp4', minAccess: 'admin', keep: true,
            content: 'REKAMAN: panel menyalin plat nomor tiap kendaraan + waktu, lalu mengunggahnya ke server luar. Bukti kuat.',
            onDownload: { flags: ['got_clip'] } },
          { id: 'cfg', name: 'uplink.cfg', minAccess: 'admin',
            content: 'tujuan_unggah = pasar-data.example\njadwal = tiap 10 menit\nstatus = AKTIF' }
        ],
        controls: [
          { id: 'cam_power', label: 'Daya Kamera', minAccess: 'admin', states: ['AKTIF', 'MATI'], state: 'AKTIF',
            on: { MATI: { flags: ['cam_off'], online: [], log: 'Kamera mati. Perekaman plat berhenti.' } } }
        ]
      },
      cam: {
        id: 'cam', name: 'Kamera Plat', kind: 'Workstation', addr: '192.168.4.20', x: 72, y: 35,
        online: true, open: 'guest',
        inspect: 'Kamera pembaca plat. Hanya bisa dimatikan lewat kontrol di DVR (butuh admin DVR).'
      }
    }
  },
  creds: {},
  clues: { flaw: { title: 'Celah DVR', text: 'DVR punya debug-port terbuka → EXPLOIT untuk admin.' } },
  objectives: [
    { id: 'clip', text: 'Ambil clip_bukti.mp4', main: true, done: (r) => hasLocal(r, 'clip') },
    { id: 'off', text: '(Bonus) Matikan kamera plat', bonus: true, done: (r) => r.flags.includes('cam_off') }
  ],
  hints: [
    { when: (r) => !r.read.includes('note'), text: 'CONNECT ke Panel Parkir dan baca pemasang.txt.' },
    { when: (r) => r.devices.dvr.access !== 'admin', text: 'CONNECT ke Perekam DVR lalu EXPLOIT celah debug-port.' },
    { when: (r) => !hasLocal(r, 'clip'), text: 'DOWNLOAD clip_bukti.mp4 dari DVR.' },
    { when: (r) => !r.flags.includes('cam_off'), text: 'Bonus: di tab Sistem DVR, CONTROL → Daya Kamera → MATI.' }
  ],
  endings: [
    { id: 'leak', label: 'Serahkan bukti ke Rani', reward: 240,
      requires: (r) => hasLocal(r, 'clip'),
      text: 'Rani menerbitkan buktinya. Operasi penjualan plat ditutup. Reputasimu naik di kalangan jurnalis.' }
  ]
};
