// English for s12. Key = exact Indonesian text; {1} {2} are positional args.
// SAME lists strings that must stay identical in English (names, codes).
export default {
  en: {
    "Klinik: Jadwal Obat Kacau":
      "Clinic: Medicine Schedule Mix-up",
    "dr. Wulan, Klinik Pratama Pelabuhan Timur":
      "Dr. Wulan, Pelabuhan Timur Primary Clinic",
    "Jadwal minum obat di farmasi klinik tidak sama dengan resep dokter, dan dispenser obat otomatis mengikuti jadwal farmasi. Bandingkan jadwal dokter dengan jadwal farmasi (COMPARE), lalu betulkan baris yang salah (EDIT, ◆130 — beli di Pasar Gelap). Sistem farmasi butuh akun apoteker dan ada proses sinkron yang mengunci berkasnya.":
      "The medicine schedule in the clinic pharmacy does not match the doctor's prescriptions, and the automatic dispenser follows the pharmacy schedule. Compare the doctor's schedule with the pharmacy's (COMPARE), then fix the wrong line (EDIT, ◆130 — buy it at the Black Market). The pharmacy system needs a pharmacist account, and a sync process locks its file.",
    "Server Farmasi Klinik":
      "Clinic Pharmacy Server",
    "Server farmasi klinik. Tertutup untuk tamu — butuh akun apoteker.\nAda proses \"autosync\" yang menyalin jadwal ke dispenser dan menahan berkasnya.":
      "The clinic pharmacy server. Closed to guests — needs a pharmacist account.\nA \"autosync\" process copies the schedule to the dispenser and holds its file.",
    "JADWAL FARMASI — OBAT PASIEN RAWAT\n\nBu Yanti — Amlodipin 5 mg: 1x sehari, pagi\nPak Anto — Metformin 500 mg: 3x sehari, sesudah makan\nBu Yuli — Amoksisilin 500 mg: 3x sehari, tiap 8 jam":
      "PHARMACY SCHEDULE — INPATIENT MEDICINE\n\nBu Yanti — Amlodipine 5 mg: 1x a day, morning\nPak Anto — Metformin 500 mg: 3x a day, after meals\nBu Yuli — Amoxicillin 500 mg: 3x a day, every 8 hours",
    "Pak Anto — Metformin 500 mg: 1x sehari, pagi":
      "Pak Anto — Metformin 500 mg: 1x a day, morning",
    "Pak Anto — Metformin 500 mg: 2x sehari, sesudah makan":
      "Pak Anto — Metformin 500 mg: 2x a day, after meals",
    "Bu Yanti — Amlodipin 5 mg: 2x sehari, pagi":
      "Bu Yanti — Amlodipine 5 mg: 2x a day, morning",
    "Bu Yuli — Amoksisilin 500 mg: 2x sehari, tiap 8 jam":
      "Bu Yuli — Amoxicillin 500 mg: 2x a day, every 8 hours",
    "JADWAL FARMASI — OBAT PASIEN RAWAT\n\nBu Yanti — Amlodipin 5 mg: 1x sehari, pagi\nPak Anto — Metformin 500 mg: 2x sehari, sesudah makan\nBu Yuli — Amoksisilin 500 mg: 3x sehari, tiap 8 jam":
      "PHARMACY SCHEDULE — INPATIENT MEDICINE\n\nBu Yanti — Amlodipine 5 mg: 1x a day, morning\nPak Anto — Metformin 500 mg: 2x a day, after meals\nBu Yuli — Amoxicillin 500 mg: 3x a day, every 8 hours",
    "Jadwal farmasi kini sama dengan resep dokter.":
      "The pharmacy schedule now matches the doctor's prescriptions.",
    "LOG FARMASI\n\n[06:00] autosync: menyalin jadwal ke dispenser\n[06:01] autosync: menahan jadwal_farmasi.txt (sedang disalin)\n[06:40] apoteker: ada pasien tanya, kok dosis Pak Anto beda dengan di buku dokter?\n[06:41] apoteker: nanti dicek, belum sempat.":
      "PHARMACY LOG\n\n[06:00] autosync: copying schedule to dispenser\n[06:01] autosync: holding jadwal_farmasi.txt (copy in progress)\n[06:40] pharmacist: a patient asked why Pak Anto's dose differs from the doctor's book?\n[06:41] pharmacist: will check later, no time yet.",
    "Menyalin jadwal ke dispenser. Sedang menahan jadwal_farmasi.txt.":
      "Copies the schedule to the dispenser. Currently holding jadwal_farmasi.txt.",
    "Dispenser Obat Otomatis":
      "Automatic Medicine Dispenser",
    "Dispenser obat di ruang rawat. Mode MANUAL: perawat mengeluarkan obat sendiri.\nMode OTOMATIS mengikuti jadwal farmasi — nyalakan hanya kalau jadwalnya sudah benar.":
      "Medicine dispenser in the ward. MANUAL mode: nurses hand out medicine themselves.\nAUTOMATIC mode follows the pharmacy schedule — switch it on only once the schedule is correct.",
    "CATATAN DISPENSER\n\nMode OTOMATIS membaca jadwal_farmasi.txt tiap pagi.\nSejak ada selisih dosis, perawat mengeluarkan obat manual dari buku dokter.\nKalau jadwal sudah dibetulkan, pindahkan ke OTOMATIS.":
      "DISPENSER NOTES\n\nAUTOMATIC mode reads jadwal_farmasi.txt every morning.\nSince the dose mismatch, nurses have been handing out medicine manually from the doctor's book.\nOnce the schedule is fixed, switch to AUTOMATIC.",
    "Mode Dispenser":
      "Dispenser Mode",
    "Dispenser kini mengikuti jadwal farmasi. Pastikan jadwal itu sudah benar.":
      "The dispenser now follows the pharmacy schedule. Make sure that schedule is correct.",
    "apoteker @ Server Farmasi Klinik":
      "pharmacist @ Clinic Pharmacy Server",
    "Akun apoteker klinik":
      "Clinic pharmacist account",
    "Catatan di meja pendaftaran memuat akun apoteker untuk server farmasi.":
      "A note on the registration desk holds the pharmacist account for the pharmacy server.",
    "Selisih dosis":
      "Dose mismatch",
    "Dosis Metformin Pak Anto di farmasi (3x) berbeda dari resep dokter (2x).":
      "Pak Anto's Metformin dose in the pharmacy (3x) differs from the doctor's prescription (2x).",
    "PERBEDAAN DITEMUKAN\n\n1. Judul berkas — hanya penulisan, tidak berpengaruh.\n2. Pak Anto — Metformin 500 mg:\n   dokter  : 2x sehari, sesudah makan\n   farmasi : 3x sehari, sesudah makan   <-- DOSIS BERLEBIH\n3. Baris lain sama persis.":
      "DIFFERENCES FOUND\n\n1. File title — wording only, no effect.\n2. Pak Anto — Metformin 500 mg:\n   doctor   : 2x a day, after meals\n   pharmacy : 3x a day, after meals   <-- EXCESS DOSE\n3. All other lines are identical.",
    "CATATAN MEJA PENDAFTARAN\n\n- Stok masker menipis, pesan lagi.\n- Server farmasi: kalau apoteker cuti, pakai akun \"apoteker\" sandi \"puskes2024\".\n  (Jangan difoto, ya.)\n- Ganti galon, Jumat.":
      "REGISTRATION DESK NOTES\n\n- Masks running low, order more.\n- Pharmacy server: if the pharmacist is on leave, use account \"apoteker\" password \"puskes2024\".\n  (Please don't photograph this.)\n- Change the water jug, Friday.",
    "RESEP DOKTER — OBAT PASIEN RAWAT\n\nBu Yanti — Amlodipin 5 mg: 1x sehari, pagi\nPak Anto — Metformin 500 mg: 2x sehari, sesudah makan\nBu Yuli — Amoksisilin 500 mg: 3x sehari, tiap 8 jam":
      "DOCTOR'S PRESCRIPTION — INPATIENT MEDICINE\n\nBu Yanti — Amlodipine 5 mg: 1x a day, morning\nPak Anto — Metformin 500 mg: 2x a day, after meals\nBu Yuli — Amoxicillin 500 mg: 3x a day, every 8 hours",
    "Masuk ke server farmasi sebagai apoteker":
      "Log in to the pharmacy server as the pharmacist",
    "Buktikan selisih dosis dengan COMPARE":
      "Prove the dose mismatch with COMPARE",
    "Betulkan jadwal_farmasi.txt dengan EDIT":
      "Fix jadwal_farmasi.txt with EDIT",
    "(Bonus) Pindahkan dispenser ke mode OTOMATIS":
      "(Bonus) Switch the dispenser to AUTOMATIC mode",
    "Kamu butuh EDIT (◆130, beli di Pasar Gelap) untuk membetulkan jadwal. Akun farmasi ada di catatan meja PC Klinik Pratama.":
      "You need EDIT (◆130, buy it at the Black Market) to fix the schedule. The pharmacy account is on the registration desk notes on the Clinic PC.",
    "CONNECT ke Server Farmasi Klinik lalu LOGIN dengan akun apoteker.":
      "CONNECT to the Clinic Pharmacy Server, then LOGIN with the pharmacist account.",
    "Jadwal farmasi terkunci. Buka Service Server dan STOP proses autosync.":
      "The pharmacy schedule is locked. Open Service Server and STOP the autosync process.",
    "DOWNLOAD jadwal_obat_dokter.txt dari PC Klinik, lalu COMPARE dengan jadwal_farmasi.txt di server farmasi.":
      "DOWNLOAD jadwal_obat_dokter.txt from the Clinic PC, then COMPARE it with jadwal_farmasi.txt on the pharmacy server.",
    "Di server farmasi, pilih jadwal_farmasi.txt → COMPARE → jadwal_obat_dokter.txt.":
      "On the pharmacy server, pick jadwal_farmasi.txt → COMPARE → jadwal_obat_dokter.txt.",
    "EDIT jadwal_farmasi.txt: pilih baris Pak Anto dengan dosis yang sama seperti resep dokter. Salah pilih tidak merusak apa pun.":
      "EDIT jadwal_farmasi.txt: pick Pak Anto's line with the same dose as the doctor's prescription. A wrong pick breaks nothing.",
    "Bonus: sambungkan ke Dispenser Obat Otomatis lalu CONTROL → Mode → OTOMATIS.":
      "Bonus: connect to the Automatic Medicine Dispenser, then CONTROL → Mode → AUTOMATIC.",
    "Laporkan ke dr. Wulan: jadwal sudah benar":
      "Report to Dr. Wulan: the schedule is correct",
    "dr. Wulan memeriksa jadwal satu per satu, lalu mengangguk pelan. Pak Anto mendapat dosis yang tepat sejak malam itu, dan perawat tidur lebih tenang.":
      "Dr. Wulan checks the schedule line by line, then nods slowly. Pak Anto gets the right dose from that night on, and the nurses sleep easier.",
    "Klinik — jadwal obat farmasi tidak sama dengan resep dokter.":
      "Clinic — pharmacy medicine schedule does not match the doctor's prescriptions.",
    "Ada yang tidak beres di farmasi. Jadwal obat di sana tidak sama dengan resep saya.":
      "Something is wrong in the pharmacy. The medicine schedule there does not match my prescriptions.",
    "Satu pasien sudah bertanya soal dosisnya. Saya belum tahu sumber salahnya.":
      "A patient has already asked about the dose. I do not yet know where the error comes from.",
    "Bandingkan jadwal dokter dengan jadwal farmasi, lalu betulkan. Kamu butuh perintah EDIT dari Pasar Gelap.":
      "Compare the doctor's schedule with the pharmacy's, then fix it. You will need the EDIT command from the Black Market.",
    "Saya periksa, Dok.":
      "I'll look into it, Doctor.",
    "Nanti dulu, Dok.":
      "Not right now, Doctor.",
    "Terima kasih. Pelan-pelan saja, tapi jangan terlalu lama.":
      "Thank you. Take it slowly, but not too slowly.",
    "Baik. Kabari saya kalau berubah pikiran.":
      "All right. Let me know if you change your mind.",
    "Sudah sama persis. Dosis Pak Anto kembali dua kali sehari.":
      "They match exactly. Pak Anto is back to twice a day.",
    "Terima kasih. Obat herbal ini buat kamu — untuk malam-malam panjang.":
      "Thank you. This herbal medicine is for you — for the long nights."
  },
  same: []
};
