// Generic city nodes: always there, interconnected, explorable. Missions are
// built on top of them (they add files / services through `patches`).
// All fictional. Hotspots ("hub") are open to guests and anchor each district.

const hub = (id, name, addr, district, inspect, extra = {}) => ({
  id, name, kind: 'Router', addr, online: true, open: 'guest', hub: true, district, inspect,
  files: [
    { id: `${id}_info`, name: 'info_hotspot.txt', minAccess: 'guest',
      content: `${name.toUpperCase()}\n\nJaringan tamu terbuka untuk warga.\nPerangkat di sekitar terlihat setelah SCAN.\n(Semua sistem di game ini fiktif.)` }
  ],
  ...extra
});

export const GENERIC_NODES = [
  // ===== Industri (kawasan pabrik, hanya lewat ROUTE) =====
  hub('industri_hub', 'Hotspot Kawasan Industri', '10.80.255.1', 'industri',
    'Hotspot kawasan pabrik. Jaringan ini tidak tersambung ke kota — hanya bisa dicapai lewat relay.\nGardu listrik, menara air, gudang pendingin, dan ruang kontrol pabrik berbagi jaringan ini.',
    { routes: ['menara_relay'], open: 'guest' }),
  {
    id: 'menara_relay', name: 'Menara Relay Selatan', kind: 'Gateway', addr: '10.9.200.1', online: true, open: 'guest',
    routes: ['industri_hub'], routeAccess: 'admin',
    inspect: 'Menara relay tua di ujung pasar. Satu-satunya jembatan ke jaringan kawasan industri.\nPerlu akses admin untuk membuka rute — ROUTE tidak akan jalan untuk tamu.',
    files: [
      { id: 'relay_catatan', name: 'catatan_relay.txt', minAccess: 'guest',
        content: 'CATATAN RELAY\n\nRute ke kawasan industri hanya dibuka oleh admin menara.\nSemua lalu lintas ke sana melewati ROUTE, bukan sambungan biasa.' }
    ]
  },
  {
    id: 'kelurahan_nas', name: 'NAS Kantor Kelurahan', kind: 'NAS', addr: '10.0.50.2', online: true, open: 'guest',
    inspect: 'Penyimpanan berkas kantor kelurahan. Hanya pengumuman publik yang terbuka.',
    files: [
      { id: 'pengumuman_lurah', name: 'pengumuman_kelurahan.txt', minAccess: 'guest',
        content: 'PENGUMUMAN KELURAHAN\n\nLayanan KTP: Senin–Kamis pukul 08.00–14.00.\nRapat warga: Jumat malam di balai.\nLaporan gangguan jaringan: datangi Pak Hadi.' }
    ]
  },
  {
    id: 'pos_satpam', name: 'Pos Satpam Alun-Alun', kind: 'Workstation', addr: '10.0.51.3', online: true, open: 'guest',
    inspect: 'PC jaga satpam alun-alun. Hanya buku jaga dasar yang terbuka.',
    files: [
      { id: 'buku_jaga', name: 'buku_jaga.txt', minAccess: 'guest',
        content: 'BUKU JAGA\n\n06.00 patroli pagi, aman.\n13.00 pedagang minta pindah lapak, ditolak.\n22.00 lampu taman mati tiga titik.' }
    ]
  },
  {
    id: 'gate_tol', name: 'Gerbang Tol Utara', kind: 'Gateway', addr: '10.20.15.1', online: true, open: 'guest',
    inspect: 'Panel monitor gerbang tol. Hanya statistik lalu lintas yang terbuka untuk tamu.',
    files: [
      { id: 'statistik_tol', name: 'statistik_tol.txt', minAccess: 'guest',
        content: 'STATISTIK GERBANG\n\nPagi 1.240 kendaraan · Siang 880 · Malam 410\nGardu 3 sering macet karena sensor kotor.' }
    ]
  },
  // ===== Tengah =====
  hub('tengah_hub', 'Hotspot Alun-Alun', '10.0.255.1', 'tengah',
    'Hotspot publik alun-alun. Pusat jaringan Kota Lama.\nBanyak perangkat warga dan kota tersambung di sini.'),
  {
    id: 'halte_info', name: 'Panel Info Halte', kind: 'Gateway', addr: '10.0.30.1', online: true, open: 'guest',
    inspect: 'Layar informasi halte bus dan papan pengumuman digital.\nPetugas sering menempel catatan di sini.',
    files: [
      { id: 'jadwal_bus', name: 'jadwal_bus.txt', minAccess: 'guest',
        content: 'JADWAL BUS KOTA\n\nKoridor 1  05.00 – 22.00  tiap 10 menit\nKoridor 2  06.00 – 21.00  tiap 15 menit\nKoridor 3  libur hari Minggu' }
    ]
  },
  {
    id: 'kios_tiket', name: 'Kios Tiket Kereta', kind: 'Workstation', addr: '10.0.31.2', online: true, open: 'guest',
    inspect: 'Kios penjualan tiket kereta lokal. Hanya menampilkan jadwal untuk tamu.',
    files: [
      { id: 'tarif', name: 'tarif_kereta.txt', minAccess: 'guest', content: 'TARIF KERETA LOKAL\n\nEkonomi 4k · Bisnis 9k · Eksekutif 15k\nAnak di bawah 5 tahun gratis.' }
    ]
  },
  {
    id: 'isp_core', name: 'Inti ISP Lokal', kind: 'Server', addr: '10.255.0.1', online: true, open: 'guest',
    inspect: 'Router inti penyedia internet lokal — pintu masuk rigmu ke jaringan kota.\nDari sini kamu bisa SCAN untuk menemukan hotspot tiap distrik.',
    files: [
      { id: 'isp_peta', name: 'peta_backbone.txt', minAccess: 'guest',
        content: 'BACKBONE KOTA\n\n            ┌─ Terminal Utara\n[INTI ISP] ──┼─ Alun-Alun ── (Utara, Barat, Timur)\n            ├─ Kampus Barat\n            ├─ Pelabuhan Timur\n            └─ Pasar Selatan\n\nMulai dari sini: SCAN lalu CONNECT ke hotspot distrik.' }
    ]
  },

  // ===== Utara =====
  hub('utara_hub', 'Hotspot Terminal Utara', '10.20.255.1', 'utara',
    'Hotspot terminal bus antarkota. Ramai di pagi hari.\nDi dekatnya ada gedung parkir dan pengendali lampu lalu lintas.'),
  {
    id: 'lampu_lalin', name: 'Pengendali Lampu Lalin', kind: 'Server', addr: '10.20.8.5', online: true, open: 'guest',
    inspect: 'Pengendali lampu lalu lintas persimpangan terminal.\nTamu hanya bisa membaca jadwal fase lampu.',
    files: [
      { id: 'fase_lampu', name: 'fase_lampu.txt', minAccess: 'guest',
        content: 'FASE LAMPU PERSIMPANGAN\n\nPagi  hijau-utara 45s · hijau-timur 30s\nSiang hijau-utara 30s · hijau-timur 30s\nMalam kuning kedip setelah 23.00' }
    ]
  },
  {
    id: 'dishub_nas', name: 'Arsip Dishub', kind: 'NAS', addr: '10.20.9.2', online: true, open: 'guest',
    inspect: 'NAS arsip dinas perhubungan. Hanya dokumen publik yang terbuka.',
    files: [
      { id: 'perda_parkir', name: 'perda_parkir.txt', minAccess: 'guest',
        content: 'PERATURAN PARKIR\n\nData kendaraan dilarang dikumpulkan tanpa persetujuan pemilik.\nPelanggaran dikenai denda administratif.' }
    ]
  },

  // ===== Barat =====
  hub('barat_hub', 'Hotspot Kampus Barat', '172.16.255.1', 'barat',
    'Hotspot kampus. Mahasiswa bergadang di sini.\nLab arsip dan perpustakaan ada di jaringan yang sama.'),
  {
    id: 'perpus_nas', name: 'NAS Perpustakaan', kind: 'NAS', addr: '172.16.5.9', online: true, open: 'guest',
    inspect: 'Katalog dan arsip digital perpustakaan kampus.',
    files: [
      { id: 'katalog', name: 'katalog_baru.txt', minAccess: 'guest',
        content: 'KATALOG BARU\n\n- Sejarah Jaringan Kota (2 eksemplar)\n- Dasar-Dasar Keamanan Informasi\n- Arsitektur Gedung Tua Surabaya' }
    ]
  },
  {
    id: 'kampus_ws', name: 'PC Lab Komputer', kind: 'Workstation', addr: '172.16.6.14', online: true, open: 'guest',
    inspect: 'Komputer lab untuk praktikum. Dipakai bergantian.',
    files: [
      { id: 'tugas', name: 'tugas_praktikum.txt', minAccess: 'guest',
        content: 'PRAKTIKUM 7\n\nBuat peta jaringan sederhana dari tiga perangkat.\nCatat alamat, jenis, dan siapa yang terhubung ke siapa.' }
    ]
  },

  // ===== Timur =====
  hub('timur_hub', 'Hotspot Pelabuhan Timur', '10.40.255.1', 'timur',
    'Hotspot dermaga. Nelayan dan pedagang sama-sama memakainya.\nRadio komunitas, klinik, dan sekolah berbagi jaringan ini.'),
  {
    id: 'klinik_ws', name: 'PC Klinik Pratama', kind: 'Workstation', addr: '10.40.6.3', online: true, open: 'guest',
    inspect: 'Komputer pendaftaran klinik. Data pasien tidak disimpan di sini.',
    files: [
      { id: 'jadwal_dokter', name: 'jadwal_dokter.txt', minAccess: 'guest',
        content: 'JADWAL DOKTER\n\nSenin–Rabu  dr. Wulan\nKamis–Sabtu dr. Hadi\nMinggu tutup, hanya IGD.' }
    ]
  },

  // ===== Selatan =====
  hub('selatan_hub', 'Hotspot Pasar Selatan', '10.9.255.1', 'selatan',
    'Hotspot pasar induk. Pedagang memakainya untuk kasir digital.\nBursa kripto kecil beroperasi di gang belakang.'),
  {
    id: 'pasar_pos', name: 'Kasir Pasar Induk', kind: 'Workstation', addr: '10.9.12.4', online: true, open: 'guest',
    inspect: 'Kasir bersama pedagang pasar induk.',
    files: [
      { id: 'harga_pasar', name: 'harga_pasar.txt', minAccess: 'guest',
        content: 'HARGA HARI INI\n\nBeras 14k/kg · Telur 28k/kg\nCabai 45k/kg · Bawang 38k/kg' }
    ]
  },
  {
    id: 'gudang_nas', name: 'NAS Gudang Pasar', kind: 'NAS', addr: '10.9.13.6', online: true, open: 'guest',
    inspect: 'Penyimpanan data stok gudang pasar.',
    files: [
      { id: 'stok', name: 'stok_gudang.txt', minAccess: 'guest',
        content: 'STOK GUDANG\n\nBeras 1.200 kg · Minyak 340 L\nGula 410 kg · Tepung 220 kg' }
    ]
  }
];

