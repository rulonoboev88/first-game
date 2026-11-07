// Чернила в воде. Настоящая симуляция несжимаемой жидкости на видеокарте (метод «стабильных жидкостей» Стэма):
// скорость переносится сама собой, давление делает воду несжимаемой (вихри!), усиление завихрённости держит клубы живыми.
// Краска переносится водой и смешивается как пигмент (жёлтый + синий = зелёный).
// Тап → капля чернил расплывается клубами с прядями. Удержание → льётся струйка. Проведение → вода закручивается.
import { GL, NOISE, PAINTS, absorb } from '../core/gl.js';
import { tone, noise, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const SIM = 256;        // клеток по короткой стороне для скоростей
const DYE_MAX = 1280;   // пикселей по короткой стороне для краски
const STEP = 1 / 60;

const H = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
`;

const FS = {
  advect: H + `
uniform sampler2D uVel; uniform sampler2D uSrc;
uniform vec2 uVelTexel; uniform float uDt; uniform float uDiss;
void main() {
  vec2 c = vUv - uDt * texture(uVel, vUv).xy * uVelTexel;
  o = uDiss * texture(uSrc, c);
}`,
  // Схема Маккормака: прямой + обратный перенос, исправление ошибки и защита от выбросов.
  // Держит краску чёткой и сочной даже после долгого перемешивания.
  maccormack: H + `
uniform sampler2D uVel; uniform sampler2D uSrc; uniform sampler2D uHat; uniform sampler2D uBack;
uniform vec2 uVelTexel; uniform vec2 uSrcTexel; uniform float uDt;
void main() {
  vec2 c = vUv - uDt * texture(uVel, vUv).xy * uVelTexel;
  vec4 hat = texture(uHat, vUv);
  vec4 r = hat + 0.5 * (texture(uSrc, vUv) - texture(uBack, vUv));
  // ограничиваем значениями соседей в точке, откуда пришла жидкость
  vec2 st = c / uSrcTexel - 0.5;
  vec2 i = floor(st);
  vec2 t0 = (i + 0.5) * uSrcTexel;
  vec4 a = texture(uSrc, t0), b = texture(uSrc, t0 + vec2(uSrcTexel.x, 0)),
       d = texture(uSrc, t0 + vec2(0, uSrcTexel.y)), e = texture(uSrc, t0 + uSrcTexel);
  vec4 mn = min(min(a, b), min(d, e)), mx = max(max(a, b), max(d, e));
  o = clamp(r, mn, mx);
}`,
  divergence: H + `
uniform sampler2D uVel; uniform vec2 uTexel;
void main() {
  float L = texture(uVel, vUv - vec2(uTexel.x, 0)).x;
  float R = texture(uVel, vUv + vec2(uTexel.x, 0)).x;
  float B = texture(uVel, vUv - vec2(0, uTexel.y)).y;
  float T = texture(uVel, vUv + vec2(0, uTexel.y)).y;
  vec2 C = texture(uVel, vUv).xy;
  // стенки аквариума: скорость в стену отражается
  if (vUv.x - uTexel.x < 0.0) L = -C.x;
  if (vUv.x + uTexel.x > 1.0) R = -C.x;
  if (vUv.y - uTexel.y < 0.0) B = -C.y;
  if (vUv.y + uTexel.y > 1.0) T = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0, 0, 1);
}`,
  curl: H + `
uniform sampler2D uVel; uniform vec2 uTexel;
void main() {
  float L = texture(uVel, vUv - vec2(uTexel.x, 0)).y;
  float R = texture(uVel, vUv + vec2(uTexel.x, 0)).y;
  float B = texture(uVel, vUv - vec2(0, uTexel.y)).x;
  float T = texture(uVel, vUv + vec2(0, uTexel.y)).x;
  o = vec4(0.5 * (R - L - T + B), 0, 0, 1);
}`,
  vorticity: H + `
