// Синтезированные голоса птичьего двора. Мультяшные, но узнаваемые по ритму и интонации.
import { tone, noise, chime, loadSamples, playSample, fakeVoice } from '../core/audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);

/** «Пи-пи-пи» цыплёнка. loud — громче и выше (реакция на тап). */
function chirpSynth({ pan = 0, loud = false, count = null, pitch = 1 } = {}) {
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
function panicChirpSynth(pan = 0) {
  const base = rnd(3800, 4400);
  for (let i = 0; i < 4; i++) {
    const at = i * 0.07;
    tone({ freq: base, to: base * 1.15, dur: 0.06, type: 'sine', gain: 0.12, attack: 0.004, at, pan, wet: 0.4 });
  }
}

function quackSyllable({ f, dur, at, pan, gain, formant }) {
  tone({ freq: f, to: f * 0.78, dur, type: 'sawtooth', gain, attack: 0.01, release: dur * 0.5, at, pan, wet: 0.4,
    filter: { type: 'bandpass', freq: formant, q: 3 } });
  tone({ freq: f, to: f * 0.78, dur, type: 'square', gain: gain * 0.4, attack: 0.01, release: dur * 0.5, at, pan, wet: 0.3,
    filter: { type: 'bandpass', freq: formant * 2.2, q: 4 } });
}

/** «Кря-кря» утёнка (высокое, мягкое). */
function quackSynth(pan = 0, baby = true) {
  const f = baby ? rnd(520, 600) : rnd(250, 290);
  quackSyllable({ f, dur: 0.13, at: 0, pan, gain: 0.32, formant: baby ? 1600 : 1100 });
  quackSyllable({ f: f * 0.95, dur: 0.15, at: 0.2, pan, gain: 0.3, formant: baby ? 1600 : 1100 });
}

/** «Га-га» гусёнка. */
function honkSynth(pan = 0) {
  const f = rnd(420, 470);
  for (let i = 0; i < 2; i++) {
    tone({ freq: f, to: f * 0.85, dur: 0.16, type: 'square', gain: 0.22, attack: 0.012, release: 0.08, at: i * 0.24, pan, wet: 0.4,
      filter: { type: 'bandpass', freq: 1000, q: 2.5 } });
  }
}

/** «Ко-ко-ко… кудах» курицы. */
function cluckSynth(pan = 0, long = false) {
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
function crowSynth(pan = 0) {
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
function gobbleSynth(pan = 0) {
  for (let i = 0; i < 9; i++) {
    const f = i % 2 ? 260 : 330;
    tone({ freq: f, to: f * 0.9, dur: 0.045, type: 'sawtooth', gain: 0.22, attack: 0.004, release: 0.03, at: i * 0.055, pan, wet: 0.5,
      filter: { type: 'bandpass', freq: 900, q: 2 } });
  }
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


// ---------- Натуральные записи (CC0, см. sounds/CREDITS.txt) ----------

const DIR = 'sounds/farm';
const SETS = {
  chick: ['chick_1', 'chick_2', 'chick_3', 'chick_4', 'chick_5', 'chick_6', 'chick_7', 'chick_8'],
  hen: ['hen_1', 'hen_2', 'hen_3', 'hen_4'],
  henlay: ['henlay_1', 'henlay_2'],
  rooster: ['rooster_1', 'rooster_2'],
  duck: ['duck_1', 'duck_2', 'duck_3', 'duck_4'],
  goose: ['goose_1'],
  turkey: ['turkey_1'],
};
// Громкость каждой группы, чтобы петух не оглушал, а цыплёнок не терялся.
const GAIN = { chick: 0.5, hen: 0.55, henlay: 0.5, rooster: 0.5, duck: 0.55, goose: 0.55, turkey: 0.6 };

export function preloadFarm() {
  return loadSamples(DIR, Object.values(SETS).flat());
}

const lastPick = {};
function sample(group, { rate = 1, gain = 1, pan = 0, at = 0, meter = false } = {}) {
  const list = SETS[group];
  // не повторяем один и тот же фрагмент два раза подряд
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === lastPick[group]) i = (i + 1) % list.length;
  lastPick[group] = i;
  return playSample(`${DIR}/${list[i]}`, { rate, gain: GAIN[group] * gain, pan, at, wet: 0.35, meter });
}

export function chirp({ pan = 0, loud = false } = {}) {
  if (!sample('chick', { rate: rnd(0.92, 1.12) * (loud ? 1.08 : 1), gain: loud ? 1.25 : 1, pan })) chirpSynth({ pan, loud });
}

export function panicChirp(pan = 0) {
  if (!sample('chick', { rate: rnd(1.2, 1.35), gain: 0.8, pan })) panicChirpSynth(pan);
}

export function goldChirp(pan = 0) {
  if (!sample('chick', { rate: 1.1, gain: 1.2, pan })) chirpSynth({ pan, loud: true });
  [1568, 1976, 2349, 3136].forEach((f, i) => chime(f, { gain: 0.07, dur: 0.9, at: 0.05 + i * 0.07, pan }));
}

/** Утёнок — запись утки, поднятая выше (детёныш); взрослая — как есть. */
export function quack(pan = 0, baby = true) {
  const v = sample('duck', { rate: baby ? rnd(1.35, 1.55) : rnd(0.95, 1.05), pan, meter: true });
  if (v) return v;
  quackSynth(pan, baby); return fakeVoice(0.4);
}

/** Пингвинёнок — писк цыплёнка, опущенный ниже: «пиу» потолще. */
export function penguinPeep(pan = 0) {
  if (!sample('chick', { rate: rnd(0.68, 0.78), gain: 1.15, pan })) chirpSynth({ pan, pitch: 0.75 });
}

/** Гусёнок — запись гуся, поднятая выше. */
export function honk(pan = 0, baby = true) {
  const v = sample('goose', { rate: baby ? rnd(1.3, 1.5) : rnd(0.95, 1.05), pan, meter: true });
  if (v) return v;
  honkSynth(pan); return fakeVoice(0.5);
}

export function cluck(pan = 0, long = false) {
  const v = sample(long ? 'henlay' : 'hen', { rate: rnd(0.96, 1.06), pan, meter: true });
  if (v) return v;
  cluckSynth(pan, long); return fakeVoice(0.5);
}

export function crow(pan = 0) {
  const v = sample('rooster', { rate: rnd(0.97, 1.04), pan, meter: true });
  if (v) return v;
  crowSynth(pan); return fakeVoice(1.2);
}

export function gobble(pan = 0) {
  if (!sample('turkey', { rate: rnd(0.95, 1.08), pan })) gobbleSynth(pan);
}

// ---------- Лиса-«бандит» (синтез, мультяшно) ----------

/** Пиццикато: короткая щипковая нота. */
function pluck(freq, at, gain = 0.22, pan = 0) {
  tone({ freq, dur: 0.16, type: 'triangle', gain, attack: 0.003, release: 0.14, at, pan, wet: 0.5, filter: { type: 'lowpass', freq: 1800, q: 1 } });
  tone({ freq: freq * 2, dur: 0.08, type: 'sine', gain: gain * 0.25, attack: 0.002, at, pan, wet: 0.4 });
}

/** Крадущаяся тема «пришёл бандит»: на цыпочках, хроматика вниз, в конце «бамм». */
export function foxEnter(pan = 0) {
  const n = { B2: 123.47, C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Fs3: 185.0, G3: 196.0 };
  const seq = [[n.E3, 0], [n.G3, 0.19], [n.Fs3, 0.38], [n.F3, 0.57], [n.E3, 0.76], [n.Eb3, 0.95], [n.D3, 1.14]];
  seq.forEach(([f, at]) => {
    pluck(f, at, 0.24, pan);
    noise({ dur: 0.02, gain: 0.05, type: 'bandpass', freq: 3000, q: 6, at, pan, wet: 0.2 }); // «цок» на цыпочках
  });
  // «бамм» — низкая нота с глиссандо вниз
  tone({ freq: n.B2, to: n.B2 * 0.8, dur: 0.7, type: 'sawtooth', gain: 0.2, attack: 0.01, release: 0.5, at: 1.38, pan, wet: 0.8, filter: { type: 'lowpass', freq: 700, q: 2 } });
  tone({ freq: n.B2 / 2, dur: 0.6, type: 'sine', gain: 0.25, attack: 0.01, release: 0.45, at: 1.38, pan, wet: 0.6 });
}

/** «Бо-инг» — когда лису тапнули. */
export function foxBoing(pan = 0) {
  tone({ freq: 220, to: 660, dur: 0.35, type: 'sine', gain: 0.22, attack: 0.005, release: 0.25, pan, wet: 0.5, vibrato: 40, vibratoRate: 18, curve: 'lin' });
}

/** Грустный тромбон «вам-вам-вам-ваааа» — лиса ушла ни с чем. */
export function foxSigh(pan = 0) {
  const notes = [[233.08, 0, 0.32], [220.0, 0.36, 0.32], [207.65, 0.72, 0.32], [196.0, 1.08, 0.9]];
  notes.forEach(([f, at, d], i) => {
    tone({ freq: f * 1.03, to: f, dur: d, type: 'sawtooth', gain: 0.17, attack: 0.03, release: d * 0.5, at, pan, wet: 0.7,
      vibrato: i === 3 ? 7 : 0, vibratoRate: 6, curve: 'lin', filter: { type: 'lowpass', freq: 1100, q: 3 } });
  });
}
