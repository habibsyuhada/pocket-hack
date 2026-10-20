// Alternate routes. Most missions used to have a single way through; here each one gets at least one
// more, so the player picks how to get it done. The primary routes stay in the site files.
//
// Kinds of alternates used below (each mission gets the one that fits its story):
//   quiet / loud   a way in by login and clues, or by EXPLOIT (needs a clue about the flaw; it trips the
//                  node's alarm and cuts your Trace time)
//   sniffer        capture the credentials with the Sniffer tool instead of hunting for them
//   copy           a second copy of the file somewhere else (often damaged: RECOVER first)
//   partial        a quicker route that delivers less, with its own, smaller ending
//   bypass         force the end state by another device instead of fixing the cause
//
// Every new line of text goes through T(): it returns the Indonesian text and records its English
// version, which i18n/extra/routes.js hands to the translator.
export const ROUTE_EN = {};
const T = (id, en) => { ROUTE_EN[id] = en; return id; };

const hasLocal = (r, id) => r.local.some((f) => f.id === id);
const okLocal = (r, id) => { const f = r.local.find((x) => x.id === id); return !!f && !f.deleted && !f.corrupt; };
const opened = (r, id) => { const f = r.local.find((x) => x.id === id); return !!f && !f.encrypted; };

const dev = (s, id) => s.world.devices[id];
const clue = (s, id, title, text) => { s.clues[id] = { title: T(title[0], title[1]), text: T(text[0], text[1]) }; };
const cred = (s, id, c) => { s.creds[id] = { ...c, label: T(c.label[0], c.label[1]) }; };
const put = (s, nodeId, f) => {                       // a file on one of the mission's own nodes
  const d = dev(s, nodeId);
  d.files.push({ ...f, name: f.name, content: T(f.content[0], f.content[1]) });
};
const patchFile = (s, nodeId, f) => {                 // a file dropped on a city node
  const p = ((s.patches ||= {})[nodeId] ||= {});
  (p.files ||= []).push({ ...f, content: T(f.content[0], f.content[1]) });
};
const mainObj = (s) => s.objectives.find((o) => o.main);
const alsoMain = (s, alt, text) => {                  // the main objective is done by the old way OR the new one
  const o = mainObj(s), old = o.done;
  o.done = (r) => old(r) || alt(r);
  if (text) o.text = T(text[0], text[1]);
};
const alsoEnding = (s, id, alt) => { const e = s.endings.find((x) => x.id === id), old = e.requires; e.requires = (r) => old(r) || alt(r); };
const ending = (s, e) => s.endings.push({ ...e, label: T(e.label[0], e.label[1]), text: T(e.text[0], e.text[1]) });
const exploit = (d, level, requires, text) => { d.exploit = { level, requires, loud: true, text: T(text[0], text[1]) }; };

