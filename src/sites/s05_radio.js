// "Siaran Gelap" — CRACK a studio login (hint on the same node), pull the
// evidence log, then switch the transmitter off via CONTROL on another node.
const hasLocal = (run, id) => run.local.some((f) => f.id === id);

export default {
  id: 's05',
  code: 'R-05',
  title: 'Siaran Gelap',
  client: 'Jurnalis lepas "Rani"',
  reward: 300,
  brief:
    'Radio komunitas Pelabuhan Timur tiba-tiba menyiarkan iklan investasi palsu tiap malam. ' +
    'Ambil log siaran sebagai bukti dari server studio, lalu matikan pemancarnya.',
  entry: ['radio_server'],
  world: {
    devices: {
      radio_server: {
        id: 'radio_server', name: 'Server Studio Radio', kind: 'Server', addr: '10.40.5.10', online: true, open: 'guest', links: ['pemancar'],
        inspect: 'Server studio Radio Komunitas 96.5. Tamu hanya melihat catatan operator.\nAkses admin dikunci sandi studio.',
        crack: { level: 'admin', answer: 'RADIO965', options: ['radio123', 'RADIO965', 'admin', 'siaran2024'], onSuccess: { clues: ['studio_pass'] } },
        files: [
          { id: 'catatan_operator', name: 'catatan_operator.txt', minAccess: 'guest',
            content: 'CATATAN OPERATOR\n\nSandi studio = nama stasiun + frekuensi tanpa titik, huruf besar.\nStasiun kita: RADIO. Frekuensi: 96.5.\nPemancar ada di menara belakang (akses user cukup untuk daya).',
            onRead: { clues: ['studio_hint'] } },
          { id: 'log_siaran', name: 'log_siaran.txt', minAccess: 'admin', keep: true,
            content:
              'LOG SIARAN\n\n19:00 siaran normal\n23:14 sumber audio berganti -> stream-iklan.example\n' +
              '23:15 iklan "investasi cepat" mulai mengudara\n23:40 login tak dikenal dari luar jaringan',
            onDownload: { flags: ['got_log'] } }
        ]
      },
      pemancar: {
        id: 'pemancar', name: 'Pemancar FM', kind: 'Workstation', addr: '10.40.5.20', online: true, open: 'user',
        inspect: 'Pemancar FM komunitas di menara. Daya bisa diatur dari panel dengan akses user.',
        controls: [
          { id: 'tx', label: 'Daya Pemancar', minAccess: 'user', states: ['AKTIF', 'MATI'], state: 'AKTIF',
            on: { MATI: { flags: ['tx_off'], log: 'Pemancar mati. Siaran gelap berhenti.' } } }
        ]
      }
    }
  },
  creds: {},
  clues: {
    studio_hint: { title: 'Pola sandi studio', text: 'Sandi studio = RADIO + frekuensi tanpa titik.' },
    studio_pass: { title: 'Akses studio', text: 'Sandi RADIO965 cocok. Server studio terbuka.' }
  },
  patches: {
    timur_hub: {
      files: [
        { id: 'keluhan_radio', name: 'keluhan_warga.txt', minAccess: 'guest',
          content: 'KELUHAN WARGA\n\nRadio komunitas malam-malam menyiarkan ajakan "investasi cepat kaya".\nSudah ada yang kehilangan tabungan. Tolong ditindak.' }
      ]
    }
  },
  objectives: [
    { id: 'studio', text: 'Masuk ke server studio sebagai admin', done: (r) => r.devices.radio_server.access === 'admin' },
    { id: 'log', text: 'Salin log_siaran.txt ke perangkatmu', main: true, done: (r) => hasLocal(r, 'log_siaran') },
    { id: 'tx', text: '(Bonus) Matikan pemancar', bonus: true, done: (r) => r.flags.includes('tx_off') }
  ],
  hints: [
    { when: (r) => !r.read.includes('catatan_operator'), text: 'CONNECT ke Server Studio Radio dan baca catatan_operator.txt.' },
    { when: (r) => r.devices.radio_server.access !== 'admin', text: 'CRACK server studio dengan sandi RADIO965.' },
    { when: (r) => !hasLocal(r, 'log_siaran'), text: 'Buka File Server dan DOWNLOAD log_siaran.txt.' },
    { when: (r) => !r.flags.includes('tx_off'), text: 'Bonus: SCAN dari server, CONNECT ke Pemancar FM, lalu CONTROL → Daya → MATI.' }
  ],
  endings: [
    { id: 'siar', label: 'Serahkan log ke Rani', reward: 300,
      requires: (r) => hasLocal(r, 'log_siaran'),
      text: 'Rani menerbitkan log itu. Penipu siaran diburu dan radio kembali normal. Warga Pelabuhan Timur berterima kasih.' }
  ]
};
