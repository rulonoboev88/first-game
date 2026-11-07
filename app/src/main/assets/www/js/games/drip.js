// Стекающая краска. Белая стена. Полное разрешение экрана.
// Каждый подтёк — отдельная капля со своим объёмом краски (без сеток и «столбцов»):
//  • капли рождаются в случайных местах у нижнего края кляксы, пока в ней много краски;
//  • чем больше краски в капле, тем быстрее бежит; по пути оставляет след и «худеет» —
//    след сужается, капля замедляется и останавливается круглой бусиной;
//  • путь слегка извилистый, у каждой капли свой; соседние капли сливаются;
//  • капля, пробегая по чужой краске, подхватывает её цвет; следы смешиваются как пигмент.
// Отрисовка: краска с толщиной (объём, блеск), бегущие бусины — поверх, с настоящей сферической нормалью.
import { GL, NOISE, PAINTS, absorb } from '../core/gl.js';
import { tone, noise, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MAX_HEADS = 64;
const CELL = 6; // клетка «карты цвета» для подхвата цвета (CSS-пиксели)

const H = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
`;

// Общая функция освещения краски
const SHADE = `
vec3 shade(vec3 col, vec3 n) {
  vec3 l = normalize(vec3(-0.45, 0.62, 0.65));
  float diff = clamp(dot(n, l), 0.0, 1.0);
  float spec = pow(max(dot(reflect(-l, n), vec3(0, 0, 1)), 0.0), 30.0);
  return col * (0.8 + 0.28 * diff) + spec * 0.32;
}
`;

const FS = {
  // Мазок краски: капсула от A до B (радиусы rA→rB) или круг с неровным краем (uNoise > 0).
  // rgb — количество пигмента, a — толщина. Пересекаясь, краски смешиваются.
  stamp: H + NOISE + `
uniform sampler2D uTmp; uniform vec2 uOrigin; uniform float uS;
uniform vec2 uA; uniform vec2 uB; uniform float uRA; uniform float uRB;
uniform vec3 uInk; uniform float uAmt; uniform float uNoise; uniform float uSeed;
void main() {
  vec2 px = gl_FragCoord.xy;
  vec4 c = texture(uTmp, (px - uOrigin) / uS);
  vec2 ab = uB - uA;
  float t = clamp(dot(px - uA, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  float r = mix(uRA, uRB, t);
  vec2 d = px - (uA + ab * t);
  if (uNoise > 0.0) {
    float ang = atan(d.y, d.x);
    r *= 1.0 + uNoise * (fbm(vec2(cos(ang), sin(ang)) * 1.8 + uSeed) - 0.5);
  }
  float dist = length(d);
  if (dist < r + 1.0) {
    float q = clamp(dist / r, 0.0, 1.0);
    // плоская плёнка краски со скруглённым краем (а не «трубочка»)
    float add = uAmt * sqrt(1.0 - pow(q, 6.0)) * clamp(r + 0.5 - dist, 0.0, 1.0);
    vec3 co = c.a > 1e-3 ? c.rgb / c.a : uInk;
    float tm = c.a > 1e-3 ? clamp(add / (c.a + add) * 1.3, 0.0, 1.0) : 1.0;
    vec3 cn = mix(co, uInk, tm);
    float an = max(c.a, add) + 0.12 * min(c.a, add);
    c = vec4(cn * an, an);
  }
  o = c;
}`,
  display: H + SHADE + `
uniform sampler2D uP; uniform vec2 uT; uniform vec2 uRes;
uniform int uN; uniform vec4 uBead[${MAX_HEADS}]; uniform vec4 uBeadInk[${MAX_HEADS}];
void main() {
  vec4 p = texture(uP, vUv);
  vec3 conc = p.rgb / max(p.a, 1e-3);
  float cov = smoothstep(0.004, 0.05, p.a);
  float hL = texture(uP, vUv - vec2(uT.x, 0)).a, hR = texture(uP, vUv + vec2(uT.x, 0)).a;
  float hB = texture(uP, vUv - vec2(0, uT.y)).a, hT = texture(uP, vUv + vec2(0, uT.y)).a;
  vec3 n = normalize(vec3((hL - hR) * 1.6, (hB - hT) * 1.6, 1.0));
  vec3 col = mix(vec3(1.0), shade(exp(-conc), n), cov);
  // бегущие капли-бусины поверх
  vec2 px = vUv * uRes;
  for (int i = 0; i < ${MAX_HEADS}; i++) {
    if (i >= uN) break;
    vec4 b = uBead[i];
    vec2 d = px - b.xy;
    if (abs(d.x) > b.z + 1.0 || abs(d.y) > b.z * 1.25 + 1.0) continue;
    d.y /= 1.15;                       // капля чуть вытянута вниз
    float q = dot(d, d) / (b.z * b.z);
    if (q < 1.0) {
      vec3 nb = normalize(vec3(-d / b.z * 0.7, 1.0));
      float a = clamp((1.0 - sqrt(q)) * b.z, 0.0, 1.0);
      col = mix(col, shade(exp(-uBeadInk[i].rgb), nb), a);
    }
  }
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
    this.blobs = [];   // кляксы-«резервуары», из которых рождаются подтёки
    this.heads = [];   // бегущие капли
    this.time = 0;
    this.colorIdx = Math.floor(Math.random() * PAINTS.length);
    this.build();
  }

  get u() { return this.stage.unit; }

  build(old = null, map = null) {
    const g = this.g;
    const { width, height } = this.stage.canvas;
    const prev = this.paint;
    this.paint = g.target(width, height, 'f16');
    this.k = width / this.stage.w; // CSS → пиксели текстуры
    const S = Math.ceil(this.u * 0.16 * this.k * 2) + 8;
    g.free(this.tmp);
    this.tmp = g.target(S, S, 'f16');
    this.S = S;
    if (old && prev) g.run(this.P.copy, { uSrc: prev, uMap: map }, this.paint);
    g.free(prev);
    // карта цвета (CPU) — чтобы капля подхватывала цвет чужой краски
    this.cw = Math.ceil(this.stage.w / CELL); this.ch = Math.ceil(this.stage.h / CELL);
    this.cmap = new Float32Array(this.cw * this.ch * 4);
  }

  // ---------- Рисование в текстуру ----------

  /** Капсула (или круг) в CSS-координатах: A(x0,y0,r0) → B(x1,y1,r1). */
  stamp(x0, y0, r0, x1, y1, r1, ink, amt, noiseK = 0) {
    const g = this.g, gl = g.gl, k = this.k, W = this.paint.w, Hh = this.paint.h, S = this.S;
    const ax = x0 * k, ay = Hh - y0 * k, bx = x1 * k, by = Hh - y1 * k;
    const R = Math.max(r0, r1) * k * (1 + noiseK * 0.6) + 2;
    const minx = Math.floor(Math.min(ax, bx) - R), miny = Math.floor(Math.min(ay, by) - R);
    const maxx = Math.ceil(Math.max(ax, bx) + R), maxy = Math.ceil(Math.max(ay, by) + R);
    if (maxx - minx > S || maxy - miny > S) return; // слишком большой кусок за раз — пропускаем
    const sx0 = Math.max(0, minx), sy0 = Math.max(0, miny), sx1 = Math.min(W, maxx), sy1 = Math.min(Hh, maxy);
    if (sx1 <= sx0 || sy1 <= sy0) return;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.paint.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.tmp.fb);
    gl.blitFramebuffer(sx0, sy0, sx1, sy1, sx0 - minx, sy0 - miny, sx1 - minx, sy1 - miny, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(sx0, sy0, sx1 - sx0, sy1 - sy0);
    g.run(this.P.stamp, {
      uTmp: this.tmp, uOrigin: [minx, miny], uS: S, uA: [ax, ay], uB: [bx, by], uRA: r0 * k, uRB: r1 * k,
      uInk: ink, uAmt: amt, uNoise: noiseK, uSeed: Math.random() * 40,
    }, this.paint);
    gl.disable(gl.SCISSOR_TEST);
    this.markColor(x1, y1, Math.max(r0, r1), ink);
  }

  markColor(x, y, r, ink) {
    const c0 = Math.max(0, Math.floor((x - r) / CELL)), c1 = Math.min(this.cw - 1, Math.floor((x + r) / CELL));
    const r0 = Math.max(0, Math.floor((y - r) / CELL)), r1 = Math.min(this.ch - 1, Math.floor((y + r) / CELL));
    for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) {
      const o = (j * this.cw + i) * 4;
      this.cmap[o] = ink[0]; this.cmap[o + 1] = ink[1]; this.cmap[o + 2] = ink[2]; this.cmap[o + 3] = 1;
    }
  }

  colorAt(x, y) {
    const i = Math.floor(x / CELL), j = Math.floor(y / CELL);
    if (i < 0 || j < 0 || i >= this.cw || j >= this.ch) return null;
    const o = (j * this.cw + i) * 4;
    return this.cmap[o + 3] ? [this.cmap[o], this.cmap[o + 1], this.cmap[o + 2]] : null;
  }

  // ---------- Касания ----------

  freshInk() {
    const c = PAINTS[this.colorIdx].map((v) => clamp(v + rnd(-0.03, 0.03), 0.03, 1));
    this.colorIdx = (this.colorIdx + 1) % PAINTS.length;
    return absorb(c).map((v) => v * 1.1);
  }

  /** Клякса: сразу планируем 1–3 подтёка в разных местах нижнего края. */
  addBlob(x, y, r, ink, { count = null, small = false } = {}) {
    const b = { x, y, r, r0: r, ink, held: false, small, spots: [], plan: [] };
    const n = count != null ? count : 1 + Math.floor(Math.random() * 2.6);
    for (let i = 0; i < n; i++) b.plan.push(this.time + rnd(0.15, 1.2));
    this.blobs.push(b);
    if (!small) this.stamp(x, y, r, x, y, r, ink, 0.55, 0.35);
    return b;
  }

  onDown(p) {
    const ink = this.freshInk();
    const b = this.addBlob(p.x, p.y, this.u * rnd(0.034, 0.048), ink);
    b.held = true;
    b.heldT = 0;
    p.data.b = b;
    p.data.ink = ink;
    p.data.last = { x: p.x, y: p.y };
    const pan = panFor(p.x, this.stage.w);
    noise({ dur: 0.16, gain: 0.22, type: 'lowpass', freq: 1400, to: 300, q: 0.8, pan, wet: 0.4 });
    tone({ freq: 160, to: 90, dur: 0.12, type: 'sine', gain: 0.22, attack: 0.003, pan, wet: 0.3 });
    haptic(1);
  }

  onMove(p) {
    const l = p.data.last;
    const step = this.u * 0.02;
    const d = Math.hypot(p.x - l.x, p.y - l.y);
    if (d < step) return;
    if (p.data.b) { p.data.b.held = false; p.data.b = null; }
    const r = this.u * 0.016;
    // мазок — лента краски; на ней в случайных местах (не слишком тесно) рождаются подтёки
    this.stamp(l.x, l.y, r, p.x, p.y, r, p.data.ink, 0.5);
    p.data.dist = (p.data.dist || 0) + d;
    if (p.data.dist > this.u * rnd(0.07, 0.16)) {
      p.data.dist = 0;
      const k = Math.random();
      this.addBlob(l.x + (p.x - l.x) * k, l.y + (p.y - l.y) * k, r, p.data.ink, { count: 1, small: true });
    }
    p.data.last = { x: p.x, y: p.y };
    if (Math.random() < 0.3) noise({ dur: 0.08, gain: 0.05, type: 'bandpass', freq: 900, q: 1, pan: panFor(p.x, this.stage.w), wet: 0.2 });
  }

  onUp(p) {
    if (p.data.b) p.data.b.held = false;
  }

  // ---------- Капли ----------

  spawnHead(b) {
    if (this.heads.length >= MAX_HEADS) return;
    // ширина подтёка задаётся при рождении (зависит от размера кляксы) и почти не меняется
    const w0 = clamp(b.r * (b.small ? rnd(0.38, 0.55) : rnd(0.14, 0.23)), 2.2, this.u * 0.014);
    // место — по всему нижнему краю, не ближе 2.5 ширин к соседнему подтёку этой кляксы
    let off = 0;
    for (let tries = 0; tries < 8; tries++) {
      off = rnd(-0.72, 0.72);
      const x = b.x + off * b.r;
      if (b.spots.every((sx) => Math.abs(sx - x) > w0 * 2.5)) break;
    }
    const x = b.x + off * b.r;
    b.spots.push(x);
    // стартуем чуть ВНУТРИ кляксы — начало подтёка спрятано под ней, без «шишек»
    const y = b.y + b.r * Math.sqrt(Math.max(0, 1 - off * off)) * 0.72;
    // запас краски определяет длину: обычно 1–4 размера кляксы, иногда длиннее
    const len = b.r0 * (Math.random() < 0.15 ? rnd(4, 7) : rnd(1.2, 4)) * (b.small ? 1.4 : 1) * (1 + (b.heldT || 0) * 0.4);
    const v0 = len;
    this.heads.push({ x, y, px: x, py: y, v: v0, v0, w0, vy: 0, ink: b.ink.slice(), seed: rnd(0, 100), base: b.r, run: 0 });
  }

  /** Ширина следа: почти постоянная, к концу самую малость тоньше. */
  width(h) { return h.w0 * (0.82 + 0.18 * clamp(h.v / h.v0, 0, 1)); }

  update(dt) {
    this.time += dt;
    dt = Math.min(dt, 1 / 30);
    const u = this.u;

    // кляксы: по плану рождают подтёки; удержание — клякса растёт и даёт новые
    for (const b of this.blobs) {
      if (b.held) {
        b.heldT += dt;
        const nr = Math.min(b.r0 * 1.7, b.r + u * 0.02 * dt);
        if (nr - b.r > 0.6) { b.r = nr; this.stamp(b.x, b.y, b.r, b.x, b.y, b.r, b.ink, 0.55, 0.35); }
        if (b.plan.length < 2 && b.spots.length < 7) b.plan.push(this.time + rnd(0.4, 0.9));
      }
      while (b.plan.length && b.plan[0] <= this.time) { b.plan.shift(); this.spawnHead(b); }
    }
    this.blobs = this.blobs.filter((b) => b.held || b.plan.length);

    // бегущие капли: быстро в начале, замедляются по мере расхода краски
    for (const h of this.heads) {
      const w = this.width(h);
      const fill = clamp(h.v / h.v0, 0, 1);
      const target = u * (0.05 + 0.3 * Math.pow(fill, 0.8));
      h.vy += (target - h.vy) * Math.min(1, dt * 4);
      const dy = Math.min(h.vy * dt, h.v);
      // почти прямо вниз, с лёгкой индивидуальной извилистостью
      const wob = (Math.sin(h.y * 0.03 + h.seed) + Math.sin(h.y * 0.011 + h.seed * 2.1) * 0.6) * 0.08;
      h.px = h.x; h.py = h.y;
      h.x += wob * dy;
      h.y += dy;
      h.v -= dy;
      // подхват цвета: бежим по чужой краске — понемногу перенимаем её цвет
      const c = this.colorAt(h.x, h.y + w * 2);
      if (c) for (let i = 0; i < 3; i++) h.ink[i] += (c[i] - h.ink[i]) * Math.min(1, dt * 1.2);
      // плавное расширение у основания — краска «стекает» с кляксы, а не торчит палочкой
      h.run += dy;
      const k = Math.max(0, 1 - h.run / (h.base * 0.9));
      const wNow = w * (1 + 0.9 * k * k);
      this.stamp(h.px, h.py, h.lastW || wNow, h.x, h.y, wNow, h.ink, 0.42);
      h.lastW = wNow;
    }

    // слияние соседних капель
    for (let i = 0; i < this.heads.length; i++) for (let j = i + 1; j < this.heads.length; j++) {
      const a = this.heads[i], b = this.heads[j];
      if (a.dead || b.dead) continue;
      const wa = this.width(a), wb = this.width(b);
      if (Math.abs(a.x - b.x) < (wa + wb) * 0.8 && Math.abs(a.y - b.y) < (wa + wb) * 2) {
        const [big, small] = a.v >= b.v ? [a, b] : [b, a];
        const t = small.v / (big.v + small.v + 1e-3);
        for (let k = 0; k < 3; k++) big.ink[k] += (small.ink[k] - big.ink[k]) * t;
        big.v += small.v * 0.7;
        big.v0 = Math.max(big.v0, big.v);
        big.w0 = Math.min(u * 0.016, Math.hypot(big.w0, small.w0 * 0.6));
        big.y = Math.max(big.y, small.y);
        small.dead = true;
      }
    }

    // остановилась или ушла за край — оставляем каплю-бусину и «кап»
    for (const h of this.heads) {
      if (h.dead) continue;
      if (h.v <= 0.5 || h.y > this.stage.h + 20) {
        if (h.y <= this.stage.h) {
          const rb = this.width(h) * 1.5;
          this.stamp(h.x, h.y - rb * 0.3, this.width(h), h.x, h.y + rb * 0.25, rb, h.ink, 0.6);
          const f = rnd(800, 1400);
          tone({ freq: f, to: f * 1.6, dur: 0.06, type: 'sine', gain: 0.07, attack: 0.003, pan: panFor(h.x, this.stage.w), wet: 0.8 });
        }
        h.dead = true;
      }
    }
    this.heads = this.heads.filter((h) => !h.dead);
  }

  erase() {
    this.g.clear(this.paint);
    this.heads = [];
    this.blobs = [];
    this.cmap.fill(0);
    noise({ dur: 0.7, gain: 0.14, type: 'bandpass', freq: 600, to: 2500, q: 0.7, wet: 0.8 });
  }

  resize(prev, next) {
    const s = Math.min(next.w / prev.w, next.h / prev.h);
    const sw = (prev.w * s) / next.w, sh = (prev.h * s) / next.h;
    const ox = (next.w - prev.w * s) / 2, oy = (next.h - prev.h * s) / 2;
    for (const o of [...this.heads, ...this.blobs]) { o.x = o.x * s + ox; o.y = o.y * s + oy; if (o.r) { o.r *= s; o.r0 *= s; } }
    this.build(true, [(1 - sw) / 2, (1 - sh) / 2, sw, sh]);
  }

  draw() {
    const { width, height } = this.stage.canvas;
    const bead = new Float32Array(MAX_HEADS * 4), bink = new Float32Array(MAX_HEADS * 4);
    const k = this.k;
    this.heads.forEach((h, i) => {
      const rb = this.width(h) * 1.4;
      bead.set([h.x * k, height - (h.y + rb * 0.15) * k, rb * k, 0], i * 4);
      bink.set([h.ink[0], h.ink[1], h.ink[2], 0], i * 4);
    });
    this.g.run(this.P.display, {
      uP: this.paint, uT: this.paint.texel, uRes: [width, height],
      uN: { i: this.heads.length }, uBead: bead, uBeadInk: bink,
    }, null, width, height);
  }

  destroy() { this.g.destroy(); }
}
