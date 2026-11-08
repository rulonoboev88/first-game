// Звуки паровозика: гудок (держится, пока палец на поезде), «чух», стук колёс, «пшшш», колокола, «бип-бип».
import { tone, noise, chime, audioCtx, voiceOut, noiseBuffer, audioReady } from '../core/audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);

/**
 * Паровозный гудок «ту-тууу»: короткое «ту» сразу, затем длинное «тууу», которое звучит,
 * пока не вызовут release() (но не короче ~0.75 с). echo — эхо (в туннеле).
 */
export function whistle({ pan = 0, echo = false, gain = 1 } = {}) {
  if (!audioReady()) return { release() {} };
  const ctx = audioCtx();
  const t0 = ctx.currentTime + 0.01;
  const t1 = t0 + 0.3;
  const A = 0.15 * gain;
  const out = voiceOut(pan, echo ? 1.5 : 0.6);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(A, t0 + 0.035);
  g.gain.setValueAtTime(A, t0 + 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.21);
  g.gain.setValueAtTime(0.0001, t1);
  g.gain.exponentialRampToValueAtTime(A * 1.05, t1 + 0.05);
  g.connect(out);

  if (echo) {
    // эхо туннеля: задержка с затухающим повтором
    const d = ctx.createDelay(1);
    d.delayTime.value = 0.27;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1600;
    g.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(out);
  }

  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 2600;
  f.connect(g);

  // аккорд, как у настоящего паровозного свистка
  const srcs = [];
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const lg = ctx.createGain(); lg.gain.value = 2.5;
  lfo.connect(lg);
  for (const [fr, v] of [[392, 0.34], [494, 0.3], [587, 0.26]]) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(fr * 0.93, t0);
    o.frequency.exponentialRampToValueAtTime(fr, t0 + 0.06);
    o.frequency.setValueAtTime(fr * 0.95, t1);
    o.frequency.exponentialRampToValueAtTime(fr, t1 + 0.08);
    lg.connect(o.frequency);
    const og = ctx.createGain(); og.gain.value = v;
    o.connect(og); og.connect(f);
    srcs.push(o);
  }
  // «дыхание» пара
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(); n.loop = true;
  const nb = ctx.createBiquadFilter();
  nb.type = 'bandpass'; nb.frequency.value = 1900; nb.Q.value = 0.9;
  const ng = ctx.createGain(); ng.gain.value = 0.22;
  n.connect(nb); nb.connect(ng); ng.connect(f);
  srcs.push(n, lfo);
  for (const s of srcs) s.start(t0);

  const minEnd = t1 + 0.75;
  let done = false;
  const release = () => {
    if (done) return;
    done = true;
    const t = Math.max(ctx.currentTime, minEnd);
    g.gain.setTargetAtTime(0.0001, t, 0.09);
    for (const s of srcs) s.stop(t + 0.8);
  };
  setTimeout(release, 7000); // страховка: гудок не бесконечный
  return { release };
}

/** «Чух» — выхлоп пара из трубы. */
export function chuff(pan = 0, gain = 1, echo = false) {
  noise({ dur: 0.17, gain: 0.075 * gain, type: 'lowpass', freq: 950, to: 280, attack: 0.004, pan, wet: echo ? 1.4 : 0.3 });
  noise({ dur: 0.07, gain: 0.02 * gain, type: 'highpass', freq: 3200, attack: 0.003, pan, wet: 0.2 });
}

/** Стук колёс на стыке рельсов: «та-дам» (две оси подряд). hollow — гулко, на мосту. */
export function clackPair(pan = 0, gain = 1, gap = 0.12, hollow = false, echo = false) {
  for (const at of [0, gap]) {
    noise({ dur: 0.035, gain: 0.09 * gain, type: 'bandpass', freq: hollow ? 1300 : 2500, q: 2.5, at, pan, wet: hollow || echo ? 1 : 0.25 });
    tone({ freq: hollow ? 105 : 170, to: hollow ? 66 : 110, dur: hollow ? 0.14 : 0.08, type: 'sine', gain: (hollow ? 0.2 : 0.14) * gain, attack: 0.002, at, pan, wet: hollow || echo ? 1 : 0.2 });
    if (hollow) tone({ freq: 310, to: 300, dur: 0.3, type: 'triangle', gain: 0.025 * gain, attack: 0.003, at, pan, wet: 1.2 });
  }
}

