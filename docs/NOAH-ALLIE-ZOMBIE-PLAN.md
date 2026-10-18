## Aktif — plot dan konsekuensi

Run baru memakai mode story: satu jawaban menetapkan hasil, benar maupun salah. Kesalahan tetap membawa cerita maju dan meninggalkan kerusakan yang dipulihkan dari token server. Plot membongkar siaran sebagai pembawa infeksi dan jalur evakuasi sebagai perangkap. Tiga bab memberi ruang tenang ketika operasi berhasil; kegagalan memicu kejaran. Final bercabang antara memutus daya (dua simpul) atau membalik siaran (tiga simpul), ditambah satu simpul jika inti gagal. Ending mempertimbangkan pilihan final, kerusakan jaringan, dan gerbong penyintas yang tertinggal. Tidak semua konsekuensi berupa combat: sebagian mengubah cerita dan hasil evakuasi.

## Pembaruan aktif — cinematic escape

HUD dunia penuh menggantikan rail checklist. Subtitle radio hilang setelah 6,5 detik; catatan tetap dapat dibuka. Intro 13 detik bisa dilewati, tidak diulang saat resume. Setelah terminal aktif, pemain mulai jalur kabur dari sisi kiri: infected mengejar dari dua arah, Space/pulse menghalau dengan cooldown 1,3 detik. Tertangkap mengulang jalur tanpa penalti nilai. Delapan terminal dan eksplorasi masih dipertahankan; ini menambah fase aksi, bukan mengganti seluruh struktur misi menjadi shooter.

## Implementasi aktif — Alien Outbreak (18 Oktober 2026)

Versi aktif sekarang `src/invasion/`: empat lingkungan bergambar baru (minimarket, klinik, stasiun, menara), delapan misi sistem, 16 langkah eksplorasi, pilihan tindakan lingkungan, serta villain Sang Penyiar yang memberi instruksi palsu. Satu karakter dimainkan pada tiap misi. Petunjuk pendek berubah mengikuti progres, tanpa dialog pembuka/penutup berhalaman.

UI tahap sebelumnya menggunakan rail tujuan; versi terbaru memakai HUD minimal seperti pembaruan di atas. Penilaian delapan kuis tetap memakai API tervalidasi. Langkah eksplorasi tidak memengaruhi nilai. Detail implementasi dan batasan terbaru ada di README.

Rancangan LAST CALL/heist dan koridor di bawah adalah arsip arah sebelumnya. Tidak ada fitur heist, tiga penyintas bercabang, atau pertarungan refleks yang diklaim sudah dibuat.

---

## Pembaruan 18 Oktober 2026 — eksplorasi solo

Noah dan Allie tidak berjalan berdua. Satu karakter dikontrol per adegan; POV bergantian setelah perpindahan bab. Menu memilih karakter pembuka, partner berada di lokasi berbeda dan berbicara lewat radio. Implementasi aktif menjaga delapan kuis dan penilaian yang sudah ada. Pertemuan kembali terjadi pada dialog ending.

Arah berikutnya: LAST CALL, empat bab besar (minimarket, klinik, stasiun, dermaga), dua kuis per bab, tiga penyintas, pilihan cerita dengan konsekuensi dan satu cabang pendek yang menyatu kembali. Vertical slice minimarket perlu dibuat dan diuji sebelum memperluas ke empat bab; ini belum termasuk implementasi solo.

# SELECTOR STRIKE: DEAD SIGNAL — rencana Noah & Allie

Status terbaru (15 Oktober 2026): arah game diubah sesuai preferensi pengguna menjadi **petualangan kamera samping seperti The Last Shift + kuis pilihan ganda**. Implementasi aktif ada di `src/quiz/`; rancangan combat di bawah menjadi arsip, bukan kriteria versi sekarang.

## Versi aktif: cerita dan kuis

