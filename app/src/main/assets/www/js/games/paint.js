// Краски — акварель. Белая бумага.
// Тап → капля растекается с неровным краем и тёмной каймой, как настоящая акварель.
// Цвета смешиваются как краски (жёлтый + синий = зелёный): храним не цвет, а «плотность пигмента»
// и смешиваем её в логарифмическом пространстве — это даёт вычитательное смешение, как на бумаге.
// Удержание → капля растёт. Каждые ~50 капель меняется цвет. Старые капли не пропадают.
import { tone, pentaFreq, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const MAXD = 40;          // сколько капель одновременно «сохнут»
const rnd = (a, b) => a + Math.random() * (b - a);

// Палитра акварели (цвет на белой бумаге). Плотность пигмента = -ln(цвет).
const PALETTE = [
  [1.0, 0.84, 0.12],   // жёлтый
  [0.13, 0.42, 0.92],  // синий
  [0.93, 0.18, 0.24],  // красный
  [0.28, 0.74, 0.32],  // зелёный
  [1.0, 0.55, 0.12],   // оранжевый
  [0.55, 0.28, 0.82],  // фиолетовый
  [1.0, 0.45, 0.68],   // розовый
  [0.08, 0.68, 0.74],  // бирюзовый
];
const absorb = (c) => c.map((v) => -Math.log(Math.max(0.03, v)));

const VS = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Общий код: шум и наложение капель.
const COMMON = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uPaint;
uniform vec2 uRes;
uniform int uCount;
uniform vec4 uDrop[${MAXD}];   // x, y, радиус (в пикселях текстуры), «высыхание» 0..1
uniform vec4 uCol[${MAXD}];    // плотность пигмента rgb, зерно (seed)
out vec4 outColor;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }

vec3 applyDrops(vec3 D, vec2 px) {
  for (int i = 0; i < ${MAXD}; i++) {
    if (i >= uCount) break;
    vec4 d = uDrop[i];
    vec2 p = px - d.xy;
    float r = d.z;
    if (abs(p.x) > r * 1.4 || abs(p.y) > r * 1.4) continue;
    float seed = uCol[i].w;
    float dist = length(p);
    vec2 dir = p / max(dist, 1e-3);
    // неровный «акварельный» край: шум по углу + шум по месту
    float n1 = fbm(dir * 1.7 + seed * 13.1);
    float n2 = fbm(px / max(r * 0.55, 4.0) + seed * 7.7);
    float R = r * (0.78 + 0.3 * n1) * (0.9 + 0.2 * n2);
    float soft = max(1.2, r * 0.035);
    float inside = 1.0 - smoothstep(R - soft, R, dist);
    if (inside <= 0.0) continue;
    // пигмент собирается к краю — тёмная кайма
    float rim = smoothstep(R * 0.55, R - soft * 0.5, dist);
    float gran = 0.86 + 0.28 * vnoise(px * 0.35 + seed * 3.0);   // зернистость бумаги
    float bloom = 0.85 + 0.3 * fbm(px / max(r * 0.35, 3.0) + seed); // разводы внутри
    float dens = inside * (0.5 + 0.55 * rim) * gran * bloom;
    float wet = 1.0 - d.w;                 // мокрая краска чуть насыщеннее
    float a = clamp(dens * (0.62 + 0.12 * wet), 0.0, 1.0);
    D = mix(D, uCol[i].rgb, a) + uCol[i].rgb * a * 0.06;
  }
  return D;
}
`;

// Показ на экран: плотность → цвет на белой бумаге.
const FS_SHOW = COMMON + `
void main() {
  vec2 px = vUv * uRes;
  vec3 D = texture(uPaint, vUv).rgb * 4.0;
  D = applyDrops(D, px);
  outColor = vec4(exp(-D), 1.0);  // чистый белый фон
}`;

// Впитывание высохших капель в бумагу (в текстуру).
const FS_COMMIT = COMMON + `
void main() {
  vec2 px = vUv * uRes;
  vec3 D = texture(uPaint, vUv).rgb * 4.0;
  D = applyDrops(D, px);
  outColor = vec4(clamp(D / 4.0, 0.0, 1.0), 1.0);
}`;

// Перенос старого рисунка при смене размера экрана (Fold).
const FS_COPY = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uPaint;
uniform vec4 uMap; // смещение и масштаб uv
out vec4 outColor;
void main() {
  vec2 uv = (vUv - uMap.xy) / uMap.zw;
  outColor = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? vec4(0.0, 0.0, 0.0, 1.0) : texture(uPaint, uv);
}`;