/** «Пшшш» — пар при торможении. */
export function hiss(pan = 0, dur = 1.3) {
  noise({ dur, gain: 0.085, type: 'highpass', freq: 2200, to: 3800, attack: 0.06, pan, wet: 0.5 });
  noise({ dur: dur * 0.7, gain: 0.03, type: 'bandpass', freq: 1200, q: 0.7, attack: 0.05, pan, wet: 0.5 });
}

/** Колокол на перроне (бронзовый, с неровными обертонами). */
export function stationBell(pan = 0, at = 0) {
  const f = 520;
  for (const [k, v, d] of [[1, 0.17, 2.0], [2.0, 0.07, 1.3], [2.76, 0.06, 1.0], [4.07, 0.03, 0.6]]) {
    tone({ freq: f * k, dur: d, type: 'sine', gain: v, attack: 0.003, release: d * 0.95, at, pan, wet: 1.2 });
  }
  noise({ dur: 0.03, gain: 0.05, type: 'highpass', freq: 3000, at, pan, wet: 0.5 });
}

/** «Дзынь» на переезде. */
export function crossingBell(pan = 0) {
  chime(1320, { gain: 0.05, dur: 0.45, pan });
}

/** «Пуф» — лопнул клуб дыма. */
export function puffPop(pan = 0) {
  noise({ dur: 0.2, gain: 0.11, type: 'lowpass', freq: 700, to: 180, attack: 0.005, pan, wet: 0.5 });
  tone({ freq: 260, to: 120, dur: 0.12, type: 'sine', gain: 0.07, attack: 0.003, pan, wet: 0.4 });
}

/** Большой клуб дыма из трубы. */
export function bigPuff(pan = 0, echo = false) {
  chuff(pan, 2.2, echo);
  noise({ dur: 0.5, gain: 0.05, type: 'bandpass', freq: 500, to: 200, q: 0.8, attack: 0.02, pan, wet: 0.8 });
}

/** «Бип-бип» машинки. */
export function carBeep(pan = 0) {
  for (const at of [0, 0.2]) {
    tone({ freq: 620, dur: 0.13, type: 'square', gain: 0.07, attack: 0.005, at, pan, wet: 0.4, filter: { type: 'lowpass', freq: 1800, q: 1 } });
    tone({ freq: 780, dur: 0.13, type: 'square', gain: 0.04, attack: 0.005, at, pan, wet: 0.4, filter: { type: 'lowpass', freq: 1800, q: 1 } });
  }
}

/** «Ой!» — звери пугаются темноты туннеля (мультяшно, у каждого свой тон). */
export function oh(pan = 0, pitch = 1, at = 0) {
  tone({ freq: 560 * pitch, to: 390 * pitch, dur: 0.26, type: 'sawtooth', gain: 0.05, attack: 0.012, at, pan, wet: 1.2, filter: { type: 'bandpass', freq: 950 * pitch, q: 2 } });
  tone({ freq: 560 * pitch, to: 390 * pitch, dur: 0.26, type: 'sine', gain: 0.07, attack: 0.012, at, pan, wet: 1.2 });
}

/** Щелчок лампы в вагоне. */
export function lampClick(pan = 0, at = 0) {
  noise({ dur: 0.02, gain: 0.05, type: 'highpass', freq: 2500, at, pan, wet: 0.6 });
}

/** Прыжок зверя (в вагон / на перрон). */
export function hop(pan = 0) {
  tone({ freq: rnd(280, 330), to: rnd(480, 560), dur: 0.12, type: 'sine', gain: 0.05, attack: 0.004, pan, wet: 0.4 });
}

/** Гул при въезде в туннель. */
export function tunnelWhoosh(pan = 0) {
  noise({ dur: 0.8, gain: 0.07, type: 'bandpass', freq: 700, to: 220, q: 0.8, attack: 0.1, pan, wet: 1 });
}

/** Дождь — длящийся шум, громкость задаётся set(0..1). */
export function rainLoop() {
  if (!audioReady()) return null;
  const ctx = audioCtx();
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(); n.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
  const g = ctx.createGain(); g.gain.value = 0.0001;
  n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(voiceOut(0, 0.3));
  n.start();
  return {
    set(v) { g.gain.setTargetAtTime(Math.max(0.0001, v * 0.06), ctx.currentTime, 0.4); },
    stop() { g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1); n.stop(ctx.currentTime + 0.6); },
  };
}