- Noah atau Allie berjalan pada satu bidang horizontal; A/D atau panah untuk bergerak, E untuk terminal dan pintu. Tombol sentuh tersedia.
- Delapan bab mempertahankan cerita sinyal evakuasi palsu hingga feri. Dialog manual, bisa dilewati dan dibaca lagi lewat Catatan.
- Tiap terminal menyajikan empat pilihan kode jQuery. Pemain memilih lalu mengonfirmasi. Tidak perlu mengetik kode, menembak, reload, membunuh musuh, atau lolos kejaran.
- Zombie menjadi suasana di balik jendela. Tidak ada health, game over, atau timer.
- Jawaban pertama benar memperoleh 12,5 poin. Salah tetap bisa diperbaiki untuk membuka jalur; skor bab itu tetap 0. Server memvalidasi pilihan dan menghitung hasil.
- Pilihan event handler di bab 7 diikuti tombol Aktifkan pulse-switch sebelum jalur terbuka.
- Checkpoint disimpan lokal per bab, termasuk jawaban dan karakter. Refresh melanjutkan dari awal jalur bab tersimpan, bukan posisi kaki terakhir. Token kedaluwarsa setelah 24 jam atau saat secret dev berubah.
- Sprite karakter samping dipakai kembali dari repo pengguna `alvirarisky/quest-javascript`; kredit ada di `docs/ART-ASSETS.md`.

## Arsip rancangan combat sebelumnya

Bangun adaptasi pola gameplay Dead Nation dalam 2D top-down: dua survivor, gerombolan zombie, tembakan yang terasa kuat, lingkungan perkotaan, perjalanan antarlokasi, dan finale evakuasi. Karakter, cerita, peta, dialog, musik, UI, dan aset dibuat untuk Noah–Allie. Bukan salinan aset atau port 3D game sumber. Ini rekomendasi kecocokan proyek, bukan klaim peringkat objektif game zombie terbaik.

Referensi yang dibaca:

- Dead Nation, Housemarque: https://housemarque.com/games/dead-nation/
- Dead Nation, PlayStation: https://www.playstation.com/en-ca/games/dead-nation/
- Dead Nation — Turning Up the Heat: https://blog.playstation.com/2010/11/24/dead-nation-turning-up-the-heat/
- Left 4 Dead 2 — fitur resmi: https://www.l4d.com/game.html
- The Last of Us Part I — adaptasi gameplay PC: https://www.naughtydog.com/blog/celebrating_the_release_of_the_last_of_us_part_i_on_pc
- Project Zomboid — fitur resmi: https://projectzomboid.com/blog/the-game/
- Referensi karakter milik pengguna: https://github.com/alvirarisky/quest-javascript/blob/main/src/game/story.js

Dead Nation dipilih untuk bentuk combat dan ruang lingkup kamera. Left 4 Dead 2 menyumbang prinsip variasi serbuan dan jeda. The Last of Us menjadi acuan bagaimana perjalanan dan interaksi pasangan mengikat combat. Project Zomboid dipertimbangkan untuk suasana kota dan tekanan kerumunan, tetapi survival sandbox, crafting panjang, lapar/haus, dan simulasi luka tidak masuk versi ini.

## Janji pengalaman

Pemain ingin membawa Noah dan Allie keluar hidup-hidup. Setiap sektor memberikan tujuan fisik: cari suplai, capai pintu, pulihkan listrik, lindungi rekan, atau tembus jalan evakuasi. Membunuh zombie membuka ruang untuk bergerak; jumlah kill bukan satu-satunya objective.

Proporsi target pengalaman tetap sekitar 70% aksi dan eksplorasi, 30% terminal jQuery. Delapan bab = delapan wave akademik, masing-masing tepat satu submission bernilai. Target durasi awal tetap 10–15 menit, perlu dibuktikan lewat playtest; cerita disampaikan dengan opening singkat, dialog berjalan, dan momen jeda tanpa batas waktu membaca.

## Cerita original

Judul kerja: SELECTOR STRIKE: DEAD SIGNAL.

Kota sedang dikarantina. Noah, operator keamanan, datang menjemput Allie, teknisi sistem yang terjebak di gedung layanan darurat. Allie menemukan bahwa beacon evakuasi kota terus mengirim sinyal ke lokasi kosong. Sirene yang seharusnya menuntun warga justru menarik gerombolan zombie ke shelter.

Mereka harus mencapai terminal feri lama, memulihkan jalur komunikasi, dan menyiarkan koordinat evakuasi yang benar. Di tengah perjalanan, Noah mengira Allie terus menunda pelarian demi memperbaiki mesin. Allie mengungkap bahwa ada penyintas lain yang masih mengikuti sinyal palsu. Tujuan mereka berubah: keluar bersama sambil membuka jalan bagi orang lain.

