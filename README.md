# Pocket Hack

Game hacker terminal **open-world** untuk mobile, dibungkus dengan
**Capacitor** (Android). Terinspirasi game bergaya terminal/Null Byte, dengan
gameplay mengikuti desain **GHOSTLINK**: investigasi dan kontrol sistem,
**tanpa mengetik**, **tanpa timer**, **tanpa sistem Trace**.

> Semua jaringan, perangkat, file, dan "celah" di dalam game sepenuhnya fiktif.
> Ini puzzle deduksi, bukan alat atau simulasi peretasan nyata.

## Dunia

Kamu operator di kota **Surabaya**. Jelajahi peta, ambil job, retas target,
kumpulkan kredit & reputasi, naikkan rank (Script Kiddie → NULLBYTE), dan
belanja tool/upgrade di pasar gelap. Progres tersimpan antar sesi.

## Bottom bar 3-konteks

Navigasi utama ada di bottom bar yang **berubah sesuai tempatmu**:

- **DUNIA** (menjelajah): 🗺️ Peta · 📡 Job · ▲ JACK IN · 🛒 Pasar · 👤 Profil
- **JARINGAN** (sudah jack-in ke 1 target): 🌐 Node · 🧰 Rig · ▲ SCAN/CONNECT · 🎯 Misi · 📟 Log — `‹` di status bar = Jack Out
- **PERANGKAT** (masuk 1 device): 📁 File · ⚙️ Sistem · ▲ READ/DL · 📟 Log · ⏏ Keluar — `‹` di status bar = Disconnect

Tombol **Aksi tengah (FAB)** menjalankan perintah utama objek yang disorot.
**Tap objek** (node/file/proses/kontrol, atau kartu perangkat di scene device)
membuka sheet berisi semua perintah + alasan kalau terkunci.

## Command

- **Jaringan:** `SCAN`, `INSPECT`, `CONNECT`, `DISCONNECT`
- **Akses:** `LOGIN`, `CRACK`, `EXPLOIT`, `ELEVATE`
- **File:** `READ`, `DOWNLOAD`, `RECOVER`, `DECRYPT`, `COMPARE`
- **Sistem:** `START`, `STOP`, `CONFIG`, `RESTORE`, `CONTROL`
- Tool aktif dibatasi **RAM** (bukan energi per-tindakan).

## Target (v1)

| Kode | Judul          | Mengajarkan |
|------|----------------|-------------|
| K-00 | Antrean Cetak  | scan → connect → read → login → stop proses → download |
| C-02 | Mata Parkir    | exploit + control (matikan kamera) |
| A-07 | Blueprint Asli | dua jalur (perbaiki server **atau** pulihkan backup) + COMPARE |
| V-03 | Brankas Dingin | crack + decrypt + COMPARE (bukti angka dipalsukan) |

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest (20 test)
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
