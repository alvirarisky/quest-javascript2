# DEAD SIGNAL — Alien Outbreak

Petualangan aksi-puzzle kamera samping dalam empat lokasi: minimarket, klinik, stasiun, dan menara siaran. Sang Penyiar, alien yang membajak sinyal evakuasi, memakai suaramu sendiri untuk memancing warga keluar. Pemain memilih Noah atau Allie dan memakai karakter itu sampai akhir, sendirian. Tidak ada partner di radio; petunjuk muncul sebagai "insting" karakter.

Versi aktif ada di `src/invasion/`. Entry `src/main.ts` memuat versi ini. Kode `src/quiz/` dan combat lama dipertahankan sebagai arsip, bukan alur aktif.

## Mainkan lokal

Node.js 20.19+.

```sh
npm ci
npm run dev
```

Buka http://127.0.0.1:5173. Dev server menggabungkan Vite dan API, dengan Node watch untuk perubahan backend. Jika port dipakai, gunakan `PORT=5174 npm run dev`. Preview Vite tanpa server API tidak dapat memuat soal.

## Alur permainan

Praktikan mengisi nama, NIM, dan kelas, lalu memilih karakter. Run baru dibuka intro berupa log transkrip radio: siaran darurat yang sama terulang persis, lalu "Ini aku. Buka pintunya." yang cocok 97% dengan suara pemain, lalu daya padam. Intro bisa dilewati lewat tombol atau Esc, dan diikuti briefing singkat: situasi, rute, kontrol, dan aturan nilai. Checkpoint tidak mengulang intro.

Setiap lokasi mempunyai dua misi; total delapan kuis bernilai:

1. Ambil barang yang ditandai amber.
2. Selesaikan tindakan lapangan. Misi 2, 6, dan 7 memakai mini-puzzle yang diacak setiap percobaan: cari gelombang yang polanya berulang, pilih soket biru yang hanya terlihat saat lampu berkedip, hitung kedipan lampu lalu pilih suara yang menyebut jumlahnya. Misi lain berupa pilihan. Salah pilih boleh diulang tanpa mengurangi nilai, tetapi menimbulkan suara: fase kabur bab itu mendapat satu infected tambahan, dan bab tenang berubah jadi kejaran.
3. Jawab satu kuis pilihan ganda jQuery untuk mengoperasikan sistem. Setelah jawaban terkirim, **simulasi DOM** mengetik ulang kode yang dipilih di atas elemen-elemen scanner: elemen yang terpilih menyala (tepat, ikut terkena, atau terlewat), lalu tiap method di chain dianimasikan (hide/fadeOut, show, addClass/removeClass, handler click lalu callback-nya). Putusan akhirnya menjelaskan apakah seleksi salah atau method/urutannya yang salah. Target hanya dikirim server setelah jawaban mode cerita terkunci.
4. Kabur. Kebanyakan bab berupa lari ke pintu. Misi 4 adalah **sembunyi**: patroli berjalan bolak-balik, pemain harus diam di zona bayangan saat mereka lewat, dan gelombang membangunkan semua patroli. Misi 6 adalah **bertahan**: gerbang servis macet dan harus dipukul 30 kali (36 jika kuis bab itu salah) sementara infected datang bergelombang dari sisi jalan setiap 6,5 detik, makin banyak tiap gelombang. Tertangkap membuat gerbang terkunci lagi 4 pukulan. Misi 2 dan 7 tenang bila kuis benar dan tidak ada suara. Final mengharuskan menghancurkan dua simpul untuk memutus listrik, atau tiga untuk membalik siaran; inti gagal menambah satu simpul.

**Panduan** tersedia di menu (Panduan cara main) dan tombol `?` di dalam game, yang langsung membuka misi yang sedang dimainkan dengan penanda SEKARANG. Isinya: alur empat langkah, kontrol, nilai dan bukti, lalu untuk tiap misi: barang yang dicari, cara menyelesaikan tindakan lapangan, konsep jQuery yang diuji beserta contoh dengan nama lain (bukan jawabannya), serta jenis kabur dan rintangannya.

Kontrol: A/D atau panah untuk jalan, Space/W/↑ untuk lompat, Q untuk gelombang, E untuk interaksi sekaligus memukul, Esc untuk jeda. Tombol layar tersedia untuk HP; menekan ↑ di depan peti otomatis menyeberanginya. **Gelombang** (jeda 1,3 detik; 2,2 detik jika sel medis rusak) merobohkan infected dalam jarak 160 px selama 3,2 detik sehingga bisa dilewati, dan mendorong yang lebih jauh (sampai 600 px) sambil membuat mereka linglung 1,6 detik. Setiap lokasi punya rintangan sendiri:

| Bab | Rintangan |
|---|---|
| 1 Minimarket | troli belanja (lompat), rolling door (pukul 6×) |
| 2 Minimarket | rak roboh (lompat), kabel memercik |
| 3 Klinik | sekat kaca (pukul 3×), ranjang dorong (lompat) |
| 4 Klinik | genangan di antara bayangan |
| 5 Stasiun | tumpukan koper (lompat), kabel memercik, palang tiket (pukul 5×) |
| 6 Stasiun | gerbang macet (pukul 30×) |
| 7 Menara | gulungan kabel (lompat), uap panas |
| 8 Menara | uap panas, gulungan kabel, simpul inti (pukul 3× per simpul) |

**Lompat** melewati rintangan rendah; infected memanjatnya dengan lambat. **Pukul** (E berulang) menghancurkan rintangan tinggi (+2 pukulan jika kuis bab itu salah); rintangan ini juga menahan infected, jadi sering ada yang menunggu di baliknya. **Kabel memercik** dan **uap panas** menyala bergantian (1,1 dari 2,8 detik); menyentuhnya saat menyala melempar pemain mundur. Percikan bisa dilompati, uap tidak. Infected yang terkena ikut linglung. **Genangan** memperlambat semua orang.

Tertangkap mengembalikan pemain ke belakang rintangan terakhir yang sudah dilewati, bukan ke awal layar. Di final, Sang Penyiar menandai sepotong lantai dengan garis merah lalu menyapunya dengan tentakel setiap 3,4–4,8 detik: lompat untuk menghindar, atau terhempas mundur. Infected yang berada di jalur sapuan ikut roboh.

Jumlah pemburu mengikuti jawaban kuis bab itu: 2 jika benar, 3 jika salah, ditambah 1 untuk alarm bocor (bab 2 dan seterusnya), 1 untuk akses terbakar (bab 7–8), dan 1 jika salah pilih tindakan; maksimal 5. Pemburu tambahan datang dari belakang, tidak menunggu di pintu keluar. Di mode sembunyi: 2 patroli jika benar, 3 jika salah. Di mode bertahan, gelombang pertama berisi 1 infected jika benar, 2 jika salah. Kejaran pertama menampilkan tutorial dengan waktu melambat sampai pemain memakai gelombang. Mulai bab 5, satu infected menjadi Screamer: tanda "!" merah lalu menerjang; gelombang membatalkannya. Setelah tiga kali tertangkap dalam satu fase, adrenalin membuat pemburu melambat. Tepi layar memerah dan detak jantung makin cepat saat pemburu mendekat. Setiap fase kabur diberi rank S–D (waktu, tertangkap, "NYARIS!") yang tampil di beat bab berikutnya dan layar hasil; rank ini kosmetik.

**Alarm**: memilih "Bunyikan alarm freezer" menyalakan sirene dua nada dan lampu merah berkedip yang terus berbunyi sampai bab itu selesai (juga dipulihkan setelah refresh). Memilih soket merah di misi 6 membunyikan alarm darurat singkat.

**Atmosfer** per lokasi (dimatikan oleh Kurangi gerakan): lampu neon berkedip dan debu di minimarket, tetesan air di klinik, debu melayang di stasiun, spora hijau naik dari inti di menara. Infected bergoyang saat berjalan; roboh dan rintangan yang hancur mengeluarkan kepulan debu.

**Audio** disintesis WebAudio, tanpa file. Backsound berupa drone rendah yang selalu berbunyi; saat dikejar, bass berdenyut, hi-hat, dan disonansi tinggi masuk dan temponya naik seiring jarak pemburu. Musik meredup saat kuis, jeda, atau menu terbuka dan berhenti saat tab disembunyikan. Efek suara dan musik latar punya toggle terpisah di Jeda.

Pada run cerita, kuis dikirim sekali: benar mendapat 12,5 poin, salah 0 dan tetap menyelesaikan operasi dengan konsekuensi. Alarm menambah pemburu permanen, kesalahan medis memperlambat gelombang, gerbang rusak menambah ancaman menara dan memperkuat gerbang macet, dan kegagalan inti menambah simpul final. Kerusakan kanal, infeksi rombongan, serta gerbong tertinggal mengubah beat cerita dan ending. Nilai dan kerusakan kuis diturunkan dari state bertanda tangan server.

