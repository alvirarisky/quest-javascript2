import { names, type Character, type Line } from "../gameplay/story";

// The menu selects the opening POV. Each completed scene hands control to the other survivor.
export function sceneFor(opening: Character, room: number) {
  const character: Character =
    room % 2 === 0 ? opening : opening === "noah" ? "allie" : "noah";
  const partner: Character = character === "noah" ? "allie" : "noah";
  const local = names[character] as Line["who"],
    remote = names[partner] as Line["who"];
  const say = (who: Line["who"], text: string): Line => ({ who, text });
  const locations = [
    ["MINIMARKET / PINTU DEPAN", "RUANG CCTV / BELAKANG TOKO"],
    ["SHELTER TIMUR / RUANG RELAY", "JALUR EVAKUASI / POS LUAR"],
    ["POS KARANTINA / TERMINAL UV", "KLINIK / RUANG RADIO"],
    ["KLINIK / PARKIR AMBULANS", "GUDANG / PAGAR BARAT"],
    ["GUDANG / PANEL SEKTOR B", "GUDANG / SISI DALAM PAGAR"],
    ["TEROWONGAN / PANEL SERVIS", "RADIO PELABUHAN / AKSES LUAR"],
    ["RADIO PELABUHAN / PEMANCAR", "DERMAGA 07 / GERBANG LUAR"],
    ["DERMAGA 07 / PANEL CONTAINMENT", "FERI 07 / PINTU NAIK"],
  ];
  const intros: Line[][] = [
    [
      say(
        local,
        `${names[partner]}, kedengeran? Gue di pintu depan minimarket.`,
      ),
      say(
        remote,
        "Jelas. Gue di ruang CCTV belakang. Rolling door macet, kita belum bisa ketemu.",
      ),
      say(
        local,
        "Oke. Gue bersihin jalur lewat terminal UV. Lo pantau kamera.",
      ),
      say(remote, "Yang ditandai saja. Jangan sampai drone medis ikut hilang."),
    ],
    [
      say(local, "Gue sampai ruang relay shelter. Sepi banget."),
      say(
        remote,
        "Dari pos luar juga kosong. Tapi radionya masih nyuruh warga masuk.",
      ),
      say(
        "Radio",
        "Seluruh warga menuju shelter timur. Lokasi dinyatakan aman.",
      ),
      say(local, "Itu rekaman yang sama. Gue matikan sumbernya dari sini."),
    ],
    [
      say(
        local,
        "Pos karantina terkunci. Infected di balik pagar masih pakai shield.",
      ),
      say(
        remote,
        "Gue sudah di radio klinik. Panel UV lo bisa melepas shield mereka.",
      ),
      say(
        local,
        "Drone medis juga bershield. Gue harus pilih target yang tepat.",
      ),
    ],
    [
      say(local, "Gue di parkiran klinik. Ada baterai ambulans buat radio."),
      say(remote, "Gue ke pagar gudang. Jalur langsung ke kapal tertutup."),
      say("Radio", "…kami masih di halte… anak-anak ikut kami…"),
      say(
        local,
        "Kita belum boleh pergi. Tandai ancaman tinggi dulu, biar mereka bisa lewat.",
      ),
    ],
    [
      say(local, "Gue di panel luar gudang. Lo di sisi mana?"),
      say(
        remote,
        "Di dalam sektor B sama penyintas. Pintu di belakang kami nutup.",
      ),
      say(local, "Gue aktifkan UV sektor B. Jauhin pagar."),
      say(
        remote,
        "Yang enemy saja. Penyintas di sini jangan sampai ikut kena.",
      ),
    ],
    [
      say(
        local,
        "Kami sudah keluar dari gudang. Gue pisah dari rombongan buat cek terowongan servis.",
      ),
      say(
        remote,
        "Gue lewat jalur luar menuju radio pelabuhan. Pintu servis lo disembunyikan saat lockdown.",
      ),
      say(local, "Berarti lepas penguncinya, baru tampilkan aksesnya."),
      say(remote, "Betul. Ketemu di feri. Radio tetap nyala."),
    ],
    [
      say(local, "Gue di pemancar. Jammer terhubung ke pulse-switch."),
      say(
        remote,
        "Gue di gerbang dermaga. Rombongan mulai sampai, tapi sinyal masih putus-putus.",
      ),
      say(local, "Gue pasang handler dulu. Setelah itu baru tekan sakelarnya."),
    ],
    [
      say(local, "Gue di panel dermaga. Ada mutan yang nutup jalur naik."),
      say(
        remote,
        "Gue sudah di pintu feri. Containment bisa menjangkaunya dari panel lo.",
      ),
      say(local, "Lepas shield dulu, lalu purge. Habis itu gue nyusul."),
      say(remote, "Gue tunggu di sini. Jangan matikan radio."),
    ],
  ];
  const outros: Line[][] = [
    [
      say(local, "Jalur depan bersih. Gue keluar lewat jalan utama."),
      say(
        remote,
        "Pintu belakang ikut terbuka. Gue cek relay shelter lewat gang servis.",
      ),
      say(local, "Kita pisah jalur dulu. Kasih kabar begitu sampai."),
    ],
    [
      say(
        local,
        "Beacon palsu mati. Kita butuh pemancar buat kasih rute yang benar.",
      ),
      say(
        remote,
        "Gue lanjut ke pos karantina. Lo cari akses radio dari klinik.",
      ),
    ],
    [
      say(local, "Shield infected lepas. Drone medis masih aman."),
      say(
        remote,
        "Diterima. Sekarang gue cari suplai di parkiran klinik. Tetap di kanal ini.",
      ),
    ],
    [
      say(local, "Ancaman sudah ditandai. Tim evakuasi bisa lewat klinik."),
      say(
        remote,
        "Gue sampai panel gudang. Ada masalah dengan pagar sektor B.",
      ),
      say(local, "Gue coba lewat sisi dalam. Lo pegang panelnya."),
    ],
    [
      say(remote, "Pagarnya kebuka! Gue lihat lo di seberang."),
      say(
        local,
        "Syukurlah. Bawa mereka lewat terowongan. Gue ambil jalur ke radio.",
      ),
      say(remote, "Oke. Sampai ketemu lagi di feri."),
    ],
    [
      say(local, "Pintu servis kelihatan. Rombongan bisa menuju dermaga."),
      say(
        remote,
        "Gue sudah masuk ruang pemancar. Sebentar lagi sinyalnya pulih.",
      ),
    ],
    [
      say(
        local,
        "Untuk semua yang mendengar: dermaga tujuh. Ikuti lampu amber.",
      ),
      say("Radio", "Diterima! Kami bergerak. Terima kasih!"),
      say(remote, "Sinyal jelas. Sekarang giliran gue buka gerbang terakhir."),
    ],
    [
      say(local, "Jalur bersih. Gue menuju pintu naik sekarang."),
      say(
        remote,
        "Gue lihat lampu panel lo dari kapal. Jalan lurus, gue tunggu di ujung.",
      ),
    ],
  ];
  return {
    character,
    partner,
    place: locations[room][0],
    remotePlace: locations[room][1],
    intro: intros[room],
    outro: outros[room],
  };
}
