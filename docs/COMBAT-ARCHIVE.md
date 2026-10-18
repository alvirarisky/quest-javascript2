# SELECTOR STRIKE: DEAD SIGNAL

Game zombie 2D top-down dengan cerita Noah–Allie, Phaser 3, TypeScript, Vite, jQuery nyata, dan penilaian Vercel Node Functions tanpa database. Ini implementasi dari [rencana Dead Signal](docs/NOAH-ALLIE-ZOMBIE-PLAN.md), menggantikan arena drone Neon Grid.

Pilih Noah atau Allie; karakter lain menjadi companion AI. Ikuti delapan bab dari minimarket hingga dermaga, pulihkan sinyal evakuasi, hadapi mutan, lalu lari menuju feri. Nilai hanya berasal dari delapan tantangan jQuery: 12,5 poin jika jawaban pertama benar. Kematian, waktu, dan kemampuan menembak tidak memengaruhi nilai.

## Jalankan

Butuh Node.js 20.19+ dan npm.

```sh
npm ci
cp .env.example .env
# Buat secret, lalu masukkan nilainya sebagai RUN_SIGNING_SECRET di .env:
openssl rand -hex 32
npm run dev
```

Buka http://127.0.0.1:5173. Frontend dan API dijalankan terpadu. Jika secret lokal kosong, server membuat secret sementara di memori; restart server membatalkan token lama. Production wajib memiliki secret. Tidak ada fallback penilaian client.

Jika port sudah dipakai:

```sh
PORT=5174 npm run dev
```

`vite dev` dan `npm run preview` saja tidak menjalankan API. Refresh halaman mengakhiri run lokal; checkpoint respawn berlaku selama halaman tetap terbuka.

## Cara bermain

- WASD/panah: berjalan. Mouse: membidik. Klik/tahan klik kiri: menembak.
- R: reload. 1: pistol dengan cadangan tak habis. 2: shotgun atau SMG sesuai bab, ammo terbatas.
- Space sambil bergerak: dash (cooldown 2,4 detik). Q: dorong/melee.
- E atau tahan E dekat penanda: mengambil suplai, mengaktifkan panel, atau menyelamatkan partner.
- Ikuti panah objective. Setelah tugas fisik dan gerombolan selesai, capai terminal di ujung jalan lalu buka Code Gun.
- Ctrl/Cmd+Enter: submit kode. Esc: tutup editor atau pause. Semua combat berhenti saat editor/dialog/cerita terbuka.
- Pickup `+`: 30 HP. Pickup `|||`: ammo senjata sekunder. Barrel meledak ketika ditembak; pemain juga bisa terkena jika terlalu dekat. Alarm mengalihkan zombie sementara.
- Pilihan karakter mengubah karakter yang dikontrol. Partner ikut berjalan, menembak, dan berlindung saat terdesak; bukan escort yang mudah mati.
- Dialog pembuka/penutup dapat dilewati. Caption saat berjalan menunggu tombol lanjut, dan percakapan dapat dibaca ulang di Catatan.

Zombie biasa mengejar, pelari lebih cepat, pemanggil menarik tambahan zombie, heavy melakukan serbuan dengan telegraph. Boss The Breakwater menyerbu lalu menghantam area; Code Gun menyelesaikan purge setelah fase combat. Lari ke feri adalah penutup bab 8, bukan wave atau soal kesembilan.

Target durasi 10–15 menit masih perlu playtest manusia. Tes integrasi mempercepat quota combat; angka durasi dari tes tersebut bukan durasi bermain normal. Target 60 FPS belum menjadi benchmark perangkat.

## Struktur

- `src/game.ts`: scene, collision, senjata, projectile lifecycle, enemy/companion AI, objective, boss, escape, bridge visual.
- `src/gameplay/story.ts`: delapan bab, tugas fisik, dialog dan ending.
- `src/gameplay/systems.ts`: collision, BFS navigation, layout, senjata, director sederhana.
- `src/gameplay/art.ts`: atlas runtime, karakter dan environment; `audio.ts`: SFX Web Audio original; `input.ts`: pause reasons dan pressed keys.
- `src/main.ts`: lifecycle, cerita, tutorial, input, API, editor dan results.
- `src/ui.ts`, `src/style.css`: UI Bahasa Indonesia, pilihan karakter, HUD, dialog dan hasil.
- `src/registry.ts`: registry DOM terisolasi, jQuery dan handler sekali pakai.
- `shared/challenges.ts`: fixture delapan tantangan dan evaluator selector.
- `server/validator.ts`: AST Acorn dan semantic validation.
- `server/state.ts`: signed state HMAC-SHA256, expiry 24 jam dan scoring.
- `api/run/{start,submit,result}.ts`: adapters Vercel. `server/dev.ts`: API lokal bersama Vite.

State: menu → tutorial opsional → cerita → combat/objective → terminal → efek/klik switch → cerita → bab berikutnya. Bab 8 diteruskan ke escape → ending → result yang diverifikasi server. Respawn mengulang combat bab aktif atau escape checkpoint; token tidak diubah. Pause reasons independen mencegah overlay dan blur saling membatalkan pause.

Registry ada dalam root hidden/aria-hidden. Scanner dirender dengan textContent. Selector dibatasi ke fixture; elemen halaman lain tidak bisa disentuh. Normalized plan diterapkan melalui allowlist jQuery, bukan eval/new Function. Fade jQuery dan Phaser berjalan bersamaan dan progression menunggu completion. Wave 7 memasang handler `.one()` bernamespace; jammer tidak hilang dan perjalanan tidak lanjut sebelum switch diaktifkan. Exit awalnya locked dan hidden pada DOM serta visual.