## Bukti pengerjaan

Nama, NIM, dan kelas dikirim saat run dimulai dan dikunci di token bertanda tangan, sehingga tidak bisa diganti di akhir. `/api/run/result` mengembalikan identitas itu bersama nilai, jumlah benar, serta waktu mulai dan selesai. Layar hasil menampilkannya dengan tombol **Unduh bukti (PNG)**; PNG berisi nama, NIM, kelas, nilai, jumlah benar, ending, dan waktu selesai. Tidak ada kode verifikasi atau halaman verifikasi asisten.

## Checkpoint dan server

Checkpoint `dead-signal-story-v3` menyimpan karakter, misi, langkah eksplorasi, status aktivasi, catatan, rank kabur, suara akibat salah pilih, dan status tutorial. Identitas diambil dari token server. Setelah refresh, posisi pemain kembali ke awal layar tetapi langkah dan jawaban pulih. Bab 7 tetap memerlukan tombol pulse-switch meski jawaban sudah tercatat. Endpoint `/api/run/resume` memverifikasi token; cache lokal bukan sumber nilai. Checkpoint v2 (tanpa kelas) tidak dipakai lagi. Pilihan final disimpan lokal; kondisi kerusakan dipulihkan dari token server. Mengulang fase aksi tidak menghapus kerusakan kuis.

Pencocokan selector ada di `shared/selector.ts` tanpa data soal, sehingga simulasi di browser tidak ikut membundel kunci jawaban (`shared/challenges.ts` hanya dipakai server). `server/quiz.ts` membuat empat pilihan dengan ID HMAC per run/misi. `/api/run/question` tidak mengirim penanda jawaban benar. `/submit` memvalidasi melalui parser AST; `/result` hanya menerima run yang menuntaskan delapan soal. Kode dari pilihan tidak dieksekusi sebagai JavaScript bebas di browser; hasil tervalidasi mengaktifkan efek Phaser.

Production membutuhkan `RUN_SIGNING_SECRET` minimal 32 karakter, tanpa prefix `VITE_`. Development membuat secret sementara jika `.env` belum diisi; restart server membatalkan token sebelumnya. Token berlaku 24 jam. Lihat `.env.example` untuk secret stabil. Jangan commit `.env`.

Penilaian stateless tidak mencegah replay token lama untuk mencoba alternatif. Identitas bukan autentikasi: bukti membuktikan bahwa server mencatat nilai untuk nama/NIM/kelas tersebut, bukan bahwa orang itu yang bermain. Tidak ada database, sertifikasi identitas atau jaminan anti-cheat ujian.

## UI dan aset

- Menu dengan ilustrasi menara alien, pilihan karakter (tetap sampai akhir), nama, NIM, kelas, dan tautan panduan. Form, kartu karakter, dan tombol Main selebar satu kolom dan muat di layar pertama (termasuk laptop 1280×720).
- Layar dunia penuh tanpa sidebar/checklist. Satu objek aktif, tombol aksi ringkas, petunjuk insting sementara (6,5 detik), riwayat lewat Catatan.
- Mobile: informasi dipadatkan, aksi utama besar, kontrol gerak layar, dialog yang bisa discroll.
- Intro dengan perpindahan gambar dan judul, diikuti briefing misi. Reduced motion tersedia di Jeda.
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

Tes perjalanan aktif (`invasion-story-browser.mjs`) memakai karakter tetap, mengisi kelas, melewati briefing, menyelesaikan ketiga mini-puzzle (termasuk satu salah pilih yang memicu kejaran), mengirim tiga jawaban salah, memeriksa konsekuensi setelah refresh, jeda gelombang, rintangan, mode sembunyi dan bertahan bergelombang, simpul final, skor 62,5, ending putus daya / siaran pulih / siaran terkorupsi, serta unduhan PNG bukti. Final juga dimainkan di viewport HP. Tes unit mencakup run semua salah yang tetap selesai dengan skor 0. Audit tambahan memeriksa gagal mulai, respons non-JSON, checkpoint rusak, fokus, blur, reduced motion dan tombol gerak pada viewport landscape. Tes unit lama tetap tersedia untuk backend dan modul arsip.

Durasi dan keseruan masih perlu playtest manusia. Browser QA bukan pengujian semua perangkat. Konfigurasi Vercel tetap build Vite ke `dist` dan Node Functions `api/run`; versi ini belum dideploy. Bundle Phaser masih memunculkan peringatan ukuran chunk Vite.