Tidak ada twist bahwa semua hanya simulasi, tidak ada tokoh kebal yang harus dikorbankan, dan tidak ada kematian karakter yang ditentukan nilai akademik. Akhir utama: mereka mencapai feri setelah mematikan beacon palsu. Variasi skor muncul pada laporan pemulihan sistem dan dialog pendek, bukan menentukan apakah Noah/Allie selamat.

### Suara karakter

- Noah: cepat bertindak, protektif, humor kering. Mengomentari ancaman, jalur aman, dan kondisi Allie. Bukan karakter bodoh yang selalu merusak mesin.
- Allie: observan, berani, memahami sistem. Tetap ikut bertarung; bukan NPC pasif yang hanya memberi soal.
- Keduanya saling menyelamatkan. Hubungan romantis tidak diasumsikan; chemistry dibangun lewat kepercayaan, kekesalan kecil, dan kepedulian.

Contoh momen awal:

Noah: “Lo bilang pintu depan aman.”
Allie: “Tadi. Sebelum lo nyalain alarm mobil.”
Noah: “Oke. Kita revisi definisi aman sambil lari.”

Contoh momen tengah:

Noah: “Kapalnya di sana. Kenapa kita balik?”
Allie: “Karena radio itu masih nyuruh orang datang ke sini.”
Noah: “…Oke. Lo benerin sinyalnya. Gue jagain pintunya.”

## Mode bermain

Versi pertama single-player dengan companion AI. Pemain memilih Noah atau Allie saat mulai; karakter lain hadir secara fisik, mengikuti, menembak pendukung, memberi peringatan, dan membantu membuka jalur. Pilihan karakter mengubah dialog serta animasi, tidak mengubah kesulitan soal atau skor. Online co-op bukan bagian versi pertama.

Companion memakai navigasi grid yang sama dengan musuh, menjaga jarak dari tembakan, dan pindah ke titik aman terdekat jika tertahan terlalu lama. Companion bukan objek escort yang mudah mati: saat terdesak ia berlindung singkat dan kembali membantu. Momen penyelamatan khusus dibuat scripted agar cerita terbaca. Kegagalan pemain mengulang checkpoint bab, tanpa reset percobaan akademik.

## Combat yang harus terasa enak

- WASD: bergerak; mouse: arah bidik; klik kiri: tembak; R: reload; Space: dash; Q: dorong melee; 1/2: ganti senjata; E: interaksi/terminal.
- Pistol cadangan dengan ammo reserve tidak habis tetapi magazine dan reload tetap berlaku: tidak ada softlock kehabisan peluru.
- Shotgun untuk jarak dekat dan knockback; SMG untuk gerombolan dengan ammo pickup terbatas. Maksimal dua slot aktif, tanpa inventory rumit.
- Pembeda senjata berasal dari sebaran, fire rate, recoil visual, knockback, dan suara, bukan sekadar warna peluru.
- Zombie bereaksi pada impact: hentakan, animasi kena, decal singkat, suara hit, dan ragdoll sederhana berbasis sprite. Gore bergaya dan dapat dikurangi; reduced motion mematikan shake/hit-stop.
- Benda interaktif: alarm mobil untuk mengalihkan kerumunan, barrel untuk ledakan berantai, pagar dan mobil rusak untuk membentuk jalur.
- Kamera mengikuti pemain dalam peta memanjang dengan beberapa kantong pertempuran. Kamera tidak terkurung dalam satu arena kosong.
- Empat perilaku zombie: lambat bergerombol; pelari ringan; pemanggil yang harus diprioritaskan; heavy yang menyerbu setelah telegraph. Nama dan desain original.
- Boss akhir: mutan besar dengan serbuan lurus dan hantaman area. Kedua serangan memiliki tanda visual dan audio. Setelah fase combat, sistem containment membuka vulnerability melalui tantangan terakhir.

