// Звуки «Фонарика»: щелчок фонаря, сверчки, «ой!», лунный звон.
import { tone, noise, chime } from '../core/audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);

/** Щёлк — фонарик включили. */
export function torchClick(pan = 0) {
  noise({ dur: 0.018, gain: 0.07, type: 'highpass', freq: 2800, pan, wet: 0.3 });
  tone({ freq: 1800, to: 1500, dur: 0.03, type: 'square', gain: 0.012, attack: 0.002, pan, wet: 0.3, filter: { type: 'lowpass', freq: 3000, q: 1 } });
}

/** Сверчок вдалеке: «три-три-три». */
export function cricket(pan = 0) {
  const f = rnd(4200, 4800), n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    tone({ freq: f, dur: 0.045, type: 'sine', gain: 0.012, attack: 0.004, at: i * 0.075, pan, wet: 1.2 });
  }
}

/** «Ой!» — зверя застали светом (мультяшно, у каждого свой тон). */
export function ohh(pan = 0, pitch = 1) {
  tone({ freq: 480 * pitch, to: 720 * pitch, dur: 0.18, type: 'sawtooth', gain: 0.04, attack: 0.01, pan, wet: 0.8, filter: { type: 'bandpass', freq: 1100 * pitch, q: 2 } });
  tone({ freq: 480 * pitch, to: 720 * pitch, dur: 0.18, type: 'sine', gain: 0.07, attack: 0.01, pan, wet: 0.8 });
}

/** Луна просыпается и светит: тихий перелив. */
export function moonGlow() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => chime(f, { gain: 0.05, dur: 1.6, at: i * 0.09, pan: (i - 2) * 0.2 }));
}

/** Луна засыпает. */
export function moonSleep() {
  [784, 659, 523].forEach((f, i) => chime(f, { gain: 0.035, dur: 1.2, at: i * 0.12 }));
}
