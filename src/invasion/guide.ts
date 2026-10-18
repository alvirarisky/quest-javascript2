import { missions } from "./missions";
import { KINDS, OBSTACLES } from "./world";
// In-game guide: how each mission's four steps work. Quiz entries teach the
// concept with an example on other names — never the answer itself.
const CONCEPTS = [
  {
    explain:
      "Titik (.) memilih semua elemen yang punya class tersebut. hide() menyembunyikan elemen yang terpilih.",
    example: '$(".lampu").hide();',
  },
  {
    explain:
      "Tanda pagar (#) memilih satu elemen dengan ID unik. fadeOut() memudarkan elemen sampai hilang.",
    example: '$("#pintu").fadeOut();',
  },
  {
    explain:
      "Dua class ditulis menempel tanpa spasi (.a.b) memilih elemen yang punya keduanya. Kalau diberi spasi, artinya turunan. removeClass() melepas sebuah class.",
    example: '$(".kotak.aktif").removeClass("aktif");',
  },
  {
    explain:
      'Selector atribut [atribut="nilai"] memilih elemen berdasarkan atributnya dan bisa digabung dengan class. addClass() menambahkan class.',
    example: '$(\'.item[data-tipe="baru"]\').addClass("sorot");',
  },
  {
    explain:
      "Spasi di antara dua selector berarti turunan: elemen kanan yang berada di dalam elemen kiri.",
    example: '$("#menu .tombol").hide();',
  },
  {
    explain:
      "Method chaining memanggil beberapa method berurutan pada seleksi yang sama. Urutannya ikut menentukan hasil.",
    example: '$("#panel").addClass("buka").show();',
  },
  {
    explain:
      'on("click", function () { ... }) memasang aksi yang baru berjalan ketika elemen diklik, bukan saat itu juga.',
    example: '$("#tombol").on("click", function () { $(".pesan").show(); });',
  },
  {
    explain:
      "Gabungkan selector ID dengan chaining. Lepaskan dulu yang menghalangi, baru jalankan efek berikutnya.",
    example: '$("#kotak").removeClass("terkunci").fadeOut();',
  },
];
const FIELD = [
  "Pancing infected ke area UV. Suara dari dalam area UV menarik mereka tanpa membuka jalan masuk. Memilih alarm menyalakan sirene sampai bab selesai.",
  "Dua kanal tampil sebagai batang gelombang. Rekaman palsu mengulang pola empat batang yang sama tiga kali, sedangkan kanal asli berubah-ubah. Posisi kanal diacak.",
  "Buka katup sprinkler; langsung berhasil tanpa pilihan.",
  "Bandingkan dua ruang isolasi. Bukti infeksi alien adalah pola hijau bercabang pada scan, bukan suhu tubuh.",
  "Peta menandai gerbong penyintas dengan lampu amber. Alihkan daya ke jalur yang warnanya cocok dengan peta.",
  "Warna tiga soket hanya terlihat saat lampu berkedip. Sekring yang dibawa berwarna biru. Soket merah tersambung ke alarm darurat.",
  "Lampu uji berkedip 2–4 kali (acak). Pos evakuasi asli melihat lampu itu lewat kamera, jadi suara yang benar menyebut jumlah kedipan yang sama. Kode bisa dicuri. Tersedia tombol Ulangi kedipan.",
  "Putar rekaman umpan ke tempat yang tidak membahayakan penyintas. Lalu pilih akhir: putus listrik (2 simpul) atau balik siaran (3 simpul). Keduanya sah, endingnya berbeda.",
];
const MODES = {
  run: "Kabur ke pintu keluar. Q merobohkan infected yang dekat sehingga bisa dilewati.",
  quiet:
    "Bab tenang: tidak ada kejaran jika kuis benar dan tidak ada salah pilih tindakan. Kalau ada, bab ini berubah jadi kejaran.",
  hide: "Sembunyi: patroli berjalan bolak-balik. Diam (tanpa bergerak) di zona BAYANGAN saat mereka lewat. Gelombang Q membangunkan semua patroli.",
  defend:
    "Bertahan: gerbang servis macet. Pukul dengan E sampai bilahnya habis sementara infected datang bergelombang dari kiri. Tertangkap membuat gerbang terkunci lagi sedikit.",
};
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  className = "",
) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
function steps(items: [string, string, string?][]) {
  const list = el("ol", "", "guide-steps");
  for (const [label, text, code] of items) {
    const li = el("li");
    li.append(el("b", label), el("p", text));
    if (code) li.append(el("code", code));
    list.append(li);
  }
  return list;
}
const general = () => {
  const section = el("section");
  section.id = "guide-general";
  section.append(
    el("h3", "Cara main"),
    steps([
      [
        "1 · Barang",
        "Dekati penanda amber (klik tombol aksi untuk berjalan otomatis) lalu tekan E.",
      ],
      [
        "2 · Tindakan lapangan",
        "Pilihan atau teka-teki singkat. Tidak dinilai dan boleh diulang, tetapi salah pilih menimbulkan suara: fase kabur bab itu mendapat satu infected tambahan.",
      ],
      [
        "3 · Kuis jQuery",
        "Pilih satu dari empat kode, sekali kirim. Benar +12,5 poin dan zombie lebih sedikit; salah 0 poin, cerita tetap lanjut dengan kerusakan. Setelah kirim, simulasi menunjukkan elemen mana yang terkena.",
      ],
      [
        "4 · Kabur",
        "Lari, sembunyi, atau bertahan sesuai bab. Tertangkap hanya mengulang posisi; nilai tidak berubah.",
      ],
    ]),
    el("h3", "Kontrol"),
    steps([
      ["A / D", "Jalan. Tombol ← → di layar HP."],
      [
        "Space / W",
        "Lompat rintangan rendah. ↑ di HP; di depan rintangan otomatis menyeberang.",
      ],
      [
        "Q",
        "Gelombang: robohkan infected dekat (bisa dilewati), dorong yang jauh. Ada jeda isi ulang.",
      ],
      [
        "E",
        "Interaksi. Tekan berulang untuk memukul rolling door, kaca, palang, gerbang, dan simpul.",
      ],
      ["Esc", "Jeda: efek suara, musik, kurangi gerakan, kembali ke menu."],
    ]),
    el("h3", "Nilai dan bukti"),
    el(
      "p",
      "Nilai = jumlah kuis benar × 12,5 (maksimal 100), dihitung server. Di layar akhir, unduh bukti PNG dan salin kode bukti untuk dikumpulkan. Rank kabur S–D hanya hiasan.",
    ),
  );
  return section;
};
function mission(i: number) {
  const m = missions[i],
    section = el("section", "", "guide-mission");
  section.id = "guide-" + i;
  const obstacles = OBSTACLES[i].map(([kind]) => {
    const spec = KINDS[kind];
    return `${spec.name} (${
      spec.cat === "jump"
        ? "lompat"
        : spec.cat === "smash"
          ? `pukul ${spec.hp}×`
          : spec.cat === "hazard"
            ? kind === "steam"
              ? "tunggu padam"
              : "lewati saat padam atau lompati"
            : "memperlambat"
    })`;
  });
  section.append(
    el("small", `${m.act} · ${m.location}`),
    el("h3", `${i + 1}. ${m.title}`),
    steps([
      [
        "1 · " + m.tasks[0].label,
        m.tasks[0].instruction +
          (m.tasks[0].item ? ` Didapat: ${m.tasks[0].item}.` : ""),
      ],
      ["2 · " + m.tasks[1].label, FIELD[i]],
      [
        "3 · " +
          m.device +
          " — " +
          [
            "Selector class · hide",
            "Selector ID · fadeOut",
            "Compound class · removeClass",
            "Selector atribut · addClass",
            "Selector turunan · hide",
            "Method chaining · show",
            "Event handler · callback",
            "ID · chaining berurutan",
          ][i],
        m.quiz + " " + CONCEPTS[i].explain + " Contoh dengan nama lain:",
        CONCEPTS[i].example,
      ],
      [
        "4 · Kabur",
        (i === 7
          ? "Hancurkan simpul inti dengan E (3 pukulan per simpul). Sang Penyiar menyapu lantai dengan tentakel setelah garis merah muncul — lompat untuk menghindar. Lalu keluar."
          : MODES[m.escape]) +
          (obstacles.length ? ` Rintangan: ${obstacles.join(", ")}.` : ""),
      ],
    ]),
  );
  return section;
}
// Fills the guide once; `current` highlights the mission being played.
export function renderGuide(
  nav: HTMLElement,
  body: HTMLElement,
  current: { room: number; step: string } | null,
) {
  nav.replaceChildren();
  body.replaceChildren();
  const jump = (id: string) => () =>
    body.querySelector("#" + id)?.scrollIntoView({ block: "start" });
  const tab = el("button", "Umum");
  tab.onclick = jump("guide-general");
  nav.append(tab);
  body.append(general());
  missions.forEach((_, i) => {
    const b = el("button", String(i + 1));
    b.setAttribute("aria-label", `Misi ${i + 1}`);
    b.onclick = jump("guide-" + i);
    const section = mission(i);
    if (current?.room === i) {
      b.classList.add("current");
      section.classList.add("current");
      section.prepend(el("p", "SEKARANG · " + current.step, "guide-now"));
    }
    nav.append(b);
    body.append(section);
  });
  if (current) jump("guide-" + current.room)();
}
