import type { Character } from "../gameplay/story";
export type Choice = {
  label: string;
  detail: string;
  correct: boolean;
  feedback: string;
};
export type Task = {
  id: string;
  label: string;
  x: number;
  icon: string;
  instruction: string;
  done: string;
  item?: string;
  choices?: Choice[];
};
export type Mission = {
  act: string;
  title: string;
  location: string;
  background: number;
  time: string;
  tasks: Task[];
  device: string;
  quiz: string;
  effect: string;
  exit: string;
  villain: string;
  hint: string;
};
export const missions: Mission[] = [
  {
    act: "01 / MINIMARKET",
    title: "Umpan dingin",
    location: "TOKO 24 JAM · LANTAI PENJUALAN",
    background: 0,
    time: "03:14",
    tasks: [
      {
        id: "fuse",
        label: "SEKRING",
        x: 240,
        icon: "battery",
        instruction: "Ambil sekring di rak perkakas.",
        done: "Sekring masuk tas. Siapkan pengalih perhatian.",
        item: "Sekring UV",
      },
      {
        id: "freezer",
        label: "FREEZER",
        x: 640,
        icon: "freezer",
        instruction: "Pancing infected ke area freezer sebelum menyalakan UV.",
        done: "Alarm freezer menarik infected. Pasang perintah UV.",
        choices: [
          {
            label: "Bunyikan alarm freezer",
            detail: "Panel alarm berada di dalam ruang UV.",
            correct: true,
            feedback: "Infected mendekati suara alarm.",
          },
          {
            label: "Buka pintu depan",
            detail: "Jalur keluar menghadap jalan yang penuh infected.",
            correct: false,
            feedback:
              "Jangan buka jalur masuk mereka. Gunakan suara dari dalam area UV.",
          },
        ],
      },
    ],
    device: "KONTROL UV",
    quiz: "Sembunyikan semua .infected dengan hide(). Jangan mengenai ally atau enemy tanpa penanda.",
    effect: "UV aktif. Infected dalam freezer berhasil diisolasi.",
    exit: "Keluar lewat pintu servis",
    villain: "“Buka pintu depan. Di luar aman.”",
    hint: "Ikuti label amber. Pintu depan masih berbahaya.",
  },
  {
    act: "01 / MINIMARKET",
    title: "Suara yang berulang",
    location: "TOKO 24 JAM · RUANG RELAY",
    background: 0,
    time: "03:22",
    tasks: [
      {
        id: "recording",
        label: "REKAMAN",
        x: 270,
        icon: "radio",
        instruction: "Periksa rekaman di meja radio.",
        done: "Pesan “di luar aman” berulang setiap 6 detik. Ini rekaman.",
        item: "Rekaman palsu",
      },
      {
        id: "source",
        label: "PILIH SUMBER",
        x: 660,
        icon: "relay",
        instruction: "Bandingkan dua kanal. Pilih sumber rekaman palsu.",
        done: "relay-core teridentifikasi sebagai sumber panggilan palsu.",
        choices: [
          {
            label: "Kanal A · relay-core",
            detail: "“Di luar aman.” Kalimat dan jeda selalu sama.",
            correct: true,
            feedback: "Pola berulang cocok dengan rekaman.",
          },
          {
            label: "Kanal B · relay-decoy",
            detail: "Petugas menjawab pertanyaan dan menyebut posisi terbaru.",
            correct: false,
            feedback:
              "Kanal B merespons langsung. Cari kanal yang selalu mengulang kalimat sama.",
          },
        ],
      },
    ],
    device: "PEMUTUS RELAY",
    quiz: "Matikan hanya #relay-core dengan fadeOut() agar sinyal palsu meredup.",
    effect: "Beacon palsu padam. Koordinat klinik ditemukan.",
    exit: "Pindah POV · menuju klinik",
    villain: "“Kamu akan kembali mendengarkan.”",
    hint: "Cocokkan pola pesan, bukan nama kanal saja.",
  },
  {
    act: "02 / KLINIK",
    title: "Di balik kaca",
    location: "KLINIK · PINTU KARANTINA",
    background: 1,
    time: "03:39",
    tasks: [
      {
        id: "key",
        label: "KARTU MEDIS",
        x: 250,
        icon: "card",
        instruction: "Ambil kartu medis di lemari sebelah kiri.",
        done: "Kartu medis ditemukan. Sekarang buka katup sprinkler.",
        item: "Kartu medis",
      },
      {
        id: "valve",
        label: "SPRINKLER",
        x: 660,
        icon: "valve",
        instruction: "Buka katup sprinkler untuk memperlihatkan lapisan alien.",
        done: "Air memperlihatkan shield infected. Drone medis juga punya pelindung.",
      },
    ],
    device: "PANEL KARANTINA",
    quiz: "Hapus class shielded hanya dari .enemy.shielded. Biarkan pelindung ally tetap utuh.",
    effect: "Shield infected terlepas. Ruang karantina terkunci aman.",
    exit: "Buka akses ruang observasi",
    villain: "“Lepaskan semua pelindungnya.”",
    hint: "Air membantu mengungkap target; jangan mengikuti perintah Sang Penyiar.",
  },
  {
    act: "02 / KLINIK",
    title: "Ini bukan wabah",
    location: "KLINIK · RUANG OBSERVASI",
    background: 1,
    time: "03:48",
    tasks: [
      {
        id: "chart",
        label: "HASIL SCAN",
        x: 260,
        icon: "scan",
        instruction: "Baca hasil scan di meja observasi.",
        done: "Infeksi: pola hijau bercabang. Demam saja bukan bukti.",
        item: "Catatan scan",
      },
      {
        id: "patient",
        label: "RUANG ISOLASI",
        x: 650,
        icon: "scan",
        instruction: "Pilih ruang yang menunjukkan tanda infeksi alien.",
        done: "Ruang 02 dikunci. Penyintas ruang 01 tetap aman.",
        choices: [
          {
            label: "Ruang 01",
            detail: "Suhu 38°C · tidak ada pola hijau pada scan.",
            correct: false,
            feedback:
              "Demam saja belum membuktikan infeksi. Cari pola hijau bercabang.",
          },
          {
            label: "Ruang 02",
            detail: "Suhu 36°C · pola hijau bercabang di leher.",
            correct: true,
            feedback: "Pola alien terdeteksi. Ruang ini perlu isolasi.",
          },
        ],
      },
    ],
    device: "PENANDA ANCAMAN",
    quiz: 'Tambahkan marked pada .enemy dengan data-threat="high". Jangan tandai ally atau ancaman rendah.',
    effect: "Ancaman tinggi ditandai. Penyintas klinik mendapat jalur aman.",
    exit: "Pindah POV · menuju stasiun",
    villain: "“Yang demam itu musuhmu.”",
    hint: "Gunakan bukti scan, bukan suhu tubuh saja.",
  },
  {
    act: "03 / STASIUN",
    title: "Kereta menuju sarang",
    location: "STASIUN · PERON SEKTOR B",
    background: 2,
    time: "04:06",
    tasks: [
      {
        id: "map",
        label: "PETA PERON",
        x: 245,
        icon: "map",
        instruction: "Periksa peta jalur evakuasi di bangku peron.",
        done: "Sektor B adalah gerbong dengan lampu amber. Penyintas menunggu di dalam.",
        item: "Peta sektor B",
      },
      {
        id: "power",
        label: "PENGALIH DAYA",
        x: 660,
        icon: "relay",
        instruction: "Alihkan daya UV ke gerbong yang ditunjukkan peta.",
        done: "Daya tersambung ke sektor B. Pilih hanya enemy di gerbong itu.",
        choices: [
          {
            label: "Jalur biru · sektor A",
            detail: "Gudang peralatan kosong.",
            correct: false,
            feedback: "Peta menunjuk gerbong amber: sektor B.",
          },
          {
            label: "Jalur amber · sektor B",
            detail: "Gerbong evakuasi dengan penyintas.",
            correct: true,
            feedback: "Daya sektor B aktif.",
          },
        ],
      },
    ],
    device: "UV GERBONG B",
    quiz: "Sembunyikan #sector-b .enemy saja. Pertahankan ally dan sektor lain.",
    effect: "Infected sektor B disingkirkan. Penyintas bisa menuju menara.",
    exit: "Masuk jalur pemeliharaan",
    villain: "“Gerbong biru. Cepat.”",
    hint: "Lampu amber menandai sektor B.",
  },
  {
    act: "03 / STASIUN",
    title: "Yang tertinggal",
    location: "STASIUN · AKSES PEMELIHARAAN",
    background: 2,
    time: "04:17",
    tasks: [
      {
        id: "service",
        label: "PETA SERVIS",
        x: 260,
        icon: "map",
        instruction: "Ambil peta servis dari kotak peralatan.",
        done: "Akses menara ada di balik gerbang servis tersembunyi.",
        item: "Sekring biru",
      },
      {
        id: "socket",
        label: "SOKET DAYA",
        x: 650,
        icon: "battery",
        instruction: "Pasang sekring biru ke soket yang cocok.",
        done: "Panel servis menyala. Lepas kunci, lalu tampilkan gerbang.",
        choices: [
          {
            label: "Soket biru · daya servis",
            detail: "Simbol sekring cocok dengan peta.",
            correct: true,
            feedback: "Sekring terpasang. Daya servis pulih.",
          },
          {
            label: "Soket merah · alarm darurat",
            detail: "Terhubung ke pengeras suara stasiun.",
            correct: false,
            feedback:
              "Itu jalur alarm. Sekring biru cocok dengan soket daya servis.",
          },
        ],
      },
    ],
    device: "AKSES SERVIS",
    quiz: "Pada #exit-gate, hapus locked lebih dulu, lalu show() untuk menampilkan pintu.",
    effect: "Gerbang servis muncul. Jalur menuju menara terbuka.",
    exit: "Pindah POV · naik ke menara",
    villain: "“Tidak ada jalan di belakang pintu itu.”",
    hint: "Warna dan simbol sekring harus sama dengan soket.",
  },
  {
    act: "04 / MENARA",
    title: "Jangan percaya suara",
    location: "MENARA · RUANG PENERIMA",
    background: 3,
    time: "04:38",
    tasks: [
      {
        id: "auth",
        label: "KODE KANAL",
        x: 250,
        icon: "radio",
        instruction: "Tekan sakelar uji di penerima radio.",
        done: "Lampu pemancar padam tiga kali. Partner asli bisa melihatnya; rekaman tidak.",
        item: "Uji tiga kedipan",
      },
      {
        id: "verify",
        label: "VERIFIKASI SUARA",
        x: 650,
        icon: "radio",
        instruction: "Pilih suara yang merespons uji lampu barusan.",
        done: "Kanal partner terverifikasi. Pasang handler pulse untuk memutus jammer.",
        choices: [
          {
            label: "“AMBER-07. Buka pintu merah!”",
            detail: "Menyebut kode, tetapi mengabaikan uji lampu.",
            correct: false,
            feedback:
              "Kode bisa dicuri. Cari respons terhadap lampu yang baru saja diuji.",
          },
          {
            label: "“Tiga kedipan. Gue lihat. Putus jammer!”",
            detail: "Merespons perubahan fisik di ruang pemancar.",
            correct: true,
            feedback: "Ini kanal partner yang asli.",
          },
        ],
      },
    ],
    device: "PULSE-SWITCH",
    quiz: "Pasang handler click pada #pulse-switch. Di dalam function, sembunyikan .jammer. Lalu tekan sakelar.",
    effect:
      "Jammer padam. Sang Penyiar kehilangan saluran untuk meniru partner.",
    exit: "Masuk ruang inti",
    villain: "“Ini gue. Buka pintunya.”",
    hint: "Periksa respons uji lampu, bukan kode yang bisa dicuri.",
  },
  {
    act: "04 / MENARA",
    title: "Harga keheningan",
    location: "MENARA · INTI SANG PENYIAR",
    background: 3,
    time: "04:51",
    tasks: [
      {
        id: "sample",
        label: "SAMPEL SUARA",
        x: 250,
        icon: "radio",
        instruction: "Ambil rekaman suara palsu dari penerima.",
        done: "Rekaman siap. Gunakan sebagai umpan untuk memancing inti.",
        item: "Umpan suara",
      },
      {
        id: "decoy",
        label: "ANTENA UMPAN",
        x: 650,
        icon: "relay",
        instruction: "Pilih keluaran untuk memutar rekaman umpan.",
        done: "Sang Penyiar menyerang antena kosong. Intinya terbuka.",
        choices: [
          {
            label: "Antena kosong · atap timur",
            detail: "Tidak terhubung dengan penyintas.",
            correct: true,
            feedback: "Alien mengikuti suaranya sendiri ke antena umpan.",
          },
          {
            label: "Pengeras suara · zona evakuasi",
            detail: "Terhubung ke rombongan penyintas.",
            correct: false,
            feedback:
              "Jangan arahkan alien ke penyintas. Gunakan antena kosong.",
          },
        ],
      },
    ],
    device: "PEMUTUS INTI",
    quiz: "Pada #boss, lepaskan shielded lalu fadeOut(). Urutan ini membuka pelindung sebelum memutus inti.",
    effect:
      "Sang Penyiar terputus. Jaringan infeksi berhenti menerima perintah.",
    exit: "Evakuasi · selesaikan perjalanan",
    villain: "“Aku tahu suaramu.”",
    hint: "Pancing inti dengan rekaman, lalu lepaskan shield sebelum purge.",
  },
];
export function pov(opening: Character, room: number): Character {
  return room % 2 === 0 ? opening : opening === "noah" ? "allie" : "noah";
}
export function partner(opening: Character, room: number): Character {
  return pov(opening, room) === "noah" ? "allie" : "noah";
}
export function clampProgress(value: unknown, completed: boolean) {
  return completed
    ? 2
    : typeof value === "number" && Number.isInteger(value)
      ? Math.max(0, Math.min(2, value))
      : 0;
}