const ROUTES = {
  // ---- tutorial: a damaged cache copy of the menu sits on the router
  s00(s) {
    put(s, 'router', { id: 's00_cache', name: 'cache_cetak.tmp', minAccess: 'guest', corrupt: true, keep: true,
      content: ['(berkas rusak, tidak terbaca)', '(damaged file, unreadable)'],
      recoverTo: { content: T('CACHE ANTREAN CETAK\n\nSalinan sementara menu_baru.pdf yang sempat tertahan di cache router. Ukurannya kecil dan kualitasnya turun, tapi isinya lengkap dan bisa dicetak di tempat lain.',
        'PRINT QUEUE CACHE\n\nA temporary copy of menu_baru.pdf that got held in the router cache. It is small and lower quality, but complete and printable elsewhere.') } });
    alsoMain(s, (r) => okLocal(r, 's00_cache'), ['Dapatkan file menu baru untuk Bu Laras', 'Get the new menu file for Bu Laras']);
    alsoEnding(s, 'deliver', (r) => okLocal(r, 's00_cache'));
  },

  // ---- quiet: a service login written down at the camera; loud: the old debug-port
  s02(s) {
    put(s, 'cam', { id: 's02_servis', name: 'jurnal_servis.txt', minAccess: 'guest',
      content: ['JURNAL SERVIS KAMERA\n\nKamera dan DVR memakai satu akun servis: teknisi_dvr.\nSandinya ditempel di badan kamera: "parkir-2024". Jangan hilang lagi.',
        'CAMERA SERVICE JOURNAL\n\nThe camera and the DVR share one service account: teknisi_dvr.\nThe password is stuck on the camera body: "parkir-2024". Do not lose it again.'],
      onRead: { creds: ['s02_servis'], clues: ['s02_servis'] } });
    cred(s, 's02_servis', { account: 'teknisi_dvr', device: 'dvr', level: 'admin', label: ['teknisi_dvr @ Perekam DVR', 'teknisi_dvr @ DVR Recorder'] });
    clue(s, 's02_servis', ['Akun servis DVR', 'DVR service account'], ['Jurnal servis kamera memuat akun teknisi_dvr untuk DVR.', 'The camera service journal lists the teknisi_dvr account for the DVR.']);
    dev(s, 'dvr').exploit.requires = ['flaw'];
    dev(s, 'dvr').exploit.loud = true;
  },

  // ---- the ops portal has an old token flaw (loud) besides the cracked password (quiet)
  s03(s) {
    put(s, 'edge', { id: 's03_vendor', name: 'catatan_vendor.txt', minAccess: 'guest',
      content: ['CATATAN VENDOR PORTAL OPS\n\nVersi 3.1 masih menerima "legacy-token" dari sistem lama. Celah ini belum ditutup di cabang bursa.',
        'OPS PORTAL VENDOR NOTES\n\nVersion 3.1 still accepts the "legacy-token" from the old system. The flaw is not closed at the exchange branch.'],
      onRead: { clues: ['s03_celah'] } });
    clue(s, 's03_celah', ['Celah legacy-token', 'Legacy-token flaw'], ['Portal Ops menerima legacy-token: bisa ditembus dengan EXPLOIT.', 'The Ops portal accepts a legacy-token: it can be broken with EXPLOIT.']);
    exploit(dev(s, 'ops'), 'user', ['s03_celah'], ['Legacy-token diterima. Kamu masuk Portal Ops sebagai user.', 'Legacy-token accepted. You are in the Ops portal as a user.']);
  },

  // ---- the old POS has a no-password service mode
  s04(s) {
    patchFile(s, 'halte_info', { id: 's04_readme', name: 'readme_kasir.txt', minAccess: 'guest',
      content: ['KASIR POS v1.0\n\nMode servis tidak memakai sandi: dipakai teknisi saat sandi kasir terlupa. Belum pernah dimatikan.',
        'POS CASHIER v1.0\n\nService mode uses no password: technicians use it when the cashier password is forgotten. It was never turned off.'],
      onRead: { clues: ['s04_celah'] } });
    clue(s, 's04_celah', ['Mode servis kasir', 'Cashier service mode'], ['Kasir POS punya mode servis tanpa sandi: EXPLOIT.', 'The POS has a no-password service mode: EXPLOIT.']);
    exploit(dev(s, 'warung_pos'), 'admin', ['s04_celah'], ['Mode servis terbuka. Kamu masuk sebagai admin kasir.', 'Service mode opened. You are in as the cashier admin.']);
  },

  // ---- partial: the transmitter's own log proves broadcasts happened, but not what was aired
  s05(s) {
    put(s, 'pemancar', { id: 's05_log_tx', name: 'log_tx_lokal.txt', minAccess: 'user', keep: true,
      content: ['LOG PEMANCAR (lokal)\n\nHanya mencatat jam pancar, bukan isi siarannya:\n22.00, 22.30, 23.00, 23.30. Semuanya di luar jadwal resmi stasiun.',
        'TRANSMITTER LOG (local)\n\nIt only records transmit times, not the content:\n22:00, 22:30, 23:00, 23:30. All outside the station\'s official schedule.'] });
    alsoMain(s, (r) => hasLocal(r, 's05_log_tx'), ['Dapatkan bukti siaran gelap', 'Get proof of the dark broadcast']);
    ending(s, { id: 'siar_sebagian', label: ['Serahkan jam siar ke Rani (bukti sebagian)', 'Hand the airing times to Rani (partial proof)'], reward: 190,
      requires: (r) => hasLocal(r, 's05_log_tx'),
      text: ['Rani mengangguk. "Jam siarnya mencurigakan, tapi tanpa isi siaran ini cuma petunjuk. Aku butuh lebih." Ia membayar separuh lebih sedikit.',
        'Rani nods. "The times are suspicious, but without what was aired this is only a lead. I need more." She pays a bit less.'] });
  },

  // ---- a second, damaged-less copy of the grade list with its own key at the village hall
  s06(s) {
    patchFile(s, 'balai_printer', { id: 's06_catatan', name: 'catatan_panitia.txt', minAccess: 'guest',
      content: ['CATATAN PANITIA REUNI\n\nSalinan cadangan nilai angkatan kami simpan di berkas balai (rapor_cadangan.enc).\nKuncinya: kata NILAI lalu tahun angkatan empat digit, huruf besar, tanpa spasi.',
        'REUNION COMMITTEE NOTE\n\nWe keep a backup copy of the class grades in the hall files (rapor_cadangan.enc).\nThe key: the word NILAI then the four-digit class year, capitals, no spaces.'],
      onRead: { clues: ['s06_kunci2'] } });
    patchFile(s, 'balai_printer', { id: 's06_cadangan', name: 'rapor_cadangan.enc', minAccess: 'guest', keep: true,
      content: ['[terenkripsi]', '[encrypted]'],
      encrypted: { key: 'NILAI1998', keyOptions: ['NILAI98', 'NILAI1998', 'NILAI2098', 'ALUMNI1998'],
        result: { content: T('DAFTAR NILAI ANGKATAN 98 (salinan cadangan)\n\nWali kelas: Ibu Marni\nPeringkat 1: Wulan · Peringkat 2: Hadi · Peringkat 3: Sari',
          'CLASS OF 98 GRADE LIST (backup copy)\n\nHomeroom teacher: Ibu Marni\nRank 1: Wulan · Rank 2: Hadi · Rank 3: Sari') } } });
    clue(s, 's06_kunci2', ['Kunci salinan cadangan', 'Backup copy key'], ['Kunci cadangan = NILAI + tahun angkatan empat digit.', 'Backup key = NILAI + the four-digit class year.']);
    alsoMain(s, (r) => opened(r, 's06_cadangan'));
    alsoEnding(s, 'reuni', (r) => opened(r, 's06_cadangan'));
  },

  // ---- sniffer: the operator logs in over plain text
  s07(s) {
    dev(s, 's07_papan').sniff = { text: T('TANGKAPAN LALU LINTAS: operator masuk dari pos satpam. Akun "operator", sandi terkirim polos (pabrik: admin123).',
      'TRAFFIC CAPTURE: the operator logs in from the guard post. Account "operator", password sent in clear (factory: admin123).'),
    fx: { creds: ['s07_operator'], clues: ['s07_default'] } };
  },

  // ---- the draft invitation is a legitimate (worse) way out
  s08(s) {
    ending(s, { id: 'cetak_draf', label: ['Serahkan undangan draf (tanggal belum final)', 'Hand in the draft invitation (date not final)'], reward: 100,
      requires: (r) => okLocal(r, 's08_draf'),
      text: ['Pak Hadi membaca undangan draf itu dan mengernyit. "Tanggalnya belum final... saya telepon warga satu-satu saja." Ia membayar sebagian.',
        'Pak Hadi reads the draft invitation and frowns. "The date is not final... I will just phone the residents one by one." He pays part of it.'] });
    alsoMain(s, (r) => okLocal(r, 's08_draf'));
  },

  // ---- payroll server: a treasurer's note gives the login (quiet), the old firmware gives the flaw (loud)
  s09(s) {
    put(s, 's09_loket', { id: 's09_bendahara', name: 'catatan_bendahara.txt', minAccess: 'user',
      content: ['CATATAN BENDAHARA\n\nAkun admin server gaji: bendahara. Sandi sama dengan nomor rekening kas bus. Jangan dibagi.',
        'TREASURER NOTE\n\nPayroll server admin account: bendahara. The password is the bus fund account number. Do not share.'],
      onRead: { creds: ['s09_bendahara'], clues: ['s09_bendahara'] } });
    cred(s, 's09_bendahara', { account: 'bendahara', device: 's09_payroll', level: 'admin', label: ['bendahara @ Server Gaji Loket', 'bendahara @ Counter Payroll Server'] });
    clue(s, 's09_bendahara', ['Akun bendahara', 'Treasurer account'], ['Catatan bendahara memuat akun admin server gaji.', 'The treasurer note lists the payroll server admin account.']);
    clue(s, 's09_celah', ['Server gaji lama', 'Old payroll server'], ['Server gaji masih firmware lama: ada celah.', 'The payroll server still runs old firmware: it has a flaw.']);
    const info = dev(s, 's09_loket').files.find((f) => f.id === 's09_info_gaji');
    info.onRead = { ...info.onRead, clues: [...(info.onRead.clues || []), 's09_celah'] };
    dev(s, 's09_payroll').exploit.requires = ['s09_celah'];
    dev(s, 's09_payroll').exploit.loud = true;
  },

  // ---- the router has a leaked vendor flaw besides the password puzzle
  s10(s) {
    put(s, 's10_papan', { id: 's10_vendor', name: 'buletin_vendor.txt', minAccess: 'guest',
      content: ['BULETIN VENDOR ROUTER\n\nSeri RT-20: antarmuka admin bisa ditembus lewat parameter "reset" tanpa sandi. Perbaikan firmware tersedia, tapi jarang dipasang.',
        'ROUTER VENDOR BULLETIN\n\nRT-20 series: the admin interface can be broken through the "reset" parameter without a password. A firmware fix exists but is rarely installed.'],
      onRead: { clues: ['s10_celah'] } });
    clue(s, 's10_celah', ['Celah parameter reset', 'Reset-parameter flaw'], ['Router RT-20 bisa ditembus lewat parameter reset: EXPLOIT.', 'The RT-20 router can be broken through the reset parameter: EXPLOIT.']);
    exploit(dev(s, 's10_router'), 'admin', ['s10_celah'], ['Parameter reset menembus antarmuka. Kamu masuk sebagai admin router.', 'The reset parameter breaks the interface. You are in as the router admin.']);
  },

  // ---- the letter also sits in the village NAS archive, outside the filter
  s11(s) {
    patchFile(s, 'kelurahan_nas', { id: 's11_salinan', name: 'arsip_surat_masuk.txt', minAccess: 'guest',
      content: ['ARSIP SURAT MASUK (salinan)\n\nKEPADA PIHAK KELURAHAN: papan iklan memakai sandi bawaan pabrik, printer kehilangan berkas karena spool tak terlindungi, loket bus membayar sopir yang tak pernah berangkat. Saya hanya menguji. — SENTINEL',
        'INCOMING MAIL ARCHIVE (copy)\n\nTO THE VILLAGE OFFICE: the billboard uses a factory password, the printer lost files because the spool is unprotected, the bus counter pays a driver who never leaves. I only test. — SENTINEL'],
      trace: { text: T('LEMBAR LACAK — arsip surat masuk\n\nJalur 1: kotak surat kelurahan <- relay surat kota\nJalur 2: relay surat kota <- gerbang kawasan industri (10.80.x.x)\n\nKesimpulan: surat dikirim dari kawasan industri.',
        'TRACE SHEET — incoming mail archive\n\nPath 1: village mailbox <- city mail relay\nPath 2: city mail relay <- industrial estate gate (10.80.x.x)\n\nConclusion: the letter was sent from the industrial estate.'),
      fx: { flags: ['sentinel_industri'], clues: ['s11_asal'], reveal: ['menara_relay'] } } });
  },

  // ---- sniffer: the pharmacist's login crosses the network in plain text
  s12(s) {
    dev(s, 's12_farmasi').sniff = { text: T('TANGKAPAN LALU LINTAS: akun "apoteker" masuk tiap pagi, sandi terkirim tanpa enkripsi.',
      'TRAFFIC CAPTURE: the "apoteker" account logs in every morning, password sent unencrypted.'),
    fx: { creds: ['s12_apoteker'], clues: ['s12_apoteker'] } };
  },

  // ---- partial: the station log already holds an estimate of the boat's last position
  s13(s) {
    put(s, 's13_stasiun', { id: 's13_perkiraan', name: 'perkiraan_posisi.txt', minAccess: 'user', keep: true,
      content: ['PERKIRAAN POSISI (stasiun)\n\nDari arah angin dan arus sebelum uplink padam: KM Bahari 17 diperkirakan di perairan utara karang Sepuluh, radius 6 mil. Bukan posisi pasti.',
        'POSITION ESTIMATE (station)\n\nFrom wind and current before the uplink died: KM Bahari 17 is estimated in the waters north of Sepuluh reef, radius 6 miles. Not an exact position.'] });
    alsoMain(s, (r) => hasLocal(r, 's13_perkiraan'), ['Dapatkan posisi terakhir KM Bahari 17', 'Get the last position of KM Bahari 17']);
    ending(s, { id: 'posisi_perkiraan', label: ['Serahkan perkiraan posisi ke Kapten Sari', 'Hand the estimated position to Captain Sari'], reward: 200,
      requires: (r) => hasLocal(r, 's13_perkiraan'),
      text: ['Kapten Sari menandai peta dengan lingkaran besar. "Enam mil itu luas, tapi lebih baik daripada gelap. Kami mulai menyisir dari utara."',
        'Captain Sari marks the chart with a big circle. "Six miles is wide, but better than the dark. We start sweeping from the north."'] });
  },

  // ---- the customs system also has an old flaw
  s14(s) {
    put(s, 's14_timbang', { id: 's14_vendor', name: 'catatan_vendor_bea.txt', minAccess: 'guest',
      content: ['CATATAN VENDOR SISTEM BEA\n\nVersi 2.4 punya celah sesi: token lama tidak dicabut. Tambalan belum dipasang di pelabuhan ini.',
        'CUSTOMS SYSTEM VENDOR NOTES\n\nVersion 2.4 has a session flaw: old tokens are not revoked. The patch is not installed at this port.'],
      onRead: { clues: ['s14_celah'] } });
    clue(s, 's14_celah', ['Celah sesi sistem bea', 'Customs session flaw'], ['Sistem bea menerima token lama: EXPLOIT.', 'The customs system accepts old tokens: EXPLOIT.']);
    exploit(dev(s, 's14_bea'), 'admin', ['s14_celah'], ['Token lama diterima. Kamu masuk sebagai admin Sistem Bea.', 'Old token accepted. You are in as the Customs System admin.']);
  },

  // ---- the secretariat PC has a known flaw too
  s15(s) {
    put(s, 's15_situs', { id: 's15_forum', name: 'forum_himpunan.txt', minAccess: 'guest',
      content: ['FORUM ANGGOTA HIMAKOM\n\n"PC sekretariat masih pakai OS lama, katanya bisa dibuka lewat berbagi file tanpa sandi."\n"Jangan dipakai buat yang aneh-aneh ya."',
        'HIMAKOM MEMBER FORUM\n\n"The secretariat PC still runs an old OS; they say file sharing opens it without a password."\n"Do not use it for anything weird, okay."'],
      onRead: { clues: ['s15_celah'] } });
    clue(s, 's15_celah', ['Berbagi file sekretariat', 'Secretariat file sharing'], ['PC sekretariat bisa dibuka lewat berbagi file tanpa sandi: EXPLOIT.', 'The secretariat PC can be opened through file sharing without a password: EXPLOIT.']);
    exploit(dev(s, 's15_sekre'), 'user', ['s15_celah'], ['Berbagi file terbuka. Kamu masuk PC Sekretariat sebagai user.', 'File sharing opened. You are in the Secretariat PC as a user.']);
  },

  // ---- loud: skip the two approvals by breaking the wallet server
  s16(s) {
    put(s, 's16_loket', { id: 's16_forum', name: 'diskusi_nasabah.txt', minAccess: 'guest',
      content: ['DISKUSI NASABAH\n\n"Server dompet pakai versi lama, admin panelnya bisa dilewati lewat URL cadangan."\n"Tapi sistemnya mencatat setiap serangan."',
        'CUSTOMER DISCUSSION\n\n"The wallet server runs an old version; the admin panel can be skipped through the backup URL."\n"But the system logs every attack."'],
      onRead: { clues: ['s16_celah'] } });
    clue(s, 's16_celah', ['URL cadangan dompet', 'Wallet backup URL'], ['Server dompet bisa dilewati lewat URL cadangan: EXPLOIT melewati dua persetujuan.', 'The wallet server can be bypassed through the backup URL: EXPLOIT skips the two approvals.']);
    exploit(dev(s, 's16_brankas'), 'admin', ['s16_celah'], ['URL cadangan melewati panel persetujuan. Kamu admin Server Dompet.', 'The backup URL skips the approval panel. You are the wallet server admin.']);
  },

  // ---- loud: take the relay tower directly, skipping the repair shop and the UPLOAD
  s17(s) {
    put(s, 's17_gang', { id: 's17_forum', name: 'obrolan_montir.txt', minAccess: 'guest',
      content: ['OBROLAN MONTIR\n\n"Menara relay lama itu tokennya bisa ditebak kalau kamu tahu pola modem gang."\n"Cuma, menara mencatat siapa pun yang memaksa masuk."',
        'MECHANICS\' CHAT\n\n"The old relay tower\'s token can be guessed if you know the alley modem\'s pattern."\n"Only, the tower logs anyone who forces their way in."'],
      onRead: { clues: ['s17_celah'] } });
    clue(s, 's17_celah', ['Token menara bisa ditebak', 'Guessable tower token'], ['Token Menara Relay bisa ditebak dari pola modem gang: EXPLOIT.', 'The Relay Tower token can be guessed from the alley modem pattern: EXPLOIT.']);
    const p = (s.patches ||= {}).menara_relay;
    p.trace = 150;
    p.exploit = { level: 'admin', requires: ['s17_celah'], loud: true,
      text: T('Token tertebak. Kamu masuk sebagai admin Menara Relay. Rute ke kawasan industri siap dibuka dengan ROUTE.',
        'Token guessed. You are in as the Relay Tower admin. The route to the industrial estate is ready to open with ROUTE.') };
  },

  // ---- loud: break the control room instead of finding the operator's login
  s18(s) {
    put(s, 's18_panel', { id: 's18_vendor', name: 'catatan_vendor_scada.txt', minAccess: 'guest',
      content: ['CATATAN VENDOR SCADA\n\nPanel kontrol seri lama memuat akun cadangan "vendor" tanpa sandi untuk servis jarak jauh. Belum dinonaktifkan di gardu ini.',
        'SCADA VENDOR NOTES\n\nOld-series control panels carry a spare "vendor" account with no password for remote service. It is not disabled at this substation.'],
      onRead: { clues: ['s18_celah'] } });
    clue(s, 's18_celah', ['Akun cadangan vendor', 'Vendor spare account'], ['Panel SCADA punya akun vendor tanpa sandi: EXPLOIT.', 'The SCADA panel has a vendor account with no password: EXPLOIT.']);
    exploit(dev(s, 's18_scada'), 'admin', ['s18_celah'], ['Akun vendor terbuka. Kamu masuk ruang kontrol sebagai admin.', 'The vendor account is open. You are in the control room as admin.']);
  },

  // ---- the safe values are also on the tank's operator placard
  s19(s) {
    put(s, 's19_tangki', { id: 's19_plakat', name: 'plakat_operator.txt', minAccess: 'guest',
      content: ['PLAKAT OPERATOR (tertempel di tangki)\n\nPompa P-3, pipa baru: tekanan maks 3.5 bar, debit 45 L/s, mode normal.\nJangan lewati batas ini.',
        'OPERATOR PLACARD (stuck on the tank)\n\nPump P-3, new pipe: max pressure 3.5 bar, flow 45 L/s, normal mode.\nDo not exceed these limits.'],
      onRead: { clues: ['s19_spek'] } });
  },

  // ---- bypass: override the cold room from the panel without patching the sensor, at a lower reward
  s20(s) {
    (s.edges ||= []).push(['s20_panel', 's20_kompresor']);          // the panel can reach the compressor once it is forced online
    dev(s, 's20_panel').controls = [{ id: 's20_bypass', label: T('Jalur Darurat Gudang', 'Warehouse Emergency Line'), minAccess: 'guest', states: ['NORMAL', 'PAKSA'], state: 'NORMAL',
      on: { PAKSA: { flags: ['s20_bypass'], online: ['s20_kompresor'], log: T('Panel memaksa kompresor tersambung, mengabaikan sensor. Sensor masih salah.', 'The panel forces the compressor online, ignoring the sensor. The sensor is still wrong.') } } }];
    const komp = (r) => r.devices.s20_kompresor.controls.find((c) => c.id === 's20_komp_daya');
    const darurat = (r) => r.flags.includes('s20_bypass') && komp(r).state === 'NORMAL';
    alsoMain(s, darurat);
    ending(s, { id: 'dingin_darurat', label: ['Dinginkan gudang lewat jalur darurat (sensor belum diperbaiki)', 'Cool the warehouse through the emergency line (sensor not fixed)'], reward: 380, noItems: true,
      requires: darurat,
      text: ['Gudang mulai dingin, tapi sensornya masih berbohong. Mbah Gun memeriksa termometernya sendiri. "Jalan pintas, ya. Tahan sebentar saja." Kunci gudang tidak ia serahkan.',
        'The warehouse starts cooling, but the sensor still lies. Mbah Gun checks the thermometer himself. "A shortcut. It will hold for a while." He does not hand over the warehouse key.'] });
  }
};

export function applyRoutes(sites) {
  for (const s of sites) ROUTES[s.id]?.(s);
}