Director sederhana menggunakan state tenang → tekanan → serbuan → pemulihan. Input: health pemain, jumlah ancaman dekat, waktu sejak serbuan, dan objective. Director hanya mengatur combat, tidak mengubah soal atau skor. Spawn datang dari pintu/lorong yang diberi telegraph, di luar jarak aman pemain. Tidak perlu mengimplementasikan AI Director penuh milik Valve.

## Delapan bab dan materi

### 1. Pintu Depan — class selector + hide

Noah mencapai Allie di minimarket dekat gedung layanan darurat. Tutorial gerak, tembak, dorong, dan dash terjadi selama mereka mencari jalan keluar. Setelah halaman aman, unit UV menandai beberapa infected untuk purge; ada penyintas dan target umpan yang harus tetap aman. `.infected` + `.hide()` menonaktifkan entity zombie bertanda dengan animasi purge UV, bukan menghilangkannya tanpa konteks. Dialog menjelaskan Code Gun mengendalikan jaringan containment.

### 2. Jalan yang Salah — ID + fadeOut

Ikuti beacon evakuasi melintasi jalan penuh mobil. Mereka menemukan bahwa beacon mengarah ke shelter yang kosong. Hancurkan gerombolan, lalu matikan `relay-core` melalui fadeOut. Suara beacon mereda, lampu memudar, dan jalan lanjutan terbuka. Allie mulai curiga terhadap sinyal kota.

### 3. Pos Karantina — compound class + removeClass

Lawan infected berlapis pelindung eksperimental, dengan drone medis/ally bershield sebagai decoy. Sistem containment menghapus lapisan `shielded` hanya pada `.enemy.shielded`; bridge menghilangkan armor visual dan menonaktifkan kemampuan serbu target. Noah menemukan jejak penyintas yang dikirim ke rute berbahaya.

### 4. Lorong Ambulans — attribute + addClass

Cari baterai komunikasi di parkiran ambulans. Setelah pertempuran, tandai `.enemy[data-threat="high"]` dengan `marked`; turret containment menjalankan tactical strike pada target tepat. Allie menggunakan daya cadangan untuk mendengar panggilan penyintas. Mereka memutuskan membantu.

### 5. Dua Sisi Pagar — descendant + hide

Pintu keamanan memisahkan pasangan secara singkat. Pemain membersihkan sisi sendiri, lalu mengaktifkan UV untuk enemy di dalam `#sector-b`, tempat partner terkepung. Enemy di sektor lain dan ally tidak terkena. Scanner menampilkan struktur parent–child. Efek purge terlihat melintasi pagar; pasangan bersatu lagi setelah pintu terbuka.

### 6. Jalur Servis — chaining removeClass + show

Cari rute pendek menuju pelabuhan melewati koridor servis. Allie menemukan jalur evakuasi yang disembunyikan antarmuka lockdown. `#exit-gate` benar-benar locked dan hidden pada registry; lepaskan locked lalu show untuk memunculkan akses dan membuka gerbang. Ini reveal akses sistem, bukan pintu fisik yang tiba-tiba diciptakan.

### 7. Sinyal yang Benar — on(click, callback)

Pertahankan ruang radio dari gerombolan, lalu pasang handler `#pulse-switch` yang menyembunyikan `.jammer`. Setelah server menerima jawaban, pemain tetap harus menekan switch fisik atau tombol keyboard yang jelas. Klik memicu callback jQuery, mematikan jammer, dan menyiarkan koordinat feri. Tidak ada nilai kedua untuk klik ini. Dialog radio penyintas membayar usaha mereka.

### 8. Jangan Lepasin — ID + ordered chaining

Serbuan terakhir di dermaga dan boss mutan menjaga akses kapal. Noah dan Allie berbagi tugas lewat dialog singkat. Setelah boss dilemahkan, selector `#boss` harus melepas shielded kemudian fadeOut: containment mempurge boss. Setelah efek, pemain menempuh sprint pendek ke feri; tidak ada wave atau soal kesembilan. Results hanya muncul setelah ending lokal dan hasil delapan tantangan diverifikasi server.

## Code Gun dan penilaian

Nama “Code Gun” dipertahankan sebagai perangkat pengendali jaringan containment milik Allie. Noah dapat mengoperasikannya dengan panduan Allie jika dipilih pemain. Seluruh simulasi combat dan companion berhenti saat editor terbuka; tidak ada kewajiban mengetik sambil ditembaki.

