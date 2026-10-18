export type Character = "noah" | "allie";
export type Line = { who: "Noah" | "Allie" | "Radio"; text: string };
export type Task = {
  x: number;
  y: number;
  label: string;
  kind: "pickup" | "hold" | "rescue";
  seconds: number;
};
export type Chapter = {
  title: string;
  place: string;
  time: string;
  goal: string;
  quota: number;
  theme: "street" | "checkpoint" | "hospital" | "harbor";
  tasks: Task[];
  intro: Line[];
  middle: Line[];
  outro: Line[];
};
export const names: Record<Character, string> = {
  noah: "Noah",
  allie: "Allie",
};
export const chapters: Chapter[] = [
  {
    title: "Pintu Depan",
    place: "MINIMARKET / BLOK 09",
    time: "03:14",
    goal: "Ambil suplai. Temukan terminal UV di ujung jalan.",
    quota: 18,
    theme: "street",
    tasks: [
      { x: 660, y: 560, label: "Ambil tas suplai", kind: "pickup", seconds: 0 },
      { x: 1390, y: 720, label: "Pulihkan daya UV", kind: "hold", seconds: 2 },
    ],
    intro: [
      { who: "Noah", text: "Allie! Lo masih di dalam?" },
      {
        who: "Allie",
        text: "Di belakang minimarket. Bawa senjata, bukan cuma rasa khawatir.",
      },
      {
        who: "Noah",
        text: "Dua-duanya gue bawa. Ayo, kita cari jalan keluar.",
      },
    ],
    middle: [
      { who: "Noah", text: "Lo bilang pintu depan aman." },
      { who: "Allie", text: "Tadi. Sebelum lo nyalain alarm mobil." },
    ],
    outro: [
      {
        who: "Allie",
        text: "UV-nya bekerja. Yang ditandai sudah bersih. Ikuti lampu jalan ke shelter.",
      },
      {
        who: "Noah",
        text: "Tetap dekat gue. Kali ini kita lewat pintu yang sama.",
      },
    ],
  },
  {
    title: "Jalan yang Salah",
    place: "JALUR EVAKUASI / TIMUR",
    time: "03:27",
    goal: "Cari peta shelter dan hentikan beacon palsu.",
    quota: 20,
    theme: "street",
    tasks: [
      {
        x: 740,
        y: 700,
        label: "Periksa peta evakuasi",
        kind: "pickup",
        seconds: 0,
      },
      { x: 1460, y: 470, label: "Putus kabel alarm", kind: "hold", seconds: 2 },
    ],
    intro: [
      {
        who: "Radio",
        text: "Seluruh warga menuju shelter timur. Lokasi dinyatakan aman.",
      },
      {
        who: "Noah",
        text: "Kalau aman, kenapa semua mobil menghadap ke luar?",
      },
      {
        who: "Allie",
        text: "Itu rekaman. Kalimatnya persis sama sejak sepuluh menit lalu.",
      },
    ],
    middle: [
      {
        who: "Allie",
        text: "Shelter ini kosong. Beacon-nya justru menarik mereka ke sini.",
      },
    ],
    outro: [
      {
        who: "Noah",
        text: "Sinyalnya mati. Tapi orang lain masih menuju shelter ini.",
      },
      {
        who: "Allie",
        text: "Kita butuh pemancar. Ada satu di pelabuhan lama.",
      },
    ],
  },
  {
    title: "Pos Karantina",
    place: "CHECKPOINT / SEKTOR C",
    time: "03:41",
    goal: "Temukan kartu petugas dan buka pos karantina.",
    quota: 22,
    theme: "checkpoint",
    tasks: [
      {
        x: 650,
        y: 490,
        label: "Ambil kartu petugas",
        kind: "pickup",
        seconds: 0,
      },
      {
        x: 1490,
        y: 680,
        label: "Buka jalur inspeksi",
        kind: "hold",
        seconds: 3,
      },
    ],
    intro: [
      {
        who: "Noah",
        text: "Pelindung mereka masih aktif. Peluru biasa nggak cukup.",
      },
      {
        who: "Allie",
        text: "Sistem containment bisa melepas lapisannya. Tapi jangan kena drone medis.",
      },
    ],
    middle: [
      {
        who: "Noah",
        text: "Ada coretan di dinding: “Jangan percaya sirene.” Mereka sudah tahu.",
      },
    ],
    outro: [
      {
        who: "Allie",
        text: "Pelindung infected sudah lepas. Drone medis tetap aman.",
      },
      {
        who: "Noah",
        text: "Berarti masih ada yang selamat. Kita cari mereka.",
      },
    ],
  },
  {
    title: "Lorong Ambulans",
    place: "RUMAH SAKIT / PARKIR SELATAN",
    time: "04:02",
    goal: "Ambil baterai radio dan aktifkan penanda turret.",
    quota: 24,
    theme: "hospital",
    tasks: [
      {
        x: 720,
        y: 720,
        label: "Ambil baterai ambulans",
        kind: "pickup",
        seconds: 0,
      },
      { x: 1490, y: 440, label: "Sambungkan radio", kind: "hold", seconds: 3 },
    ],
    intro: [
      { who: "Allie", text: "Baterai ambulans bisa menyalakan radio kita." },
      {
        who: "Noah",
        text: "Gue periksa lorong. Lo jangan hilang dari pandangan.",
      },
    ],
    middle: [
      {
        who: "Radio",
        text: "…ada yang dengar? Kami masih di halte… anak-anak ikut kami…",
      },
      { who: "Noah", text: "Kapalnya di sana. Kenapa kita balik?" },
      {
        who: "Allie",
        text: "Karena radio itu masih nyuruh orang datang ke sini.",
      },
    ],
    outro: [
      { who: "Noah", text: "Oke. Lo benerin sinyalnya. Gue jagain pintunya." },
      { who: "Allie", text: "Kita kasih mereka jalan yang benar." },
    ],
  },
  {
    title: "Dua Sisi Pagar",
    place: "GUDANG / SEKTOR B",
    time: "04:19",
    goal: "Capai tuas pagar. Buka akses UV untuk menolong partner.",
    quota: 24,
    theme: "checkpoint",
    tasks: [
      {
        x: 680,
        y: 650,
        label: "Ambil kunci gudang",
        kind: "pickup",
        seconds: 0,
      },
      {
        x: 1530,
        y: 610,
        label: "Lepaskan pengunci pagar",
        kind: "rescue",
        seconds: 2,
      },
    ],
    intro: [
      { who: "Noah", text: "Pintunya nutup! Allie, lo di sisi mana?" },
      { who: "Allie", text: "Sektor B. Masih hidup. Untuk sekarang." },
      { who: "Noah", text: "Gue ke terminal UV. Jangan ke mana-mana." },
    ],
    middle: [
      {
        who: "Allie",
        text: "Yang di dalam sektor B saja. Ada penyintas di sebelahku.",
      },
    ],
    outro: [
      { who: "Noah", text: "Gue bilang jangan hilang dari pandangan." },
      {
        who: "Allie",
        text: "Gue juga nggak mesen pintu otomatis rusak. Makasih sudah balik.",
      },
    ],
  },
  {
    title: "Jalur Servis",
    place: "TEROWONGAN / AKSES PELABUHAN",
    time: "04:38",
    goal: "Pulihkan panel servis dan temukan exit tersembunyi.",
    quota: 26,
    theme: "checkpoint",
    tasks: [
      {
        x: 780,
        y: 480,
        label: "Ambil sekring servis",
        kind: "pickup",
        seconds: 0,
      },
      { x: 1450, y: 730, label: "Pasang sekring", kind: "hold", seconds: 3 },
    ],
    intro: [
      {
        who: "Allie",
        text: "Peta ini menyembunyikan jalur servis saat lockdown.",
      },
      { who: "Noah", text: "Bisa dibuka?" },
      {
        who: "Allie",
        text: "Bisa. Asal kita masih punya dua menit dan beberapa peluru.",
      },
    ],
    middle: [{ who: "Noah", text: "Gue mulai kangen jalan macet yang biasa." }],
    outro: [
      {
        who: "Allie",
        text: "Exit muncul. Lewat sini, pemancarnya tinggal satu blok.",
      },
      { who: "Noah", text: "Denger? Itu suara kapal. Bukan rekaman." },
    ],
  },
  {
    title: "Sinyal yang Benar",
    place: "RADIO PELABUHAN / KANAL 07",
    time: "04:51",
    goal: "Ambil modul pemancar. Pertahankan radio hingga akses terbuka.",
    quota: 30,
    theme: "harbor",
    tasks: [
      {
        x: 680,
        y: 670,
        label: "Ambil modul pemancar",
        kind: "pickup",
        seconds: 0,
      },
      {
        x: 1530,
        y: 530,
        label: "Tahan E · sambungkan antena",
        kind: "hold",
        seconds: 5,
      },
    ],
    intro: [
      {
        who: "Allie",
        text: "Jammer-nya terhubung ke sakelar. Gue butuh handler untuk pulse itu.",
      },
      { who: "Noah", text: "Gue tahan mereka. Kalau sudah siap, kasih tanda." },
    ],
    middle: [
      {
        who: "Radio",
        text: "Sinyalnya makin jelas… kami tunggu koordinat kalian.",
      },
    ],
    outro: [
      {
        who: "Allie",
        text: "Untuk semua yang mendengar: dermaga tujuh. Ikuti lampu amber. Kami tunggu.",
      },
      {
        who: "Radio",
        text: "Diterima! Kami bergerak. Terima kasih… terima kasih.",
      },
      { who: "Noah", text: "Nah. Itu baru suara manusia." },
    ],
  },
  {
    title: "Jangan Lepasin",
    place: "DERMAGA 07 / EVAKUASI TERAKHIR",
    time: "05:08",
    goal: "Ambil flare dan lemahkan mutan penjaga dermaga.",
    quota: 12,
    theme: "harbor",
    tasks: [
      {
        x: 720,
        y: 470,
        label: "Ambil flare kapal",
        kind: "pickup",
        seconds: 0,
      },
      {
        x: 1430,
        y: 700,
        label: "Nyalakan lampu dermaga",
        kind: "hold",
        seconds: 2,
      },
    ],
    intro: [
      {
        who: "Noah",
        text: "Kapal sudah siap. Satu masalah besar di depan kita.",
      },
      {
        who: "Allie",
        text: "Terminal ini terhubung ke containment. Lepas shield-nya, baru aktifkan purge.",
      },
    ],
    middle: [
      {
        who: "Noah",
        text: "Habis ini kita makan sesuatu yang nggak keluar dari kaleng.",
      },
      { who: "Allie", text: "Deal. Tapi lo yang masak." },
    ],
    outro: [
      { who: "Allie", text: "Shield lepas. Jalur bersih. Noah—sekarang!" },
      { who: "Noah", text: "Lari ke feri. Gue tepat di belakang lo." },
    ],
  },
];
export const ending: Line[] = [
  { who: "Radio", text: "Dermaga tujuh bersih. Semua penyintas sudah naik." },
  { who: "Noah", text: "Lo masih di sini?" },
  {
    who: "Allie",
    text: "Di sebelah lo. Akhirnya bukan cuma suara di radio.",
  },
  { who: "Noah", text: "Iya. Kali ini sampai rumah." },
];
