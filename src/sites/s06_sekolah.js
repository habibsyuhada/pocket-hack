// "Arsip Sekolah" — hint on one city node (balai_printer), encrypted file on
// another (sekolah_nas): DECRYPT with a key assembled from the memo.
const hasLocal = (run, id) => run.local.some((f) => f.id === id);
const opened = (r) => { const f = r.local.find((x) => x.id === 'rapor'); return !!f && !f.encrypted; };

export default {
  id: 's06',
  code: 'T-06',
  title: 'Arsip Sekolah',
  client: 'Panitia reuni angkatan 98 (lewat Dimas)',
  reward: 260,
  brief:
    'Panitia reuni butuh daftar nilai angkatan 98 untuk acara kenangan, tapi berkasnya terkunci di NAS sekolah dan pegawai lama sudah pensiun. ' +
    'Cari petunjuk kuncinya di jaringan desa, unduh berkas, lalu buka dengan Cipher.',
  entry: ['sekolah_nas'],
  world: {
    devices: {
      sekolah_nas: {
        id: 'sekolah_nas', name: 'NAS Sekolah', kind: 'NAS', addr: '10.40.8.2', online: true, open: 'guest',
        inspect: 'Penyimpanan arsip sekolah dasar-menengah. Berkas lama ada yang terenkripsi.\nUnduh lalu DECRYPT di perangkatmu (butuh Cipher).',
        files: [
          { id: 'rapor', name: 'rapor_angkatan98.enc', minAccess: 'guest', keep: true,
            encrypted: {
              key: 'SMP98ALUMNI',
              keyOptions: ['SMP98', 'SMP98ALUMNI', 'ALUMNI98', 'SMPALUMNI'],
              result: { content: 'DAFTAR NILAI ANGKATAN 98\n\nWali kelas: Ibu Marni\nPeringkat 1: Wulan · Peringkat 2: Hadi · Peringkat 3: Sari\n"Anak-anak ini kebanggaan sekolah."' },
              onOpen: { flags: ['rapor_open'] }
            },
            content: '[terenkripsi]' }
        ]
      }
    }
  },
  creds: {},
  clues: {
    key_rapor: { title: 'Kunci arsip angkatan 98', text: 'Kunci = singkatan sekolah + 2 digit tahun lulus + ALUMNI → SMP98ALUMNI.' }
  },
  patches: {
    balai_printer: {
      files: [
        { id: 'memo_reuni', name: 'memo_reuni.txt', minAccess: 'guest',
          content:
            'MEMO PANITIA REUNI\n\nBerkas nilai angkatan dikunci pegawai lama dengan pola:\n' +
            'singkatan sekolah (SMP) + dua digit tahun lulus (98) + kata ALUMNI, huruf besar, tanpa spasi.',
          onRead: { clues: ['key_rapor'] } }
      ]
    }
  },
  objectives: [
    { id: 'memo', text: 'Temukan petunjuk kunci arsip', done: (r) => r.clues.includes('key_rapor') },
    { id: 'rapor', text: 'Buka daftar nilai angkatan 98', main: true, done: (r) => opened(r) },
    { id: 'salin', text: '(Bonus) Baca pengumuman balai desa', bonus: true, done: (r) => r.read.includes('pengumuman_balai') }
  ],
  hints: [
    { when: (r) => !r.read.includes('memo_reuni'), text: 'SCAN dari Hotspot Pelabuhan Timur: Printer Balai Desa menyimpan memo_reuni.txt.' },
    { when: (r, p) => !p.tools.cipher, text: 'Butuh tool Cipher untuk DECRYPT. Selesaikan K-00 atau beli di Pasar.' },
    { when: (r) => !hasLocal(r, 'rapor'), text: 'CONNECT ke NAS Sekolah dan DOWNLOAD rapor_angkatan98.enc.' },
    { when: (r) => !opened(r), text: 'Pilih berkas lokal rapor_angkatan98.enc lalu DECRYPT dengan SMP98ALUMNI.' },
    { when: (r) => !r.read.includes('pengumuman_balai'), text: 'Bonus: baca pengumuman_balai.txt di Printer Balai Desa.' }
  ],
  endings: [
    { id: 'reuni', label: 'Serahkan nilai ke panitia', reward: 260,
      requires: (r) => opened(r),
      text: 'Reuni angkatan 98 berjalan hangat. Wulan, Hadi, dan Sari memeluk panitia. Dimas tersenyum: "Aku tahu kamu bisa."' }
  ]
};
