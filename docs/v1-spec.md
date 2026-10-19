# Pocket Hack v1 — spesifikasi konten

Kerangka mesin sudah ada (lihat README). Dokumen ini = kontrak untuk **menulis misi dan dialog baru**.
Bahasa sumber = **Bahasa Indonesia** (santai, hangat, tanpa jargon berlebihan). Semua sistem **fiktif**; pemain adalah
pemulih/penguji keamanan yang dibayar warga, bukan penjahat. Tidak ada nama perusahaan/orang nyata.

## 1. Berkas yang boleh disentuh (tiap misi)
- `src/sites/sNN_*.js` — file misi (sudah ada sebagai *stub*, timpa isinya).
- `tests/missions_sNN.test.js` — tes solusi (pakai `tests/helpers/city.js`).
- `src/i18n/extra/sNN.js` — terjemahan Inggris untuk semua teks misi (`en: {kunci Indonesia persis: 'English'}`, `same: [...]` untuk teks yang memang sama, mis. nama/kode).
Jangan edit berkas lain. Butuh perubahan mesin? Tulis di laporan akhir, jangan ubah sendiri.

## 2. Bentuk file misi (lihat `src/sites/s04_warung.js` sebagai contoh utuh)
```js
import { N, Y, offer } from '../game/dlg.js';
export default {
  id: 's07', code: 'B-07', title: '…', client: '…', reward: 150, brief: '…',   // reward = kredit saat tamat
  entry: ['s07_papan'],                 // node awal (muncul di peta saat misi diterima)
  world: { devices: { s07_papan: { id, name, kind, addr, online: true, inspect: '…', files: [...], procs: [...], controls: [...], links: [...] } } },
  creds: { s07_admin: { label, account, device, level } },   // kunci unik, awalan sNN_
  clues: { s07_note: { title, text } },
  diffs: { 'fileA|fileB': { text, onRead } },                 // COMPARE (kunci = id kedua file, diurutkan alfabet, dipisah |)
  patches: { pos_satpam: { files: [ {...} ] } },              // tambah file/proc/uploads/routes ke node kota yang sudah ada
  edges: [['pos_satpam', 's07_papan']],                       // tautan dua arah ke jaringan kota (WAJIB: node awal harus terjangkau dari isp_core)
  place: { s07_papan: [3, 5, 'tengah'] },                     // [kolom, baris, distrik] — hanya sel yang dialokasikan untukmu
  objectives: [ { id, text, main?: true, bonus?: true, done: (run) => … } ],  // satu `main`
  hints: [ { when: (run, profile) => …, text } ],             // urut; yang pertama cocok ditampilkan
  endings: [ { id, label, reward, requires: (run) => …, text, unlockTools?: [...] } ],
  meta: { giver: 'hadi', minLevel: 0, district: 'Tengah', difficulty: 1, repReward: 50, short: 'Satu kalimat untuk papan misi.', requires: ['s17'] /* opsional: misi yang harus tamat dulu */ },
  items: { nasi: 1 },                   // hadiah barang saat tamat pertama (opsional)
  drop: 'kue',                          // barang dari kontrak harian (opsional)
  dialogue: {
    offer: offer([N('…'), N('…', 'worried')], 'Aku bantu.', 'Nanti dulu.', [N('…')], [N('…')]),   // saat pemberi menawarkan misi
    turnIn: [N('…'), N('…', 'happy')]                                                           // saat pemain menyerahkan hasil
  }
};
```
Mood dialog: `normal | happy | worried | serious`. Garis dialog: `N(teks, mood)` = NPC, `Y(teks)` = pemain.

## 3. Aturan keras
1. **Semua id baru berawalan id misi**: node `s07_papan`, file `s07_menu`, proc `s07_sync`, kontrol `s07_tx`, cred/clue `s07_note`. (Id file/proc harus unik se-kota; tes city memeriksa.)
2. Boleh membaca/menambal node kota lama lewat `patches` (id node lama: lihat `src/city/nodes.js`, `src/sites/s0*.js`), tapi **jangan mengubah file yang sudah ada**, hanya menambah.
3. Node awal harus terjangkau: `edges` menghubungkannya ke node kota yang bisa dicapai pemain (hotspot distrik atau tetangganya). Jalur masuk ke node bertingkat dijaga puzzle: node tanpa `open` berakses `none` sampai LOGIN/CRACK/EXPLOIT; tetangga baru bisa di-CONNECT bila ada node berakses ≥ tamu yang terhubung ke sana (`reachable`).
4. Misi harus **bisa diselesaikan hanya dengan** command bawaan + hal yang dijelaskan hint pertama. Command/tool berbayar yang WAJIB (EDIT ◆130, UPLOAD ◆110, ROUTE ◆90, Cipher ◆120, Tracer ◆140, Sniffer ◆110, SEARCH ◆70) harus disebut di `brief` dan hint pertama ("beli di Pasar Gelap").
5. Ada ≥ 2 jalan gagal/menjebak yang pesannya mengajar (mis. sandi salah, file terkunci proses), tapi **tidak ada jalan buntu permanen**.
6. Teks selalu bahasa Indonesia, hangat, ringkas. Isi file = dunia: pengumuman, log, catatan; beri petunjuk lewat cerita, bukan perintah telanjang.
7. Setiap misi: 1 objective `main`, 2–4 objective lain, 0–1 `bonus`, ≥ 1 `endings` (finale s21 = 3).
8. Alokasi sel peta HANYA yang tercantum di tabel §5. Sel NPC (`NPC_CELLS`) dan sel Safehouse/Pasar/Kontrak jangan dipakai.