// Undirected links between generic nodes and into mission entry nodes.
// (Mission-internal links stay as authored, so puzzles can't be bypassed.)
export const EDGES = [
  // backbone: your rig dials into the ISP core, which feeds every district hotspot
  ['isp_core', 'tengah_hub'], ['isp_core', 'utara_hub'], ['isp_core', 'barat_hub'], ['isp_core', 'timur_hub'], ['isp_core', 'selatan_hub'],
  // shortcuts between neighbouring districts
  ['tengah_hub', 'utara_hub'], ['tengah_hub', 'barat_hub'], ['tengah_hub', 'timur_hub'],
  // Tengah
  ['tengah_hub', 'router'], ['tengah_hub', 'warung_pos'], ['tengah_hub', 'halte_info'], ['tengah_hub', 'kios_tiket'],
  ['halte_info', 'kios_tiket'],
  // Utara
  ['utara_hub', 'gw'], ['utara_hub', 'lampu_lalin'], ['utara_hub', 'dishub_nas'], ['lampu_lalin', 'halte_info'],
  // Barat
  ['barat_hub', 'gateway'], ['barat_hub', 'perpus_nas'], ['barat_hub', 'kampus_ws'], ['perpus_nas', 'kampus_ws'],
  // Timur
  ['timur_hub', 'radio_server'], ['timur_hub', 'klinik_ws'], ['timur_hub', 'sekolah_nas'], ['timur_hub', 'balai_printer'],
  ['klinik_ws', 'sekolah_nas'],
  // Selatan
  ['tengah_hub', 'kelurahan_nas'], ['tengah_hub', 'pos_satpam'], ['utara_hub', 'gate_tol'], ['selatan_hub', 'menara_relay'],
  ['selatan_hub', 'edge'], ['selatan_hub', 'pasar_pos'], ['selatan_hub', 'gudang_nas'], ['pasar_pos', 'gudang_nas']
];

// Hotspots a rig scan can pick up from the street.
export const HUBS = ['tengah_hub', 'utara_hub', 'barat_hub', 'timur_hub', 'selatan_hub', 'industri_hub'];
// Balai Printer is a plain city node that missions can patch.
export const EXTRA_NODES = [
  {
    id: 'balai_printer', name: 'Printer Balai Desa', kind: 'Printer', addr: '10.40.9.7', online: true, open: 'guest',
    inspect: 'Printer umum balai desa. Banyak pengumuman lama menumpuk di antriannya.',
    files: [
      { id: 'pengumuman_balai', name: 'pengumuman_balai.txt', minAccess: 'guest',
        content: 'PENGUMUMAN BALAI\n\nKerja bakti Minggu pagi.\nPendaftaran ulang siswa baru dibuka bulan depan.\nRadio komunitas siaran tiap malam pukul 19.00.' }
    ]
  }
];
