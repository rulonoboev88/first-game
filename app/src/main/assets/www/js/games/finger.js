// Пальчиковые краски (густая гуашь). Белая бумага.
// Как настоящий палец в краске:
//  • при касании на палец «набирается» порция свежего цвета;
//  • когда ведёшь, палец одновременно ОТДАЁТ свою краску и ЗАБИРАЕТ ту, по которой идёт —
//    синим пальцем через жёлтое получается зелёный след, который постепенно меняется;
//  • по пустой бумаге краска на пальце заканчивается — мазок сходит на нет;
//  • по краям мазка краска выдавливается валиками, видны полоски «отпечатка», всё объёмное и блестит;
//  • палец немного тащит краску за собой — разводы.
// Бумага: rgb — количество пигмента, a — толщина слоя. Палец — крошечная текстура 1×1 с тем же смыслом.
// Считаем только пятно под пальцем (scissor), а не весь экран.
import { GL, NOISE, PAINTS, absorb } from '../core/gl.js';
import { noise, tone, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const GRID = 760;   // пикселей бумаги по короткой стороне

const H = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
`;

const FS = {
  // Обновление краски на пальце: часть отдаёт, часть подбирает с бумаги под собой.
  load: H + `
uniform sampler2D uTmp; uniform sampler2D uLoad; uniform vec2 uC; uniform float uR; uniform float uPick; uniform float uDep;
void main() {
  vec4 sum = vec4(0); float ws = 0.0;
  for (int i = 0; i < 40; i++) {
    float t = (float(i) + 0.5) / 40.0;
    float a = float(i) * 2.39996;            // золотой угол — равномерно по пятну
    float r = sqrt(t);
    vec2 p = uC + vec2(cos(a), sin(a)) * r * uR;
    float w = 1.1 - 0.5 * r;
    sum += texture(uTmp, p) * w; ws += w;
  }
  vec4 avg = sum / ws;
  vec4 L = texture(uLoad, vec2(0.5));
  float pk = uPick * clamp(L.a * 1.2, 0.25, 1.0);   // почти сухой палец собирает меньше
  o = L * (1.0 - uDep) + avg * pk;
}`,
  // Обмен краской между пальцем и бумагой в пятне под пальцем.
  touch: H + NOISE + `
uniform sampler2D uTmp; uniform sampler2D uLoad;
uniform vec2 uOrigin; uniform vec2 uSize; uniform vec2 uCenter; uniform float uR; uniform vec2 uDelta; uniform vec2 uDir;
uniform float uPick; uniform float uDep; uniform float uSmear; uniform float uSeed; uniform float uRing;
void main() {
  vec2 px = gl_FragCoord.xy;
  vec4 c = texture(uTmp, (px - uOrigin) / uSize);
  float r = length(px - uCenter) / uR;
  if (r < 1.0) {
    float f = 1.0 - smoothstep(0.72, 1.0, r);
    // палец тащит краску за собой
    vec4 back = texture(uTmp, (px - uDelta - uOrigin) / uSize);
    c = mix(c, back, uSmear * f);
    // подбирает (больше в середине пятна); почти сухой палец — меньше
    vec4 L0 = texture(uLoad, vec2(0.5));
    float pk = uPick * clamp(L0.a * 1.2, 0.25, 1.0);
    c -= c * pk * f * (1.1 - 0.5 * r);
    // отдаёт (больше к краям — валики), с полосками отпечатка вдоль движения
    float across = dot(px - uCenter, vec2(-uDir.y, uDir.x)) / uR;
    float streak = 0.75 + 0.5 * vnoise(vec2(across * 7.0, uSeed));
    vec4 L = texture(uLoad, vec2(0.5));
    float ring = 1.0 + uRing * (smoothstep(0.45, 0.95, r) - 0.5);
    c += L * uDep * f * ring * mix(1.0, streak, uRing);
    c.a = min(c.a, 3.0);
  }
  o = c;
}`,
  fill: H + `
uniform vec4 uV;
void main() { o = uV; }`,
  // Показ: цвет по смешанному пигменту, гуашь непрозрачная, объём и мягкий блеск.
  display: H + `
uniform sampler2D uPaint; uniform vec2 uT;
void main() {
  vec4 p = texture(uPaint, vUv);
  vec3 conc = p.rgb / max(p.a, 1e-3);
  float cov = smoothstep(0.012, 0.09, p.a);
  vec3 col = exp(-conc);
  float hL = texture(uPaint, vUv - vec2(uT.x, 0)).a, hR = texture(uPaint, vUv + vec2(uT.x, 0)).a;
  float hB = texture(uPaint, vUv - vec2(0, uT.y)).a, hT = texture(uPaint, vUv + vec2(0, uT.y)).a;
  vec3 n = normalize(vec3((hL - hR) * 3.6, (hB - hT) * 3.6, 1.0));
  vec3 l = normalize(vec3(-0.45, 0.6, 0.66));
  float diff = clamp(dot(n, l), 0.0, 1.0);
  float spec = pow(max(dot(reflect(-l, n), vec3(0, 0, 1)), 0.0), 26.0);
  vec3 lit = col * (0.68 + 0.42 * diff) + spec * 0.32;
  o = vec4(mix(vec3(1.0), lit, cov), 1);
}`,
  copy: H + `
uniform sampler2D uSrc; uniform vec4 uMap;
void main() {
  vec2 uv = (vUv - uMap.xy) / uMap.zw;
  o = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? vec4(0) : texture(uSrc, uv);
}`,
};

export default class FingerGame {
  static erasable = true;
  static background = '#FFFFFF';
  static webgl = true;
  static maxDpr = 2;

  constructor(stage) {
    this.stage = stage;
    this.g = new GL(stage.canvas);
    this.P = {};
    for (const [k, src] of Object.entries(FS)) this.P[k] = this.g.program(src);
    this.fingers = new Map();
    this.colorIdx = Math.floor(Math.random() * PAINTS.length);
    this.time = 0;
    this.lastSquish = 0;
    this.build();
  }

  get u() { return this.stage.unit; }

  build(old = null, map = null) {
    const g = this.g;
    const { width, height } = this.stage.canvas;
    const short = Math.min(width, height);
    const pw = Math.round((GRID * width) / short), ph = Math.round((GRID * height) / short);
    const prev = this.paint;
    this.paint = g.target(pw, ph, 'f16');
    this.k = pw / this.stage.w; // CSS-пиксели → пиксели бумаги
    this.R = Math.max(10, this.u * 0.042 * this.k);
    const S = Math.ceil(2 * this.R * 1.6) + 4;
    g.free(this.tmp);
    this.tmp = g.target(S, S, 'f16');
    this.S = S;
    if (old && prev) {
      g.run(this.P.copy, { uSrc: prev, uMap: map }, this.paint);
    }
    g.free(prev);
  }

  // ---------- Палец ----------

  newFinger(p) {
    const ink = absorb(PAINTS[this.colorIdx].map((v) => Math.min(1, Math.max(0.03, v + rnd(-0.03, 0.03)))));
    this.colorIdx = (this.colorIdx + 1) % PAINTS.length;
    const load = this.g.double(1, 1, 'f16', false);
    const L0 = 1.3;
    this.g.run(this.P.fill, { uV: [ink[0] * L0, ink[1] * L0, ink[2] * L0, L0] }, load.read);
    return { load, x: p.x, y: p.y, still: 0, seed: Math.random() * 50 };
  }

  onDown(p) {
    const f = this.newFinger(p);
    this.fingers.set(p.id, f);
    // мазок-«шлепок»: палец прижали — краска отдаётся щедро
    for (let i = 0; i < 3; i++) this.touchAt(f, p.x, p.y, 0, 0, 0.25, 0.05, 0, 1, 0, 0.15);
    const pan = panFor(p.x, this.stage.w);
    noise({ dur: 0.18, gain: 0.2, type: 'lowpass', freq: 1100, to: 250, q: 1.2, pan, wet: 0.3 });
    tone({ freq: 140, to: 90, dur: 0.1, type: 'sine', gain: 0.15, attack: 0.004, pan, wet: 0.3 });
    haptic(1);
  }

  onMove(p) {
    const f = this.fingers.get(p.id);
    if (!f) return;
    const dx = p.x - f.x, dy = p.y - f.y;
    const d = Math.hypot(dx, dy);
    const stepPx = (this.R / this.k) * 0.3;
    if (d < stepPx) return;
    const n = Math.min(24, Math.ceil(d / stepPx));
    const ux = dx / d, uy = dy / d;
    for (let i = 1; i <= n; i++) {
      const x = f.x + (dx * i) / n, y = f.y + (dy * i) / n;
      this.touchAt(f, x, y, dx / n, dy / n, 0.035, 0.1, 0.55, ux, uy, 0.9);
    }
    f.x = p.x; f.y = p.y; f.still = 0;
    // «чвяк» мокрой краски
    if (this.time - this.lastSquish > 0.09 && p.speed > 150) {
      this.lastSquish = this.time;
      noise({ dur: 0.12, gain: Math.min(0.1, p.speed / 25000), type: 'bandpass', freq: rnd(500, 900), q: 2.2, pan: panFor(p.x, this.stage.w), wet: 0.3 });
    }
  }

  onUp(p) {
    const f = this.fingers.get(p.id);
    if (f) { this.g.free(f.load); this.fingers.delete(p.id); }
  }

  /**
   * Один «шаг» пальца в точке (x, y) (CSS-пиксели), смещение (dx, dy) с прошлого шага.
   * dep — сколько краски отдаёт, pick — сколько подбирает, smear — насколько тащит за собой.
   */
  touchAt(f, x, y, dx, dy, dep, pick, smear, ux = 1, uy = 0, ring = 0.9) {
    const g = this.g, gl = g.gl;
    const W = this.paint.w, Hh = this.paint.h;
    const cx = x * this.k, cy = Hh - y * this.k;
    const S = this.S;
    const ox = Math.round(cx - S / 2), oy = Math.round(cy - S / 2);
    // 1) копируем пятно бумаги во временную текстуру
    g.clear(this.tmp);
    const sx0 = Math.max(0, ox), sy0 = Math.max(0, oy), sx1 = Math.min(W, ox + S), sy1 = Math.min(Hh, oy + S);
    if (sx1 <= sx0 || sy1 <= sy0) return;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.paint.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.tmp.fb);
    gl.blitFramebuffer(sx0, sy0, sx1, sy1, sx0 - ox, sy0 - oy, sx1 - ox, sy1 - oy, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    // 2) краска на пальце: отдаёт и подбирает
    g.run(this.P.load, { uTmp: this.tmp, uLoad: f.load, uC: [(cx - ox) / S, (cy - oy) / S], uR: (this.R * 0.9) / S, uPick: pick, uDep: dep }, f.load.write);
    // 3) обмен с бумагой — только в квадрате вокруг пальца
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(sx0, sy0, sx1 - sx0, sy1 - sy0);
    g.run(this.P.touch, {
      uTmp: this.tmp, uLoad: f.load, uOrigin: [ox, oy], uSize: [S, S], uCenter: [cx, cy], uR: this.R,
      uDelta: [dx * this.k, -dy * this.k], uDir: [ux, -uy], uPick: pick, uDep: dep, uSmear: smear, uSeed: f.seed, uRing: ring,
    }, this.paint);
    gl.disable(gl.SCISSOR_TEST);
    f.load.swap();
  }

  update(dt) {
    this.time += dt;
    // палец стоит на месте — краска понемногу добавляется и перемешивается под ним
    for (const f of this.fingers.values()) {
      f.still += dt;
      if (f.still > 0.15) this.touchAt(f, f.x, f.y, 0, 0, 0.02, 0.02, 0, 1, 0, 0.1);
    }
  }

  erase() {
    this.g.clear(this.paint);
    noise({ dur: 0.6, gain: 0.14, type: 'bandpass', freq: 700, to: 2600, q: 0.7, wet: 0.8 });
  }

  resize(prev, next) {
    const s = Math.min(next.w / prev.w, next.h / prev.h);
    const sw = (prev.w * s) / next.w, sh = (prev.h * s) / next.h;
    for (const f of this.fingers.values()) this.g.free(f.load);
    this.fingers.clear();
    this.build(true, [(1 - sw) / 2, (1 - sh) / 2, sw, sh]);
  }

  draw() {
    const { width, height } = this.stage.canvas;
    this.g.run(this.P.display, { uPaint: this.paint, uT: this.paint.texel }, null, width, height);
  }

  destroy() {
    for (const f of this.fingers.values()) this.g.free(f.load);
    this.g.destroy();
  }
}