Pertahankan baseline delapan learning objectives, parser AST, semantic target validation, normalized action plan, registry jQuery terisolasi, HMAC signed state, first-attempt scoring 12,5 poin, retry, dan results. Client tidak boleh memutuskan nilai. Cerita memberi alasan untuk memakai perintah; preview tidak membocorkan benar/salah.

Token tetap server-authoritative untuk akademik. State objective lokal boleh menyimpan checkpoint/posisi, tetapi tidak mengganti token atau mengulang kesempatan pertama. Companion, kill count, death, dan escape sprint tidak menambah/mengurangi poin akademik.

## Visual dan audio

Gaya 2D top-down bergambar dengan perspektif sedikit miring, sprite manusia jelas dan environment kota yang padat objek. Fokus pada siluet terbaca di layar laptop, bukan meniru fidelitas 3D Dead Nation. Karakter referensi dari quest-javascript menjadi acuan wajah/pakaian; sprite samping lama tidak langsung dipakai untuk top-down. Perlu sprite baru dengan arah dan animasi yang cocok.

Palet malam: aspal biru abu, lampu jalan amber, darah merah gelap, layar terminal cyan. Neon menjadi aksen teknologi. Delapan lokasi memakai komposisi berbeda, bukan grid yang hanya berganti warna.

Minimum aset: Noah dan Allie multi-arah (idle, jalan, tembak, hit, interaksi), empat zombie dan boss, tiga senjata, jalan/mobil/pagar/terminal/dermaga, portrait dialog, hit/ledakan/UV, ambience kota dan SFX lokal berlisensi jelas/original. Animasi harus terbaca sebelum dekorasi ditambah. Dialog tampil sebagai caption singkat dan bisa dibaca ulang; teks penting tidak hilang karena timer membaca.

## Urutan implementasi setelah rencana disepakati

1. Simpan game sekarang sebagai baseline. Pertahankan backend/scoring yang telah dites; ganti gameplay scene secara terukur.
2. Buat satu bab pertama lengkap: opening Noah–Allie, peta jalan/minimarket, karakter bergerak dan menembak, companion AI, zombie bereaksi, tutorial singkat, terminal bernilai, efek jQuery, checkpoint.
3. Playtest bab ini. Jangan meluaskan menjadi delapan bab sebelum combat dan hubungan karakter terasa menyenangkan. Periksa navigasi companion, kejelasan zombie, kepuasan impact, serta tempo dialog.
4. Tambahkan objective bervariasi, director sederhana, senjata, lalu bab 2–7 dengan test state/transition.
5. Buat boss, escape sprint, ending, dan results; uji run sempurna dan run salah-lalu-benar.
6. Polish art/audio, ukuran laptop, accessibility, optimasi, dan deploy smoke test.

## Kriteria penerimaan

- Dalam menit awal, pemain mengenal Noah dan Allie, tahu tujuan mereka, dan sudah menembak zombie.
- Kedua karakter terlihat ikut bertindak; companion tidak terus tersangkut atau menutupi bidikan.
- Ada perubahan lokasi dan objective. Tidak semua bab memakai kill quota → terminal dengan arena identik.
- Tembakan memiliki feedback jelas, jenis senjata terasa berbeda, dan serbuan memiliki fase jeda.
- Setiap bab punya minimal satu percakapan spesifik konteks, satu perkembangan cerita, dan satu perubahan dunia hasil jQuery.
- Ada tepat delapan penilaian. Semua aturan keamanan, scoring, pause, fokus input, retry dan token lama tetap diuji.
- Browser QA nyata mencakup opening, combat, companion, editor, setiap efek, boss, ending, dan hasil. Catat durasi run dan performa pada perangkat yang benar-benar diuji.

## Risiko dan batas scope

Risiko terbesar adalah companion navigation, kualitas sprite, dan tempo combat. Karena itu vertical slice pertama menjadi gerbang kualitas. Versi pertama tidak mencakup multiplayer online, open world, crafting, skill tree, gore realistis, atau 3D penuh. Rencana ini belum membuktikan performa, durasi, atau keseruan; semuanya harus diuji setelah implementasi slice.
