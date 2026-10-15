// "Blueprint Asli" — the two-path mission from the design doc.
// Path A: repair the dead archive server (control systems).
// Path B: recover the blueprint from the corrupt backup (data investigation).
// Bonus investigation: COMPARE proves the newest blueprint was tampered with.
const hasLocal = (run, id) => run.local.some((f) => f.id === id);

export default {
  id: 's01',
  code: 'A-07',
  title: 'Blueprint Asli',
  client: 'Kontak anonim "Arsitek"',
  reward: 600,
  brief:
    'Ambil blueprint proyek "Arsip 07". Server arsip mati, dan satu-satunya salinan ada di backup yang rusak. ' +
    'Ada dua jalan: hidupkan kembali server arsip, atau selamatkan file dari backup. Satu jalan cukup.',
  entry: ['gateway'],
  world: {
    devices: {
      gateway: {
        id: 'gateway', name: 'Gateway Lab', kind: 'Gateway', addr: '172.16.0.1', x: 50, y: 82,
        online: true, open: 'guest', links: ['teknisi', 'archive', 'backup'],
        inspect: 'Pintu masuk jaringan lab.\nAkses tamu melihat tiga perangkat: komputer teknisi, server arsip (offline), dan penyimpanan cadangan.',
        files: [
          { id: 'memo', name: 'memo_internal.txt', minAccess: 'guest',
            content:
              'MEMO — Tim Lab\n\nServer arsip (ARC) tumbang sejak update konfigurasi kemarin.\n' +
              'Pak Dharma (teknisi) sudah diminta memperbaiki, catatannya ada di komputernya.\n' +
              'Kalau mendesak, ambil saja dari BACKUP — tapi file terakhir katanya korup.\n\n' +
              'Akun teknisi dikunci sandi. Petunjuk sandi: nama proyek + tahun. Lihat papan proyek.',
            onRead: { clues: ['hint_pass'] } },
          { id: 'board', name: 'papan_proyek.txt', minAccess: 'guest',
            content: 'PAPAN PROYEK AKTIF\n\n- Arsip 07  (mulai 2024)\n- Kanvas  (mulai 2023)\n- Mercusuar (arsip)\n\nKode proyek utama: ARSIP07-2024',
            onRead: { clues: ['proj_code'] } }
        ]
      },
      teknisi: {
        id: 'teknisi', name: 'Komputer Teknisi', kind: 'Workstation', addr: '172.16.0.12', x: 20, y: 45,
        online: true,
        inspect: 'Workstation Pak Dharma.\nTerkunci. CRACK dengan KeyLoom bila kamu sudah tahu pola sandinya.',
        crack: {
          level: 'user', answer: 'ARSIP07-2024',
          options: ['dharma123', 'ARSIP07-2024', 'kanvas2023', 'admin'],
          onSuccess: { clues: ['tek_notes'] }
        },
        files: [
          { id: 'catatan_gangguan', name: 'catatan_gangguan.txt', minAccess: 'user',
            content:
              'CATATAN GANGGUAN — ARC\n\nSetelah update, service "arcd" gagal start.\n' +
              'Dugaan: mode penyimpanan kefault ke "ro" (read-only) dan sumber data salah folder.\n' +
              'Config lama yang benar:\n  mode = rw\n  sumber = /vol/arsip07\n' +
              'Aku keburu pulang. Tolong kembalikan dua nilai itu lalu START arcd.',
            onRead: { clues: ['arc_fix'] } },
          { id: 'konfig_lama', name: 'arcd.conf.bak', minAccess: 'user', compare: 'arcconf',
            content: 'mode = rw\nsumber = /vol/arsip07\nport = 9090' }
        ]
      },
      archive: {
        id: 'archive', name: 'Server Arsip (ARC)', kind: 'Server', addr: '172.16.0.20', x: 80, y: 45,
        online: true, open: 'user', statusText: 'LAYANAN MATI',
        inspect: 'Server arsip utama. Mesin hidup, tapi service "arcd" mati sejak update.\nBlueprint tidak bisa dibaca sampai arcd diperbaiki dan dinyalakan.\nAkses user terbuka untuk maintenance.',
        files: [
          { id: 'blueprint_asli', name: 'blueprint_arsip07.cad', minAccess: 'user', keep: true, compare: 'blueprint',
            requiresProc: 'arcd',
            content: 'BLUEPRINT ARSIP 07 — v FINAL (asli)\n\nRuang server: lantai 2, sisi timur.\nDaya: jalur A utama, jalur B cadangan.\nPintu masuk: koridor utara.\nCatatan: denah ini sah dan ditandatangani Arsitek.',
            onRead: { flags: ['seen_original'] } }
        ],
        procs: [
          {
            id: 'arcd', name: 'arcd', desc: 'Service arsip. Mati karena konfigurasi salah.', running: false, control: 'user',
            failText: 'arcd gagal start: konfigurasi ditolak. Periksa mode dan sumber data.',
            config: {
              mode: { label: 'mode', value: 'ro', correct: 'rw', options: ['ro', 'rw'] },
              sumber: { label: 'sumber', value: '/vol/temp', correct: '/vol/arsip07', options: ['/vol/temp', '/vol/arsip07', '/vol/kanvas'] }
            },
            onStart: { online: ['archive'], log: 'Server arsip kembali online. Blueprint bisa dibaca.' }
          }
        ]
      },
      backup: {
        id: 'backup', name: 'Penyimpanan Cadangan', kind: 'NAS', addr: '172.16.0.30', x: 50, y: 20,
        online: true, open: 'user',
        inspect: 'NAS cadangan. Akses user terbuka.\nSalinan terakhir blueprint rusak — pulihkan dengan Mender, lalu buka kuncinya dengan Cipher.',
        files: [
          { id: 'manifest', name: 'manifest.txt', minAccess: 'user',
            content:
              'MANIFEST BACKUP\n\n- blueprint_arsip07.cad.enc  (TERENKRIPSI, korup)\n- kunci terpecah jadi 2 bagian:\n' +
              '    bagian A ada di file ini -> "ARS"\n    bagian B = kode proyek dari papan proyek, tanpa tanda "-"\n' +
              '  Gabungkan: bagian A + bagian B.',
            onRead: { clues: ['key_hint'] } },
          { id: 'blueprint_backup', name: 'blueprint_arsip07.cad.enc', minAccess: 'user', keep: true, corrupt: true, compare: 'blueprint',
            recoverTo: {
              encrypted: {
                key: 'ARSARSIP072024',
                keyOptions: ['ARSARSIP072024', 'ARS2024', 'ARSIP07', 'ARSKANVAS2023'],
                result: {
                  content: 'BLUEPRINT ARSIP 07 — v BACKUP (sebelum update)\n\nRuang server: lantai 2, sisi timur.\nDaya: jalur A utama, jalur B cadangan.\nPintu masuk: koridor SELATAN.\nCatatan: versi backup, lebih tua dari yang di server.'
                },
                onOpen: { flags: ['seen_backup'] }
              }
            },
            content: '[data rusak]'
          }
        ]
      }
    }
  },
  creds: {},
  clues: {
    hint_pass: { title: 'Pola sandi teknisi', text: 'Sandi teknisi = nama proyek + tahun (lihat papan proyek).' },
    proj_code: { title: 'Kode proyek', text: 'Kode proyek utama: ARSIP07-2024.' },
    tek_notes: { title: 'Akses komputer teknisi', text: 'Komputer teknisi terbuka. Baca catatan gangguannya.' },
    arc_fix: { title: 'Perbaikan arcd', text: 'arcd butuh mode = rw dan sumber = /vol/arsip07, lalu START.' },
    key_hint: { title: 'Kunci backup', text: 'Kunci = "ARS" + kode proyek tanpa tanda "-" (ARSIP072024).' }
  },
  diffs: {
    'blueprint_asli|blueprint_backup': {
      text:
        'PERBANDINGAN BLUEPRINT\n\nServer (asli):   Pintu masuk = koridor UTARA\nBackup (lama):   Pintu masuk = koridor SELATAN\n\n' +
        'Versi di server diubah SETELAH backup dibuat. Pintu masuk dipindah diam-diam.\nAda yang memanipulasi denah terbaru.',
      onRead: { flags: ['found_tamper'], clues: ['tamper'] }
    }
  },
  objectives: [
    { id: 'blueprint', text: 'Dapatkan blueprint Arsip 07 (lewat jalur mana pun)', main: true,
      done: (r) => (hasLocal(r, 'blueprint_asli') || (hasLocal(r, 'blueprint_backup') && !r.local.find((f) => f.id === 'blueprint_backup')?.encrypted)) },
    { id: 'tamper', text: '(Bonus) Buktikan blueprint terbaru dimanipulasi', bonus: true,
      done: (r) => r.flags.includes('found_tamper') }
  ],
  hints: [
    { when: (r) => !r.read.includes('memo'), text: 'CONNECT ke Gateway Lab dan baca memo_internal serta papan_proyek.' },
    { when: (r) => !r.clues.includes('proj_code'), text: 'Baca papan_proyek.txt untuk kode proyek.' },
    { when: (r, p) => !p.tools.cipher, text: 'Jalur backup butuh tool Cipher. Selesaikan kontrak K-00 dulu untuk membukanya, atau pakai jalur server.' },
    { when: (r) => !hasLocal(r, 'blueprint_asli') && !hasLocal(r, 'blueprint_backup'),
      text: 'Jalur A (server): CRACK komputer teknisi dengan ARSIP07-2024, baca catatan, perbaiki config arcd (mode=rw, sumber=/vol/arsip07), START, lalu CONNECT ke server. Jalur B (backup): RECOVER file .enc lalu DECRYPT.' },
    { when: (r) => !r.flags.includes('found_tamper'),
      text: 'Bonus: dapatkan KEDUA versi blueprint (server + backup), lalu COMPARE keduanya.' }
  ],
  endings: [
    {
      id: 'handover', label: 'Serahkan blueprint ke Arsitek', reward: 600,
      requires: (r) => hasLocal(r, 'blueprint_asli') || (hasLocal(r, 'blueprint_backup') && !r.local.find((f) => f.id === 'blueprint_backup')?.encrypted),
      text: 'Arsitek menerima blueprint. "Kerja bersih." Kamu dibayar penuh dan membuka Skeleton Key.'
    },
    {
      id: 'expose', label: 'Ungkap manipulasi denah', reward: 850,
      requires: (r) => r.flags.includes('found_tamper'),
      text: 'Kamu serahkan blueprint sekaligus bukti pintu masuk dipindah diam-diam. Arsitek terdiam. "Ini... lebih penting dari yang kukira." Bayaran bonus masuk, dan Skeleton Key terbuka.'
    }
  ]
};