Subset selector: ID, class, compound class, atribut equality dengan kutip, dan descendant whitespace. Tidak mendukung selector grup/pseudo/universal/tag/combinator lain. Hanya satu expression statement, literal string, method allowlist dan callback `function () { satu perintah; }`; arrow function tidak didukung. Maksimal 2000 karakter dan kompleksitas chain dibatasi.

## Pengujian

```sh
npm run typecheck
npm test
npm run build
# Server lokal harus sudah berjalan:
npm run test:browser
node tests/noah-smoke.mjs # Noah + aiming/collision pada 1280×720
# Server di port berbeda:
BASE_URL=http://127.0.0.1:5174 npm run test:browser
```

Browser suite memakai Chrome terpasang di macOS. Set `CHROME_PATH` untuk executable browser Chromium pada sistem lain. Playwright tidak mengunduh browser saat npm install. Screenshot disimpan di `artifacts/qa/` (gitignored).

48 unit/integration tests mencakup canonical solutions, variasi sintaks, target salah/terlalu luas/kosong, chaining, callback terlarang, arbitrary JS, signature/expiry/version, first-answer score, salah-lalu-benar, results prematur, client score diabaikan, retry, jQuery DOM nyata, wave 7 sekali pakai, hidden exit, hierarchy scanner, jalur objective delapan bab, collision, director, dan pause independence.

Browser suite memakai renderer Phaser nyata, API lokal nyata, serta keyboard/mouse. Mencakup tutorial, Allie, movement, tembakan membunuh zombie, pergantian senjata/reload, pause, respawn, input editor, network failure/retry, blur/focus, delapan tugas fisik dan submission, efek bridge, switch, boss rendering, escape dengan keyboard, hasil 87,5 setelah salah pertama, replay, dan hasil pada 1280×720. Quota combat dipercepat dan posisi dipindahkan ke task untuk menguji seluruh alur secara deterministik; ini bukan bukti delapan pertarungan diselesaikan secara normal oleh manusia. Smoke test terpisah juga lulus untuk Noah, partner Allie, movement, aiming dan projectile collision pada 1280×720. Hook inspeksi hanya aktif pada dev dengan query `?qa=1` dan dibuang dari build production. Tidak ada klaim benchmark hardware.

## Aset dan batas scope

Atlas karakter, properti kota, dan title art dibuat menggunakan ImageGen built-in dan disimpan di `public/art/`. Prompt, asal referensi identitas, serta catatan ukuran/arah aktual ada di [ART-ASSETS.md](docs/ART-ASSETS.md). Font Oswald dan Source Sans 3 dibundel dengan OFL. Tidak ada hotlink atau aset premium. Sprite karakter memiliki empat arah dengan gerak procedural, bukan set animasi berjalan lengkap per-frame. Map memakai komponen kota yang sama dengan variasi layout/props dan jalur escape terpisah. Bukan replika 3D atau aset Dead Nation.

Versi ini single-player dengan companion AI; tidak ada online co-op, crafting, open world, atau akun. Objek dibatasi: 25 musuh, 160 peluru, 100 partikel, 30 corpse dan 18 pickup. Bundle Phaser cukup besar; build memberi peringatan chunk >500 kB, bukan error.

## API dan keamanan

Semua POST JSON, `Cache-Control: no-store`, envelope maksimum 12 KB:

- `/api/run/start`: `{}` → token dan state awal server.
- `/api/run/submit`: `{token,answer}` → token/state baru, feedback, correct dan normalized plan jika valid.
- `/api/run/result`: `{token}` → state dan score; menolak delapan challenge belum lengkap.

Jawaban kosong/oversized, envelope malformed, dan token invalid tidak menjadi kesalahan akademik. Kode nonkosong yang salah sintaks/semantik dihitung. UI mengunci submit selama request dan hanya mengganti token setelah respons diterima. Respons hilang dapat diulang dengan token/input sama; backend stateless tidak menjamin exactly-once global.

Token ditandatangani, bukan dienkripsi. Secret hanya di server, tidak berprefix VITE_. Payload tidak memuat identitas lokal. HMAC mencegah perubahan score/state tanpa signature valid. Tanpa database, token lama tidak dapat dicabut per run: pemain dapat replay state lama atau membuat run baru. Submission pertama berlaku pada rantai state yang diikuti client, bukan percobaan pertama global. Unlimited replay memang diperbolehkan. Server memvalidasi jawaban dan nilai, bukan membuktikan combat atau switch benar-benar dilakukan. Fixture dan solusi dapat dipelajari dari bundle. Screenshot dapat dimanipulasi; bukan bukti kriptografis/identitas. Run ID singkat hanya referensi. Sistem ini bukan platform ujian anti-cheat.

## Deployment Vercel

1. Import repository sebagai Vite, atau gunakan Vercel CLI dari folder ini.
2. Build `npm run build`, output `dist`; konfigurasi ada di `vercel.json`.
3. Isi `RUN_SIGNING_SECRET` dengan minimal 32 karakter acak untuk environment deployment. Jangan gunakan `VITE_`.
4. File `api/run/*.ts` menggunakan Node Functions. Jangan tambahkan SPA fallback yang menimpa `/api/*`; frontend hanya memakai `/`.
5. Setelah deploy, smoke-test start, submit benar/salah, result prematur, satu run lengkap, audio, layar laptop, dan screenshot hasil. Tambahkan pembatasan request di platform bila diperlukan.

Belum dideploy: akun/proyek/kredensial Vercel belum disediakan. Tidak ada perubahan pada repo GitHub referensi.
