// Tutorial contract: short, teaches SCAN → CONNECT → READ → LOGIN → PS/STOP → DOWNLOAD.
const hasLocal = (run, id) => run.local.some((f) => f.id === id);

export default {
  id: 'm00',
  code: 'K-00',
  title: 'Antrean Cetak',
  client: 'Bu Laras, pemilik Kafe Senja',
  reward: 150,
  brief:
    'Printer dapur Kafe Senja macet sejak pagi. File menu baru tertahan di antrean dan laptop kasir rusak. ' +
    'Ambil file menu_baru.pdf dari printer supaya bisa dicetak di tempat lain.',
  entry: ['router'],
  world: {
    devices: {
      router: {
        id: 'router', name: 'Router Kafe', kind: 'Router', addr: '10.0.0.1', x: 50, y: 70,
        online: true, open: 'guest', links: ['printer'],
        inspect: 'Router Wi-Fi tamu milik Kafe Senja.\nAkses tamu terbuka untuk pelanggan.\nAda folder catatan staf yang bisa dibaca tamu.',
        files: [
          {
            id: 'wifi_info', name: 'catatan_staf.txt', minAccess: 'guest',
            content:
              'CATATAN STAF — jangan dihapus\n\n- Wi-Fi tamu: senja2024\n- Printer dapur: kalau macet, login akun "servis".\n' +
              '  Sandinya ditempel di bawah printer: kopisusu88\n- Jangan matikan router saat jam ramai!',
            onRead: { creds: ['printer_servis'], clues: ['printer_servis'] }
          }
        ]
      },
      printer: {
        id: 'printer', name: 'Printer Dapur', kind: 'Printer', addr: '10.0.0.7', x: 50, y: 25,
        online: true,
        inspect: 'Printer jaringan model fiktif PX-200.\nStatus: antrean macet.\nButuh login untuk melihat antrean.',
        files: [
          { id: 'menu_baru', name: 'menu_baru.pdf', minAccess: 'admin', keep: true,
            content: 'MENU BARU KAFE SENJA\n\nKopi Susu Gula Aren ... 18k\nTeh Melati Dingin ... 12k\nRoti Bakar Senja ... 22k',
            onDownload: { flags: ['got_menu'] } },
          { id: 'log_printer', name: 'error.log', minAccess: 'admin',
            content: '[08:02] job #41 menu_baru.pdf: kertas tersangkut\n[08:03] spooler: menahan job #41\n[08:03] spooler: menunggu operator...' }
        ],
        procs: [
          { id: 'spooler', name: 'spooler', desc: 'Mengatur antrean cetak. Sedang menahan menu_baru.pdf.', running: true, control: 'admin', locks: ['menu_baru'] },
          { id: 'fw', name: 'firmware', desc: 'Sistem inti printer.', running: true, control: 'admin', stoppable: false }
        ],
        controls: [
          { id: 'lcd', label: 'Layar LCD', minAccess: 'admin', states: ['ERROR 41', 'SIAP'], state: 'ERROR 41',
            on: { SIAP: { flags: ['lcd_fixed'] } } }
        ]
      }
    }
  },
  creds: {
    printer_servis: { label: 'servis @ Printer Dapur', account: 'servis', device: 'printer', level: 'admin' }
  },
  clues: {
    printer_servis: { title: 'Akun servis printer', text: 'Catatan staf menyebut akun "servis" untuk printer dapur.' }
  },
  objectives: [
    { id: 'reach', text: 'Temukan printer dapur', done: (r) => r.devices.printer.discovered },
    { id: 'access', text: 'Dapatkan akses ke printer', done: (r) => r.devices.printer.access !== 'none' },
    { id: 'menu', text: 'Salin menu_baru.pdf ke perangkatmu', done: (r) => hasLocal(r, 'menu_baru'), main: true },
    { id: 'lcd', text: '(Bonus) Kembalikan layar printer ke SIAP', done: (r) => r.flags.includes('lcd_fixed'), bonus: true }
  ],
  hints: [
    { when: (r) => !r.devices.router.discovered, text: 'Pilih RIG lalu jalankan SCAN untuk melihat jaringan kafe.' },
    { when: (r) => r.current !== 'router' && r.devices.router.access === 'none', text: 'CONNECT ke Router Kafe. Akses tamunya terbuka.' },
    { when: (r) => !r.read.includes('wifi_info'), text: 'Buka tab FILE dan baca catatan staf di router.' },
    { when: (r) => !r.devices.printer.discovered, text: 'SCAN dari router untuk menemukan printer.' },
    { when: (r) => r.current !== 'printer', text: 'CONNECT ke Printer Dapur.' },
    { when: (r) => r.devices.printer.access === 'none', text: 'Pilih Printer Dapur lalu LOGIN dengan akun servis.' },
    { when: (r) => r.devices.printer.procs[0].running, text: 'File menu tertahan. Lihat tab SISTEM dan hentikan proses yang menguncinya.' },
    { when: (r) => !hasLocal(r, 'menu_baru'), text: 'Sekarang DOWNLOAD menu_baru.pdf dari tab FILE.' },
    { when: (r) => !r.flags.includes('lcd_fixed'), text: 'Bonus: di tab SISTEM, pakai CONTROL untuk mengubah layar ke SIAP. Atau kembali ke markas.' }
  ],
  endings: [
    {
      id: 'deliver', label: 'Kirim menu ke Bu Laras', reward: 150, unlockTools: ['cipher'],
      requires: (r) => hasLocal(r, 'menu_baru'),
      text: 'Bu Laras mencetak menu di fotokopi sebelah. "Makasih ya! Kenalanku butuh orang sepertimu." Kamu mendapat tool Cipher.'
    }
  ]
};
