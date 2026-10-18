import type { Proof } from "../../server/state";
export const formatTime = (ms: number) =>
  new Date(ms).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });
// Renders the signed result as an image the student can upload as evidence.
export function proofImage(proof: Proof, ending: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 640;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#0a1418";
  c.fillRect(0, 0, 1200, 640);
  c.strokeStyle = "#e3bd78";
  c.lineWidth = 4;
  c.strokeRect(24, 24, 1152, 592);
  c.fillStyle = "#e3bd78";
  c.font = "600 20px monospace";
  c.fillText("BUKTI PENGERJAAN · PRAKTIKUM jQUERY", 70, 92);
  c.fillStyle = "#e2e8de";
  c.font = "700 64px Oswald, sans-serif";
  c.fillText("DEAD SIGNAL", 70, 170);
  const rows: [string, string][] = [
    ["Nama", proof.name],
    ["NIM", proof.student],
    ["Kelas", proof.kelas],
    ["Nilai", `${String(proof.score).replace(".", ",")} / 100`],
    ["Jawaban benar", `${proof.correct} dari 8`],
    ["Ending", ending],
    ["Selesai", formatTime(proof.finishedAt)],
  ];
  rows.forEach(([label, value], i) => {
    const y = 250 + i * 54;
    c.fillStyle = "#9dafa8";
    c.font = "24px Source, Arial, sans-serif";
    c.fillText(label, 70, y);
    c.fillStyle = label === "Nilai" ? "#e3bd78" : "#e2e8de";
    c.font = `${label === "Nilai" ? "700 34px" : "600 28px"} Source, Arial, sans-serif`;
    c.fillText(value.slice(0, 60), 330, y);
  });
  return canvas;
}
export function download(canvas: HTMLCanvasElement, proof: Proof) {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `dead-signal-${proof.student.replace(/[^\w-]+/g, "_")}.png`;
  a.click();
}
