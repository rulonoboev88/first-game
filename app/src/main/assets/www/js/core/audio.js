// Синтез звуков на Web Audio. Ни одного аудиофайла — всё генерируется на лету.
// Общая цепочка: голоса → мастер-громкость → компрессор (чтобы сотня звуков не хрипела) → выход,
// плюс немного мягкой «комнаты» (реверберации) для теплоты.

let ctx = null;
let master, comp, reverbSend, reverb;
let active = 0;
const MAX_VOICES = 28;
let noiseBuf = null;

export function audioCtx() {
  return ctx;
}

export function initAudio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC({ latencyHint: 'interactive' });

  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;

  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(comp);
  comp.connect(ctx.destination);

  reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(1.1, 2.8);
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.16;
  reverbSend.connect(reverb);
  reverb.connect(master);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  return ctx;
}

/** Вызывать на каждое касание: браузер разрешает звук только после жеста. */
export function unlockAudio() {
  initAudio();
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}

export function suspendAudio() {
  if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
}

function makeImpulse(seconds, decay) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function canPlay() {
  return ctx && ctx.state === 'running' && active < MAX_VOICES;
}

/** Выход голоса: панорама + отправка в реверберацию. */
function outNode(pan = 0, wet = 1) {
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(master);
  if (wet > 0) {
    const s = ctx.createGain();
    s.gain.value = wet;
    p.connect(s);
    s.connect(reverbSend);
  }
  return p;
}

function track(node, endTime) {
  active++;
  node.onended = () => { active--; };
  node.stop(endTime + 0.05);
}

/**
 * Простой тон с огибающей и глиссандо.
 * freq → to (Гц) за dur секунд; type: sine/triangle/square/sawtooth.
 */
export function tone({
  freq = 440, to = null, dur = 0.2, type = 'sine', gain = 0.3,
  attack = 0.005, release = null, at = 0, pan = 0, wet = 1,
  curve = 'exp', vibrato = 0, vibratoRate = 6, filter = null, q = 1,
} = {}) {
  if (!canPlay()) return;
  const t0 = ctx.currentTime + at;
  const t1 = t0 + dur;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) {
    if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t1);
    else o.frequency.linearRampToValueAtTime(to, t1);
  }
  const g = ctx.createGain();
  const rel = release == null ? dur * 0.6 : release;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.setValueAtTime(gain, Math.max(t0 + attack, t1 - rel));
  g.gain.exponentialRampToValueAtTime(0.0001, t1);

  let last = o;
  if (vibrato) {
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = vibratoRate;
    lg.gain.value = vibrato;
    lfo.connect(lg);
    lg.connect(o.frequency);
    lfo.start(t0);
    lfo.stop(t1 + 0.05);
  }
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = filter.type || 'lowpass';
    f.frequency.value = filter.freq || 2000;
    f.Q.value = filter.q || q;
    last.connect(f);
    last = f;
  }
  last.connect(g);
  g.connect(outNode(pan, wet));
  o.start(t0);
  track(o, t1);
}

/** Шум через фильтр: всплески, шорохи, лопанье. */
export function noise({
  dur = 0.1, gain = 0.2, type = 'bandpass', freq = 1500, to = null, q = 1,
  attack = 0.002, at = 0, pan = 0, wet = 0.5,
} = {}) {
  if (!canPlay()) return;
  const t0 = ctx.currentTime + at;
  const t1 = t0 + dur;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t0);
  if (to) f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t1);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t1);
  src.connect(f);
  f.connect(g);
  g.connect(outNode(pan, wet));
  src.start(t0, Math.random() * 0.5);
  track(src, t1);
}

// Приятные ноты: мажорная пентатоника — любые сочетания звучат благозвучно.
const PENTA = [0, 2, 4, 7, 9];
export function pentaFreq(step, base = 261.63) {
  const oct = Math.floor(step / 5);
  const n = PENTA[((step % 5) + 5) % 5] + oct * 12;
  return base * Math.pow(2, n / 12);
}

/** Мягкий колокольчик (для меню, звёзд, салюта). */
export function chime(freq, { gain = 0.18, dur = 1.2, at = 0, pan = 0 } = {}) {
  tone({ freq, dur, type: 'sine', gain, attack: 0.004, release: dur * 0.95, at, pan, wet: 1.4 });
  tone({ freq: freq * 2.01, dur: dur * 0.6, type: 'sine', gain: gain * 0.35, attack: 0.003, release: dur * 0.55, at, pan, wet: 1.4 });
  tone({ freq: freq * 3.98, dur: dur * 0.3, type: 'sine', gain: gain * 0.12, attack: 0.002, release: dur * 0.28, at, pan, wet: 1.4 });
}

/** Панорама по горизонтальной позиции на экране. */
export function panFor(x, w) {
  return ((x / Math.max(1, w)) * 2 - 1) * 0.7;
}
