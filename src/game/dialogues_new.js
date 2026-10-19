// Dialogue for the NPCs added in v1: Pak Hadi, Vira, dr. Wulan, Kapten Sari.
// Same shape as BASE in dialogues.js (greet ×5 levels, talks, thanks, noOffer, gift).
// Mission offer / turn-in lines live in each mission file (`dialogue`).
import { N, Y, scene, opt } from './dlg.js';

export const NEW_DIALOGUES = {
  hadi: {
    greet: [
      ['Selamat datang, Nak. Saya Hadi, lurah di sini. Silakan duduk.',
       'Kelurahan ini melayani semua warga, termasuk tamu yang baru kami kenal.',
       'Kalau ada keperluan, sampaikan dengan sopan. Kami dengarkan.'],
      ['Ah, Nak yang kemarin. Sudah makan? Jangan bekerja dengan perut kosong.',
       'Warga mulai membicarakan kamu. Sebagian curiga, sebagian berterima kasih.',
       'Pintu kelurahan terbuka untukmu, selama niatmu baik.'],
      ['Nak, saya senang kamu mampir. Teh hangat sudah disiapkan.',
       'Berkas-berkas lama di arsip itu menumpuk. Kota ini punya ingatan panjang.',
       'Kamu mulai dipercaya orang. Jaga kepercayaan itu baik-baik.'],
      ['Saya sudah menganggap kamu bagian dari kelurahan ini, Nak.',
       'Kalau ada warga yang ragu padamu, saya yang pasang badan.',
       'Ada hal yang hanya bisa saya ceritakan pada orang yang saya percaya.'],
      ['Nak, kalau kota ini aman malam ini, sebagian karena kamu.',
       'Jabatan lurah ini berat. Berbagi bebannya denganmu terasa ringan.',
       'Apa pun yang terjadi, kelurahan ini rumahmu.']
    ],
    talks: [
      scene('hadi_low_1', 'low', [N('Kelurahan buka dari pagi, tetapi warga lebih sering datang saat urusannya sudah mendesak.'), N('Menurutmu, bagaimana seharusnya pelayanan publik itu?')], [
        opt('Cepat dan ramah, Pak.', 2, N('Betul sekali. Cepat tanpa ramah itu dingin, ramah tanpa cepat itu membuang waktu.', 'happy')),
        opt('Yang penting prosedurnya jelas.', 1, N('Prosedur memang tulang punggung. Tetapi jangan sampai lupa orangnya.')),
        opt('Saya tidak terlalu paham, Pak.', 0, N('Tidak apa-apa. Pelan-pelan juga belajar.'))
      ]),
      scene('hadi_low_2', 'low', [N('Tadi pagi ada ibu-ibu membawa nasi kotak untuk seluruh pegawai. Katanya terima kasih atas surat keterangannya.'), N('Hal-hal kecil begitu yang membuat saya betah.', 'happy')], [
        opt('Itu tanda warga menghargai Bapak.', 2, N('Semoga begitu, Nak. Terima kasih.', 'happy')),
        opt('Nasi kotaknya enak, Pak?', 1, N('Enak sekali. Sambalnya pedas, persis kesukaan saya.', 'happy')),
        opt('Pegawai negeri memang selalu dapat begitu.', 0, N('Hm. Tidak semua begitu, Nak. Jangan menyamaratakan.', 'serious'))
      ]),
      scene('hadi_mid_1', 'mid', [N('Akhir-akhir ini kelurahan menerima surat tanpa nama pengirim. Isinya peringatan: lampu jalan, papan iklan, kamera... semua ada celahnya.', 'worried'), N('Tulisannya sopan, hampir seperti laporan. Tetapi saya tidak suka diberi pelajaran oleh orang yang bersembunyi.')], [
        opt('Mungkin dia memang ingin membantu.', 2, N('Mungkin. Itu yang membuat saya bingung: marah atau berterima kasih.')),
        opt('Kita perlu menyelidiki pengirimnya.', 3, N('Itu juga pikiran saya. Dan saya ingin yang menyelidiki adalah orang yang saya percaya.', 'serious')),
        opt('Jangan-jangan itu ancaman.', 1, N('Saya sudah memikirkannya. Anehnya, tidak ada tuntutan apa pun.', 'worried'))
      ]),
      scene('hadi_mid_2', 'mid', [N('Dulu kelurahan ini punya seorang teknisi yang merawat semua perangkat. Pendiam, rajin, tulisan tangannya rapi sekali.'), N('Sejak dia pergi, banyak sistem berjalan sendiri tanpa ada yang benar-benar paham.')], [
        opt('Siapa namanya, Pak?', 2, N('Nanti saya ceritakan, setelah saya yakin ceritanya ada gunanya.')),
        opt('Sistem yang berjalan sendiri itu berbahaya.', 2, N('Berbahaya, atau malah setia. Entahlah, Nak.')),
        opt('Mungkin dia pindah ke kota lain.', 1, N('Mungkin. Kami tidak sempat bertanya.'))
      ]),
      scene('hadi_high_1', 'high', [N('Nak, saya ingin jujur. Waktu surat pertama datang, saya sempat mencurigai kamu.', 'worried'), N('Sekarang saya tahu, orang yang mencuri tidak akan repot memulihkan kepercayaan warga.'), N('Maafkan saya.')], [
        opt('Wajar, Pak. Saya akan curiga juga.', 3, N('Hati yang lapang. Terima kasih, Nak.', 'happy')),
        opt('Yang penting sekarang sudah jelas.', 2, N('Ya. Dan saya bersyukur jelasnya ke arah yang baik.', 'happy')),
        opt('Saya sempat tersinggung, Pak.', 1, N('Pantas. Saya akan menebusnya dengan kepercayaan.', 'worried'))
      ]),
      scene('hadi_high_2', 'high', [N('Tulisan di surat-surat itu... saya pernah melihatnya. Di buku catatan lama teknisi kami, bertahun-tahun lalu.', 'serious'), N('Saya belum berani menyimpulkan apa-apa. Tetapi kalau kamu menemukan sesuatu di kawasan industri, kabari saya lebih dulu.')], [
        opt('Saya akan melapor ke Bapak dulu.', 3, N('Terima kasih, Nak. Itu yang saya harapkan darimu.', 'happy')),
        opt('Bapak merahasiakan apa dari warga?', 2, N('Bukan rahasia. Hanya belum matang. Warga berhak tahu kalau sudah jelas.', 'serious')),
        opt('Saya tidak janji, Pak.', 1, N('Baik. Jujur lebih baik daripada janji kosong.'))
      ])
    ],
    thanks: N('Terima kasih, Nak. Kelurahan berutang budi padamu.', 'happy'),
    noOffer: { locked: 'Urusan itu belum bisa saya percayakan, Nak. Mampirlah lebih sering, kita saling kenal dulu.', none: 'Tidak ada urusan baru dari kelurahan. Terima kasih sudah membantu.' },
    gift: {
      liked: [N('Nasi kotak! Masih hangat pula. Terima kasih, Nak, kamu perhatian sekali.', 'happy')],
      other: [N('Terima kasih, Nak. Saya hargai niat baikmu.')]
    }
  },

  vira: {
    greet: [
      ['Eh, kamu yang katanya jago jaringan? Aku Vira, anak sistem informasi.',
       'Jangan kaget, aku suka mengamati orang. Kebiasaan.',
       'Kalau mau pinjam lab, tanya aku dulu ya.'],
      ['Hai, Kak! Kemarin aku lihat caramu menyelesaikan misi. Lumayan rapi.',
       'Aku lagi nulis skripsi soal infrastruktur kota. Kamu boleh jadi narasumber, hehe.',
       'Bawa kopi, nanti kuajari trik debugging.'],
      ['Kak! Pas banget, aku baru nemu bug lucu di sistem kampus.',
       'Kamu enak diajak ngobrol. Dosenku saja kalah.',
       'Aku sering catat jam-jam aneh di log. Nanti kutunjukkan.'],
      ['Kak, kamu itu partner riset terbaikku. Resmi, deh.',
       'Aku percaya kamu. Makanya aku berani cerita hal yang belum kutulis.',
       'Datanya makin menarik. Kamu pasti nggak mau ketinggalan.'],
      ['Kak, aku bangga banget bisa kenal kamu.',
       'Skripsiku sudah hampir jadi, dan separuhnya berkat kamu.',
       'Apa pun yang kamu temukan nanti, kita hadapi bareng ya.']
    ],
    talks: [
      scene('vira_low_1', 'low', [N('Kampus lagi ramai ujian. Semua orang begadang, lab penuh, Wi-Fi lemot.'), N('Kalau kamu jadi aku, mending belajar atau tidur?')], [
        opt('Tidur dulu, otak butuh istirahat.', 2, N('Setuju! Otak itu kayak CPU, kalau overheat malah salah hitung.', 'happy')),
        opt('Belajar sedikit, tidur sedikit.', 1, N('Kompromi ala mahasiswa. Boleh.')),
        opt('Begadang saja sampai selesai.', 0, N('Hih, itu yang bikin kantong matamu setebal buku.'))
      ]),
      scene('vira_low_2', 'low', [N('Aku koleksi flashdisk bekas. Katanya aneh, tapi isinya kadang lebih jujur daripada orangnya.'), N('Pernah nemu sesuatu yang menarik di barang bekas?')], [
        opt('Aku pernah menemukan catatan lama.', 2, N('Nah, itu dia! Barang bekas itu arsip yang tidak sengaja.', 'happy')),
        opt('Biasanya cuma sampah.', 1, N('Sampah buat orang lain, data buat kita.')),
        opt('Aku tidak suka barang bekas.', 0, N('Yah. Sayang sekali, padahal banyak harta karun.'))
      ]),
      scene('vira_mid_1', 'mid', [N('Kak, aku punya hobi aneh: mengumpulkan pola. Dan ada pola janggal di log infrastruktur kota.'), N('Tiap beberapa minggu, ada uji sambungan di jam yang sama persis. Pukul 02.17, tidak pernah meleset.')], [
        opt('Itu mirip tugas terjadwal otomatis.', 3, N('Yes! Kamu menangkap hal yang sama denganku. Tapi siapa yang menjadwalkannya?', 'happy')),
        opt('Mungkin ada orang yang rutin mengujinya.', 2, N('Manusia tidak sekonsisten itu, Kak. Mesin yang setia.')),
        opt('Bisa jadi kebetulan.', 0, N('Dua puluh tiga kali berturut-turut? Itu bukan kebetulan, itu tanda tangan.', 'serious'))
      ]),
      scene('vira_mid_2', 'mid', [N('Aku nggak suka gosip, tapi katanya ada surat-surat aneh bertanda SENTINEL.'), N('Anehnya, gaya bahasanya mirip dokumen pemeliharaan lama. Formal dan rapi, kayak orang yang sayang sama mesinnya.')], [
        opt('Kamu pikir pelakunya orang dalam?', 2, N('Atau orang yang dulu pernah merawat semua ini. Pertanyaannya, kenapa baru sekarang?')),
        opt('Aku juga ingin tahu siapa dia.', 3, N('Tim, kan? Nanti kita bandingkan catatan kita.', 'happy')),
        opt('Jangan ikut campur, Vira.', 0, N('Hmph. Kakak sendiri yang pertama ikut campur, lho.', 'serious'))
      ]),
      scene('vira_high_1', 'high', [N('Kak, jujur... aku pernah takut jadi orang yang cuma menonton dari pinggir.', 'worried'), N('Tapi kamu bikin aku berani ikut turun tangan. Skripsi dan kota ini sama-sama penting buatku.')], [
        opt('Kamu sudah berani dari awal.', 3, N('Hehe, kamu pandai menyenangkan hati orang.', 'happy')),
        opt('Kita lakukan ini bersama.', 3, N('Deal. Kita tim, bukan sekadar kenalan.', 'happy')),
        opt('Jangan sampai kamu terluka.', 2, N('Aku hati-hati kok. Sedikit.'))
      ]),
      scene('vira_high_2', 'high', [N('Aku cek lagi log uji tadi malam. Jamnya sama, bentuk datanya sama, bahkan salah ketiknya sama.', 'serious'), N('Kalau SENTINEL itu orang, dia terlalu teliti. Kalau dia mesin, dia terlalu manusiawi.')], [
        opt('Mungkin dua-duanya.', 3, N('Hah... itu teori paling gila, tapi paling masuk akal. Aku suka.', 'happy')),
        opt('Kita harus lihat ke kawasan industri.', 3, N('Kuhubungi kamu begitu aku selesai menelusuri alamat IP-nya.')),
        opt('Kamu terlalu banyak berpikir.', 1, N('Sudah bawaan, Kak. Mau diapakan.'))
      ])
    ],
    thanks: N('Makasih, Kak! Kamu penyelamat deadline-ku.', 'happy'),
    noOffer: { locked: 'Yang itu belum bisa kuceritakan, Kak. Kita ngobrol lebih banyak dulu ya.', none: 'Belum ada tugas baru dari aku. Nanti kukabari kalau ada.' },
    gift: {
      liked: [N('USB bekas! Kak, ini koleksi langka. Makasih banyak!', 'happy')],
      other: [N('Makasih, Kak! Aku simpan baik-baik.')]
    }
  },

  wulan: {
    greet: [
      ['Selamat datang di Klinik Pratama. Ada keluhan?',
       'Saya dokter Wulan. Silakan duduk.',
       'Kalau sehat, tidak perlu antre.'],
      ['Wajahmu agak pucat. Sudah tidur cukup?',
       'Kopi tidak menggantikan istirahat.',
       'Minum air putih. Itu saja dulu.'],
      ['Kamu datang lagi. Syukurlah, itu tanda kamu peduli pada dirimu.',
       'Klinik ini kecil, tetapi pintunya terbuka.',
       'Ada teh jahe di meja. Silakan.'],
      ['Saya senang melihatmu. Bagaimana kabar?',
       'Kamu sudah seperti keluarga bagi klinik ini.',
       'Kalau ada yang mengganjal, cerita saja.'],
      ['Kamu tahu pintu klinik ini selalu terbuka untukmu.',
       'Terima kasih sudah menjaga kota ini. Dan menjaga dirimu.',
       'Istirahatlah di sini kapan pun perlu.']
    ],
    talks: [
      scene('wulan_low_1', 'low', [N('Klinik ramai sejak pagi. Kebanyakan hanya batuk biasa.'), N('Kamu sendiri, kapan terakhir periksa kesehatan?')], [
        opt('Beberapa bulan lalu, Dok.', 2, N('Cukup baik. Jaga ritmenya.')),
        opt('Saya jarang periksa.', 1, N('Datanglah sesekali. Mencegah lebih mudah daripada mengobati.')),
        opt('Saya sehat-sehat saja.', 0, N('Orang sehat pun perlu dicek. Itu intinya.'))
      ]),
      scene('wulan_low_2', 'low', [N('Ramuan herbal di lemari itu buatan nenek saya. Saya masih percaya khasiatnya, selama dosisnya tepat.'), N('Kamu percaya obat tradisional?')], [
        opt('Selama ada penelitiannya, ya.', 2, N('Jawaban seorang ilmuwan. Saya suka.', 'happy')),
        opt('Kadang manjur untuk saya.', 1, N('Pengalaman juga data, asal dicatat.')),
        opt('Tidak terlalu percaya.', 0, N('Tidak masalah. Skeptis itu sehat.'))
      ]),
      scene('wulan_mid_1', 'mid', [N('Dua minggu lalu, listrik klinik padam pukul dua dini hari. Genset menyala sendiri, lalu mati lagi tepat lima menit kemudian.', 'worried'), N('Seperti ada yang sedang memeriksa apakah kami siap. Aneh.')], [
        opt('Apakah ada pasien yang terdampak?', 2, N('Tidak. Saat itu semua pasien sudah stabil. Seolah waktunya dipilih.', 'serious')),
        opt('Saya akan memeriksa sistem listriknya.', 3, N('Terima kasih. Saya lebih tenang kalau kamu yang melihat.', 'happy')),
        opt('Mungkin cuma gangguan PLN.', 0, N('Mungkin. Tetapi gangguan jarang punya rasa disiplin.'))
      ]),
      scene('wulan_mid_2', 'mid', [N('Saya pernah menemukan catatan di kotak genset. Tulisannya rapi: "Uji ketahanan selesai. Hasil: cukup. Perbaiki sambungan kedua."'), N('Tidak ada tanda tangan, hanya satu kata di pojok: SENTINEL.')], [
        opt('Itu bukan perusakan, itu pemeriksaan.', 3, N('Benar. Dan anehnya, sambungan kedua memang longgar. Saya sudah memperbaikinya.')),
        opt('Dokter simpan catatannya?', 2, N('Ada di laci. Kalau diperlukan, saya berikan.')),
        opt('Itu pasti orang iseng.', 0, N('Orang iseng tidak memperbaiki sambungan, Nak.', 'serious'))
      ]),
      scene('wulan_high_1', 'high', [N('Saya jarang bicara tentang diri sendiri. Tetapi terkadang, jadi dokter itu sepi.', 'worried'), N('Semua orang datang membawa masalah, hampir tak ada yang bertanya kabar saya. Kamu bertanya, dan saya ingat itu.')], [
        opt('Dokter juga perlu dirawat.', 3, N('Terima kasih. Kalimat sederhana yang jarang saya dengar.', 'happy')),
        opt('Saya selalu ada kalau Dokter butuh.', 3, N('Saya pegang kata-katamu.', 'happy')),
        opt('Semua pekerjaan memang melelahkan.', 1, N('Benar. Tetapi tidak semua orang sempat istirahat.'))
      ]),
      scene('wulan_high_2', 'high', [N('Kalau SENTINEL itu orang, saya ingin dia tahu: klinik ini pernah selamat karena peringatannya.', 'serious'), N('Seseorang yang peduli pada genset sebuah klinik tidak mungkin sepenuhnya jahat.')], [
        opt('Saya setuju, Dok.', 2, N('Kamu melihat dengan jernih.')),
        opt('Kita masih belum tahu motifnya.', 3, N('Betul. Karena itu, tolong selidiki dengan hati-hati. Jangan hukum sebelum paham.', 'serious')),
        opt('Tetap saja itu pelanggaran.', 1, N('Pelanggaran, ya. Tetapi niat juga perlu ditimbang.'))
      ])
    ],
    thanks: N('Terima kasih. Itu sangat membantu.', 'happy'),
    noOffer: { locked: 'Saya belum bisa meminta itu padamu. Kita saling kenal dulu.', none: 'Tidak ada keperluan baru dari klinik. Jaga dirimu.' },
    gift: {
      liked: [N('Obat herbal... ramuan seperti ini sulit dicari. Terima kasih, sangat tepat.', 'happy')],
      other: [N('Terima kasih. Saya simpan di lemari.')]
    }
  },

  sari: {
    greet: [
      ['Kapten Sari, Syahbandar. Kamu siapa dan urusanmu apa?',
       'Dermaga bukan tempat berkeliaran. Bicara cepat.',
       'Kalau tidak ada izin, jangan sentuh apa pun.'],
      ['Kamu lagi. Setidaknya kali ini kamu tidak menyentuh kontainer.',
       'Kapal masuk jam enam. Aku sibuk, tapi bicara saja.',
       'Pelabuhan ini lebih tua dari aku. Hormati.'],
      ['Hei, kamu sudah mulai dikenal anak buahku. Itu pujian.',
       'Manifest hari ini kacau, tapi bisa kuatasi. Ada apa?',
       'Duduk di bolder itu. Jangan di tali tambat.'],
      ['Kamu salah satu dari sedikit orang yang kupercaya di dermaga.',
       'Kalau ada masalah di perairan, kamu orang pertama yang kupanggil.',
       'Hari ini laut tenang. Jangan terlena.'],
      ['Kamu itu awak terbaik yang pernah kutemui tanpa seragam.',
       'Pelabuhan ini aman karena ada orang sepertimu.',
       'Kapan pun, dermaga ini punya tempat untukmu.']
    ],
    talks: [
      scene('sari_low_1', 'low', [N('Tiap hari saya mengawasi puluhan kapal. Jadwal sedikit meleset, kekacauan satu pelabuhan.'), N('Kamu bisa menjaga jadwal?')], [
        opt('Saya biasa disiplin soal waktu.', 2, N('Bagus. Di sini keterlambatan itu mahal.', 'happy')),
        opt('Tergantung situasinya.', 1, N('Jawaban jujur. Tapi laut tidak mengenal situasi.')),
        opt('Saya lebih suka santai.', 0, N('Santai di darat, boleh. Di dermaga, tidak.', 'serious'))
      ]),
      scene('sari_low_2', 'low', [N('Lihat peta pelabuhan di dinding itu? Gambar tangan, sudah dua puluh tahun. Setiap sudutnya kuhafal.'), N('Peta digital bisa saja hilang, kertas tidak.')], [
        opt('Peta tangan punya nilai tersendiri.', 2, N('Betul. Kamu mengerti.', 'happy')),
        opt('Digital lebih praktis.', 1, N('Praktis, sampai listriknya padam.')),
        opt('Peta itu sudah usang.', 0, N('Usang itu kata untuk yang tidak pernah berlayar.', 'serious'))
      ]),
      scene('sari_mid_1', 'mid', [N('Tiga hari lalu, kamera dermaga timur mati sebelas menit tanpa sebab. Setelah itu menyala lagi, rapi seperti tidak terjadi apa-apa.', 'serious'), N('Anehnya, tidak ada kontainer yang hilang. Seakan ada yang sekadar menghitung berapa lama kami sadar.')], [
        opt('Itu terdengar seperti uji sistem.', 3, N('Itu juga dugaanku. Dan hasilnya memalukan: kami baru sadar setelah sembilan menit.', 'worried')),
        opt('Saya bisa memeriksa lognya.', 2, N('Lakukan. Tapi jangan bocorkan ke awak. Mereka cepat panik.')),
        opt('Mungkin kamera rusak biasa.', 0, N('Kamera rusak tidak menyala sendiri tepat waktu.'))
      ]),
      scene('sari_mid_2', 'mid', [N('Aku menemukan secarik kertas terselip di manifest: "Pintu gudang tujuh tidak terkunci. Segera diperbaiki. SENTINEL."'), N('Pintu itu memang tidak terkunci. Aku tidak suka diberi tahu orang tak dikenal, tapi dia benar.')], [
        opt('Orang ini berniat baik.', 3, N('Niat baik bisa melanggar aturan. Aku masih bingung menilainya.')),
        opt('Kita lacak siapa dia.', 2, N('Aku sudah. Jejaknya mengarah ke kawasan industri. Hanya itu.', 'serious')),
        opt('Dia bisa saja mengancam kita.', 1, N('Bisa. Tapi ancaman jarang meninggalkan saran perbaikan.'))
      ]),
      scene('sari_high_1', 'high', [N('Dulu aku tidak pernah mengaku salah di depan anak buah. Terlalu keras kepala.', 'worried'), N('Setelah kamu muncul, aku belajar bahwa mendengar itu bukan kelemahan.')], [
        opt('Itu yang membuat Kapten dihormati.', 3, N('Hmph. Kamu pintar memuji tanpa terdengar menjilat.', 'happy')),
        opt('Semua orang belajar dari kesalahan.', 2, N('Betul. Dan sebagian lebih lambat dari yang lain.')),
        opt('Saya cuma bicara jujur.', 3, N('Justru itu langka di dermaga.', 'happy'))
      ]),
      scene('sari_high_2', 'high', [N('Aku sudah membaca semua catatan SENTINEL di gudang, kamera, derek. Gayanya konsisten: teliti, sabar, tidak pernah merusak.', 'serious'), N('Orang yang menulis ini bukan musuh. Tapi dia juga bukan seseorang yang tahu kapan harus berhenti.')], [
        opt('Mungkin dia sendiri tidak tahu kenapa.', 3, N('Hm. Itu pikiran yang dalam. Aku akan memikirkannya.')),
        opt('Kita hentikan dia dengan hati-hati.', 2, N('Setuju. Tanpa korban, tanpa keributan.')),
        opt('Saya tidak yakin kita perlu menghentikannya.', 3, N('Menarik. Jelaskan nanti, aku ingin dengar alasanmu.', 'serious'))
      ])
    ],
    thanks: N('Bagus. Tugas selesai, terima kasih.', 'happy'),
    noOffer: { locked: 'Belum. Kamu belum cukup lama di dermaga untuk tugas itu.', none: 'Tidak ada perintah baru. Istirahat dulu.' },
    gift: {
      liked: [N('Peta Pelabuhan! Kamu tahu selera kapten. Terima kasih banyak.', 'happy')],
      other: [N('Diterima. Kuhargai.')]
    }
  }
};
