import type { State } from "../../server/state";
export type Plan = "cut" | "broadcast";
export const scars = [
  {
    name: "Alarm bocor",
    text: "UV gagal. Alarm pintu memanggil infected; satu pemburu tambahan mengikuti sampai menara.",
  },
  {
    name: "Rekaman dicuri",
    text: "Relay salah diputus. Sang Penyiar mendapatkan rekaman percakapan kalian.",
  },
  {
    name: "Sel pulse rusak",
    text: "Pelindung medis ikut terbuka. Sel cadangan rusak; isi ulang pulse menjadi lebih lambat.",
  },
  {
    name: "Karantina bocor",
    text: "Target salah ditandai. Infeksi ikut masuk ke rombongan evakuasi.",
  },
  {
    name: "Gerbong tertinggal",
    text: "UV salah sasaran. Gerbong penyintas harus ditinggalkan agar kereta bisa berangkat.",
  },
  {
    name: "Akses terbakar",
    text: "Gerbang macet. Jalur darurat terbuka, tetapi alarm menara ikut menyala.",
  },
  {
    name: "Kanal dibajak",
    text: "Jammer tetap aktif. Lokasi partner terbuka; ia terjebak di ruang pemancar.",
  },
  {
    name: "Inti bertahan",
    text: "Perintah gagal menutup inti. Satu simpul cadangan harus diputus secara manual.",
  },
];
export function damage(state: State) {
  return state.completed.map((done, i) => done && !state.first[i]);
}
export function chapterBeat(room: number, failed: boolean[]): string {
  return [
    "Panggilan evakuasi memakai suara partner. Padahal radionya belum menyala.",
    failed[0]
      ? "Alarm minimarket masih terdengar. Mereka mengikuti suaranya ke ruang relay."
      : "Di rekaman itu ada kata yang baru saja kalian ucapkan. Seseorang sedang mendengar.",
    failed[1]
      ? "Rekaman kalian hilang dari relay. Kini suara palsu mulai menjawab, bukan sekadar mengulang."
      : "Koordinat relay mengarah ke klinik. Daftar pasiennya ditulis sebelum wabah dimulai.",
    "Scan menunjukkan pola yang sama dengan gelombang radio. Ini bukan wabah biasa—siaran itu membawa infeksi.",
    failed[3]
      ? "Pintu gerbong ditutup. Dari dalam, seorang penyintas mulai mengulang suara Sang Penyiar."
      : "Peta asli ditemukan: kereta evakuasi tidak menuju tempat aman. Ujung jalurnya adalah sarang.",
    failed[4]
      ? "Kereta berangkat tanpa gerbong belakang. Lampu para penyintas tertinggal dalam gelap."
      : "Penyintas turun sebelum kereta masuk sarang. Sekarang kalian punya satu kesempatan membalik siaran.",
    failed[1]
      ? "“AMBER-07,” jawab suara palsu. Kodenya ikut tercuri. Hanya sakelar fisik yang bisa membuktikan kanal asli."
      : "Sang Penyiar memakai suara kalian untuk memanggil korban. Putus jammer sebelum ia menemukan partner.",
    failed[6]
      ? "Partner terjebak di pemancar. Memutus daya membebaskannya, tetapi infeksi di kota akan tetap ada."
      : "Inti terbuka. Memutus daya menghentikan panggilan; membalik siaran mungkin memulihkan yang terinfeksi.",
  ][room];
}
export function ending(failed: boolean[], plan: Plan) {
  const costs = failed.filter(Boolean).length;
  if (plan === "cut")
    return {
      title: "KOTA TANPA SUARA",
      text: `Menara padam. Noah dan Allie keluar bersama. ${failed[4] ? "Gerbong yang tertinggal tidak pernah tiba." : "Rombongan yang berhasil lolos menunggu di peron."} Panggilan berhenti, tetapi mereka yang terinfeksi belum pulih.`,
    };
  if (failed[6] || failed[7] || costs >= 4)
    return {
      title: "SUARA KETIGA",
      text: "Siaran balik menembus kota, tetapi jaringan yang rusak memberi Sang Penyiar jalan keluar. Noah dan Allie tiba di peron. Dari radio yang sudah dimatikan, suara mereka kembali memanggil.",
    };
  return {
    title: failed[4] ? "YANG TIDAK KEMBALI" : "PAGI PERTAMA",
    text: `Gelombang balik memutus infeksi. Orang-orang mulai mengenali suara mereka sendiri. ${failed[4] ? "Noah dan Allie selamat, tetapi kursi gerbong belakang tetap kosong." : "Noah dan Allie bertemu di peron saat lampu kota kembali menyala."}`,
  };
}
