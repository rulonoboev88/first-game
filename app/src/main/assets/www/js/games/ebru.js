// Эбру — мраморирование на воде. Краска плавает тонкой плёнкой и не размывается.
// Тап → капля растекается кругом и раздвигает всю краску вокруг (кольца внутри колец).
// Удержание → капля продолжает расти. Проведение пальцем → «гребёнка»: краска тянется за пальцем завитками.
//
// Математика — как в «математическом мраморировании» (Lu, Jaffer и др.): каждая капля — замкнутый контур,
// капля радиуса r в точке C переносит точку P в C + (P−C)·√(1 + r²/|P−C|²) (площадь сохраняется точно),
// палец сдвигает точки вдоль движения с затуханием по расстоянию до пути пальца. Всё векторное — без потери чёткости.
import { tone, noise, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const PALETTE = ['#E63946', '#F4A261', '#E9C46A', '#2A9D8F', '#457B9D', '#8E5BC2', '#F28482', '#43AA8B', '#1D3557', '#FF7F51'];
const MAX_POINTS = 160000;

function darker(h, k) {
  const n = parseInt(h.slice(1), 16);
  return `rgb(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k))).join(',')})`;
}

export default class EbruGame {
  static erasable = true;
  static background = '#F3EDE1';

  constructor(stage) {
    this.stage = stage;
    this.polys = [];          // { pts: number[] (x0,y0,x1,y1,…), col, edge, bb: [x0,y0,x1,y1] }
    this.growing = null;      // капля, которая сейчас растёт под пальцем
    this.ci = Math.floor(Math.random() * PALETTE.length);
    this.dirty = true;
    this.swishT = 0;
    this.time = 0;
    this.makeGrain();
  }

  get u() { return this.stage.unit; }
  get maxSeg() { return Math.max(2.2, this.u * 0.0035); }
  get minSeg() { return this.maxSeg * 0.3; }

  makeGrain() {
    // лёгкая «вода» в лотке: едва заметное зерно, чтобы фон не был мёртвым
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 60;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 10;
    }
    g.putImageData(img, 0, 0);
    this.grain = c;
  }

  // ---------- Деформации ----------

  /** Капля: прирост квадрата радиуса dr2 в точке (cx, cy) раздвигает всё вокруг. */
  pushDrop(cx, cy, dr2, skip) {
    for (const P of this.polys) {
      if (P === skip) continue;
      const a = P.pts;
      for (let i = 0; i < a.length; i += 2) {
        const dx = a[i] - cx, dy = a[i + 1] - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < 1e-6) continue;
        const k = Math.sqrt(1 + dr2 / d2);
        a[i] = cx + dx * k; a[i + 1] = cy + dy * k;
      }
      this.refine(P);
    }
  }

  /** Палец тянет краску: сдвиг вдоль (mx,my) с затуханием по расстоянию до отрезка A→B. */
  comb(ax, ay, bx, by) {
    const mx = bx - ax, my = by - ay;
    const L = Math.hypot(mx, my);
    if (L < 0.01) return;
    const lam = this.u * 0.03;
    const reach = lam * 6;
    const x0 = Math.min(ax, bx) - reach, x1 = Math.max(ax, bx) + reach;
    const y0 = Math.min(ay, by) - reach, y1 = Math.max(ay, by) + reach;
    const L2 = L * L;
    for (const P of this.polys) {
      const bb = P.bb;
      if (bb[2] < x0 || bb[0] > x1 || bb[3] < y0 || bb[1] > y1) continue;
      const a = P.pts;
      let moved = false;
      for (let i = 0; i < a.length; i += 2) {
        const px = a[i], py = a[i + 1];
        if (px < x0 || px > x1 || py < y0 || py > y1) continue;
        // расстояние до отрезка
        let t = ((px - ax) * mx + (py - ay) * my) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = px - (ax + mx * t), dy = py - (ay + my * t);
        const d = Math.sqrt(dx * dx + dy * dy);
        const f = Math.exp(-d / lam);
        if (f < 0.002) continue;
        a[i] = px + mx * f; a[i + 1] = py + my * f;
        moved = true;
      }
      if (moved) this.refine(P);
    }
  }

  /** Дробим длинные отрезки и убираем лишние точки — контур остаётся гладким и не разрастается. */
  refine(P) {
    const a = P.pts;
    const n = a.length / 2;
    const max = this.maxSeg, min = this.minSeg;
    const W = this.stage.w, H = this.stage.h;
    const out = [];
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = a[i * 2], y = a[i * 2 + 1];
      const j = (i + 1) % n;
      const nx = a[j * 2], ny = a[j * 2 + 1];
      if (out.length >= 2) {
        const lx = out[out.length - 2], ly = out[out.length - 1];
        if (Math.abs(x - lx) + Math.abs(y - ly) < min && i < n - 1) continue;
      }
      out.push(x, y);
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
      // вне экрана точность не нужна — не дробим
      const off = (x < -40 && nx < -40) || (x > W + 40 && nx > W + 40) || (y < -40 && ny < -40) || (y > H + 40 && ny > H + 40);
      const seg = Math.hypot(nx - x, ny - y);
      if (!off && seg > max) {
        const k = Math.min(16, Math.ceil(seg / max));
        for (let s = 1; s < k; s++) out.push(x + ((nx - x) * s) / k, y + ((ny - y) * s) / k);
      }
    }
    P.pts = out;
    P.bb = [bx0, by0, bx1, by1];
  }

  circle(cx, cy, r) {
    const n = clamp(Math.ceil((Math.PI * 2 * r) / this.maxSeg), 24, 2000);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    return pts;
  }

  cull() {
    const { w, h } = this.stage;
    this.polys = this.polys.filter((P) => P === (this.growing && this.growing.P) || !(P.bb[0] > w + 60 || P.bb[2] < -60 || P.bb[1] > h + 60 || P.bb[3] < -60));
    let total = 0;
    for (const P of this.polys) total += P.pts.length / 2;
    // страховка: если краски слишком много — убираем самые старые слои (они уже вытеснены к краям)
    while (total > MAX_POINTS && this.polys.length > 1) total -= this.polys.shift().pts.length / 2;
  }

  // ---------- Касания ----------

  onDown(p) {
    this.finishGrow();
    const col = PALETTE[this.ci % PALETTE.length];
    this.ci++;
    const r0 = this.u * 0.012;
    const P = { pts: this.circle(p.x, p.y, r0), col, edge: darker(col, 0.28), bb: [p.x - r0, p.y - r0, p.x + r0, p.y + r0] };
    this.pushDrop(p.x, p.y, r0 * r0, null);
    this.polys.push(P);
    this.growing = { id: p.id, x: p.x, y: p.y, r: r0, target: this.u * rnd(0.055, 0.075), P, held: 0 };
    p.data.lx = p.x; p.data.ly = p.y;
    this.plink(p.x);
    haptic(1);
    this.dirty = true;
  }

  onMove(p) {
    const g = this.growing;
    if (g && g.id === p.id && !p.moved) return; // палец ещё на месте — капля растёт
    if (g && g.id === p.id) this.finishGrow();
    const lx = p.data.lx ?? p.x, ly = p.data.ly ?? p.y;
    const L = Math.hypot(p.x - lx, p.y - ly);
    if (L < 0.5) return;
    // длинные рывки режем на шаги — завитки получаются плавные
    const step = this.u * 0.012;
    const n = Math.max(1, Math.ceil(L / step));
    let ax = lx, ay = ly;
    for (let i = 1; i <= n; i++) {
      const bx = lx + ((p.x - lx) * i) / n, by = ly + ((p.y - ly) * i) / n;
      this.comb(ax, ay, bx, by);
      ax = bx; ay = by;
    }
    p.data.lx = p.x; p.data.ly = p.y;
    this.swish(p.x, L);
    this.dirty = true;
  }

  onUp(p) {
    if (this.growing && this.growing.id === p.id) this.finishGrow();
  }

  finishGrow() {
    if (!this.growing) return;
    this.growing = null;
    this.cull();
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
    const g = this.growing;
    if (g) {
      g.held += dt;
      // держишь палец — краски прибавляется
      if (g.held > 0.5) g.target = Math.min(this.u * 0.2, g.target + this.u * 0.05 * dt);
      if (g.r < g.target - 0.2) {
        const nr = g.r + (g.target - g.r) * Math.min(1, dt * 7) + this.u * 0.004 * dt;
        const r = Math.min(nr, g.target);
        this.pushDrop(g.x, g.y, r * r - g.r * g.r, g.P);
        g.r = r;
        g.P.pts = this.circle(g.x, g.y, r);
        g.P.bb = [g.x - r, g.y - r, g.x + r, g.y + r];
        this.dirty = true;
      }
    }
  }

  resize(prev, next) {
    const kx = next.w / prev.w, ky = next.h / prev.h;
    for (const P of this.polys) {
      const a = P.pts;
      for (let i = 0; i < a.length; i += 2) { a[i] *= kx; a[i + 1] *= ky; }
      this.refine(P);
    }
    if (this.growing) { this.growing.x *= kx; this.growing.y *= ky; this.growing.r *= Math.min(kx, ky); }
    this.dirty = true;
  }

  erase() {
    this.polys = [];
    this.growing = null;
    this.dirty = true;
  }

  // ---------- Рисование ----------

  draw(ctx) {
    const { w, h } = this.stage;
    // контуры перерисовываем в отдельный слой только когда краска сдвинулась; иначе — просто копируем картинку
    const cw = this.stage.canvas.width, ch = this.stage.canvas.height;
    if (!this.layer) { this.layer = document.createElement('canvas'); this.lctx = this.layer.getContext('2d'); }
    if (this.layer.width !== cw || this.layer.height !== ch) { this.layer.width = cw; this.layer.height = ch; this.dirty = true; }
    if (this.dirty) {
      const L = this.lctx;
      L.setTransform(this.stage.dpr, 0, 0, this.stage.dpr, 0, 0);
      L.fillStyle = EbruGame.background;
      L.fillRect(0, 0, w, h);
      L.lineJoin = 'round';
      const lw = Math.max(1, this.u * 0.0016);
      for (const P of this.polys) {
        const bb = P.bb;
        if (bb[0] > w || bb[2] < 0 || bb[1] > h || bb[3] < 0) continue;
        const a = P.pts;
        L.beginPath();
        L.moveTo(a[0], a[1]);
        for (let i = 2; i < a.length; i += 2) L.lineTo(a[i], a[i + 1]);
        L.closePath();
        L.fillStyle = P.col;
        L.fill();
        // пигмент чуть собирается у края капли — тонкая тёмная кромка, как у настоящего эбру
        L.strokeStyle = P.edge;
        L.globalAlpha = 0.55;
        L.lineWidth = lw;
        L.stroke();
        L.globalAlpha = 1;
      }
      L.fillStyle = L.createPattern(this.grain, 'repeat');
      L.fillRect(0, 0, w, h);
      this.dirty = false;
    }
    ctx.drawImage(this.layer, 0, 0, w, h);
  }

  destroy() {}
}
