# DEAD SIGNAL — Noah & Allie / Alien Outbreak

Petualangan aksi-puzzle kamera samping dalam empat lokasi: minimarket, klinik, stasiun, dan menara siaran. Sang Penyiar, alien yang membajak sinyal evakuasi, memberi instruksi palsu. Noah dan Allie berjalan sendiri-sendiri dan bergantian tiap misi; partner memberikan petunjuk pendek lewat radio teks.

Versi aktif ada di `src/invasion/`. Entry `src/main.ts` memuat versi ini. Kode `src/quiz/` dan combat lama dipertahankan sebagai arsip, bukan alur aktif.

## Mainkan lokal

Node.js 20.19+.

```sh
npm ci
npm run dev
```

Buka http://127.0.0.1:5173. Dev server menggabungkan Vite dan API, dengan Node watch untuk perubahan backend. Jika port dipakai, gunakan `PORT=5174 npm run dev`. Preview Vite tanpa server API tidak dapat memuat soal.

## Alur permainan

Setiap lokasi mempunyai dua misi; total delapan kuis bernilai. Plot berkembang dari suara tiruan, bukti bahwa sinyal membawa infeksi, kereta evakuasi yang menuju sarang, hingga pilihan memutus atau membalik siaran. Satu beat pendek antar bab bisa dilewati.

1. Ambil atau periksa objek yang ditandai amber.
2. Gunakan petunjuk untuk memilih aksi lingkungan: alarm freezer, kanal radio, sprinkler, ruang isolasi, daya gerbong, soket sekring, kode autentikasi, atau antena umpan.
3. Jawab satu kuis pilihan ganda jQuery untuk mengoperasikan sistem.
4. Jalankan hasilnya. Bab relay, observasi, dan penerima memberi jalan tenang bila berhasil; kesalahan memicu kejaran. Bab lain membawa fase kabur. Final membutuhkan dua simpul untuk memutus listrik atau tiga untuk membalik siaran; inti gagal menambah satu simpul.

Klik objek bercahaya untuk mendekat, atau gunakan tombol aksi. A/D atau panah bergerak manual, E berinteraksi. Saat kabur, Space/tombol Pulse mendorong infected menjauh, dengan jeda isi ulang 1,3 detik (2,2 detik jika sel medis rusak). Jeda/Esc menghentikan gerakan dan isi ulang. Petunjuk tersedia lewat tombol `?`.

Run baru dibuka intro sinematik 13 detik: peringatan partner, siaran tiruan, pemadaman, judul. Bisa dilewati lewat tombol atau Esc; checkpoint tidak mengulang intro. Intro menghentikan input dunia, menghormati reduced motion, dan berhenti menghitung waktu ketika tab tidak aktif.

Pilihan eksplorasi yang salah memberikan petunjuk dan bisa diulang tanpa nilai berkurang. Pada run cerita, kuis dikirim sekali: benar mendapat 12,5 poin, salah 0 dan tetap menyelesaikan operasi dengan konsekuensi. Alarm menambah pemburu permanen, kesalahan medis memperlambat pulse, gerbang rusak menambah ancaman menara, dan kegagalan inti menambah simpul final. Kerusakan kanal, infeksi rombongan, serta gerbong tertinggal mengubah beat cerita dan ending. Nilai dan kerusakan kuis diturunkan dari state bertanda tangan server. Kontrak API lama tanpa mode story tetap mendukung retry untuk modul arsip.

Efek lingkungan mencakup infected dipancing ke freezer lalu dipurge UV, relay padam, shield terlepas, ancaman ditandai, jalur gerbong aman, gerbang servis terbuka, jammer terputus dan inti Sang Penyiar dinonaktifkan. Background ilustrasi tetap statis; objek, marker, karakter, dan lapisan efek di atasnya dirender Phaser. Transmisi villain/partner berupa teks, belum voice acting atau audio latar.

## Checkpoint dan server

Checkpoint `dead-signal-story-v2` menyimpan identitas lokal, POV pembuka, misi, langkah eksplorasi, status aktivasi dan catatan. Setelah refresh, posisi pemain kembali ke awal layar tetapi langkah dan jawaban pulih. Bab 7 tetap memerlukan tombol pulse-switch meski jawaban sudah tercatat. Endpoint `/api/run/resume` memverifikasi token; cache lokal bukan sumber nilai. Checkpoint versi sebelumnya tidak dipakai oleh run cerita baru. Pilihan final disimpan lokal; kondisi kerusakan dipulihkan dari token server. Mengulang fase aksi tidak menghapus kerusakan kuis.

`server/quiz.ts` membuat empat pilihan dengan ID HMAC per run/misi. `/api/run/question` tidak mengirim penanda jawaban benar. `/submit` memvalidasi melalui parser AST; `/result` hanya menerima run yang menuntaskan delapan soal. Kode dari pilihan tidak dieksekusi sebagai JavaScript bebas di browser; hasil tervalidasi mengaktifkan efek Phaser.

Production membutuhkan `RUN_SIGNING_SECRET` minimal 32 karakter, tanpa prefix `VITE_`. Development membuat secret sementara jika `.env` belum diisi; restart server membatalkan token sebelumnya. Token berlaku 24 jam. Lihat `.env.example` untuk secret stabil. Jangan commit `.env`.

Penilaian stateless tidak mencegah replay token lama untuk mencoba alternatif. Identitas bukan autentikasi. Tidak ada database, sertifikasi identitas atau jaminan anti-cheat ujian.

## UI dan aset

- Menu dengan ilustrasi menara alien, pilihan POV dan identitas.
- Layar dunia penuh tanpa sidebar/checklist. Satu objek aktif, tombol aksi ringkas, petunjuk radio sementara (6,5 detik), riwayat lewat Catatan.
- Mobile: informasi dipadatkan, aksi utama besar, kontrol gerak layar, dialog yang bisa discroll.
- Intro dengan perpindahan gambar dan judul, tanpa dialog Next. Reduced motion tersedia di Jeda.
- Atlas empat background baru: `public/art/invasion-environments.png`, dibuat dengan ImageGen. Sprite Noah–Allie berasal dari repo pengguna. [Kredit aset](docs/ART-ASSETS.md).

## Verifikasi

```sh
npm test
npm run build
npm run test:browser
npm run test:audit
node tests/invasion-cinema.mjs
```

Browser tests default ke port 5173. Set `BASE_URL` untuk port lain dan `CHROME_PATH` untuk executable selain Chrome macOS.

Tes perjalanan aktif (`invasion-story-browser.mjs`) melintasi delapan misi, mengirim tiga jawaban salah, memeriksa konsekuensi setelah refresh, cooldown rusak, bab tenang, simpul final, skor 62,5, serta ending putus daya / siaran pulih / siaran terkorupsi. Final juga dimainkan di viewport HP. Tes unit mencakup run semua salah yang tetap selesai dengan skor 0. Audit tambahan memeriksa gagal mulai, respons non-JSON, checkpoint rusak, fokus, blur, reduced motion dan tombol gerak pada viewport landscape. Tes unit lama tetap tersedia untuk backend dan modul arsip.

Durasi dan keseruan masih perlu playtest manusia. Browser QA bukan pengujian semua perangkat. Konfigurasi Vercel tetap build Vite ke `dist` dan Node Functions `api/run`; versi ini belum dideploy. Bundle Phaser masih memunculkan peringatan ukuran chunk Vite.
