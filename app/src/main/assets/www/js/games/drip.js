// Стекающая краска. Белая стена.
// Краска — слой с толщиной. Если слой толще порога, излишек стекает вниз (у каждого «столбика» своя скорость и порог —
// подтёки бегут по-разному). Толстые струйки перетягивают краску соседей — так рождаются ручейки и капли на концах.
// По пути мокрая краска оставляет матовый след и постепенно истощается. Подтёки разных цветов, сливаясь, смешиваются.
// Тап → клякса. Проведение → мазок. Удержание → краски всё больше, сильнее течёт.
import { GL, NOISE, PAINTS, absorb } from '../core/gl.js';
import { tone, noise, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const GRID = 170;     // клеток течения по короткой стороне (клетка ≈ ширина ручейка)
const DRY_GRID = 640; // сухой след — в высоком разрешении, чтобы края были чёткими
const SUB = 3;        // шагов течения за кадр (60 Гц)

const H = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
`;

const FS = {
  // Течение мокрой краски: rgb — КОЛИЧЕСТВО пигмента (плотность × толщина), a — толщина слоя.
  // Храним количество, а не концентрацию — тогда на краях цвета не «пачкаются» соседями.
  flow: H + NOISE + `
uniform sampler2D uWet; uniform vec2 uT; uniform float uK; uniform float uThr; uniform float uC; uniform float uLoss; uniform float uSeed; uniform float uCols;
float spd(float x) { return 0.3 + 1.1 * vnoise(vec2(x * uCols, uSeed)); }
float thr(float x) { return uThr * (0.65 + 0.7 * vnoise(vec2(x * uCols * 1.7 + 11.0, uSeed + 3.0))); }
float down(vec4 c, float x) { return max(0.0, c.a - thr(x)) * uK * spd(x); }
// сколько краски уходит из клетки толщины a к более толстой соседке b (ручейки «стягивают» краску)
float pull(float a, float b) { return (a > 0.02 && a < 0.7 && b > a) ? clamp((b - a) * uC, 0.0, a * 0.18) : 0.0; }
vec3 conc(vec4 c) { return c.a > 1e-4 ? c.rgb / c.a : vec3(0); }
void main() {
  vec4 C = texture(uWet, vUv);
  vec4 A = texture(uWet, vUv + vec2(0, uT.y));
  vec4 L = texture(uWet, vUv - vec2(uT.x, 0));
  vec4 R = texture(uWet, vUv + vec2(uT.x, 0));
  if (vUv.y + uT.y > 1.0) A = vec4(0);
  if (vUv.x - uT.x < 0.0) L = vec4(0);
  if (vUv.x + uT.x > 1.0) R = vec4(0);
  float oC = down(C, vUv.x);
  float oA = down(A, vUv.x);
  float outL = pull(C.a, L.a), outR = pull(C.a, R.a);
  float inL = pull(L.a, C.a), inR = pull(R.a, C.a);
  float keep = max(0.0, C.a - oC - outL - outR);
  float na = keep + oA + inL + inR;
  vec3 mass = conc(C) * keep + conc(A) * oA + conc(L) * inL + conc(R) * inR;
  // тонкий неподвижный слой понемногу высыхает (пигмент уходит вместе с толщиной)
  float dried = max(0.0, na - uLoss * (1.0 + 2.0 * step(na, 0.08)));
  mass *= na > 1e-4 ? dried / na : 0.0;
  o = vec4(mass, dried);
}`,
  // Сухой след: где прошла мокрая краска, остаётся матовое пятно её цвета.
  dry: H + `
uniform sampler2D uDry; uniform sampler2D uWet; uniform float uRate;
void main() {
  vec4 d = texture(uDry, vUv), w = texture(uWet, vUv);
  float k = smoothstep(0.06, 0.2, w.a) * uRate;
  vec3 c = w.a > 1e-3 ? w.rgb / w.a : vec3(0);
  vec3 D = mix(d.rgb, c * 0.82, k);   // высохшая краска чуть светлее мокрой
  o = vec4(D, max(d.a, step(0.02, w.a)));
}`,
  // Клякса краски: добавляем толщину и смешиваем цвет пропорционально количеству.
  splat: H + NOISE + `
uniform sampler2D uWet; uniform vec2 uPoint; uniform vec3 uInk; uniform float uR; uniform float uAmt; uniform vec2 uAspect; uniform float uSeed;
void main() {
  vec4 C = texture(uWet, vUv);
  vec2 d = (vUv - uPoint) * uAspect;
  float n = fbm(d / sqrt(uR) * 1.4 + uSeed);
  float r = length(d) / sqrt(uR) / (0.8 + 0.4 * n);
  float add = uAmt * pow(max(0.0, 1.0 - r * r), 1.5);   // купол: в центре толще всего
  o = vec4(C.rgb + uInk * add, C.a + add);
}`,
  // Показ: сухой след + мокрая краска с блеском и объёмом.
  display: H + `
uniform sampler2D uWet; uniform sampler2D uDry; uniform vec2 uT;
void main() {
  vec4 w = texture(uWet, vUv), d = texture(uDry, vUv);
  vec3 D = d.rgb;
  float cov = smoothstep(0.07, 0.17, w.a);   // гладкий край ручейков и капель
  D = mix(D, w.rgb / max(w.a, 1e-3), cov);
  vec3 col = exp(-D);
  // объём мокрой краски: нормаль по толщине, свет сверху-слева
  float hL = texture(uWet, vUv - vec2(uT.x, 0)).a, hR = texture(uWet, vUv + vec2(uT.x, 0)).a;
  float hB = texture(uWet, vUv - vec2(0, uT.y)).a, hT = texture(uWet, vUv + vec2(0, uT.y)).a;
  vec3 n = normalize(vec3((hL - hR) * 1.6, (hB - hT) * 1.6, 1.0));
  vec3 l = normalize(vec3(-0.45, 0.6, 0.65));
  float diff = clamp(dot(n, l), 0.0, 1.0);
  float spec = pow(max(dot(reflect(-l, n), vec3(0, 0, 1)), 0.0), 36.0);
  col = mix(col, col * (0.72 + 0.4 * diff) + spec * 0.55, cov);
  o = vec4(col, 1);
}`,
  copy: H + `
uniform sampler2D uSrc; uniform vec4 uMap;
void main() {
  vec2 uv = (vUv - uMap.xy) / uMap.zw;
  o = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? vec4(0) : texture(uSrc, uv);
}`,
};

export default class DripGame {
  static erasable = true;
  static background = '#FFFFFF';
  static webgl = true;
  static maxDpr = 2;

  constructor(stage) {
    this.stage = stage;
    this.g = new GL(stage.canvas);
    this.P = {};
    for (const [k, src] of Object.entries(FS)) this.P[k] = this.g.program(src);
    this.queue = [];
    this.held = new Map();
    this.time = 0;
    this.acc = 0;
    this.colorIdx = Math.floor(Math.random() * PAINTS.length);
    this.lastPaint = -99;
    this.nextDrip = 0;
    this.seed = Math.random() * 100;
    this.build();
  }

  get u() { return this.stage.unit; }

  build(prev = null, map = null) {
    const g = this.g;
    const { width, height } = this.stage.canvas;
    const short = Math.min(width, height);
    const gw = Math.round((GRID * width) / short), gh = Math.round((GRID * height) / short);
    const oldWet = this.wet, oldDry = this.dry;
    this.wet = g.double(gw, gh, 'f16');
    const dw = Math.round((DRY_GRID * width) / short), dh = Math.round((DRY_GRID * height) / short);
    this.dry = g.double(dw, dh, 'f16');
    this.aspect = [width / short, height / short];
    if (prev) {
      g.run(this.P.copy, { uSrc: oldWet.read, uMap: map }, this.wet.write); this.wet.swap();
      g.run(this.P.copy, { uSrc: oldDry.read, uMap: map }, this.dry.write); this.dry.swap();
    }
    g.free(oldWet); g.free(oldDry);
  }

  toUv(x, y) { return [x / this.stage.w, 1 - y / this.stage.h]; }

  // ---------- Касания ----------

  onDown(p) {
    const ink = absorb(PAINTS[this.colorIdx].map((v) => Math.min(1, Math.max(0.03, v + rnd(-0.04, 0.04))))).map((v) => v * 1.25);
    this.colorIdx = (this.colorIdx + 1) % PAINTS.length;
    p.data.ink = ink;
    p.data.t0 = this.time;
    p.data.last = { x: p.x, y: p.y };
    this.held.set(p.id, p);
    this.queue.push({ x: p.x, y: p.y, ink, r: 0.0016, amt: 1.5 });
    this.lastPaint = this.time;
    const pan = panFor(p.x, this.stage.w);
    // «шлёп» краски о стену
    noise({ dur: 0.16, gain: 0.22, type: 'lowpass', freq: 1400, to: 300, q: 0.8, pan, wet: 0.4 });
    tone({ freq: 160, to: 90, dur: 0.12, type: 'sine', gain: 0.22, attack: 0.003, pan, wet: 0.3 });
    haptic(1);
  }

  onMove(p) {
    const l = p.data.last;
    const step = this.u * 0.012;
    const d = Math.hypot(p.x - l.x, p.y - l.y);
    if (d < step) return;
    const n = Math.min(12, Math.floor(d / step));
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      this.queue.push({ x: l.x + (p.x - l.x) * k, y: l.y + (p.y - l.y) * k, ink: p.data.ink, r: 0.0005, amt: 0.45 });
    }
    p.data.last = { x: p.x, y: p.y };
    p.data.t0 = this.time; // пока ведём — это мазок, а не «наливание»
    this.lastPaint = this.time;
    if (Math.random() < 0.25) noise({ dur: 0.08, gain: 0.05, type: 'bandpass', freq: 900, q: 1, pan: panFor(p.x, this.stage.w), wet: 0.2 });
  }

  onUp(p) { this.held.delete(p.id); }

  // ---------- Симуляция ----------

  simulate() {
    const g = this.g, P = this.P;
    for (const q of this.queue) {
      const [u, v] = this.toUv(q.x, q.y);
      g.step(P.splat, { uWet: this.wet, uPoint: [u, v], uInk: q.ink, uR: q.r, uAmt: q.amt, uAspect: this.aspect, uSeed: Math.random() * 40 }, this.wet);
    }
    this.queue.length = 0;
    // удержание: краски становится всё больше
    for (const p of this.held.values()) {
      if (this.time - p.data.t0 > 0.3) {
        const [u, v] = this.toUv(p.x, p.y);
        g.step(P.splat, { uWet: this.wet, uPoint: [u, v], uInk: p.data.ink, uR: 0.001, uAmt: 0.05, uAspect: this.aspect, uSeed: Math.random() * 40 }, this.wet);
        this.lastPaint = this.time;
      }
    }
    for (let i = 0; i < SUB; i++) {
      g.step(P.flow, { uWet: this.wet, uT: this.wet.texel, uK: 0.32, uThr: 0.36, uC: 0.09, uLoss: 0.0006, uSeed: this.seed, uCols: this.wet.w / 7 }, this.wet);
      g.step(P.dry, { uDry: this.dry, uWet: this.wet, uRate: 0.04 }, this.dry);
    }
  }

  update(dt) {
    this.time += dt;
    this.acc += dt;
    let n = 0;
    while (this.acc >= 1 / 60 && n < 2) { this.simulate(); this.acc -= 1 / 60; n++; }
    if (n === 2) this.acc = 0;
    // тихое «кап… кап…», пока краска свежая и течёт
    if (this.time - this.lastPaint < 7 && this.time > this.nextDrip) {
      this.nextDrip = this.time + rnd(0.35, 1.1);
      const f = rnd(700, 1300);
      tone({ freq: f, to: f * 1.6, dur: 0.06, type: 'sine', gain: 0.06, attack: 0.003, pan: rnd(-0.6, 0.6), wet: 0.8 });
    }
  }

  erase() {
    this.g.clear(this.wet);
    this.g.clear(this.dry);
    noise({ dur: 0.7, gain: 0.14, type: 'bandpass', freq: 600, to: 2500, q: 0.7, wet: 0.8 });
  }

  resize(prev, next) {
    const s = Math.min(next.w / prev.w, next.h / prev.h);
    const sw = (prev.w * s) / next.w, sh = (prev.h * s) / next.h;
    this.build(true, [(1 - sw) / 2, (1 - sh) / 2, sw, sh]);
  }

  draw() {
    const { width, height } = this.stage.canvas;
    this.g.run(this.P.display, { uWet: this.wet, uDry: this.dry, uT: this.wet.texel }, null, width, height);
  }

  destroy() { this.g.destroy(); }
}
