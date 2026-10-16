// Shared "set dressing" so each device feels like a real box: extra readable
// files and background services that aren't required by any objective.
// All fictional. Flavor files are read-only (noDownload) unless noted.

let n = 0;
const uid = (p) => `${p}_${n++}`;

export function sysFiles(kind) {
  const common = [
    { name: 'motd.txt', noDownload: true, content: '=== SISTEM INTERNAL ===\nAkses hanya untuk staf berwenang.\nSemua aktivitas dicatat. (fiktif)' },
    { name: 'README', noDownload: true, content: 'Layanan dikelola tim IT. Jangan ubah konfigurasi tanpa izin.' }
  ];
  const byKind = {
    Router: [
      { name: 'dhcp.leases', noDownload: true, content: '10.0.0.7  printer   lease 24h\n10.0.0.22 laptop-kasir  lease 2h\n10.0.0.31 hp-staff  lease 30m' },
      { name: 'syslog.1', content: '[06:12] wlan0 up\n[07:03] client assoc 10.0.0.22\n[08:01] client assoc 10.0.0.7\n[08:40] dns query x412 ...' }
    ],
    Gateway: [
      { name: 'routes.cfg', noDownload: true, content: 'default via uplink\nlan 172.16.0.0/24\nvlan-staff 172.16.1.0/24' },
      { name: 'auth.log', content: '[mon] login ok: operator\n[tue] login FAIL x3: unknown\n[tue] login ok: teknisi' }
    ],
    Server: [
      { name: 'cpu.stat', noDownload: true, content: 'load 0.42 0.38 0.30\nmem 61% · disk 72%' },
      { name: 'service.log', content: 'svc start ok\nbackup cron 02:00\nwarn: disk 72% (ambang 80%)' }
    ],
    Workstation: [
      { name: 'recent.lnk', noDownload: true, content: 'Terakhir dibuka:\n- laporan_q3.odt\n- foto_keluarga.jpg\n- todo.txt' },
      { name: 'todo.txt', content: 'TODO:\n- balas email vendor\n- backup folder proyek\n- ganti sandi (belum!)' }
    ],
    NAS: [
      { name: 'shares.cfg', noDownload: true, content: 'share: /backup (ro)\nshare: /media (rw)\nquota: 2TB' },
      { name: 'index.db', noDownload: true, content: '[indeks biner penyimpanan — tak terbaca]' }
    ],
    Printer: [
      { name: 'ink.status', noDownload: true, content: 'Cyan 20% · Magenta 44% · Kuning 8% · Hitam 61%' },
      { name: 'jobs.hist', content: 'job#38 brosur.pdf  OK\njob#39 nota.pdf   OK\njob#40 label.pdf  OK\njob#41 menu_baru.pdf  TERTAHAN' }
    ]
  };
  return [...common, ...(byKind[kind] || [])].map((f) => ({ id: uid('fl'), minAccess: 'guest', ...f }));
}

export function sysProcs(kind) {
  const base = [
    { name: 'init', desc: 'Proses inti sistem.', running: true, control: 'admin', stoppable: false },
    { name: 'sshd', desc: 'Layanan akses jarak jauh.', running: true, control: 'admin', stoppable: false },
    { name: 'cron', desc: 'Penjadwal tugas berkala.', running: true, control: 'admin' }
  ];
  const extra = {
    Server: [{ name: 'httpd', desc: 'Server web internal.', running: true, control: 'admin' }],
    NAS: [{ name: 'smbd', desc: 'Berbagi berkas jaringan.', running: true, control: 'admin' }],
    Printer: [{ name: 'cupsd', desc: 'Manajer pencetakan.', running: true, control: 'admin' }],
    Gateway: [{ name: 'firewalld', desc: 'Penyaring lalu lintas.', running: true, control: 'admin', stoppable: false }],
    Workstation: [{ name: 'desktop', desc: 'Sesi antarmuka pengguna.', running: true, control: 'user' }]
  };
  return [...base, ...(extra[kind] || [])].map((p) => ({ id: uid('pr'), ...p }));
}

// Merge flavor into every device of a site's world (idempotent-ish: appends).
export function dressWorld(world) {
  for (const d of Object.values(world.devices)) {
    d.files = [...(d.files || []), ...sysFiles(d.kind)];
    d.procs = [...(d.procs || []), ...sysProcs(d.kind)];
  }
  return world;
}
