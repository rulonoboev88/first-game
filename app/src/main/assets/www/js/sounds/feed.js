// Звуки «Покорми зверят»: хрум-хрум, ням, глоток, «бе-е», появление угощения.
import { tone, noise } from '../core/audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);

/** Хрум — один укус чего-то твёрдого (морковка, яблоко, орех). */
export function crunch(pan = 0) {
  for (let i = 0; i < 3; i++) {
    noise({ dur: 0.045, gain: 0.07, type: 'bandpass', freq: rnd(2200, 3600), q: 1.4, at: i * 0.028 + rnd(0, 0.01), pan, wet: 0.2 });
  }
  noise({ dur: 0.08, gain: 0.05, type: 'lowpass', freq: 900, attack: 0.003, pan, wet: 0.2 });
}

/** Ням — мягкое (мёд, молоко, хлеб, сыр, арбуз). */
export function munch(pan = 0) {
  noise({ dur: 0.09, gain: 0.05, type: 'lowpass', freq: 700, to: 300, attack: 0.01, pan, wet: 0.2 });
  tone({ freq: rnd(170, 200), to: 130, dur: 0.08, type: 'sine', gain: 0.07, attack: 0.008, pan, wet: 0.2 });
}

/** Глоток в конце. */
export function gulp(pan = 0) {
  tone({ freq: 340, to: 120, dur: 0.14, type: 'sine', gain: 0.14, attack: 0.006, pan, wet: 0.3 });
  noise({ dur: 0.05, gain: 0.03, type: 'lowpass', freq: 500, at: 0.05, pan, wet: 0.2 });
}

/** «Бе-е!» — не та еда: дрожащее «бррр» и короткое «м-м». */
export function yuck(pan = 0) {
  tone({ freq: 210, to: 160, dur: 0.42, type: 'sawtooth', gain: 0.07, attack: 0.02, pan, wet: 0.4, vibrato: 22, vibratoRate: 26, filter: { type: 'bandpass', freq: 750, q: 1.6 } });
  tone({ freq: 210, to: 160, dur: 0.42, type: 'sine', gain: 0.06, attack: 0.02, pan, wet: 0.4, vibrato: 16, vibratoRate: 26 });
  for (const [at, f] of [[0.5, 300], [0.72, 240]]) {
    tone({ freq: f, to: f * 0.85, dur: 0.16, type: 'triangle', gain: 0.07, attack: 0.015, at, pan, wet: 0.4, filter: { type: 'lowpass', freq: 900, q: 1 } });
  }
}

/** Угощение появилось на тарелке. */
export function plate(pan = 0, at = 0) {
  tone({ freq: rnd(620, 700), to: rnd(900, 1000), dur: 0.1, type: 'sine', gain: 0.05, attack: 0.004, at, pan, wet: 0.6 });
}

/** Подхватил угощение пальцем. */
export function pick(pan = 0) {
  tone({ freq: 420, to: 560, dur: 0.07, type: 'sine', gain: 0.05, attack: 0.004, pan, wet: 0.3 });
}

/** Угощение вернулось на тарелку. */
export function plop(pan = 0) {
  tone({ freq: 300, to: 200, dur: 0.08, type: 'sine', gain: 0.06, attack: 0.003, pan, wet: 0.3 });
}

/** Сердечки после еды. */
export function hearts(pan = 0) {
  for (const [at, f] of [[0, 784], [0.1, 988], [0.2, 1175]]) {
    tone({ freq: f, dur: 0.25, type: 'sine', gain: 0.045, attack: 0.004, release: 0.22, at, pan, wet: 1.2 });
  }
}