uniform sampler2D uVel; uniform sampler2D uCurl; uniform vec2 uTexel; uniform float uCurlK; uniform float uDt;
void main() {
  float L = texture(uCurl, vUv - vec2(uTexel.x, 0)).x;
  float R = texture(uCurl, vUv + vec2(uTexel.x, 0)).x;
  float B = texture(uCurl, vUv - vec2(0, uTexel.y)).x;
  float T = texture(uCurl, vUv + vec2(0, uTexel.y)).x;
  float C = texture(uCurl, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + 1e-4;
  f *= uCurlK * C;
  f.y *= -1.0;
  vec2 v = texture(uVel, vUv).xy + f * uDt;
  o = vec4(clamp(v, -1000.0, 1000.0), 0, 1);
}`,
  pressure: H + `
uniform sampler2D uP; uniform sampler2D uDiv; uniform vec2 uTexel;
void main() {
  float L = texture(uP, vUv - vec2(uTexel.x, 0)).x;
  float R = texture(uP, vUv + vec2(uTexel.x, 0)).x;
  float B = texture(uP, vUv - vec2(0, uTexel.y)).x;
  float T = texture(uP, vUv + vec2(0, uTexel.y)).x;
  float d = texture(uDiv, vUv).x;
  o = vec4((L + R + B + T - d) * 0.25, 0, 0, 1);
}`,
  gradient: H + `
uniform sampler2D uP; uniform sampler2D uVel; uniform vec2 uTexel;
void main() {
  float L = texture(uP, vUv - vec2(uTexel.x, 0)).x;
  float R = texture(uP, vUv + vec2(uTexel.x, 0)).x;
  float B = texture(uP, vUv - vec2(0, uTexel.y)).x;
  float T = texture(uP, vUv + vec2(0, uTexel.y)).x;
  vec2 v = texture(uVel, vUv).xy - vec2(R - L, T - B);
  o = vec4(v, 0, 1);
}`,
  scale: H + `
uniform sampler2D uSrc; uniform float uK;
void main() { o = uK * texture(uSrc, vUv); }`,
  // Толчок скорости: гауссово пятно
  splatVel: H + `
uniform sampler2D uSrc; uniform vec2 uPoint; uniform vec2 uForce; uniform float uR; uniform vec2 uAspect;
void main() {
  vec2 d = (vUv - uPoint) * uAspect;
  float k = exp(-dot(d, d) / uR);
  o = vec4(texture(uSrc, vUv).xy + uForce * k, 0, 1);
}`,
  // Ветерок: лёгкое «живое» течение по всему аквариуму (вихревой шум)
  ambient: H + NOISE + `
uniform sampler2D uVel; uniform float uT; uniform float uAmp; uniform vec2 uAspect; uniform float uDt;
void main() {
  vec2 p = vUv * uAspect * 2.5 + vec2(uT * 0.03, -uT * 0.02);
  float e = 0.01;
  float n1 = fbm(p + vec2(0, e)), n2 = fbm(p - vec2(0, e)), n3 = fbm(p + vec2(e, 0)), n4 = fbm(p - vec2(e, 0));
  vec2 curl = vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
  o = vec4(texture(uVel, vUv).xy + curl * uAmp * uDt, 0, 1);
}`,
  // Капля чернил: пигмент вливается с неровным, «рваным» краем
  splatDye: H + NOISE + `
uniform sampler2D uSrc; uniform vec2 uPoint; uniform vec3 uInk; uniform float uR; uniform float uK; uniform vec2 uAspect; uniform float uSeed;
void main() {
  vec2 d = (vUv - uPoint) * uAspect;
  float r2 = dot(d, d);
  float n = fbm(d / sqrt(uR) * 1.6 + uSeed);
  float a = uK * exp(-r2 / (uR * (0.55 + 0.9 * n)));
  vec3 D = texture(uSrc, vUv).rgb;
  a = clamp(a, 0.0, 1.0);
  D = mix(D, uInk, a) + uInk * a * 0.05;
  o = vec4(min(D, vec3(6.0)), 1);
}`,
  // Показ: белая вода + краска по закону поглощения, лёгкий объём облаков (свет сверху-слева)
  display: H + `
uniform sampler2D uDye; uniform vec2 uTexel;
void main() {
  vec3 D = texture(uDye, vUv).rgb;
  float s = dot(D, vec3(0.333));
  float sL = dot(texture(uDye, vUv - vec2(uTexel.x * 2.0, 0)).rgb, vec3(0.333));
  float sR = dot(texture(uDye, vUv + vec2(uTexel.x * 2.0, 0)).rgb, vec3(0.333));
  float sB = dot(texture(uDye, vUv - vec2(0, uTexel.y * 2.0)).rgb, vec3(0.333));
  float sT = dot(texture(uDye, vUv + vec2(0, uTexel.y * 2.0)).rgb, vec3(0.333));
  vec2 g = vec2(sR - sL, sT - sB);
  float shade = clamp(1.0 + dot(g, vec2(-0.6, 0.6)) * 0.9, 0.82, 1.12);
  vec3 col = exp(-D * 1.1);
  col = mix(col, col * shade, smoothstep(0.02, 0.4, s));
  o = vec4(col, 1);
}`,
  copy: H + `
uniform sampler2D uSrc; uniform vec4 uMap;
void main() {
  vec2 uv = (vUv - uMap.xy) / uMap.zw;
  o = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? vec4(0) : texture(uSrc, uv);
}`,
};

export default class InkGame {
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
    this.acc = 0;
    this.time = 0;
    this.colorIdx = Math.floor(Math.random() * PAINTS.length);
    this.lastSwish = 0;
    this.build();
  }

  get u() { return this.stage.unit; }

  /** Размеры сеток с сохранением пропорций экрана. */
  build(prevDye = null, map = null) {
    const g = this.g;
    const { width, height } = this.stage.canvas;
    const short = Math.min(width, height);
    const sim = (n) => [Math.max(8, Math.round((n * width) / short)), Math.max(8, Math.round((n * height) / short))];
    const [sw, sh] = sim(SIM);
    const dyeN = Math.min(DYE_MAX, short);
    const [dw, dh] = sim(dyeN);
    for (const t of [this.vel, this.dye, this.p, this.div, this.curl, this.hat, this.back]) g.free(t);
    this.vel = g.double(sw, sh, 'f16');
    this.p = g.double(sw, sh, 'r16', false);
    this.div = g.target(sw, sh, 'r16', false);
    this.curl = g.target(sw, sh, 'r16', false);
    this.dye = g.double(dw, dh, 'f16');
    this.hat = g.target(dw, dh, 'f16');
    this.back = g.target(dw, dh, 'f16');
    // по координатам: расстояния считаем в долях короткой стороны
    this.aspect = [width / short, height / short];
    if (prevDye) {
      g.run(this.P.copy, { uSrc: prevDye.read, uMap: map }, this.dye.write);
      this.dye.swap();
      g.free(prevDye);
    }
  }

  // ---------- Касания ----------

  toUv(x, y) {
    return [x / this.stage.w, 1 - y / this.stage.h];
  }

  onDown(p) {
    const ink = absorb(PAINTS[this.colorIdx].map((v) => Math.min(1, Math.max(0.03, v + rnd(-0.04, 0.04)))));
    this.colorIdx = (this.colorIdx + 1) % PAINTS.length;
    p.data.ink = ink;
    p.data.t0 = this.time;
    this.held.set(p.id, p);
    this.queue.push({ type: 'drop', x: p.x, y: p.y, ink });
    const pan = panFor(p.x, this.stage.w);
    // «плюп» капли в воду
    tone({ freq: 380, to: 900, dur: 0.11, type: 'sine', gain: 0.2, attack: 0.003, pan, wet: 0.7 });
    tone({ freq: 700, to: 1400, dur: 0.08, type: 'sine', gain: 0.07, attack: 0.003, at: 0.09, pan, wet: 0.7 });
    noise({ dur: 0.25, gain: 0.05, type: 'lowpass', freq: 900, pan, wet: 0.5 });
    haptic(0);
  }

  onMove(p) {
    if (!p.moved) return;
    // перемешиваем воду: толчок вдоль пальца (пиксели/с → клетки/с)
    const k = this.vel.w / this.stage.w;
    this.queue.push({ type: 'stir', x: p.x, y: p.y, fx: p.vx * k * 0.9, fy: -p.vy * k * 0.9 });
    const now = this.time;
    if (now - this.lastSwish > 0.12 && p.speed > 200) {
      this.lastSwish = now;
      noise({ dur: 0.3, gain: Math.min(0.12, p.speed / 20000), type: 'bandpass', freq: 500 + Math.min(1200, p.speed / 4), q: 0.7, pan: panFor(p.x, this.stage.w), wet: 0.6 });
    }
  }

  onUp(p) {
    this.held.delete(p.id);
  }

  // ---------- Симуляция ----------

  splatVel(x, y, fx, fy, r) {
    const [u, v] = this.toUv(x, y);
    this.g.step(this.P.splatVel, { uSrc: this.vel, uPoint: [u, v], uForce: [fx, fy], uR: r, uAspect: this.aspect }, this.vel);
  }

  splatDye(x, y, ink, r, k) {
    const [u, v] = this.toUv(x, y);
    this.g.step(this.P.splatDye, { uSrc: this.dye, uPoint: [u, v], uInk: ink, uR: r, uK: k, uAspect: this.aspect, uSeed: Math.random() * 50 }, this.dye);
  }

  drop(x, y, ink) {
    const s = this.u;
    // основная капля
    this.splatDye(x, y, ink.map((v) => v * 1.5), 0.0016, 1.0);
    // капля толкает воду в стороны…
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3);
      const r = s * 0.035;
      this.splatVel(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.cos(a) * 55, -Math.sin(a) * 55, 0.0006);
    }
    // …и рождает маленькие вихри — из них растут «пряди» чернил
    for (let i = 0; i < 5; i++) {
      const a = rnd(0, Math.PI * 2), r = s * rnd(0.03, 0.07);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      const spin = (Math.random() < 0.5 ? -1 : 1) * rnd(40, 90);
      this.splatVel(px, py, -Math.sin(a) * spin, -Math.cos(a) * spin, 0.0003);
    }
  }

  simulate(dt) {
    const g = this.g, P = this.P;
    const tex = this.vel.texel;
    // входящие касания
    for (const q of this.queue) {
      if (q.type === 'drop') this.drop(q.x, q.y, q.ink);
      else this.splatVel(q.x, q.y, q.fx, q.fy, 0.0009);
    }
    this.queue.length = 0;
    // удержание пальца: льётся тонкая струйка
    for (const p of this.held.values()) {
      if (this.time - p.data.t0 > 0.25) {
        this.splatDye(p.x, p.y, p.data.ink.map((v) => v * 1.4), 0.0005, 0.4);
        this.splatVel(p.x + rnd(-3, 3), p.y + rnd(-3, 3), rnd(-25, 25), rnd(-25, 25), 0.0003);
      }
    }
    g.step(P.ambient, { uVel: this.vel, uT: this.time, uAmp: 0.9, uAspect: this.aspect, uDt: dt }, this.vel);
    g.run(P.curl, { uVel: this.vel, uTexel: tex }, this.curl);
    g.step(P.vorticity, { uVel: this.vel, uCurl: this.curl, uTexel: tex, uCurlK: 22, uDt: dt }, this.vel);
    g.run(P.divergence, { uVel: this.vel, uTexel: tex }, this.div);
    g.step(P.scale, { uSrc: this.p, uK: 0.8 }, this.p);
    for (let i = 0; i < 25; i++) g.step(P.pressure, { uP: this.p, uDiv: this.div, uTexel: tex }, this.p);
    g.step(P.gradient, { uP: this.p, uVel: this.vel, uTexel: tex }, this.vel);
    g.step(P.advect, { uVel: this.vel, uSrc: this.vel, uVelTexel: tex, uDt: dt, uDiss: Math.exp(-0.35 * dt) }, this.vel);
    // краска: точный перенос (Маккормак)
    g.run(P.advect, { uVel: this.vel, uSrc: this.dye, uVelTexel: tex, uDt: dt, uDiss: 1.0 }, this.hat);
    g.run(P.advect, { uVel: this.vel, uSrc: this.hat, uVelTexel: tex, uDt: -dt, uDiss: 1.0 }, this.back);
    g.step(P.maccormack, { uVel: this.vel, uSrc: this.dye, uHat: this.hat, uBack: this.back, uVelTexel: tex, uSrcTexel: this.dye.texel, uDt: dt }, this.dye);
  }

  update(dt) {
    this.time += dt;
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 2) { this.simulate(STEP); this.acc -= STEP; n++; }
    if (n === 2) this.acc = 0;
  }

  erase() {
    this.g.clear(this.dye);
    this.g.clear(this.vel);
    this.g.clear(this.p);
    noise({ dur: 0.9, gain: 0.15, type: 'bandpass', freq: 400, to: 2000, q: 0.7, wet: 1 });
  }

  resize(prev, next) {
    const s = Math.min(next.w / prev.w, next.h / prev.h);
    const sw = (prev.w * s) / next.w, sh = (prev.h * s) / next.h;
    const old = this.dye;
    this.dye = null;
    this.build(old, [(1 - sw) / 2, (1 - sh) / 2, sw, sh]);
  }

  draw() {
    const { width, height } = this.stage.canvas;
    this.g.run(this.P.display, { uDye: this.dye, uTexel: this.dye.texel }, null, width, height);
  }

  destroy() {
    this.g.destroy();
  }
}
