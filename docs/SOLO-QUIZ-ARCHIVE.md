# DEAD SIGNAL — Noah & Allie

Petualangan kamera samping dengan delapan kuis pilihan ganda jQuery. Terinspirasi pola jalan dan terminal **The Last Shift** milik pengguna. Noah dan Allie memulihkan sinyal evakuasi palsu dan membawa penyintas menuju feri. Pilih karakter pembuka, baca cerita, jalan sendiri ke terminal, pilih jawaban, lalu beralih ke karakter lain di lokasi berikutnya. Noah dan Allie berkomunikasi lewat radio; hanya satu survivor dirender saat eksplorasi.

## Jalankan

Node.js 20.19+.

```sh
npm ci
npm run dev
```

Buka http://127.0.0.1:5173. Server dev mengawasi perubahan backend dan otomatis restart. Jika proses lama belum memakai mode watch, hentikan sekali lalu jalankan npm run dev lagi. Untuk port lain: `PORT=5174 npm run dev`. Vite saja / `npm run preview` tidak menjalankan API.

## Cara bermain

- A/D atau panah kiri/kanan: berjalan. E dekat terminal atau EXIT: interaksi.
- Tombol kiri, kanan, dan Interaksi juga tersedia di layar.
- Empat pilihan per kuis; pilih satu lalu **Kirim jawaban**. Petunjuk tidak mengurangi poin.
- Jawaban pertama benar = 12,5 poin. Salah boleh diperbaiki agar cerita berlanjut, dengan 0 poin pada bab itu.
- Bab 7: setelah jawaban benar, klik **Aktifkan pulse-switch**.
- Jalan ke EXIT setelah terminal pulih. Bab terakhir berakhir di feri.
- Esc / Jeda menghentikan pergerakan; Catatan menyimpan dialog. Tidak ada combat, batas waktu, atau game over.
- **Lanjut checkpoint** memulihkan karakter, identitas, jawaban dan bab setelah refresh. Posisi direset ke awal jalur bab. Checkpoint tersimpan hanya pada browser ini.

## Implementasi

`src/main.ts` memuat versi aktif `src/quiz/main.ts`, `world.ts` dan `style.css`. Phaser menggambar jalur samping, sprite karakter solo, terminal dan gerbang. UI kuis menggunakan elemen HTML untuk keyboard dan layar kecil. Efek pemulihan versi ini adalah perubahan lampu terminal dan gerbang; pilihan kode dinilai dengan validator AST server, bukan dieksekusi sebagai kode bebas.

`server/quiz.ts` menyusun empat pilihan dengan ID HMAC berbeda per run dan bab. `POST /api/run/question` mengembalikan soal tanpa penanda jawaban benar. `/api/run/resume` memverifikasi token dan mengembalikan progres resmi; cache state browser tidak dipakai sebagai sumber nilai/progres. `/start`, `/submit` (field `choice`) dan `/result` memakai state HMAC yang sama. API submit kode lama dipertahankan untuk kompatibilitas. Nilai final selalu berasal dari server. Materi tetap class, ID, compound, attribute, descendant, chaining dan event handler.

Kunci rahasia `RUN_SIGNING_SECRET` minimal 32 karakter wajib di production, tanpa prefix `VITE_`. Development membuat secret sementara jika belum diatur; restart membatalkan checkpoint lama. Token berlaku 24 jam. Untuk secret stabil, gunakan `.env.example` dan isi `.env` lokal.

Stateless scoring tidak mencegah replay token lama untuk mencoba alternatif. Tidak ada autentikasi identitas, database, atau jaminan anti-cheat ujian. Identitas tampilan disimpan di browser dan bukan sertifikasi server.

Konfigurasi Vercel tetap Vite build, output `dist`, Node Functions di `api/run/`. Belum dideploy pada perubahan ini.

## Validasi

```sh
npm test
npm run build
BASE_URL=http://127.0.0.1:5173 npm run test:browser
BASE_URL=http://127.0.0.1:5173 npm run test:audit
```

Browser test memakai Playwright dengan Chrome macOS; set `CHROME_PATH` jika perlu. Cakupan: dua karakter, gerak/jeda, delapan kuis, salah lalu perbaikan, koneksi gagal, refresh checkpoint, pulse-switch, skor 87,5, replay dan layout mobile. Posisi dipercepat pada tes antarterminal; ini bukan pengukuran durasi bermain manusia.

Aset samping Noah–Allie berasal dari repo pengguna `alvirarisky/quest-javascript`; lihat [kredit aset](docs/ART-ASSETS.md). Aset kota/zombie yang sudah ada dipertahankan. Versi ini belum memiliki audio latar. Bundle Phaser masih menghasilkan peringatan ukuran chunk Vite.

Kode combat sebelumnya disimpan di `src/combat-main.ts`, `src/game.ts` dan modul pendukung; tidak dimuat entry aktif. Dokumentasinya ada di [arsip combat](docs/COMBAT-ARCHIVE.md). Tes browser combat lama disimpan sebagai arsip dan tidak menjadi pemeriksaan versi kuis.

## Perbaikan audit 16 Oktober 2026

Server lokal lama sebelumnya mengembalikan `Endpoint tidak ditemukan` untuk soal baru. Perintah dev sekarang memakai Node watch. Kegagalan muat soal menampilkan pesan dan tombol coba lagi; pilihan/hint lama dibersihkan. Kontrol loading dinonaktifkan dan dipulihkan setelah request selesai.

Checkpoint menyimpan tahap cerita, indeks dialog, jawaban yang menunggu aktivasi, dan halaman hasil. Refresh bab 7 tidak lagi melewati pulse-switch. Progres dipulihkan dari token melalui server; checkpoint lokal rusak tidak menjatuhkan UI. Kembali ke menu tersedia lewat Jeda, dan karakter pilihan sinkron setelah resume/replay.

Audit browser meliputi kegagalan endpoint lama, respons HTML, retry soal, gagal mulai/hasil, dialog dan pulse setelah refresh, hasil setelah refresh, cache progres rusak, isolasi fokus, blur pause, arah terminal, posisi partner saat berhenti, serta tombol gerak layar pada viewport landscape. Penyiapan beberapa checkpoint dipercepat lewat API untuk menguji tahap tertentu; tes ini bukan pengujian fisik semua perangkat atau deployment Vercel.

## Eksplorasi solo

Pilihan di menu menentukan POV pembuka. `src/quiz/scenes.ts` menentukan pergantian Noah/Allie untuk delapan adegan, lokasi masing-masing dan percakapan radio. HUD menunjukkan karakter aktif dan partner di radio. Checkpoint memulihkan POV dari pilihan pembuka dan bab terverifikasi; tidak menyimpan karakter kedua yang mengikuti pemain. Mereka bertemu kembali dalam dialog ending.

Perubahan ini menerapkan eksplorasi solo pada alur delapan kuis yang ada. Rombakan empat bab LAST CALL, penyintas bercabang dan interaksi CCTV/minimarket masih rancangan berikutnya, belum diimplementasikan.