## 4. Mesin: fitur command baru yang boleh dipakai di data
| Fitur | Properti data | Efek |
|---|---|---|
| **ROUTE** | di node relay: `routes: ['id_tujuan'], routeAccess: 'user'\|'admin'` | pemain (punya command ROUTE) bisa lompat dari node itu ke tujuan yang **tidak** tertaut. Tujuan tak muncul di CONNECT biasa. Tambahkan `routes` ke node kota lewat `patches`. |
| **UPLOAD** | di node penerima: `uploads: [{ file: 'id_file_lokal', minAccess: 'user', text, fx }]` | file lokal (hasil DOWNLOAD) dikirim ke node; `fx` = efek (flags/clues/creds/reveal/online/log). |
| **EDIT** | di file: `edit: { options: ['…','…'], answer: '…', minAccess: 'admin', result: { content: '…' }, onDone: fx }` | pemain memilih satu opsi; benar → file berubah (`result`) + efek. Salah → tak berubah, boleh coba lagi. |
| **TRACE** (butuh tool Tracer) | di file: `trace: { text: '…', fx }` | membuka lembar hasil lacak + efek. Sekali per file. |
| **Sniffer** (tool) | di node: `sniff: { text: '…', fx }` | INSPECT menampilkan teks tambahan + efek bila pemain punya Sniffer. |
| **PING** | otomatis | cek online/offline; node `online:false` menjadi online lewat efek `online: [id]`. |
Efek `fx`: `{ flags: [], clues: [], creds: [], reveal: [nodeId], online: [nodeId], log: 'teks' }`.
Existing yang bisa dipakai: `crack`, `exploit`, `elevate`, `procs` (lock, config, onStop/onStart), `controls`, file `encrypted`, `deleted/corrupt` (RECOVER, perlu Mender), `compare`+`diffs`, `onRead/onDownload`, `requiresProc`. Contoh semuanya ada di `src/sites/s00..s06`.

## 5. Alokasi: misi, pemberi, sel peta
Sel = `[kolom, baris, distrik]`. Hotspot sudah ada: `tengah_hub, utara_hub, barat_hub, timur_hub, selatan_hub, industri_hub`; node umum baru: `kelurahan_nas, pos_satpam, gate_tol, menara_relay`.

