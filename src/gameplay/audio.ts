import { settings } from "./input";
let context: AudioContext | undefined;
let noise: AudioBuffer | undefined;
let active = 0;
export function unlockAudio() {
  try {
    context ??= new AudioContext();
    void context.resume();
  } catch {}
}
export function sfx(
  kind:
    | "pistol"
    | "shotgun"
    | "smg"
    | "hit"
    | "dash"
    | "reload"
    | "radio"
    | "pickup"
    | "boom"
    | "step",
) {
  if (!settings.volume || active > 14) return;
  unlockAudio();
  if (!context) return;
  const c = context;
  active++;
  const gain = c.createGain();
  gain.connect(c.destination);
  const length =
    kind === "boom"
      ? 0.55
      : kind === "shotgun"
        ? 0.24
        : kind === "step"
          ? 0.04
          : 0.13;
  gain.gain.setValueAtTime(
    settings.volume * (kind === "step" ? 0.06 : 0.28),
    c.currentTime,
  );
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + length);
  if (["pistol", "shotgun", "smg", "boom", "step", "hit"].includes(kind)) {
    if (!noise) {
      noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const source = c.createBufferSource();
    source.buffer = noise;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value =
      kind === "boom" ? 160 : kind === "shotgun" ? 700 : 1500;
    source.connect(filter).connect(gain);
    source.start();
    source.stop(c.currentTime + length);
    source.onended = () => {
      active--;
      gain.disconnect();
      filter.disconnect();
    };
  } else {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(
      kind === "pickup" ? 850 : kind === "radio" ? 220 : 450,
      c.currentTime,
    );
    osc.frequency.exponentialRampToValueAtTime(
      kind === "pickup" ? 1200 : 90,
      c.currentTime + length,
    );
    osc.connect(gain);
    osc.start();
    osc.stop(c.currentTime + length);
    osc.onended = () => {
      active--;
      gain.disconnect();
    };
  }
}
export function sound(freq = 440) {
  sfx(freq < 200 ? "hit" : freq > 800 ? "pickup" : "radio");
}
