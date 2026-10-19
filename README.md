# Pocket Hack

Game hacker terminal **open-world** untuk mobile, dibungkus dengan
**Capacitor** (Android). Terinspirasi game bergaya terminal/Null Byte, dengan
gameplay mengikuti desain **GHOSTLINK**: investigasi dan kontrol sistem,
**tanpa mengetik**, **tanpa timer**, **tanpa sistem Trace**.

> Semua jaringan, perangkat, file, dan "celah" di dalam game sepenuhnya fiktif.
> Ini puzzle deduksi, bukan alat atau simulasi peretasan nyata.

## Dunia

Kamu operator di kota **Surabaya**. Kota adalah **satu jaringan besar**
(30+ node di 5 distrik: Utara, Barat, Tengah, Timur, Selatan) yang saling
terhubung lewat hotspot dan backbone ISP. Peta menampilkan node yang sudah
kamu temukan: `CONNECT` untuk masuk, `SCAN` untuk melihat tetangganya
(CONNECT tidak otomatis men-scan). Misi dibangun di atas node-node kota itu.

Rigmu masuk lewat **Inti ISP**. Di luar jaringan, CMDS → CONNECT hanya
menawarkan Inti ISP; setelah terhubung, hanya **tetangga yang sudah kamu
SCAN**. Misi diserahkan **langsung ke pemberinya** (dialog → "Serahkan
tugas"), bukan dari menu Goals.

**Misi diberikan NPC** lewat dialog ("Ada kerjaan?"). Menerima misi
memunculkan node awalnya di peta. Kedekatan dengan NPC membuka misi
berikutnya dan keuntungan (diskon, hint murah, Fokus, dll).

## Hari, Fokus, dan kontrak

- **Hari & Fokus:** tiap perintah memakai Fokus; makin lelah, aksi makin
  mahal dan loading makin lama (tidak pernah memblokir). Tidur di **Safehouse**
  memulai hari baru dan memakan **waktu nyata: 1 menit per poin Fokus** (tetap
  berjalan walau aplikasi ditutup; BANGUN = bangun lebih awal). Event mingguan: Lomba, Hari Pasar, Pemadaman.
- **Kontrak perawatan:** setelah misi selesai, klien menawarkan tugas harian
  (buka File Server di node awalnya) untuk kredit rutin.
- Semua perintah berjalan di balik **loading layar penuh**; Overclock di
  Pasar mempercepatnya. Hint berbayar kredit.

## Navigasi

Bottom bar: **Peta · Terminal · Goals · Pasar · Profil**. Terminal punya
tombol **CMDS** (grup Eksplorasi, Akses, Server, Automation). Command
**Server** (`FILES`, `SERVICES`, `CONTROL`) membuka halaman File / Service /
Control node yang terhubung; `READ`, `DOWNLOAD`, `DECRYPT`, `STOP`, `START`,
`CONFIG`, dll. dipakai dengan mengetuk file/proses di halaman itu.

## Dialog (gaya visual novel)

Dialog memakai slot **gambar standing** NPC, kotak teks dengan efek ketik, ketuk
untuk lanjut, dan pilihan yang menambah kedekatan. Teks ada di
`src/game/dialogues.js` (terpisah dari logika). Gambar NPC belum ada — dipakai
siluet placeholder. Untuk memasangnya: taruh PNG transparan (pose berdiri,
sekitar 800×1400) di `public/portraits/` lalu isi nama file di
`src/ui/portraits.js` (mood: `normal`, `happy`, `worried`, `serious`).

## Target

| Kode | Judul | Pemberi | Mengajarkan |
|------|-------|---------|-------------|
| K-00 | Antrean Cetak | Bu Laras | scan → connect → read → login → stop proses → download |
| B-04 | Kasir Ngadat | Bu Laras (lv.1) | petunjuk akun di node lain + stop proses |
| C-02 | Mata Parkir | Rani | exploit + control (matikan kamera) |
| R-05 | Siaran Gelap | Rani (lv.2) | crack sandi studio + bukti + matikan pemancar |
| T-06 | Arsip Sekolah | Dimas | petunjuk kunci di node lain + decrypt |
| A-07 | Blueprint Asli | Dimas (lv.1) | dua jalur (perbaiki server **atau** pulihkan backup) + COMPARE |
| V-03 | Brankas Dingin | Mbah Gun | crack + decrypt + COMPARE |

Data kota ada di `src/city/` (node, tata letak peta, builder graf); misi di
`src/sites/` (bisa menempelkan file ke node kota lewat `patches`).

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run build      # -> dist/
```

## Build Android (Capacitor)

```bash
npm run build
npx cap add android       # sekali saja; folder android/ tidak di-commit
npm run cap:sync          # build + sync web ke android
npm run cap:open          # buka di Android Studio
```

CI juga menyediakan workflow **Build Debug APK** (`.github/workflows/android.yml`,
jalankan manual dari tab Actions). Web di-deploy otomatis ke GitHub Pages.

## Struktur

```
src/
  engine/    logika murni tanpa DOM — core.js (run/akses/file), actions.js (perintah)
  game/      profile, world (peta+site), market, progression (rank)
  sites/     konten target (data-driven): s00..s03 + index
  ui/app.js  render 3-scene + bottom bar + interaksi
  platform/  storage.js (localStorage / Capacitor Preferences + haptics)
tests/       vitest (engine + world/market/progression)
```

## Menambah target

Buat file di `src/sites/`, daftarkan di `src/sites/index.js`, lalu tambahkan
metadata peta (district, posisi, difficulty, repReward, unlockRep) di
`src/game/world.js`. Isi site = `world.devices` (file/proc/control), `creds`,
`clues`, `diffs`, `objectives`, `hints`, `endings`. Engine tidak perlu disentuh.
