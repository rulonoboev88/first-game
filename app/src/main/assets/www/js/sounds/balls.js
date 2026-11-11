// Звуки мячиков: у каждого свой голос удара. k — сила удара 0..1.
import { tone, noise, chime } from '../core/audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);

const HIT = {
  soccer(k, pan) {   // кожаный «туп»
    const f = rnd(150, 175);
    tone({ freq: f, to: f * 0.7, dur: 0.09, type: 'sine', gain: 0.32 * k, attack: 0.002, pan, wet: 0.3 });
    noise({ dur: 0.05, gain: 0.16 * k, type: 'lowpass', freq: 700, pan, wet: 0.2 });
  },
  tennis(k, pan) {   // звонкий «пок»
    const f = rnd(560, 640);
    tone({ freq: f, to: f * 0.72, dur: 0.05, type: 'sine', gain: 0.26 * k, attack: 0.001, pan, wet: 0.3 });
    noise({ dur: 0.025, gain: 0.12 * k, type: 'bandpass', freq: 2200, q: 1.5, pan, wet: 0.2 });
  },
  beach(k, pan) {    // гулкий надувной «бомм»
    const f = rnd(115, 130);
    tone({ freq: f, to: f * 0.9, dur: 0.22, type: 'triangle', gain: 0.26 * k, attack: 0.004, pan, wet: 0.6, filter: { type: 'lowpass', freq: 700 } });
    tone({ freq: f * 2.4, to: f * 2.1, dur: 0.12, type: 'sine', gain: 0.07 * k, attack: 0.003, pan, wet: 0.6 });
    noise({ dur: 0.06, gain: 0.08 * k, type: 'lowpass', freq: 400, pan, wet: 0.3 });
  },
  basket(k, pan) {   // тяжёлый «бонг»
    const f = rnd(88, 98);
    tone({ freq: f, to: f * 0.82, dur: 0.24, type: 'sine', gain: 0.4 * k, attack: 0.002, pan, wet: 0.5 });
    tone({ freq: f * 2.02, to: f * 1.7, dur: 0.12, type: 'sine', gain: 0.12 * k, attack: 0.002, pan, wet: 0.5 });
    noise({ dur: 0.04, gain: 0.14 * k, type: 'lowpass', freq: 900, pan, wet: 0.2 });
  },
  bell(k, pan) {     // бубенчик внутри — «дзынь-дзынь»
    const base = rnd(1900, 2300);
    const n = k > 0.5 ? 3 : 2;
    for (let i = 0; i < n; i++) chime(base * rnd(0.94, 1.08), { gain: 0.09 * (0.5 + k * 0.6), dur: 0.35, at: i * rnd(0.045, 0.07), pan });
    tone({ freq: 420, to: 300, dur: 0.05, type: 'sine', gain: 0.12 * k, attack: 0.002, pan, wet: 0.2 });
  },
  fluffy(k, pan) {   // мягкий «пуф»
    noise({ dur: 0.14, gain: 0.22 * k, type: 'lowpass', freq: 520, to: 260, pan, wet: 0.4 });
    tone({ freq: 110, to: 80, dur: 0.08, type: 'sine', gain: 0.1 * k, attack: 0.008, pan, wet: 0.3 });
  },
  star(k, pan) {     // попрыгунчик — смешной «боинк» вверх
    const f = rnd(260, 320);
    tone({ freq: f, to: f * 3, dur: 0.13, type: 'sine', gain: 0.2 * (0.4 + k * 0.6), attack: 0.002, release: 0.08, pan, wet: 0.5, curve: 'exp' });
    tone({ freq: 700, to: 500, dur: 0.03, type: 'sine', gain: 0.1 * k, attack: 0.001, pan, wet: 0.2 });
  },
};

export function hit(kind, k, pan = 0) {
  const f = HIT[kind];
  if (f) f(Math.max(0.12, Math.min(1, k)), pan);
}

/** Тап по мячику — подпрыгнул: свой удар + короткий «вжик» вверх. */
export function hop(kind, pan = 0) {
  hit(kind, 0.75, pan);
  tone({ freq: 380, to: 760, dur: 0.12, type: 'sine', gain: 0.08, attack: 0.004, at: 0.02, pan, wet: 0.5 });
}

/** Бросок пальцем. */
export function whoosh(k, pan = 0) {
  noise({ dur: 0.18 + k * 0.1, gain: 0.07 + k * 0.08, type: 'bandpass', freq: 900, to: 2200, q: 0.8, pan, wet: 0.4 });
}

/** Тап мимо — мягкая волна воздуха. */
export function puff(pan = 0) {
  noise({ dur: 0.22, gain: 0.12, type: 'bandpass', freq: 600, to: 1500, q: 0.7, pan, wet: 0.6 });
  tone({ freq: 520, to: 780, dur: 0.14, type: 'sine', gain: 0.05, attack: 0.01, pan, wet: 0.8 });
}

/** Встряска — все мячики разом. */
export function rattle(k = 0.5) {
  for (let i = 0; i < 5; i++) noise({ dur: 0.05, gain: 0.1 + k * 0.08, type: 'lowpass', freq: rnd(500, 1200), at: i * rnd(0.03, 0.06), pan: rnd(-0.6, 0.6), wet: 0.3 });
}
