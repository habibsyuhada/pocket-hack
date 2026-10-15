# Pocket Hack

Game hacker terminal untuk mobile, dibungkus dengan **Capacitor** (Android).
Terinspirasi game bergaya terminal/Null Byte, tapi gameplay-nya mengikuti
desain **GHOSTLINK**: investigasi dan kontrol sistem, **tanpa mengetik**,
**tanpa timer**, dan **tanpa sistem Trace**.

> Semua jaringan, perangkat, file, dan "celah" di dalam game sepenuhnya fiktif.
> Game ini adalah puzzle deduksi, bukan alat atau simulasi peretasan nyata.

## Ide inti

Terminal dipakai untuk **menyelidiki dan mengubah dunia game**, bukan sekadar
menekan tombol "Hack". Fondasinya tiga hal:

1. **File berisi petunjuk** yang benar-benar berguna.
2. **Hak akses** (tamu → user → admin) menentukan tindakan yang tersedia.
3. **Perintah berdampak nyata** pada sistem (menghentikan proses membuka file,
   memperbaiki konfigurasi menghidupkan layanan, dll).

Command dipilih lewat **tombol kontekstual**: pilih objek (perangkat, file,
proses, kontrol) → game menampilkan perintah yang masuk akal untuk objek itu.
Perintah yang belum bisa dipakai tetap terlihat, lengkap dengan **alasannya**,
supaya pemain belajar apa yang kurang.

## Command

- **Jaringan:** `SCAN`, `INSPECT`, `CONNECT`, `DISCONNECT`
- **Akses:** `LOGIN`, `CRACK` (puzzle kandidat sandi), `EXPLOIT`, `ELEVATE`
- **File:** `READ`, `DOWNLOAD`, `RECOVER`, `DECRYPT`, `COMPARE`
- **Sistem:** `PS` (lewat tab Sistem), `START`, `STOP`, `CONFIG`, `RESTORE`, `CONTROL`
- **Rig:** mengaktifkan tool dibatasi **RAM** (bukan energi per-tindakan)

## Kontrak yang sudah ada

| Kode  | Judul          | Mengajarkan |
|-------|----------------|-------------|
| K-00  | Antrean Cetak  | scan → connect → read → login → stop proses → download |
| A-07  | Blueprint Asli | dua jalur (perbaiki server **atau** pulihkan backup) + investigasi COMPARE |

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
npx cap add android      # sekali saja; folder android/ tidak di-commit
npm run cap:sync         # build + sync web ke android
npm run cap:open         # buka di Android Studio
```

Atau pakai GitHub Actions: workflow **Build Debug APK**
(`.github/workflows/android.yml`, jalankan manual lewat tab Actions).

## Struktur

```
src/
  engine/     logika game murni (tanpa DOM) — core.js, actions.js
  missions/   konten kontrak (data-driven)
  ui/         app.js (render + interaksi)
  platform/   storage.js (localStorage / Capacitor Preferences + haptics)
  main.js     boot + tombol back Android
tests/        vitest
```

## Menambah kontrak

Buat file di `src/missions/`, daftarkan di `src/missions/index.js`. Satu misi
adalah objek data: `world.devices` (file, proses, kontrol), `creds`, `clues`,
`diffs`, `objectives`, `hints`, dan `endings`. Tidak perlu menyentuh engine.
