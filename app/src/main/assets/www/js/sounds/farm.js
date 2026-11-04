// Синтезированные голоса птичьего двора. Мультяшные, но узнаваемые по ритму и интонации.
import { tone, noise, chime } from '../core/audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);

/** «Пи-пи-пи» цыплёнка. loud — громче и выше (реакция на тап). */
export function chirp({ pan = 0, loud = false, count = null, pitch = 1 } = {}) {
  const n = count || (loud ? 3 : 2 + Math.floor(Math.random() * 2));
  const base = rnd(3300, 3900) * pitch * (loud ? 1.08 : 1);
  for (let i = 0; i < n; i++) {
    const at = i * rnd(0.1, 0.13);
    const f = base * rnd(0.96, 1.05);
    tone({ freq: f, to: f * 0.72, dur: 0.075, type: 'sine', gain: loud ? 0.2 : 0.14, attack: 0.006, release: 0.05, at, pan, wet: 0.6, vibrato: 60, vibratoRate: 40 });
    tone({ freq: f * 2, to: f * 1.44, dur: 0.06, type: 'sine', gain: loud ? 0.03 : 0.02, attack: 0.006, at, pan, wet: 0.3 });
  }
}

/** Испуганный писк — когда пришла лиса. */
export function panicChirp(pan = 0) {
  const base = rnd(3800, 4400);
  for (let i = 0; i < 4; i++) {
    const at = i * 0.07;
    tone({ freq: base, to: base * 1.15, dur: 0.06, type: 'sine', gain: 0.12, attack: 0.004, at, pan, wet: 0.4 });
  }
}

/** Золотой цыплёнок: писк + волшебный перезвон. */
export function goldChirp(pan = 0) {
  chirp({ pan, loud: true });
  [1568, 1976, 2349, 3136].forEach((f, i) => chime(f, { gain: 0.07, dur: 0.9, at: 0.05 + i * 0.07, pan }));
}

function quackSyllable({ f, dur, at, pan, gain, formant }) {
  tone({ freq: f, to: f * 0.78, dur, type: 'sawtooth', gain, attack: 0.01, release: dur * 0.5, at, pan, wet: 0.4,
    filter: { type: 'bandpass', freq: formant, q: 3 } });
  tone({ freq: f, to: f * 0.78, dur, type: 'square', gain: gain * 0.4, attack: 0.01, release: dur * 0.5, at, pan, wet: 0.3,
    filter: { type: 'bandpass', freq: formant * 2.2, q: 4 } });
}

/** «Кря-кря» утёнка (высокое, мягкое). */
export function quack(pan = 0, baby = true) {
  const f = baby ? rnd(520, 600) : rnd(250, 290);
  quackSyllable({ f, dur: 0.13, at: 0, pan, gain: 0.32, formant: baby ? 1600 : 1100 });
  quackSyllable({ f: f * 0.95, dur: 0.15, at: 0.2, pan, gain: 0.3, formant: baby ? 1600 : 1100 });
}

/** «Га-га» гусёнка. */
export function honk(pan = 0) {
  const f = rnd(420, 470);
  for (let i = 0; i < 2; i++) {
    tone({ freq: f, to: f * 0.85, dur: 0.16, type: 'square', gain: 0.22, attack: 0.012, release: 0.08, at: i * 0.24, pan, wet: 0.4,
      filter: { type: 'bandpass', freq: 1000, q: 2.5 } });
  }
}

/** «Ко-ко-ко… кудах» курицы. */
export function cluck(pan = 0, long = false) {
  const n = long ? 4 : 3;
  for (let i = 0; i < n; i++) {
    const f = rnd(480, 540);
    tone({ freq: f, to: f * 0.7, dur: 0.08, type: 'sawtooth', gain: 0.26, attack: 0.006, release: 0.05, at: i * 0.15, pan, wet: 0.5,
      filter: { type: 'bandpass', freq: 1100, q: 2 } });
  }
  if (long) {
    const at = n * 0.15 + 0.05;
    tone({ freq: 520, to: 820, dur: 0.32, type: 'sawtooth', gain: 0.24, attack: 0.02, release: 0.12, at, pan, wet: 0.6, curve: 'lin',
      filter: { type: 'bandpass', freq: 1300, q: 2 } });
  }
}

/** «Кукарекууу!» петуха — громко. */
export function crow(pan = 0) {
  const sy = [
    { f: 560, to: 600, d: 0.13, a: 0.0 },
    { f: 650, to: 700, d: 0.12, a: 0.17 },
    { f: 760, to: 820, d: 0.16, a: 0.33 },
    { f: 860, to: 640, d: 0.85, a: 0.55, vib: 18 },
  ];
  for (const s of sy) {
    tone({ freq: s.f, to: s.to, dur: s.d, type: 'sawtooth', gain: 0.3, attack: 0.02, release: Math.min(0.25, s.d * 0.5), at: s.a, pan, wet: 1,
      curve: 'lin', vibrato: s.vib || 6, vibratoRate: 7, filter: { type: 'bandpass', freq: 1500, q: 1.4 } });
    tone({ freq: s.f * 2, to: s.to * 2, dur: s.d, type: 'triangle', gain: 0.06, attack: 0.02, release: Math.min(0.25, s.d * 0.5), at: s.a, pan, wet: 1,
      curve: 'lin', vibrato: (s.vib || 6) * 2, vibratoRate: 7 });
  }
}

/** «Бл-бл-бл» индюка. */
export function gobble(pan = 0) {
  for (let i = 0; i < 9; i++) {
    const f = i % 2 ? 260 : 330;
    tone({ freq: f, to: f * 0.9, dur: 0.045, type: 'sawtooth', gain: 0.22, attack: 0.004, release: 0.03, at: i * 0.055, pan, wet: 0.5,
      filter: { type: 'bandpass', freq: 900, q: 2 } });
  }
}

/** Тявканье лисы — игривое. */
export function yip(pan = 0) {
  for (let i = 0; i < 2; i++) {
    const at = i * 0.18;
    tone({ freq: 900, to: 1500, dur: 0.06, type: 'triangle', gain: 0.22, attack: 0.004, at, pan, wet: 0.6, curve: 'lin' });
    tone({ freq: 1500, to: 800, dur: 0.08, type: 'triangle', gain: 0.2, attack: 0.004, at: at + 0.055, pan, wet: 0.6 });
  }
}

/** «Хм…» — лиса ушла ни с чем. */
export function foxSigh(pan = 0) {
  tone({ freq: 340, to: 200, dur: 0.5, type: 'triangle', gain: 0.18, attack: 0.03, at: 0, pan, wet: 0.8, vibrato: 8, vibratoRate: 5 });
}

/** Треск скорлупы. */
export function eggCrack(pan = 0) {
  for (let i = 0; i < 3; i++) {
    noise({ dur: 0.035, gain: 0.25, type: 'highpass', freq: 2500, at: i * rnd(0.05, 0.09), pan, wet: 0.3 });
  }
}

/** Стук зёрнышка о землю. */
export function grainTick(pan = 0) {
  noise({ dur: 0.03, gain: 0.05, type: 'bandpass', freq: rnd(3500, 5500), q: 4, pan, wet: 0.2 });
}

/** Клевок. */
export function peck(pan = 0) {
  noise({ dur: 0.025, gain: 0.08, type: 'bandpass', freq: 2200, q: 3, pan, wet: 0.2 });
}

/** Мягкий «хлоп» появления. */
export function pop(pan = 0) {
  tone({ freq: 420, to: 760, dur: 0.09, type: 'sine', gain: 0.12, attack: 0.005, pan, wet: 0.3 });
}