| Misi | Judul | Pemberi / minLevel | Diff | Reward ◆ / rep | Sel | Fitur yang diajarkan / dipakai |
|---|---|---|---|---|---|---|
| s07 | Papan Iklan Dibajak | laras / 2 | 1 | 150 / 50 | `[3,5,tengah]` | INSPECT, LOGIN (sandi bawaan pabrik dari tempelan/buku jaga di `pos_satpam`), STOP proses |
| s08 | Printer Kelurahan | hadi / 0 | 1 | 170 / 50 | `[4,4]`,`[5,4]` tengah | RECOVER (Mender), DOWNLOAD; jalur lewat `kelurahan_nas` |
| s09 | Absensi Loket Bus | rani / 1 | 2 | 200 / 60 | `[6,1]`,`[7,1]` utara | READ banyak file, SEARCH (opsional, bukan wajib); petunjuk dari `gate_tol` |
| s10 | Wi-Fi Asrama | vira / 0 | 2 | 220 / 60 | `[0,4]`,`[1,4]`,`[0,5]` barat | CRACK dengan kandidat dari 2 petunjuk berbeda |
| s11 | Surat Tanpa Pengirim | hadi / 1 (+requires s08) | 2 | 260 / 80 | `[3,4,tengah]` | TRACE (Tracer ◆140); petunjuk pertama SENTINEL: pengirim di "kawasan industri" (flag `sentinel_industri`) |
| s12 | Klinik: Jadwal Obat Kacau | wulan / 0 | 3 | 320 / 90 | `[6,7]`,`[6,8]` timur | COMPARE jadwal dokter vs farmasi, EDIT (◆130) |
| s13 | Kapal Nelayan Hilang Sinyal | sari / 0 | 3 | 340 / 100 | `[9,5]`,`[10,5]`,`[10,6]` timur | PING (node offline), ROUTE lewat `pemancar` (patch `routes`), START layanan |
| s14 | Syahbandar: Manifest Palsu | sari / 1 | 3 | 380 / 110 | `[9,7]`,`[9,8]`,`[10,8]`,`[10,9]` timur | COMPARE dua manifest, EDIT; dua akhir (lapor / benahi diam-diam) |
| s15 | Server Himpunan | vira / 1 | 3 | 400 / 110 | `[0,11]`,`[1,11]`,`[2,11]`,`[1,12]` barat | DECRYPT (Cipher ◆120), kunci disimpulkan dari 2 file di node berbeda |
| s16 | Bursa: Dompet Beku | gun / 1 | 4 | 420 / 120 | `[1,13]`,`[1,14]`,`[2,14]`,`[0,14]` selatan | ELEVATE; pilihan moral: kembalikan dana ke korban / ambil upah / keduanya sebagian (3 ending) |
| s17 | Gang Belakang: Relay Gelap | gun / 2 | 4 | 460 / 140 | `[6,12]`,`[6,14]`,`[7,12]` selatan | UPLOAD (◆110) patch; hasil akhir: akses **admin** di `menara_relay` (patch node itu — beri jalur elevate/cred yang selesai oleh misi) → membuka ROUTE ke Industri |
| s18 | Gardu Listrik | hadi / 3 (+requires s17) | 4 | 560 / 170 | `[9,11]`,`[10,11]`,`[11,11]`,`[8,12]` industri | SERVICES: urutan STOP/START benar, salah urutan → flag & log alarm (tidak buntu); `edges` dari `industri_hub` |
| s19 | Menara Air | wulan / 3 (+requires s17) | 4 | 600 / 180 | `[12,12]`,`[13,12]`,`[13,13]`,`[12,14]` industri | CONFIG nilai aman dari spesifikasi, RESTORE, Sniffer (opsional) |
| s20 | Gudang Pendingin | gun / 3 (+requires s17) | 4 | 640 / 190 | `[9,14]`,`[10,15]`,`[9,15]`,`[8,14]` industri | UPLOAD patch sensor + CONTROL kompresor; hadiah `items:{kunci_dingin:1}` |
| s21 | PLC Pabrik — Blackout | vira / 3 (+requires s18,s19,s20) | 5 | 900 / 300 | `[11,13]`,`[11,14]`,`[12,15]`,`[11,15]` industri | Finale: TRACE SENTINEL + puzzle gabungan; **3 ending**: lapor ke Pak Hadi (`items:{sertifikat:1}` tak bisa per-ending; taruh teksnya saja) / bocorkan ke Rani / jual ke Mbah Gun — reward berbeda, epilog berbeda, semua tamat |

Misi Industri (s18–s21): node awal ditautkan dari `industri_hub` lewat `edges`. Pemain ke sana: beli ROUTE → s17 → `ROUTE` dari `menara_relay` ke `industri_hub`.
Setiap misi: tulis `place` hanya untuk sel miliknya (distrik default = kolom distrik di tabel; tulis nama distrik: `tengah|utara|barat|timur|selatan|industri`).

## 6. Cerita besar (benang merah, tidak wajib dibahas di tiap misi)
Seseorang memakai nama **SENTINEL** menguji kelemahan infrastruktur kota (papan iklan, lampu, kamera, relay) lalu mengirim surat peringatan. Awalnya pemain dicurigai; lalu jadi pemulih kepercayaan. Petunjuk bertahap: s11 (surat → asal di kawasan industri) → s14/s16 (jejak uang & manifest) → s18–s20 (pengujian di pabrik) → s21 (SENTINEL = sistem uji otomatis peninggalan mantan teknisi kelurahan; pemain memilih nasibnya). Misi lama (s00–s06) tak perlu diubah.

## 7. NPC (nada suara)
- **Bu Laras** hangat, ibu-ibu, "Nak". **Rani** tajam, penasaran. **Dimas** santai, "bro". **Mbah Gun** pendiam, "Nak", curiga.
- **Pak Hadi** — lurah; tegas tapi baik; formal santun; "Nak". **Vira** — mahasiswi; cerdas, jahil; "kamu/aku", "Kak". **dr. Wulan** — dokter; tenang, perhatian; hemat kata. **Kapten Sari** — kepala syahbandar; cepat, lugas; "kamu".

## 8. Kualitas
`npm test` hijau untuk berkas milikmu: `npx vitest run tests/missions_sNN.test.js tests/city.test.js tests/i18n.test.js`.
`node tools/missing.mjs` mencetak teks yang belum diterjemahkan: kosong untuk teks milikmu sebelum selesai (teks misi lain yang muncul = urusan agen lain, abaikan).
Tes misi wajib: (1) solusi lengkap dari `isp_core` memakai `go/walk/route/must` (aturan CONNECT asli); (2) objective `main` selesai dan `finish()` memberi reward yang dijanjikan; (3) setiap ending tersedia/terkunci sesuai syarat; (4) minimal satu tes "tidak bisa dilewati" (mis. node tertutup tanpa langkah sebelumnya).
