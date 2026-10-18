// Synthesised audio only: no asset files, nothing plays until the first click.
const KEY = "dead-signal-audio";
const MUSIC_KEY = "dead-signal-music";
let context: AudioContext | undefined;
let noise: AudioBuffer | undefined;
let nextBeat = 0;
const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};
export let muted = read(KEY) === "off";
export let musicOn = read(MUSIC_KEY) !== "off";
export function setMuted(value: boolean) {
  muted = value;
  write(KEY, value ? "off" : "on");
}
export async function unlockAudio() {
  try {
    context ??= new AudioContext();
    await context.resume();
  } catch {}
}
const live = () => !!context && context.state === "running";
export type Cue =
  | "pulse"
  | "zap"
  | "steam"
  | "alarm"
  | "hit"
  | "break"
  | "jump"
  | "caught"
  | "correct"
  | "wrong"
  | "pickup"
  | "node"
  | "exit"
  | "static"
  | "screech"
  | "close";
function tone(
  c: AudioContext,
  at: number,
  type: OscillatorType,
  from: number,
  to: number,
  length: number,
  volume: number,
  out: AudioNode = c.destination,
  attack = 0,
) {
  const osc = c.createOscillator(),
    gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + length);
  if (attack) {
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + attack);
  } else gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + length);
  osc.onended = () => gain.disconnect();
}
function hiss(
  c: AudioContext,
  at: number,
  length: number,
  volume: number,
  hz: number,
  out: AudioNode = c.destination,
) {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const source = c.createBufferSource(),
    filter = c.createBiquadFilter(),
    gain = c.createGain();
  source.buffer = noise;
  filter.type = "bandpass";
  filter.frequency.value = hz;
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  source.connect(filter).connect(gain).connect(out);
  source.start(at);
  source.stop(at + length);
  source.onended = () => gain.disconnect();
}
export function cue(kind: Cue) {
  if (muted || !live()) return;
  const c = context!,
    t = c.currentTime;
  if (kind === "pulse") {
    tone(c, t, "sine", 180, 900, 0.35, 0.22);
    hiss(c, t, 0.3, 0.12, 2400);
  } else if (kind === "hit") {
    tone(c, t, "triangle", 140, 55, 0.12, 0.3);
    hiss(c, t, 0.08, 0.3, 500);
  } else if (kind === "break") {
    tone(c, t, "sawtooth", 220, 40, 0.45, 0.18);
    hiss(c, t, 0.5, 0.35, 900);
  } else if (kind === "zap") {
    hiss(c, t, 0.25, 0.3, 4200);
    tone(c, t, "square", 90, 60, 0.2, 0.08);
  } else if (kind === "steam") hiss(c, t, 0.9, 0.18, 1800);
  else if (kind === "alarm")
    for (let i = 0; i < 3; i++) {
      tone(c, t + i * 0.5, "square", 950, 950, 0.24, 0.05);
      tone(c, t + i * 0.5 + 0.25, "square", 700, 700, 0.24, 0.05);
    }
  else if (kind === "jump") tone(c, t, "sine", 260, 520, 0.12, 0.08);
  else if (kind === "caught") {
    tone(c, t, "sawtooth", 220, 55, 0.5, 0.2);
    hiss(c, t, 0.4, 0.25, 500);
  } else if (kind === "correct") {
    [523, 659, 784].forEach((f, i) =>
      tone(c, t + i * 0.09, "triangle", f, f, 0.22, 0.16),
    );
  } else if (kind === "wrong") {
    tone(c, t, "square", 160, 120, 0.45, 0.1);
    tone(c, t + 0.05, "square", 151, 110, 0.45, 0.08);
  } else if (kind === "pickup") tone(c, t, "triangle", 700, 1300, 0.14, 0.14);
  else if (kind === "node") {
    tone(c, t, "sine", 330, 990, 0.25, 0.18);
    tone(c, t + 0.12, "sine", 495, 1480, 0.3, 0.12);
  } else if (kind === "exit") tone(c, t, "triangle", 392, 784, 0.4, 0.15);
  else if (kind === "static") hiss(c, t, 0.6, 0.1, 1200);
  else if (kind === "screech") {
    tone(c, t, "sawtooth", 900, 1600, 0.4, 0.07);
    hiss(c, t, 0.4, 0.1, 3200);
  } else if (kind === "close") tone(c, t, "sine", 1200, 600, 0.18, 0.12);
}
// Heartbeat paces itself from danger (0..1); called every frame while escaping.
export function heartbeat(danger: number) {
  if (muted || !live() || danger < 0.15) return;
  const t = context!.currentTime;
  if (t < nextBeat) return;
  nextBeat = t + 1.1 - danger * 0.7;
  tone(context!, t, "sine", 70, 45, 0.16, 0.25 * danger);
  tone(context!, t + 0.18, "sine", 62, 40, 0.14, 0.18 * danger);
}

// Backsound: a low detuned drone that always plays, plus layers that enter
// with tension (0 explore · ~0.4 chase · 1 cornered): a syncopated bass
// pulse, ticking hats and a beating high dissonance. Tempo rises with it.
let music: {
  bus: GainNode;
  filter: BiquadFilterNode;
  pad: GainNode;
  sources: OscillatorNode[];
  timer: number;
} | null = null;
let tension = 0,
  target = 0,
  quiet = false,
  step = 0,
  nextStep = 0;
