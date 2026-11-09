// Эбру — мраморирование на воде, целиком на видеокарте: время кадра не зависит от того, сколько краски на воде.
//
// Поле (текстура RG16F) на каждый пиксель хранит: R — номер капли, G — расстояние до края СВОЕЙ капли.
// Каждое действие — обратное отображение: для пикселя ищем, откуда в него «приехала» краска, и читаем старое поле там.
//  · капля радиуса R в C: внутри — новая капля; снаружи точка пришла из C + (X−C)·√(1 − Δr²/|X−C|²) (площадь сохраняется);
//    края всего, что вокруг капли, теперь проходят и по краю капли → расстояние = min(старое, |X−C| − R);
//  · палец: X пришла из X − m·e^(−d/λ), d — расстояние до пути пальца (как «гребёнка» в старой Эбру).
// Все действия кадра применяются за ОДИН проход (цепочка обратных отображений в шейдере).
// Чтение поля: для каждого номера капли среди 4 соседних текселей строим знаковое расстояние (+ своя, − чужая)
// и интерполируем — граница между красками остаётся на месте с точностью до долей пикселя, не размывается и не «лесенкой».
// Показ: по тому же расстоянию — сглаженный край и тонкая тёмная кромка пигмента постоянной ширины.
import { GL } from '../core/gl.js';
import { tone, noise, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const PALETTE = ['#E63946', '#F4A261', '#E9C46A', '#2A9D8F', '#457B9D', '#8E5BC2', '#F28482', '#43AA8B', '#1D3557', '#FF7F51'];
const BG = '#F3EDE1';
const FIELD_MAX = 1280;  // текселей поля по короткой стороне
const MARGIN = 0.06;     // поле чуть больше экрана: краска, ушедшая за край, может вернуться
const MAX_OPS = 48;      // действий за один проход
const FAR = 4000;        // «расстояние до края» пустой воды

const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const PAL = new Float32Array(PALETTE.flatMap(rgb));

const H = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
uniform sampler2D uF;
uniform ivec2 uSize;
// Знаковое расстояние для лучшей капли в точке X (координаты поля в текселях). Возвращает (номер, расстояние, номер2, расстояние2).
vec2 tx(ivec2 p) {
  if (p.x < 0 || p.y < 0 || p.x >= uSize.x || p.y >= uSize.y) return vec2(-1.0, ${FAR.toFixed(1)});
  return texelFetch(uF, p, 0).xy;
}
// знаковое расстояние для капли id: свои тексели «+», чужие «−», билинейно
float sOf(float id, vec2 a, vec2 b, vec2 c, vec2 d, vec4 w) {
  return dot(w, vec4(a.x == id ? a.y : -a.y, b.x == id ? b.y : -b.y, c.x == id ? c.y : -c.y, d.x == id ? d.y : -d.y));
}
void best(float id, float s, inout float b1, inout float id1, inout float b2, inout float id2) {
  if (id == id1) return;
  if (s > b1) { b2 = b1; id2 = id1; b1 = s; id1 = id; }
  else if (s > b2 && id != id2) { b2 = s; id2 = id; }
}
vec4 field(vec2 X) {
  vec2 st = X - 0.5;
  vec2 fl = floor(st);
  vec2 f = st - fl;
  ivec2 i0 = ivec2(fl);
  vec2 a = tx(i0), b = tx(i0 + ivec2(1, 0)), c = tx(i0 + ivec2(0, 1)), d = tx(i0 + ivec2(1, 1));
  vec4 w = vec4((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y), (1.0 - f.x) * f.y, f.x * f.y);
  // все 4 соседа одной капли — частый случай, обходимся без перебора
  if (a.x == b.x && a.x == c.x && a.x == d.x) return vec4(a.x, max(0.0, dot(w, vec4(a.y, b.y, c.y, d.y))), -2.0, -1e9);
  float b1 = -1e9, b2 = -1e9, id1 = -3.0, id2 = -2.0;
  best(a.x, sOf(a.x, a, b, c, d, w), b1, id1, b2, id2);
  best(b.x, sOf(b.x, a, b, c, d, w), b1, id1, b2, id2);
  best(c.x, sOf(c.x, a, b, c, d, w), b1, id1, b2, id2);
  best(d.x, sOf(d.x, a, b, c, d, w), b1, id1, b2, id2);
  return vec4(id1, max(b1, 0.0), id2, b2);
}
`;

const FS = {
  // все действия кадра одним проходом
  apply: H + `
uniform int uN;
uniform vec4 uA[${MAX_OPS}];
uniform vec4 uB[${MAX_OPS}];
void main() {
  vec2 X = gl_FragCoord.xy;
  float edge = ${FAR.toFixed(1)};
  for (int i = uN - 1; i >= 0; i--) {
    vec4 a = uA[i], b = uB[i];
    if (a.x < 1.5) {
      // капля: a = (1, cx, cy, R), b = (Δr², номер)
      vec2 d = X - a.yz;
      float q = dot(d, d);
      float R = a.w;
      if (q <= R * R) { o = vec4(b.y, min(R - sqrt(q), edge), 0, 1); return; }
      edge = min(edge, sqrt(q) - R);
      X = a.yz + d * sqrt(max(0.0, 1.0 - b.x / q));
    } else {
      // палец: a = (2, ax, ay, λ), b = (bx, by)
      vec2 A = a.yz, m = b.xy - A;
      float L2 = max(dot(m, m), 1e-6);
      vec2 Y = X;
      for (int it = 0; it < 2; it++) {
        float t = clamp(dot(Y - A, m) / L2, 0.0, 1.0);
        float dd = length(Y - (A + m * t));
        Y = X - m * exp(-dd / a.w);
      }
      X = Y;
    }
  }
  vec4 F = field(X);
  o = vec4(F.x, min(F.y, edge), 0, 1);
}`,
  // перенос поля в новый размер (сложили/разложили телефон)
  remap: H + `
uniform vec3 uK;   // старое поле = новое * uK.x + uK.yz (без растяжения)
void main() {
  vec4 F = field(gl_FragCoord.xy * uK.x + uK.yz);
  o = vec4(F.x, F.y / uK.x, 0, 1);
}`,
  display: H + `
uniform vec3 uPal[${PALETTE.length}];
uniform vec3 uBg;
uniform vec4 uMap;     // поле = экранный пиксель * uMap.xy + uMap.zw
uniform float uRim;    // ширина кромки, экранных пикселей
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 colOf(float id) {
  if (id < 0.0) return uBg;
  int k = int(mod(id + 0.5, ${PALETTE.length}.0));
  return uPal[k];
}
void main() {
  vec2 X = gl_FragCoord.xy * uMap.xy + uMap.zw;
  vec4 F = field(X);
  float s = F.y;
  vec2 g = vec2(dFdx(s), dFdy(s));
  float px = s / max(length(g), uMap.x * 0.5);    // расстояние до края в экранных пикселях
  vec3 c1 = colOf(F.x);
  vec3 c2 = F.w > -1e8 ? colOf(F.z) : c1;
  // тёмная кромка пигмента у края капли (у воды — нет)
  float rim = 1.0 - smoothstep(uRim * 0.55, uRim * 1.1, px);
  if (F.x >= 0.0) c1 *= 1.0 - 0.17 * rim;
  if (F.z >= 0.0 && F.w > -1e8) c2 *= 1.0 - 0.17 * rim;
  vec3 c = mix(c2, c1, min(1.0, 0.5 + px));
  c += (hash(gl_FragCoord.xy) - 0.5) * 0.018;     // едва заметное зерно воды
  o = vec4(c, 1);
}`,
};

export default class EbruGame {
  static erasable = true;
  static background = BG;
  static webgl = true;
  static maxDpr = 2;

  constructor(stage) {
    this.stage = stage;
    this.g = new GL(stage.canvas);
    this.P = {};
    for (const [k, src] of Object.entries(FS)) this.P[k] = this.g.program(src);
    this.ops = [];
    this.grow = new Map();       // палец → растущая капля
    this.nextId = Math.floor(Math.random() * PALETTE.length);
    this.time = 0;
    this.swishT = 0;
    this.A = new Float32Array(MAX_OPS * 4);
    this.B = new Float32Array(MAX_OPS * 4);
    this.build();
  }

  get u() { return this.stage.unit; }

  /** Поле с полями-запасом вокруг экрана; k — текселей на css-пиксель. */
  build(prev = null) {
    const { w, h } = this.stage;
    const short = Math.min(w, h);
    const n = Math.min(FIELD_MAX, Math.round(short * Math.min(2, this.stage.dpr)));
    const k = n / short;
    const m = short * MARGIN;
    const fw = Math.round((w + 2 * m) * k), fh = Math.round((h + 2 * m) * k);
    const F = this.g.double(fw, fh, 'rg16', false);
    if (prev) {
      // старый рисунок целиком, по центру, в тех же пропорциях
      const sc = Math.min(w / prev.W, h / prev.H);
      const ox = (w - prev.W * sc) / 2, oy = (h - prev.H * sc) / 2;
      // новый тексель → css (ось y вниз) → старый css → старый тексель
      const toOld = (X, Y) => {
        const x = X / k - m, y = h + m - Y / k;
        const x1 = (x - ox) / sc, y1 = (y - oy) / sc;
        return [(x1 + prev.m) * prev.k, (prev.H + prev.m - y1) * prev.k];
      };
      const [x0, y0] = toOld(0, 0), [x1] = toOld(1, 0);
      this.g.run(this.P.remap, { uF: prev.F.read, uSize: { iv: [prev.F.w, prev.F.h] }, uK: [x1 - x0, x0, y0] }, F.write);
      for (const gr of this.grow.values()) { gr.x = gr.x * sc + ox; gr.y = gr.y * sc + oy; gr.r *= sc; }
      F.swap();
      this.g.free(prev.F);
    } else {
      this.g.clear(F, -1, FAR, 0, 1);
    }
    this.F = F; this.k = k; this.m = m; this.W = w; this.H = h;
  }

  /** css-координаты → тексели поля (ось y вверх, как у gl_FragCoord). */
  fx(x) { return (x + this.m) * this.k; }
  fy(y) { return (this.stage.h + this.m - y) * this.k; }

  // ---------- Касания ----------

  onDown(p) {
    const id = this.nextId;
    this.nextId = (this.nextId + 1) % 2000;     // номера < 2048 точны в half-float; 2000 кратно палитре
    const r0 = this.u * 0.012;
    const gr = { id, x: p.x, y: p.y, r: 0, target: this.u * rnd(0.055, 0.075), held: 0 };
    this.grow.set(p.id, gr);
    this.growTo(gr, r0);
    p.data.lx = p.x; p.data.ly = p.y;
    this.plink(p.x);
    haptic(1);
  }

  onMove(p) {
    const gr = this.grow.get(p.id);
    if (gr && !p.moved) return;       // палец на месте — капля растёт
    if (gr) this.grow.delete(p.id);
    const lx = p.data.lx ?? p.x, ly = p.data.ly ?? p.y;
    const L = Math.hypot(p.x - lx, p.y - ly);
    if (L < 0.5) return;
    // шаги как в старой Эбру — завитки получаются такие же
    const step = this.u * 0.012;
    const n = Math.max(1, Math.ceil(L / step));
    const lam = this.u * 0.03 * this.k;
    let ax = lx, ay = ly;
    for (let i = 1; i <= n; i++) {
      const bx = lx + ((p.x - lx) * i) / n, by = ly + ((p.y - ly) * i) / n;
      this.ops.push([2, this.fx(ax), this.fy(ay), lam, this.fx(bx), this.fy(by), 0, 0]);
      ax = bx; ay = by;
    }
    p.data.lx = p.x; p.data.ly = p.y;
    this.swish(p.x, L);
  }

  onUp(p) { this.grow.delete(p.id); }

  growTo(gr, r) {
    const k = this.k;
    const R = r * k, R0 = gr.r * k;
    this.ops.push([1, this.fx(gr.x), this.fy(gr.y), R, R * R - R0 * R0, gr.id, 0, 0]);
    gr.r = r;
  }

  // ---------- Звуки ----------

  plink(x) {
    const pan = panFor(x, this.stage.w);
    const f = rnd(700, 1100);
    tone({ freq: f, to: f * 1.6, dur: 0.12, type: 'sine', gain: 0.12, attack: 0.004, pan, wet: 0.9 });
    tone({ freq: f * 0.5, to: f * 0.45, dur: 0.25, type: 'sine', gain: 0.06, attack: 0.01, at: 0.03, pan, wet: 1.2 });
  }

  swish(x, L) {
    if (this.time - this.swishT < 0.07) return;
    this.swishT = this.time;
    const v = clamp(L / (this.u * 0.03), 0.2, 1);
    noise({ dur: 0.16, gain: 0.025 * v, type: 'bandpass', freq: rnd(500, 900), q: 0.8, attack: 0.03, pan: panFor(x, this.stage.w), wet: 0.6 });
  }

  // ---------- Время ----------

  update(dt) {
    this.time += dt;
    for (const gr of this.grow.values()) {
      gr.held += dt;
      if (gr.held > 0.5) gr.target = Math.min(this.u * 0.2, gr.target + this.u * 0.05 * dt);
      if (gr.r < gr.target - 0.2) {
        const nr = gr.r + (gr.target - gr.r) * Math.min(1, dt * 7) + this.u * 0.004 * dt;
        this.growTo(gr, Math.min(nr, gr.target));
      }
    }
    this.flush();
  }

  /** Все накопленные действия — в поле, по MAX_OPS за проход. */
  flush() {
    const ops = this.ops;
    if (!ops.length) return;
    for (let s = 0; s < ops.length; s += MAX_OPS) {
      const n = Math.min(MAX_OPS, ops.length - s);
      for (let i = 0; i < n; i++) {
        const o = ops[s + i];
        this.A.set(o.slice(0, 4), i * 4);
        this.B.set(o.slice(4, 8), i * 4);
      }
      this.g.step(this.P.apply, { uF: this.F, uSize: { iv: [this.F.w, this.F.h] }, uN: { i: n }, uA: this.A, uB: this.B }, this.F);
    }
    ops.length = 0;
  }

  resize(prev, next) {
    this.flush();
    this.build({ F: this.F, k: this.k, m: this.m, W: this.W, H: this.H });
  }

  erase() {
    this.ops.length = 0;
    this.grow.clear();
    this.g.clear(this.F, -1, FAR, 0, 1);
  }

  // ---------- Рисование ----------

  draw() {
    const { width, height } = this.stage.canvas;
    // экранный пиксель (ось y вверх) → тексель поля
    const sx = (this.stage.w / width) * this.k;
    const sy = (this.stage.h / height) * this.k;
    const rim = Math.max(1, this.u * 0.0016) * (width / this.stage.w) * 0.9;
    this.g.run(this.P.display, {
      uF: this.F, uSize: { iv: [this.F.w, this.F.h] },
      uPal: PAL, uBg: rgb(BG), uMap: [sx, sy, this.m * this.k, this.m * this.k], uRim: rim,
    }, null, width, height);
  }

  destroy() { this.g.destroy(); }
}
