// "Brankas Dingin" — teaches CRACK + DECRYPT + COMPARE. Fictional exchange.
const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const opened = (r) => { const f = r.local.find((x) => x.id === 'ledger'); return !!f && !f.encrypted; };

export default {
  id: 's03',
  code: 'V-03',
  title: 'Brankas Dingin',
  client: 'Kolektif "Saldo Balik"',
  reward: 520,
  brief:
    'Sebuah bursa kripto gadungan membekukan dana nasabah lalu memalsukan buku besarnya. ' +
    'Buka buku besar asli (ledger) dan buktikan angkanya dipalsukan.',
  entry: ['edge'],
  world: {
    devices: {
      edge: {
        id: 'edge', name: 'Edge Bursa', kind: 'Gateway', addr: '10.9.0.1', x: 50, y: 80,
        online: true, open: 'guest', links: ['ops', 'cold'],
        inspect: 'Gerbang bursa.\nTerlihat workstation operator dan simpanan dingin (cold storage).',
        files: [
          { id: 'press', name: 'siaran_pers.txt', minAccess: 'guest',
            content: 'SIARAN PERS\n\n"Saldo nasabah aman, total 1.000 unit."\nKode rilis internal: RILIS-2025.\n(Admin suka pakai kode rilis sebagai sandi sementara.)',
            onRead: { clues: ['passhint'] } }
        ]
      },
      ops: {
        id: 'ops', name: 'WS Operator', kind: 'Workstation', addr: '10.9.0.7', x: 24, y: 42,
        online: true,
        inspect: 'Workstation operator. Terkunci sandi.\nPetunjuk: admin sering memakai kode rilis sebagai sandi.',
        crack: { level: 'user', answer: 'RILIS-2025', options: ['admin', 'RILIS-2025', 'bursa123', 'saldo2025'],
          onSuccess: { clues: ['keyhint'] } },
        files: [
          { id: 'memo_ops', name: 'memo_ops.txt', minAccess: 'user',
            content: 'MEMO\n\nBuku besar asli ada di cold storage: ledger_asli.enc\nKunci = kata "COLD" + jumlah unit yang BENAR (bukan yang di siaran pers).\nJumlah benar lihat laporan audit: audit.txt.',
            onRead: { clues: ['keyhint'] } },
          { id: 'audit', name: 'audit.txt', minAccess: 'user', compare: 'ledger',
            content: 'AUDIT INTERNAL\n\nTotal unit nasabah terverifikasi: 640 unit.\n(Angka ini beda dari siaran pers 1.000 unit.)',
            onRead: { clues: ['truenum'] } }
        ]
      },
      cold: {
        id: 'cold', name: 'Cold Storage', kind: 'NAS', addr: '10.9.0.20', x: 76, y: 42,
        online: true, open: 'user',
        inspect: 'Simpanan dingin. Berisi ledger_asli.enc (terenkripsi).\nUnduh lalu DECRYPT dengan kunci dari memo operator.',
        files: [
          { id: 'ledger', name: 'ledger_asli.enc', minAccess: 'user', keep: true, compare: 'ledger',
            encrypted: {
              key: 'COLD640',
              keyOptions: ['COLD1000', 'COLD640', 'RILIS640', 'COLD2025'],
              result: { content: 'BUKU BESAR ASLI\n\nTotal unit nasabah: 640 unit.\nSelisih 360 unit dipindah ke dompet internal bursa.\nIni bukti dana nasabah dialihkan.' },
              onOpen: { flags: ['ledger_open'] }
            },
            content: '[terenkripsi]' }
        ]
      }
    }
  },
  creds: {},
  clues: {
    passhint: { title: 'Pola sandi operator', text: 'Admin memakai kode rilis "RILIS-2025" sebagai sandi.' },
    keyhint: { title: 'Kunci ledger', text: 'Kunci = "COLD" + jumlah unit yang BENAR (dari audit).' },
    truenum: { title: 'Angka benar', text: 'Audit: total benar 640 unit (siaran pers bohong 1.000).' }
  },
  diffs: {
    'audit|ledger': {
      text: 'PERBANDINGAN\n\nSiaran pers: 1.000 unit · Audit & ledger asli: 640 unit.\nSelisih 360 unit disembunyikan. Angka dipalsukan.',
      onRead: { flags: ['proven'], clues: ['truenum'] }
    }
  },
  objectives: [
    { id: 'open', text: 'Buka buku besar asli (ledger)', main: true, done: (r) => opened(r) },
    { id: 'prove', text: '(Bonus) Buktikan angka dipalsukan (COMPARE)', bonus: true, done: (r) => r.flags.includes('proven') }
  ],
  hints: [
    { when: (r) => !r.read.includes('press'), text: 'CONNECT ke Edge Bursa, baca siaran_pers.txt.' },
    { when: (r) => r.devices.ops.access !== 'user', text: 'CRACK WS Operator dengan RILIS-2025.' },
    { when: (r) => !r.read.includes('audit'), text: 'Baca memo_ops.txt dan audit.txt di WS Operator.' },
    { when: (r, p) => !p.tools.cipher, text: 'Butuh tool Cipher untuk DECRYPT. Beli di Pasar Gelap (peta, Selatan).' },
    { when: (r) => !opened(r), text: 'CONNECT ke Cold Storage, DOWNLOAD ledger_asli.enc, lalu DECRYPT dengan COLD640.' },
    { when: (r) => !r.flags.includes('proven'), text: 'Bonus: DOWNLOAD audit.txt juga, lalu COMPARE audit vs ledger.' }
  ],
  endings: [
    { id: 'return', label: 'Serahkan bukti ke kolektif', reward: 520, unlockTools: [],
      requires: (r) => opened(r),
      text: 'Kolektif memakai buku besar asli untuk menuntut pengembalian dana. Namamu disegani.' }
  ]
};
