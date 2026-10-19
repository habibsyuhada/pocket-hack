// All NPC dialogue lives here, separate from logic, so writing / tweaking
// lines never touches code.  Line shape: { who: 'npc' | 'you', text, mood }.
// mood picks the standing picture (normal | happy | worried | serious).
import { N, Y, scene, opt } from './dlg.js';
import { NEW_DIALOGUES } from './dialogues_new.js';
import { siteById } from '../sites/index.js';

const BASE = {
  // ---------------------------------------------------------------- Bu Laras
  laras: {
    greet: [
      ['Oh, kamu yang membereskan printer kafe? Duduk dulu. Kalau Fokusmu habis, tidur di Safehouse — jangan dipaksa.',
       'Kerjaan kecil juga ada hasilnya. Setelah misi selesai, klien biasanya menawarkan kontrak perawatan harian.',
       'Aku jarang lihat orang sesabar kamu di depan terminal.'],
      ['Nih, kopi buatan sendiri. Jangan bilang-bilang resepnya.', 'Pelanggan bilang Wi-Fi-nya makin cepat. Ulahmu ya?', 'Mampir lagi besok, aku bikin kue lapis.'],
      ['Kamu sudah seperti keluarga di sini.', 'Kalau ada masalah di jaringan kafe, aku langsung ingat kamu.', 'Hati-hati di luar sana, ya.'],
      ['Aku selalu sisihkan kursi di pojok buat kamu.', 'Kontrak perawatan itu kecil, tapi rutin — itu rahasia dapur yang stabil.', 'Ibuku dulu bilang: orang yang telaten pasti jadi.'],
      ['Kafe ini berdiri karena orang-orang seperti kamu.', 'Apa pun yang kamu butuhkan, bilang saja.', 'Kopi spesial hari ini khusus buatmu.']
    ],
    talks: [
      scene('laras_low_1', 'low', [N('Kafe lagi sepi. Orang-orang lebih sering ngopi di rumah sejak Wi-Fi sering putus.'), N('Kamu sendiri, suka kopi apa?')], [
        opt('Kopi susu gula aren.', 2, N('Pilihan yang benar! Gula arenku turun-temurun dari nenek.', 'happy')),
        opt('Hitam saja, tanpa gula.', 1, N('Wah, orang serius ya. Boleh juga.')),
        opt('Aku lebih suka teh.', 0, N('Teh melati? Ya sudah, kamu tetap boleh duduk.'))
      ]),
      scene('laras_low_2', 'low', [N('Kamu kelihatan lelah. Pegang terminal terus dari pagi?'), N('Jangan lupa tidur, ya. Orang pintar juga butuh istirahat.', 'worried')], [
        opt('Iya, Bu. Habis ini aku istirahat.', 2, N('Nah begitu. Anak baik.', 'happy')),
        opt('Masih banyak yang harus dikerjakan.', 1, N('Banyak kerjaan itu bagus, asal tidak lupa makan.')),
        opt('Tenang, aku kuat.', 0, N('Hm. Semua orang bilang begitu sebelum tumbang.', 'worried'))
      ]),
      scene('laras_mid_1', 'mid', [N('Besok kafe ini genap sepuluh tahun. Dulu hanya satu meja dan satu teko.'), N('Waktu itu aku hampir menyerah. Tapi pelanggan pertamaku datang dan bilang "kopimu enak".', 'happy')], [
        opt('Ibu pantas bangga.', 2, N('Terima kasih, Nak. Kamu tahu cara bicara ke hati orang tua.', 'happy')),
        opt('Satu pelanggan bisa mengubah segalanya.', 2, N('Betul. Satu orang percaya, itu cukup untuk lanjut.', 'happy')),
        opt('Sepuluh tahun itu lama ya.', 1, N('Cepat sekali kalau dijalani.'))
      ]),
      scene('laras_mid_2', 'mid', [N('Bu Tini, tetangga sebelah, sering titip kerjaan padaku karena tidak ada yang mengerti komputer.'), N('Kamu mau jadi orang kepercayaan kami?')], [
        opt('Dengan senang hati.', 2, N('Aku sudah menduga jawabanmu.', 'happy')),
        opt('Asal bayarannya cocok.', 1, N('Hehe, jujur sekali. Tenang, aku tidak pelit.')),
        opt('Aku pikir-pikir dulu.', 0, N('Boleh. Pikirkan baik-baik.'))
      ]),
      scene('laras_high_1', 'high', [N('Dulu aku takut jaringan itu hal yang rumit dan menakutkan.'), N('Sejak kamu sering mampir, rasanya kota ini lebih ramah.', 'happy'), N('Terima kasih sudah jadi bagian dari kafe ini.')], [
        opt('Kafe ini sudah jadi rumah kedua.', 3, N('Pintunya selalu terbuka untukmu, Nak.', 'happy')),
        opt('Ibu yang membuat tempat ini hangat.', 3, N('Ah, kamu ini. Duduk, kuambilkan kue.', 'happy')),
        opt('Sama-sama, Bu.', 2, N('Sini, duduk.'))
      ])
    ],
    offers: {
      s00: { lines: [N('Printer dapur macet sejak pagi. File menu baru tertahan di antrean dan laptop kasir rusak.', 'worried'),
                     N('Router kafe masih bisa dipakai tamu. Kamu bisa bantu ambil file menu dari printer?')],
             accept: 'Aku bantu, Bu.', decline: 'Nanti ya, Bu.',
             onAccept: [N('Terima kasih! Router Kafe ada di Alun-Alun. Mulai dari Inti ISP-mu, lalu cari jalan ke Hotspot Alun-Alun.', 'happy')],
             onDecline: [N('Tidak apa-apa. Tapi jangan lama-lama, menunya harus naik cetak.')] },
      s04: { lines: [N('Tetanggaku, Bu Tini, kasir warungnya macet. Laporan hari ini terkunci di dalam.', 'worried'),
                     N('Katanya ada catatan akun kasir di panel info halte. Bu Tini titip minta tolong.')],
             accept: 'Serahkan padaku.', decline: 'Lain kali ya.',
             onAccept: [N('Syukurlah! Kasir Warung Tini ada di Alun-Alun. Hati-hati, jangan tinggalkan kerusakan.', 'happy')],
             onDecline: [N('Baik, tapi Bu Tini menunggu, ya.')] }
    },
    turnIn: {
      s00: [N('Menunya sudah ada? Coba kulihat...', 'happy'), N('Rapi sekali! Sekarang menu baru bisa kucetak. Terima kasih banyak ya.', 'happy')],
      s04: [N('Bu Tini baru kabari: kasirnya normal lagi dan setoran malam ini aman.', 'happy'), N('Katanya kamu penyelamat. Aku bangga jadi perantaranya.')]
    },
    thanks: N('Terima kasih ya, Nak. Mampir lagi kapan saja.', 'happy'),
    noOffer: { locked: 'Aku belum cukup kenal kamu untuk titip yang itu. Sering-sering mampir dulu, ya.', none: 'Belum ada kerjaan lagi dariku. Kamu sudah bantu banyak.' },
    gift: {
      liked: [N('Kue lapis! Dari mana kamu tahu kesukaanku? Terima kasih banyak.', 'happy')],
      other: [N('Terima kasih, Nak. Ibu hargai.')]
    }
  },

  // ---------------------------------------------------------------- Rani
  rani: {
    greet: [
      ['Aku tidak biasa ngobrol dengan orang asing. Tapi plat-plat parkir itu... kamu yang urus, kan?',
       'Jurnalis hidup dari sumber. Aku belum tahu kamu bisa dipercaya atau tidak.', 'Jangan khawatir, namamu tidak akan kutulis.'],
      ['Buktimu rapi. Jarang ada yang mendokumentasikan sebaik itu.', 'Ada kabar soal lab arsip di barat. Aku masih menggali.', 'Kalau lihat dokumen aneh, simpan salinannya.'],
      ['Kita satu tim sekarang, ya? Tidak resmi, tapi begitu.', 'Aku bisa kasih tahu lokasi yang belum muncul di peta.', 'Sumberku bilang ada bursa yang membukukan angka palsu.'],
      ['Beritaku naik karena datamu. Terima kasih.', 'Aku mulai percaya kamu lebih dari redaksiku sendiri.', 'Hint dariku sekarang murah. Anggap kolega.'],
      ['Kalau suatu hari aku hilang, kamu orang pertama yang kuhubungi.', 'Kamu mengubah cara kerjaku.', 'Reputasimu di kalangan pers sedang menanjak.']
    ],
    talks: [
      scene('rani_low_1', 'low', [N('Kamu selalu muncul tiba-tiba. Itu bagus untuk seorang sumber, tapi bikin aku waspada.', 'serious'), N('Katakan, kenapa kamu mau repot bantu orang lain?')], [
        opt('Karena ada yang perlu dibenahi.', 2, N('Jawaban yang bersih. Aku suka.')),
        opt('Karena bayarannya lumayan.', 1, N('Setidaknya kamu jujur. Kebanyakan bohong.')),
        opt('Entahlah, iseng saja.', 0, N('Iseng sampai tengah malam? Aku tidak percaya.', 'serious'))
      ]),
      scene('rani_low_2', 'low', [N('Tadi pagi ada yang mengikutiku dari terminal. Mungkin paranoid.', 'worried'), N('Kamu pernah merasa seperti itu?')], [
        opt('Hati-hati, jangan sendirian.', 2, N('Terima kasih. Aku akan lebih waspada.')),
        opt('Itu biasa di kota besar.', 1, N('Mungkin kamu benar. Tapi tetap saja.')),
        opt('Mungkin kamu terlalu lelah.', 0, N('Hmph. Mungkin.', 'serious'))
      ]),
      scene('rani_mid_1', 'mid', [N('Aku sedang menulis tentang radio komunitas di timur. Siarannya dibajak untuk iklan penipuan.'), N('Kalau ada jejak digitalnya, aku butuh orang sepertimu.')], [
        opt('Aku siap membantu.', 2, N('Aku tahu aku bisa mengandalkanmu.', 'happy')),
        opt('Seberapa bahaya ini?', 1, N('Tidak lebih berbahaya dari parkir tadi. Tapi tetap hati-hati.')),
        opt('Berapa bayarannya?', 0, N('Selalu soal uang. Tapi ya, ada.'))
      ]),
      scene('rani_mid_2', 'mid', [N('Redaksi bilang beritaku tidak cukup "sensasional". Aku bilang, kebenaran memang membosankan.'), N('Tapi dari datamu, aku bisa menyajikannya jadi menarik.', 'happy')], [
        opt('Kebenaran itu tidak membosankan.', 2, N('Setidaknya sekarang tidak.', 'happy')),
        opt('Sajikan saja dengan jujur.', 2, N('Itu prinsipku juga.')),
        opt('Redaksimu mungkin benar.', 0, N('Heh. Jangan mulai.', 'serious'))
      ]),
      scene('rani_high_1', 'high', [N('Aku pernah berpikir berhenti jadi jurnalis. Terlalu banyak yang menutup mata.', 'worried'), N('Tapi sejak bertemu kamu, aku ingat kenapa aku mulai.', 'happy')], [
        opt('Dunia butuh jurnalis sepertimu.', 3, N('Terima kasih. Itu berarti banyak.', 'happy')),
        opt('Jangan berhenti. Aku di belakangmu.', 3, N('Kamu tahu apa yang kubutuhkan.', 'happy')),
        opt('Kamu pasti bisa.', 2, N('Aku akan coba.'))
      ])
    ],
    offers: {
      s02: { lines: [N('Sebuah gedung parkir diam-diam merekam plat nomor dan menjualnya. Aku butuh bukti rekaman.', 'serious'),
                     N('Panel parkir di terminal utara masih terbuka untuk tamu. Perekamnya punya celah lama.')],
             accept: 'Aku ambil.', decline: 'Aku butuh waktu.',
             onAccept: [N('Bagus. Cari Panel Parkir dari Hotspot Terminal Utara. Jangan sampai terlihat.', 'happy')],
             onDecline: [N('Jangan terlalu lama. Buktinya bisa hilang.')] },
      s05: { lines: [N('Radio komunitas di Pelabuhan Timur dibajak. Tiap malam menyiarkan iklan investasi palsu.', 'worried'),
                     N('Aku butuh log siaran dari server studio. Mungkin ada petunjuk sandinya di catatan operator.')],
             accept: 'Aku urus.', decline: 'Nanti dulu.',
             onAccept: [N('Server Studio Radio muncul di jaringan Pelabuhan. Kalau bisa, matikan juga pemancarnya.', 'happy')],
             onDecline: [N('Setiap malam ada korban baru. Tolong cepat.', 'worried')] }
    },
    turnIn: {
      s02: [N('Itu rekamannya? Bagus. Ini bukti yang kubutuhkan.', 'serious'), N('Akan kuterbitkan malam ini. Tanpa menyebut namamu.')],
      s05: [N('Log siarannya lengkap. Dari sini penipunya bisa dilacak.', 'serious'), N('Radio itu bisa siaran dengan tenang lagi.', 'happy')]
    },
    thanks: N('Kerja bagus. Aku berutang satu padamu.', 'happy'),
    noOffer: { locked: 'Aku belum cukup percaya untuk cerita yang itu. Kita ngobrol dulu, ya.', none: 'Belum ada liputan baru. Kamu sudah banyak membantu.' },
    gift: {
      liked: [N('Dokumen ini... bagus sekali. Terima kasih, ini sangat berguna.', 'happy')],
      other: [N('Terima kasih. Aku akan simpan.')]
    }
  },

  // ---------------------------------------------------------------- Dimas
  dimas: {
    greet: [
      ['Warnet ini sudah tua, tapi rignya masih bandel. Kamu bawa apa?', 'Jangan injak kabel itu. Serius.', 'Kamu bukan dari dinas, kan? Santai saja.'],
      ['Rig-mu bisa kupercepat. Aku tahu triknya.', 'Kemarin ada yang minta kabel LAN sepanjang pagar. Aneh.', 'Bawa komponen bekas kalau ada, aku suka.'],
      ['Tahu nggak? Loading itu kebanyakan soal sabar, bukan mesin.', 'Aku kenal "Arsitek" dari lab arsip. Orangnya misterius.', 'Duduk, minum kopi sambil aku solder.'],
      ['Rigmu sekarang hampir sehalus punyaku.', 'Fokus itu juga soal kebiasaan. Biar tubuh yang hafal.', 'Kalau kamu butuh suku cadang, kabari.'],
      ['Kita sudah seperti tim bengkel sekarang.', 'Rig-mu salah satu yang terbaik yang pernah lewat sini.', 'Jangan sungkan minta apa pun.']
    ],
    talks: [
      scene('dimas_low_1', 'low', [N('Hari ini ada anak SMP yang ngotot mau main game di warnet padahal jam sekolah.'), N('Aku usir? Atau kubiarkan?')], [
        opt('Usir pelan-pelan, suruh balik sekolah.', 2, N('Betul juga. Aku antar sampai pagar, deh.', 'happy')),
        opt('Biarkan sebentar, kasihan.', 1, N('Hmm, hatiku juga lemah soal itu.')),
        opt('Itu bukan urusanmu.', 0, N('Wah, dingin amat.'))
      ]),
      scene('dimas_low_2', 'low', [N('Kabel di belakang ini sudah seperti mie. Mau kurapikan, tapi takut ada yang putus.'), N('Kamu pernah rapiin kabel?')], [
        opt('Pakai label per ujung kabel.', 2, N('Wah, benar! Kenapa tidak terpikir dari dulu?', 'happy')),
        opt('Tarik satu-satu dengan hati-hati.', 1, N('Pelan-pelan, ya. Boleh dicoba.')),
        opt('Biarkan saja kalau jalan.', 0, N('Prinsip "kalau tidak rusak jangan diperbaiki". Boleh.'))
      ]),
      scene('dimas_mid_1', 'mid', [N('Aku lagi kerjakan rig yang bisa memangkas loading hampir separuh.'), N('Masalahnya satu: pendinginnya berisik.')], [
        opt('Coba kipas yang lebih besar.', 2, N('Betul! Besar tapi pelan putarannya. Pintar.', 'happy')),
        opt('Tahan saja, yang penting cepat.', 1, N('Hehe, jiwa kebut-kebutan, ya.')),
        opt('Ganti saja rignya.', 0, N('Mahal, bro. Aku cuma teknisi warnet.'))
      ]),
      scene('dimas_mid_2', 'mid', [N('Orang sering lupa bahwa jaringan itu soal kepercayaan, bukan kabel.'), N('Satu paket dikirim, satu paket diterima, semua pakai niat baik.')], [
        opt('Kamu bijak juga ya.', 2, N('Ah, jangan bikin geer.', 'happy')),
        opt('Terdengar seperti falsafah teknisi.', 1, N('Ya begitulah, seminggu kebanyakan baca manual.')),
        opt('Aku lebih percaya kabel.', 0, N('Hehe, ya, mungkin.'))
      ]),
      scene('dimas_high_1', 'high', [N('Dulu aku kerja di perusahaan besar. Gaji tinggi, tapi tidak ada yang mendengarkan.', 'worried'), N('Di sini aku bisa utak-atik apa saja dan ngobrol dengan orang seperti kamu.', 'happy')], [
        opt('Tempat ini lebih berharga dari gajimu.', 3, N('Itu kalimat paling manis yang kudengar bulan ini.', 'happy')),
        opt('Kamu menemukan jalanmu.', 3, N('Ya... akhirnya.', 'happy')),
        opt('Sayang gajinya kecil.', 1, N('Hehe, benar juga sih.'))
      ])
    ],
    offers: {
      s06: { lines: [N('Panitia reuni angkatan 98 butuh daftar nilai lama. Berkasnya terkunci di NAS sekolah.'),
                     N('Kuncinya ada polanya. Ada memo di printer balai desa. Kamu butuh Cipher untuk membukanya.')],
             accept: 'Aku bantu.', decline: 'Belum sekarang.',
             onAccept: [N('Mantap. NAS Sekolah ada di jaringan Pelabuhan Timur. Cari lewat hotspot dermaga.', 'happy')],
             onDecline: [N('Santai saja, reuninya masih lama.')] },
      s01: { lines: [N('Ada titipan dari kontak anonim bernama "Arsitek". Dia butuh blueprint "Arsip 07" dari lab kampus.', 'serious'),
                     N('Server arsipnya mati, backup-nya rusak. Dua jalur: perbaiki server, atau selamatkan backup.')],
             accept: 'Aku ambil.', decline: 'Terlalu berat sekarang.',
             onAccept: [N('Gateway Lab ada di jaringan Kampus Barat. Hati-hati, ini kerjaan besar.', 'serious')],
             onDecline: [N('Wajar. Kerjaan ini memang bukan main-main.')] }
    },
    turnIn: {
      s06: [N('Daftar nilainya sudah terbuka? Mantap!', 'happy'), N('Panitia pasti senang. Reuni angkatan 98 bakal seru.', 'happy')],
      s01: [N('Blueprint Arsip 07... kamu benar-benar berhasil.', 'serious'), N('Si Arsitek pasti puas. Ini kerjaan besar.')]
    },
    thanks: N('Mantap, bro. Kabari kalau butuh suku cadang.', 'happy'),
    noOffer: { locked: 'Aku belum cukup yakin menitipkan yang itu. Main ke sini lagi ya, kita ngobrol.', none: 'Belum ada titipan baru. Kamu sudah selesaikan semua.' },
    gift: {
      liked: [N('Komponen ini langka! Kamu tahu aja kesukaanku. Makasih, bro.', 'happy')],
      other: [N('Oh, makasih. Boleh juga.')]
    }
  },

  // ---------------------------------------------------------------- Mbah Gun
  gun: {
    greet: [
      ['Hmm. Wajah baru. Aku tidak menjawab pertanyaan, aku menjual jawaban.', 'Di pasar ini semua ada harganya. Kecuali kepercayaan.', 'Kamu bawa sesuatu yang menarik?'],
      ['Barang langka itu nilainya naik tiap tahun, kamu tahu?', 'Aku dengar kamu bantu kolektif Saldo Balik. Hmph.', 'Diskon kecil buat pelanggan setia.'],
      ['Aku punya satu hadiah: SEARCH, tanpa bayar. Jangan bilang siapa-siapa.', 'Orang jujur itu langka. Kamu hampir jadi langka.', 'Duduklah.'],
      ['Harga untukmu sekarang tinggal separuhnya. Hampir.', 'Aku sudah lama tidak percaya orang. Kamu pengecualian.', 'Pasar ini lebih tenang sejak kamu sering mampir.'],
      ['Kamu pewaris tokoku, kalau aku pensiun.', 'Klien yang kamu bawa selalu membayar lebih. Aku tahu itu dari kamu.', 'Anggap rumah sendiri, Nak.']
    ],
    talks: [
      scene('gun_low_1', 'low', [N('Di pasar ini ada tiga aturan: jangan tanya sumber, jangan nawar kasar, jangan bawa polisi.', 'serious'), N('Yang keempat: kalau aku bilang "pergi", kamu pergi.')], [
        opt('Aku paham aturannya.', 2, N('Bagus. Kamu pembelajar cepat.')),
        opt('Kenapa harus begitu?', 1, N('Karena begitulah pasar ini bertahan.')),
        opt('Aku tidak suka diatur.', 0, N('Hmph. Kita lihat berapa lama kamu bertahan.', 'serious'))
      ]),
      scene('gun_low_2', 'low', [N('Jangan kaget dengan harga-harga di sini. Tiap barang punya cerita.'), N('Yang murah biasanya paling mahal.')], [
        opt('Maksudmu apa?', 1, N('Nanti kamu paham sendiri.')),
        opt('Aku suka cerita di balik barang.', 2, N('Selera yang bagus. Duduk, nanti kuceritakan.', 'happy')),
        opt('Aku cuma cari harga bagus.', 0, N('Semua orang begitu. Sampai mereka sadar.'))
      ]),
      scene('gun_mid_1', 'mid', [N('Kemarin ada pembeli yang bayar pakai emas tua. Aku curiga itu barang curian.'), N('Menurutmu, aku terima atau tolak?')], [
        opt('Tolak. Jangan cari masalah.', 2, N('Hmm. Itu juga yang kupikirkan.')),
        opt('Terima, tapi laporkan.', 2, N('Hmm, cerdik juga.', 'happy')),
        opt('Terima saja, uang itu uang.', 0, N('Hmph. Kamu masih hijau.', 'serious'))
      ]),
      scene('gun_mid_2', 'mid', [N('Aku tahu pasar ini punya reputasi buruk. Tapi sebagian besar pedagangnya orang kecil yang cari makan.'), N('Itu yang kaum atas lupa.')], [
        opt('Aku mengerti.', 2, N('Kamu mengerti lebih dari kebanyakan.', 'happy')),
        opt('Reputasi itu bisa diperbaiki.', 2, N('Kalau saja semua orang mau mulai dari kamu.')),
        opt('Kalian tetap melanggar hukum.', 0, N('Hmph. Hukum juga tidak selalu adil.', 'serious'))
      ]),
      scene('gun_high_1', 'high', [N('Umurku sudah tidak panjang lagi. Aku mulai mikir siapa yang akan menjaga pasar ini.', 'worried'), N('Kamu pernah terpikir?', 'serious')], [
        opt('Aku akan jaga kalau diperlukan.', 3, N('Kamu tahu apa yang berat dari itu, dan tetap menawarkan. Aku hormat.', 'happy')),
        opt('Mbah masih sehat, jangan bicara begitu.', 3, N('Hehe, kamu baik. Terima kasih, Nak.', 'happy')),
        opt('Itu bukan urusanku.', 0, N('Ya sudah.'))
      ])
    ],
    offers: {
      s03: { lines: [N('Sebuah bursa kripto gadungan membekukan dana nasabah lalu memalsukan buku besarnya.', 'serious'),
                     N('Kolektif "Saldo Balik" menitipkan permintaan: buka buku besar aslinya dan buktikan angkanya dipalsukan. Butuh Cipher.')],
             accept: 'Aku kerjakan.', decline: 'Aku tidak yakin.',
             onAccept: [N('Edge Bursa ada di jaringan Pasar Selatan. Kunci brankasnya ada di dua tempat. Teliti.', 'serious')],
             onDecline: [N('Kolektif tidak akan menunggu selamanya.')] }
    },
    turnIn: {
      s03: [N('Buku besar aslinya...', 'serious'), N('Kolektif akan senang. Angka 640 itu akan membangunkan banyak orang.')]
    },
    thanks: N('Hm. Urusan kita beres, Nak.', 'happy'),
    noOffer: { locked: 'Barang yang itu belum kuberikan ke sembarang orang. Kita ngobrol dulu.', none: 'Hari ini tidak ada titipan. Lain kali.' },
    gift: {
      liked: [N('Hmm! Barang ini langka. Kamu paham selera lama. Terima kasih.', 'happy')],
      other: [N('Hm. Terima kasih, Nak.')]
    }
  }
};