const BASS = [0, 3, 6, 8, 10, 13];
const EERIE = [440, 466.2, 523.3, 659.3, 698.5];
export function startMusic() {
  if (!musicOn || music || !live()) return;
  const c = context!,
    t = c.currentTime;
  const bus = c.createGain(),
    filter = c.createBiquadFilter(),
    drone = c.createGain(),
    pad = c.createGain(),
    lfo = c.createOscillator(),
    depth = c.createGain();
  bus.gain.setValueAtTime(0.0001, t);
  bus.gain.exponentialRampToValueAtTime(quiet ? 0.2 : 0.55, t + 2.5);
  bus.connect(c.destination);
  filter.type = "lowpass";
  filter.frequency.value = 240;
  filter.Q.value = 6;
  drone.gain.value = 0.12;
  filter.connect(drone).connect(bus);
  lfo.frequency.value = 0.07;
  depth.gain.value = 110;
  lfo.connect(depth).connect(filter.frequency);
  pad.gain.value = 0;
  pad.connect(bus);
  const sources = [lfo];
  for (const [type, hz, dest] of [
    ["sawtooth", 55, filter],
    ["sawtooth", 55.45, filter],
    ["sine", 41.2, filter],
    ["sine", 880, pad],
    ["sine", 932.3, pad],
  ] as const) {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = hz;
    osc.connect(dest);
    sources.push(osc);
  }
  sources.forEach((s) => s.start(t));
  nextStep = t + 0.1;
  music = {
    bus,
    filter,
    pad,
    sources,
    timer: window.setInterval(schedule, 30),
  };
}
function schedule() {
  if (!music || !live()) return;
  const c = context!,
    t = c.currentTime;
  tension += (target - tension) * 0.04;
  music.filter.frequency.setTargetAtTime(220 + tension * 900, t, 0.3);
  music.pad.gain.setTargetAtTime(tension > 0.5 ? tension * 0.018 : 0, t, 0.5);
  const length = 0.17 - tension * 0.05;
  // After a suspended tab, skip ahead instead of firing a backlog of notes.
  if (nextStep < t - 0.2) nextStep = t;
  while (nextStep < t + 0.12) {
    const at = nextStep,
      beat = step % 16;
    if (tension > 0.25 && BASS.includes(beat))
      tone(c, at, "sawtooth", 58, 48, 0.14, 0.09 * tension, music.bus);
    if (tension > 0.5 && beat % 2 === 0)
      hiss(c, at, 0.03, 0.05 * tension, 7000, music.bus);
    if (step % 32 === 0 && Math.random() < 0.7)
      tone(
        c,
        at,
        "triangle",
        EERIE[Math.floor(Math.random() * EERIE.length)],
        EERIE[0] * 0.98,
        2.8,
        0.03,
        music.bus,
        1.2,
      );
    if (step % 64 === 0 && tension < 0.3)
      tone(c, at, "sine", 42, 30, 1.6, 0.16, music.bus);
    step++;
    nextStep += length;
  }
}
export function stopMusic() {
  if (!music) return;
  const m = music,
    t = context!.currentTime;
  music = null;
  clearInterval(m.timer);
  m.bus.gain.setTargetAtTime(0.0001, t, 0.3);
  window.setTimeout(() => {
    m.sources.forEach((s) => s.stop());
    m.bus.disconnect();
  }, 1500);
}
export function setMusicOn(value: boolean) {
  musicOn = value;
  write(MUSIC_KEY, value ? "on" : "off");
  if (value) startMusic();
  else stopMusic();
}
export function setTension(value: number) {
  target = Math.max(0, Math.min(1, value));
}
// Overlays (quiz, pause, menu) keep the drone but pull it back.
export function setMusicQuiet(value: boolean) {
  if (quiet === value) return;
  quiet = value;
  if (alarm && live())
    alarm.gain.gain.setTargetAtTime(
      value ? 0.02 : 0.05,
      context!.currentTime,
      0.3,
    );
  if (music && live())
    music.bus.gain.setTargetAtTime(
      value ? 0.2 : 0.55,
      context!.currentTime,
      0.4,
    );
}
// Siren loop for the freezer alarm: a two-tone wail under everything else.
let alarm: { gain: GainNode; sources: OscillatorNode[] } | null = null;
export function setAlarm(on: boolean) {
  if (!on || muted || !live()) {
    if (!alarm) return;
    const a = alarm;
    alarm = null;
    a.gain.gain.setTargetAtTime(0.0001, context!.currentTime, 0.2);
    window.setTimeout(() => {
      a.sources.forEach((s) => s.stop());
      a.gain.disconnect();
    }, 800);
    return;
  }
  if (alarm) return;
  const c = context!,
    t = c.currentTime,
    gain = c.createGain(),
    filter = c.createBiquadFilter(),
    siren = c.createOscillator(),
    lfo = c.createOscillator(),
    depth = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(quiet ? 0.02 : 0.05, t + 0.4);
  filter.type = "lowpass";
  filter.frequency.value = 2200;
  siren.type = "square";
  siren.frequency.value = 820;
  lfo.type = "square";
  lfo.frequency.value = 1.6;
  depth.gain.value = 130;
  lfo.connect(depth).connect(siren.frequency);
  siren.connect(filter).connect(gain).connect(c.destination);
  siren.start(t);
  lfo.start(t);
  alarm = { gain, sources: [siren, lfo] };
}
export function suspendAudio(hidden: boolean) {
  if (!context) return;
  void (hidden ? context.suspend() : context.resume());
}