export default class PaintGame {
  static volume = 0.9;       // выравнивание громкости между играми (tools/audit.js)
  static erasable = true;
  static background = '#FFFFFF';
  static webgl = true;
  static maxDpr = 2.5;

  constructor(stage) {
    this.stage = stage;
    this.drops = [];
    this.count = 0;
    this.time = 0;
    this.colorIdx = 0;
    this.ok = this.initGL();
  }

  get u() { return this.stage.unit; }

  // ---------- WebGL ----------

  initGL() {
    const gl = this.stage.canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false, desynchronized: true });
    if (!gl) return false;
    this.gl = gl;
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.progShow = this.program(FS_SHOW);
    this.progCommit = this.program(FS_COMMIT);
    this.progCopy = this.program(FS_COPY);
    this.makeTargets();
    this.stage.canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
    return true;
  }

  program(fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const loc = {};
    for (const n of ['uPaint', 'uRes', 'uCount', 'uDrop', 'uCol', 'uMap']) loc[n] = gl.getUniformLocation(p, n);
    return { p, loc };
  }

  target(w, h) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb, w, h };
  }

  makeTargets() {
    const { width, height } = this.stage.canvas;
    this.A = this.target(width, height);
    this.B = this.target(width, height);
  }

  /** Передаёт капли в шейдер. */
  setDrops(prog, list) {
    const gl = this.gl;
    const k = this.stage.canvas.width / this.stage.w; // CSS-пиксели → пиксели текстуры
    const H = this.stage.canvas.height;
    const dv = new Float32Array(MAXD * 4), cv = new Float32Array(MAXD * 4);
    list.forEach((d, i) => {
      dv.set([d.x * k, H - d.y * k, d.r * k, d.dry], i * 4);
      cv.set([d.A[0], d.A[1], d.A[2], d.seed], i * 4);
    });
    gl.uniform1i(prog.loc.uCount, list.length);
    gl.uniform4fv(prog.loc.uDrop, dv);
    gl.uniform4fv(prog.loc.uCol, cv);
  }

  pass(prog, src, dstFb, w, h, drops) {
    const gl = this.gl;
    gl.useProgram(prog.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dstFb);
    gl.viewport(0, 0, w, h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(prog.loc.uPaint, 0);
    gl.uniform2f(prog.loc.uRes, w, h);
    if (drops) this.setDrops(prog, drops);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Высохшие капли впитываются в бумагу навсегда. */
  commit(list) {
    if (!list.length) return;
    this.pass(this.progCommit, this.A, this.B.fb, this.B.w, this.B.h, list);
    [this.A, this.B] = [this.B, this.A];
  }

  // ---------- Капли ----------

  pickColor() {
    if (this.count > 0 && this.count % 50 === 0) this.colorIdx = (this.colorIdx + 1) % PALETTE.length;
    const base = PALETTE[this.colorIdx];
    // лёгкий разброс оттенка — живее
    const c = base.map((v) => Math.min(1, Math.max(0.03, v + rnd(-0.05, 0.05))));
    return absorb(c);
  }

  addDrop(x, y, held = null) {
    if (this.drops.length >= MAXD) {
      // слишком много мокрых капель — самую старую сразу «досушиваем»
      const old = this.drops.shift();
      old.r = old.rT; old.dry = 1;
      this.commit([old]);
    }
    const rT = this.u * rnd(0.045, 0.075);
    const d = { x, y, r: rT * 0.25, rT, A: this.pickColor(), seed: Math.random() * 100, t: 0, dry: 0, held };
    this.drops.push(d);
    this.count++;
    return d;
  }

  sound(x, y, big = false) {
    const step = Math.round((1 - y / this.stage.h) * 12);
    const f = pentaFreq(step, 293.66);
    const pan = panFor(x, this.stage.w);
    // «кап» + мягкая маримба
    tone({ freq: 900, to: 1900, dur: 0.05, type: 'sine', gain: 0.07, attack: 0.002, pan, wet: 0.3 });
    tone({ freq: f, dur: big ? 0.9 : 0.6, type: 'sine', gain: 0.2, attack: 0.004, release: big ? 0.85 : 0.55, pan, wet: 1 });
    tone({ freq: f * 4, dur: 0.12, type: 'sine', gain: 0.03, attack: 0.002, pan, wet: 0.6 });
  }

  // ---------- Касания ----------

  onDown(p) {
    const d = this.addDrop(p.x, p.y, p.id);
    p.data.d = d;
    p.data.last = { x: p.x, y: p.y };
    this.sound(p.x, p.y);
    haptic(0);
  }

  onMove(p) {
    // проведение пальцем оставляет цепочку капель
    const l = p.data.last;
    const step = this.u * 0.05;
    if (Math.hypot(p.x - l.x, p.y - l.y) < step) return;
    if (p.data.d) { p.data.d.held = null; p.data.d = null; }
    const d = this.addDrop(p.x, p.y);
    d.rT *= 0.75;
    p.data.last = { x: p.x, y: p.y };
    if (this.count % 3 === 0) { this.sound(p.x, p.y); haptic(0); }
  }

  onUp(p) {
    if (p.data.d) p.data.d.held = null;
  }

  erase() {
    const gl = this.gl;
    if (!gl) return;
    this.drops = [];
    for (const t of [this.A, this.B]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    tone({ freq: 500, to: 1500, dur: 0.4, type: 'sine', gain: 0.12, pan: 0, wet: 1 });
  }

  // ---------- Время ----------

  update(dt) {
    this.time += dt;
    const u = this.u;
    const done = [];
    for (const d of this.drops) {
      d.t += dt;
      if (d.held != null) {
        // удержание: капля растёт
        if (d.t > 0.2) d.rT = Math.min(u * 0.32, d.rT + u * 0.09 * dt);
        if (Math.floor(d.t * 3) !== Math.floor((d.t - dt) * 3) && d.t > 0.3) haptic(0);
      }
      d.r += (d.rT - d.r) * Math.min(1, dt * 3.2);
      const settled = d.held == null && Math.abs(d.rT - d.r) < 0.6 && d.t > 0.9;
      if (settled) d.dry = Math.min(1, d.dry + dt / 0.9);
      if (d.dry >= 1) { d.r = d.rT; done.push(d); }
    }
    if (done.length) {
      this.commit(done);
      this.drops = this.drops.filter((d) => !done.includes(d));
    }
  }

  // ---------- Fold ----------

  resize(prev, next) {
    if (!this.gl) return;
    const gl = this.gl;
    const old = this.A, oldB = this.B;
    this.makeTargets();
    // старый рисунок переносим без искажений: равный масштаб, по центру
    const s = Math.min(next.w / prev.w, next.h / prev.h);
    const sw = (prev.w * s) / next.w, sh = (prev.h * s) / next.h;
    gl.useProgram(this.progCopy.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.A.fb);
    gl.viewport(0, 0, this.A.w, this.A.h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, old.tex);
    gl.uniform1i(this.progCopy.loc.uPaint, 0);
    gl.uniform4f(this.progCopy.loc.uMap, (1 - sw) / 2, (1 - sh) / 2, sw, sh);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    for (const t of [old, oldB]) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }
    const ox = (next.w - prev.w * s) / 2, oy = (next.h - prev.h * s) / 2;
    for (const d of this.drops) { d.x = d.x * s + ox; d.y = d.y * s + oy; d.r *= s; d.rT *= s; }
  }

  draw() {
    if (!this.gl) return;
    const { width, height } = this.stage.canvas;
    this.pass(this.progShow, this.A, null, width, height, this.drops);
  }

  destroy() {
    const gl = this.gl;
    if (!gl) return;
    for (const t of [this.A, this.B]) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  }
}