export const DIALOGUES = { ...BASE, ...NEW_DIALOGUES };

// ---------- helpers (pure) ----------
const BANDS = { low: [0, 1], mid: [2, 3], high: [4, 4] };
export const bandOf = (level) => (level >= 4 ? 'high' : level >= 2 ? 'mid' : 'low');

export function greetingFor(npcId, level, day) {
  const set = DIALOGUES[npcId].greet[level] || DIALOGUES[npcId].greet[0];
  return set[(day - 1) % set.length];
}

export function talkSceneFor(npcId, level, day, aff = 0) {
  const pool = DIALOGUES[npcId].talks.filter((s) => s.band === bandOf(level));
  return pool[(day + aff) % pool.length];
}

// New missions carry their own offer / turn-in lines in `dialogue` (see sites/sXX).
export const offerSceneFor = (npcId, missionId) => DIALOGUES[npcId].offers?.[missionId] || siteById(missionId)?.dialogue?.offer || null;
export const turnInSceneFor = (npcId, missionId) => DIALOGUES[npcId].turnIn?.[missionId] || siteById(missionId)?.dialogue?.turnIn || [{ who: 'npc', text: 'Sudah selesai? Coba kulihat hasilnya.', mood: 'normal' }];
export const thanksLine = (npcId) => DIALOGUES[npcId].thanks;
export const noOfferLine = (npcId, kind) => DIALOGUES[npcId].noOffer[kind];
export const giftLines = (npcId, liked) => DIALOGUES[npcId].gift[liked ? 'liked' : 'other'];
export { BANDS };
