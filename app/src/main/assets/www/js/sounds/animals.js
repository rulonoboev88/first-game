// Голоса зверей: натуральные записи CC0 (если загружены), иначе мультяшный синтез.
import { tone, noise, loadSamples, playSample, fakeVoice } from '../core/audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const DIR = 'sounds/animals';

// Какие записи есть для каждого зверя (файлы sounds/animals/<имя>.ogg).
export const ANIMAL_SAMPLES = {
  cow: ['cow_1', 'cow_2'], sheep: ['sheep_1', 'sheep_2'], goat: ['goat_1', 'goat_2'],
  horse: ['horse_1', 'horse_2'], dog: ['dog_1', 'dog_2'], cat: ['cat_1', 'cat_2'],
  frog: ['frog_1', 'frog_2'], owl: ['owl_1'], pig: ['pig_1', 'pig_2'],
};
const GAIN = { cow: 0.55, sheep: 0.55, goat: 0.55, horse: 0.5, dog: 0.5, cat: 0.55, frog: 0.6, owl: 0.6, pig: 0.55 };

let manifest = null;
export function preloadAnimals() {
  // Список реально положенных файлов — в manifest.json (пока записей нет — только синтез).
  return fetch(`${DIR}/manifest.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
    .then((m) => { manifest = m || {}; return loadSamples(DIR, Object.values(manifest).flat()); });
}

const last = {};
function sample(kind, opts) {
  const list = manifest && manifest[kind];
  if (!list || !list.length) return false;
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === last[kind]) i = (i + 1) % list.length;
  last[kind] = i;
  return playSample(`${DIR}/${list[i]}`, { gain: GAIN[kind] || 0.55, wet: 0.35, meter: true, ...opts });
}

// ---------- Синтез (запасной вариант и звери без записей) ----------

const SYNTH = {
  cow: (p) => tone({ freq: 150, to: 118, dur: 1.0, type: 'sawtooth', gain: 0.22, attack: 0.08, release: 0.4, pan: p, wet: 0.6, vibrato: 3, filter: { type: 'lowpass', freq: 700, q: 2 } }),
  sheep: (p) => tone({ freq: 420, to: 380, dur: 0.6, type: 'sawtooth', gain: 0.16, attack: 0.03, pan: p, wet: 0.6, vibrato: 30, vibratoRate: 9, filter: { type: 'bandpass', freq: 1200, q: 1.5 } }),
  goat: (p) => tone({ freq: 480, to: 420, dur: 0.5, type: 'sawtooth', gain: 0.16, attack: 0.02, pan: p, wet: 0.6, vibrato: 40, vibratoRate: 11, filter: { type: 'bandpass', freq: 1400, q: 1.5 } }),
  horse: (p) => tone({ freq: 900, to: 380, dur: 0.9, type: 'sawtooth', gain: 0.14, attack: 0.02, pan: p, wet: 0.7, vibrato: 50, vibratoRate: 14, curve: 'lin', filter: { type: 'bandpass', freq: 1500, q: 1.2 } }),
  dog: (p) => { for (let i = 0; i < 2; i++) { tone({ freq: 420, to: 300, dur: 0.12, type: 'sawtooth', gain: 0.22, attack: 0.005, at: i * 0.22, pan: p, wet: 0.4, filter: { type: 'bandpass', freq: 900, q: 1.5 } }); noise({ dur: 0.06, gain: 0.08, freq: 1500, at: i * 0.22, pan: p }); } },
  cat: (p) => tone({ freq: 620, to: 520, dur: 0.6, type: 'triangle', gain: 0.2, attack: 0.05, pan: p, wet: 0.6, vibrato: 12, curve: 'lin', filter: { type: 'bandpass', freq: 1300, q: 1 } }),
  frog: (p) => { for (let i = 0; i < 3; i++) tone({ freq: 160, to: 130, dur: 0.1, type: 'square', gain: 0.16, attack: 0.005, at: i * 0.13, pan: p, wet: 0.5, filter: { type: 'lowpass', freq: 900, q: 4 } }); },
  owl: (p) => { tone({ freq: 380, to: 360, dur: 0.25, type: 'sine', gain: 0.25, attack: 0.03, pan: p, wet: 1 }); tone({ freq: 400, to: 330, dur: 0.6, type: 'sine', gain: 0.25, attack: 0.05, at: 0.35, pan: p, wet: 1, vibrato: 6 }); },
  pig: (p) => { for (let i = 0; i < 2; i++) noise({ dur: 0.14, gain: 0.25, type: 'bandpass', freq: 380, q: 3, at: i * 0.2, pan: p, wet: 0.4 }); },
  // Эти звери в жизни почти не «говорят» — им мультяшные звуки.
  mouse: (p) => { for (let i = 0; i < 3; i++) tone({ freq: rnd(2600, 3200), to: rnd(3400, 4000), dur: 0.07, type: 'sine', gain: 0.12, attack: 0.004, at: i * 0.1, pan: p, wet: 0.4 }); },
  rabbit: (p) => tone({ freq: 240, to: 720, dur: 0.28, type: 'sine', gain: 0.2, attack: 0.005, pan: p, wet: 0.5, vibrato: 30, vibratoRate: 18, curve: 'lin' }),
  // Пока нет записей — мультяшный синтез.
  bear: (p) => {
    tone({ freq: 120, to: 85, dur: 0.75, type: 'sawtooth', gain: 0.2, attack: 0.06, release: 0.35, pan: p, wet: 0.6, vibrato: 9, vibratoRate: 22, filter: { type: 'lowpass', freq: 520, q: 3 } });
    noise({ dur: 0.6, gain: 0.07, type: 'lowpass', freq: 400, attack: 0.06, pan: p, wet: 0.5 });
  },
  fox: (p) => { for (let i = 0; i < 2; i++) tone({ freq: 950, to: 620, dur: 0.11, type: 'triangle', gain: 0.17, attack: 0.004, at: i * 0.17, pan: p, wet: 0.5, filter: { type: 'bandpass', freq: 1400, q: 1.2 } }); },
  squirrel: (p) => { for (let i = 0; i < 7; i++) { tone({ freq: rnd(1900, 2400), to: rnd(1500, 1800), dur: 0.04, type: 'square', gain: 0.06, attack: 0.002, at: i * 0.065, pan: p, wet: 0.4, filter: { type: 'bandpass', freq: 2600, q: 2 } }); } },
  hedgehog: (p) => { for (let i = 0; i < 3; i++) noise({ dur: 0.07, gain: 0.18, type: 'bandpass', freq: 1800, q: 1.2, at: i * 0.11, pan: p, wet: 0.3 }); },
};

/** Голос зверя. Возвращает «голос» { dur, level() } — по нему рот двигается в такт звуку. */
export function animalVoice(kind, pan = 0, { excited = false } = {}) {
  const rate = excited ? rnd(1.05, 1.15) : rnd(0.95, 1.05);
  const v = sample(kind, { rate, pan });
  if (v) return v;
  if (SYNTH[kind]) SYNTH[kind](pan);
  return fakeVoice(0.6);
}

/** «Апчхи!» — один из трюков. */
export function sneeze(pan = 0) {
  tone({ freq: 500, to: 900, dur: 0.25, type: 'triangle', gain: 0.12, attack: 0.05, pan, wet: 0.5, curve: 'lin' });
  noise({ dur: 0.25, gain: 0.35, type: 'highpass', freq: 1800, at: 0.28, attack: 0.005, pan, wet: 0.5 });
}

/** «Ку-ку!» — как часы с кукушкой. */
export function cuckoo(pan = 0) {
  const n = [[659.25, 0], [523.25, 0.32]];
  for (const [f, at] of n) {
    tone({ freq: f, dur: 0.28, type: 'triangle', gain: 0.25, attack: 0.01, release: 0.2, at, pan, wet: 0.8, filter: { type: 'lowpass', freq: 2500, q: 1 } });
    tone({ freq: f * 2, dur: 0.2, type: 'sine', gain: 0.05, attack: 0.01, at, pan, wet: 0.6 });
  }
}

/** Вжух — зверь прячется. */
export function whoosh(pan = 0) {
  noise({ dur: 0.25, gain: 0.08, type: 'bandpass', freq: 900, to: 300, q: 1, pan, wet: 0.4 });
}

/** Трюки: прыжок и кружение. */
export function boing(pan = 0) {
  tone({ freq: 200, to: 600, dur: 0.3, type: 'sine', gain: 0.18, attack: 0.005, pan, wet: 0.5, vibrato: 30, vibratoRate: 16, curve: 'lin' });
}
export function swirl(pan = 0) {
  tone({ freq: 400, to: 1200, dur: 0.5, type: 'triangle', gain: 0.1, attack: 0.02, pan, wet: 0.7, vibrato: 60, vibratoRate: 9, curve: 'lin' });
}
