// Contract "Arsip 07": two independent routes to the same goal.
//  A) Fix the archive server: crack the technician PC, compare configs,
//     recover a deleted note, elevate, repair the service, stop the indexer.
//  B) Salvage the backup: use a known flaw on the vault, recover the
//     corrupted archive, download it and deduce the decryption key.
// Optional: compare the original with the public blueprint to expose tampering.
const got = (r) => r.flags.includes('got_blueprint');

const BLUEPRINT_ASLI =
  'BLUEPRINT — PROYEK SENTOSA (rev. 2, disetujui)\n\n' +
  'Jembatan pejalan kaki, bentang 42 m\n' +
  'Sensor beban : SL-20 (x12)\n' +
  'Baut angkur  : M24 kelas 10.9\n' +
  'Disetujui    : Ir. Mara Wiradana';

export default {
  id: 'm07',
  code: 'K-07',
  title: 'Arsip 07',
  client: 'Ir. Mara Wiradana, Kirana Teknik',
  reward: 600,
  requires: 'm00',
  brief:
    'Server arsip ARC-07 milik Kirana Teknik mati setelah pembaruan, dan salinan backup-nya rusak. ' +
    'Mara butuh blueprint ASLI Proyek Sentosa. Ia curiga versi terbaru sudah diubah seseorang.',
  entry: ['gw'],
  world: {
    devices: {
      gw: {
        id: 'gw', name: 'Gateway Kirana', kind: 'Gateway', addr: '172.16.0.1', x: 50, y: 82,
        online: true, open: 'guest', links: ['tech', 'vault'],
        inspect: 'Portal publik Kirana Teknik.\nTamu bisa membaca pengumuman dan dokumen publik.',
        files: [
          {
            id: 'pengumuman', name: 'pengumuman.txt', minAccess: 'guest',
            content:
              'PENGUMUMAN INTERNAL\n\n1. Server arsip ARC-07 offline sejak pembaruan Senin. Teknisi: Rudi.\n' +
              '2. Backup harian dipindah ke VAULT-B.\n3. Kebijakan sandi baru: nama hewan peliharaan + tahun bergabung.\n' +
              '4. Selamat! Kickoff Proyek Sentosa berjalan lancar tanggal 4 Desember.',
            onRead: { clues: ['pw_policy', 'kickoff'] }
          },
          {
            id: 'direktori', name: 'direktori_staf.txt', minAccess: 'guest',
            content:
              'DIREKTORI STAF\n\nMara Wiradana  — kepala proyek   — bergabung 2012\n' +
              'Rudi Wijaya    — teknisi        — bergabung 2017 — "foto profil: kucing oranye, Mochi"\n' +
              'Dimas Hendra   — pengadaan      — bergabung 2021',
            onRead: { clues: ['rudi'] }
          },
          {
            id: 'bp_pub', name: 'blueprint_terbaru.pdf', minAccess: 'guest', compare: 'bp',
            content:
              'BLUEPRINT — PROYEK SENTOSA (rev. 3)\n\nJembatan pejalan kaki, bentang 42 m\n' +
              'Sensor beban : SL-05 (x12)\nBaut angkur  : M24 kelas 8.8\nDiunggah     : d.hendra'
          }
        ]
      },
      tech: {
        id: 'tech', name: 'PC Teknisi', kind: 'Workstation', addr: '172.16.0.23', x: 22, y: 50,
        online: true, links: ['arc07'],
        inspect: 'Workstation milik Rudi Wijaya.\nLogin user: rwijaya.\nTidak ada akses tamu.',
        crack: {
          level: 'user', account: 'rwijaya',
          options: ['rudi2017', 'mochi2019', 'mochi2017', 'oranye2017', 'kirana2012'],
          answer: 'mochi2017',
          onSuccess: { creds: ['rwijaya'] }
        },
        files: [
          {
            id: 'catatan', name: 'catatan_gangguan.txt', minAccess: 'user',
            content:
              'Senin: setelah pembaruan, arsipd di ARC-07 tidak mau menyala.\nKayaknya file config ikut tertimpa. ' +
              'Config lama masih kusimpan di sini.\n\nNB: akun rwijaya sama di semua mesin, biar gampang.\n' +
              'NB2: catatan akses admin ARC-07 sudah kuhapus, takut ketahuan bos.',
            onRead: { clues: ['same_pw', 'deleted_note'] }
          },
          {
            id: 'cfg_old', name: 'arc07_lama.cfg', minAccess: 'user', compare: 'cfg',
            content: '# arsipd — config lama (bekerja)\nstorage = /mnt/arsip\nport    = 9090'
          },
          {
            id: 'cfg_new', name: 'arc07_baru.cfg', minAccess: 'user', compare: 'cfg',
            content: '# arsipd — config setelah pembaruan\nstorage = /mnt/arsip_new\nport    = 8080'
          },
          {
            id: 'todo', name: 'todo.txt', minAccess: 'user', deleted: true,
            content: 'TODO\n[x] tambahkan rwijaya ke grup "maint" di ARC-07 (bisa naik ke admin)\n[ ] bilang ke Pak Dimas soal revisi blueprint??',
            onRead: { flags: ['maint_group'], clues: ['maint'] }
          }
        ]
      },
      arc07: {
        id: 'arc07', name: 'ARC-07', kind: