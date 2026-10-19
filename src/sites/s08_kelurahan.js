// "Printer Kelurahan" — walk through the kelurahan NAS to the office printer, then use
// RECOVER (Mender) on deleted/corrupt files. Two look-alike files: only the FINAL one is right.
import { N, offer } from '../game/dlg.js';

const loc = (run, id) => run.local.find((f) => f.id === id);
const okLocal = (r, id) => { const f = loc(r, id); return !!f && !f.deleted && !f.corrupt; };

export default {
  id: 's08',
  code: 'K-08',
  title: 'Printer Kelurahan',
  client: 'Pak Hadi, Lurah Kelurahan',
  reward: 170,
  brief:
    'Printer kantor kelurahan macet saat mencetak undangan rapat warga, lalu berkasnya hilang dari antrean. Rapat tinggal dua hari lagi. ' +
    'Lewati NAS Kantor Kelurahan, cari tempat printer menyimpan salinan spool, pulihkan undangan versi final dengan Mender (RECOVER), lalu DOWNLOAD.',
  entry: ['s08_printer'],
  world: {
    devices: {
      s08_printer: {
        id: 's08_printer', name: 'Printer Loket Kelurahan', kind: 'Printer', addr: '10.0.50.17', online: true, open: 'guest',
        inspect:
          'Printer loket kantor kelurahan, tersambung ke jaringan kantor lewat NAS.\n' +
          'Antrean cetak kosong — berkas hilang saat macet. Printer ini menyimpan salinan sementara di spool.',
        files: [
          { id: 's08_petugas', name: 'catatan_petugas.txt', minAccess: 'guest',
            content:
              'CATATAN PETUGAS LOKET\n\n' +
              '- Selasa 10.15: printer macet, undangan rapat "hilang" dari antrean.\n' +
              '- Jangan panik. Printer lama menyimpan salinan di unit spool (cek perangkat sebelah).\n' +
              '- Ada dua undangan: draf awal dan versi FINAL (yang dicetak untuk warga). Ambil yang final saja!',
            onRead: { clues: ['s08_spool'], reveal: ['s08_spool'] } }
        ]
      },
      s08_spool: {
        id: 's08_spool', name: 'Spool Berkas Kelurahan', kind: 'NAS', addr: '10.0.50.18', online: true, open: 'guest',
        inspect: 'Unit penyimpan sementara printer. Berkas yang terhapus atau rusak bisa dipulihkan dengan Mender (RECOVER), lalu diambil dengan DOWNLOAD.',
        files: [
          { id: 's08_draf', name: 'undangan_draf.docx', minAccess: 'guest', deleted: true,
            recoverTo: {
              content: 'UNDANGAN RAPAT WARGA (DRAF)\n\nHari: Kamis, pukul 19.00\nTempat: Balai Kelurahan\nAcara: belum final — tanggal masih dicek.\n\n(Catatan Pak Hadi: JANGAN dicetak, ini hanya coretan.)'
            },
            content: '[terhapus]' },
          { id: 's08_final', name: 'undangan_final.docx', minAccess: 'guest', deleted: true, keep: true,
            recoverTo: {
              content: 'UNDANGAN RAPAT WARGA\n\nHari: Jumat, pukul 19.30\nTempat: Balai Kelurahan\nAcara: pembagian jadwal ronda dan kerja bakti.\nMohon hadir, bawa tikar masing-masing.\n\nHormat kami, Pak Hadi, Lurah.'
            },
            onDownload: { flags: ['s08_final_ambil'] },
            content: '[terhapus]' },
          { id: 's08_daftar', name: 'daftar_hadir_rt.xlsx', minAccess: 'guest', corrupt: true,
            recoverTo: {
              content: 'DAFTAR HADIR RAPAT RT\n\nRT 01: 24 orang · RT 02: 31 orang · RT 03: 18 orang\nTotal 73 orang. Konsumsi disiapkan untuk 80 porsi.'
            },
            content: '[data rusak]' }
        ]
      }
    }
  },
  creds: {},
  clues: {
    s08_spool: { title: 'Salinan spool printer', text: 'Printer loket menyimpan salinan berkas di unit Spool Berkas Kelurahan, tersambung dari printer.' }
  },
  patches: {
    kelurahan_nas: {
      files: [
        { id: 's08_info_it', name: 'catatan_jaringan_kantor.txt', minAccess: 'guest',
          content:
            'CATATAN JARINGAN KANTOR\n\nPrinter loket dipindah ke jaringan kantor minggu lalu.\n' +
            'Untuk mencapainya: dari NAS ini, sambung ke Printer Loket Kelurahan.\n' +
            'Masalah cetak? Tanya Pak Hadi dulu, jangan ubah pengaturan sendiri.',
          onRead: { reveal: ['s08_printer'] } }
      ]
    }
  },
  edges: [['kelurahan_nas', 's08_printer'], ['s08_printer', 's08_spool']],
  place: { s08_printer: [4, 4, 'tengah'], s08_spool: [5, 4, 'tengah'] },
  objectives: [
    { id: 'jalan', text: 'Sambung ke Printer Loket lewat NAS Kantor Kelurahan', done: (r) => r.devices.s08_printer.access !== 'none' },
    { id: 'spool', text: 'Temukan unit Spool Berkas Kelurahan', done: (r) => r.devices.s08_spool.access !== 'none' },
    { id: 'final', text: 'Pulihkan dan salin undangan_final.docx', main: true, done: (r) => okLocal(r, 's08_final') },
    { id: 'daftar', text: '(Bonus) Pulihkan dan salin daftar_hadir_rt.xlsx', bonus: true, done: (r) => okLocal(r, 's08_daftar') }
  ],
  hints: [
    { when: (r) => !r.devices.s08_printer.discovered || r.devices.s08_printer.access === 'none', text: 'Dari Hotspot Alun-Alun, CONNECT ke NAS Kantor Kelurahan dan baca catatan jaringan kantor. Printer Loket tersambung dari sana. Berkas yang hilang dipulihkan dengan Mender (RECOVER) — sudah ada di rigmu.' },
    { when: (r) => r.devices.s08_spool.access === 'none', text: 'Baca catatan_petugas.txt di Printer Loket, lalu SCAN dan CONNECT ke Spool Berkas Kelurahan.' },
    { when: (r) => { const f = r.devices.s08_spool.files.find((x) => x.id === 's08_final'); return f.deleted; }, text: 'Berkas terhapus tidak bisa diunduh. Pilih undangan_final.docx (bukan draf!) lalu RECOVER.' },
    { when: (r) => !okLocal(r, 's08_final'), text: 'Sekarang DOWNLOAD undangan_final.docx.' },
    { when: (r) => !okLocal(r, 's08_daftar'), text: 'Bonus: RECOVER lalu DOWNLOAD daftar_hadir_rt.xlsx juga, Pak Hadi pasti butuh.' }
  ],
  endings: [
    { id: 'cetak', label: 'Serahkan undangan ke Pak Hadi', reward: 170,
      requires: (r) => okLocal(r, 's08_final'),
      text: 'Undangan final dicetak ulang di fotokopi sebelah dan dibagikan ke seluruh RT. Pak Hadi mengangguk: "Kelurahan ini beruntung punya warga sepertimu, Nak."' }
  ],
  meta: { giver: 'hadi', minLevel: 0, district: 'Tengah', difficulty: 1, repReward: 50, short: 'Kantor kelurahan — undangan rapat hilang dari printer.' },
  items: { nasi: 1 },
  dialogue: {
    offer: offer(
      [
        N('Selamat siang, Nak. Saya Hadi, lurah di sini. Saya dengar kamu cukup cekatan dengan urusan jaringan.'),
        N('Printer kantor macet waktu mencetak undangan rapat warga, dan berkasnya hilang. Rapatnya lusa. Ada dua versi, draf dan final. Yang final yang saya butuhkan.', 'worried'),
        N('Printer itu kini tersambung lewat NAS kantor. Tolong periksa dengan hati-hati, jangan ubah apa pun yang tidak perlu.')
      ],
      'Saya bantu, Pak.',
      'Mohon maaf, Pak, nanti dulu.',
      [N('Terima kasih banyak, Nak. NAS Kantor Kelurahan bisa dijangkau dari Hotspot Alun-Alun.', 'happy')],
      [N('Baik, saya mengerti. Tapi tolong jangan terlalu lama, rapatnya tidak bisa ditunda.')]
    ),
    turnIn: [
      N('Undangan final, bukan draf? Bagus sekali. Tanggalnya pun sudah benar.', 'happy'),
      N('Terima kasih, Nak. Kantor kelurahan tidak akan lupa jasa ini. Tolong terima nasi kotak ini sebagai tanda terima kasih saya.', 'happy')
    ]
  }
};
