// Салют. Тёмно-синее небо с лёгким градиентом.
// Тап → снизу вылетает ракета, долетает до места касания и БАБАХ — разноцветный салют.
// Держишь палец — ракета подлетает и «прилипает» к пальцу: её можно водить и крутить.
// Отпустил на ходу — ракета летит дальше сама, как камень в кёрлинге: по инерции, понемногу замедляясь,
// отскакивает от краёв экрана и взрывается, когда выдохлась (или через несколько секунд).
// Бывают фигурные: сердечко, звезда, цыплёнок. Звук — весёлые хлопки и «бабахи» с треском.
import { tone, noise, chime, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const PALETTES = [
  ['#FF6B6B', '#FFD43B', '#FFA94D'],
  ['#4DABF7', '#74C0FC', '#E7F5FF'],
  ['#69DB7C', '#FFE066', '#C0EB75'],
  ['#F783AC', '#E599F7', '#FFDEEB'],
  ['#FFD43B', '#FFFFFF', '#FFE8A3'],
  ['#9775FA', '#4DABF7', '#F783AC'],
];
const MAX_PARTICLES = 3500;

// Контуры фигур (точки на единичном масштабе).
function heartPts(n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([16 * Math.sin(t) ** 3 / 17, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]);
  }
  return pts;
}
function starPts(n) {
  const v = [];
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.42 : 1; const a = -Math.PI / 2 + (i * Math.PI) / 5; v.push([Math.cos(a) * r, Math.sin(a) * r]); }
  return sample(v, n);
}
function chickPts(n) {
  // тельце + голова + клювик + хвостик
  const pts = [];
  const circ = (cx, cy, r, from, to, k) => { for (let i = 0; i < k; i++) { const a = from + (to - from) * (i / k); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  circ(-0.1, 0.25, 0.62, -0.2, Math.PI * 1.75, Math.round(n * 0.5));
  circ(0.35, -0.42, 0.36, -Math.PI * 1.1, Math.PI * 0.35, Math.round(n * 0.3));
  for (let i = 0; i < n * 0.1; i++) { const k = i / (n * 0.1); pts.push([0.7 + k * 0.25, -0.45 + k * 0.08], [0.7 + k * 0.25, -0.3 - k * 0.07]); }
  return pts;
}
function sample(poly, n) {
  const segs = poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);
  const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
  const total = lens.reduce((s, l) => s + l, 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    let d = (i / n) * total, j = 0;
    while (d > lens[j]) { d -= lens[j]; j++; }
    const [a, b] = segs[j], k = d / lens[j];
    out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
  }
  return out;
}

export default class FireworksGame {
  static volume = 0.7;       // выравнивание громкости между играми (tools/audit.js)
  static erasable = false;
  static background = '#0B1640';

  constructor(stage) {
    this.stage = stage;
    this.rockets = [];
    this.parts = [];
    this.flashes = [];
    this.time = 0;
    this.crackles = [];
  }

  get u() { return this.stage.unit; }
  pan(x) { return panFor(x, this.stage.w); }

  // ---------- Ракета ----------

  launch(p) {
    const { h } = this.stage;
    const r = {
      x: p.x + rnd(-1, 1) * this.u * 0.05, y: h + 10, vx: 0, vy: -this.u * 1.6,
      tx: p.x, ty: p.y, held: p.id, state: 'fly', t: 0, t0: this.time, bounces: 0,
      palette: pick(PALETTES), trail: [],
    };
    this.rockets.push(r);
    // свист взлёта
    tone({ freq: 500, to: 1800, dur: 0.7, type: 'sine', gain: 0.07, attack: 0.02, pan: this.pan(r.x), wet: 0.8, curve: 'lin' });
    noise({ dur: 0.5, gain: 0.05, type: 'bandpass', freq: 1500, to: 4000, q: 1, pan: this.pan(r.x), wet: 0.5 });
    haptic(0);
    return r;
  }

  onDown(p) {
    if (this.rockets.length > 10) return;
    p.data.r = this.launch(p);
  }

  onMove(p) {
    const r = p.data.r;
    if (r && r.held === p.id) { r.tx = p.x; r.ty = p.y; }
  }

  onUp(p) {
    const r = p.data.r;
    if (!r || r.held !== p.id) return;
    r.held = null;
    const quick = this.time - r.t0 < 0.3 && !p.moved;
    if (r.state === 'fly' && quick) return;          // просто тап: долетит до точки и взорвётся
    // бросок: ракета получает скорость пальца (если была у пальца) или летит с той, что есть
    if (r.state === 'drag') {
      const max = this.u * 4.5;
      let vx = p.vx || 0, vy = p.vy || 0;
      const v = Math.hypot(vx, vy);
      if (v > max) { vx *= max / v; vy *= max / v; }
      r.vx = vx; r.vy = vy;
    }
    r.state = 'free'; r.t = 0;
  }

  updateRocket(r, dt) {
    r.t += dt;
    const { w, h } = this.stage;
    const sp = this.u * 1.5;
    if (r.state === 'fly') {
      // летим к цели: к пальцу или к месту тапа
      const dx = r.tx - r.x, dy = r.ty - r.y, d = Math.hypot(dx, dy) || 1;
      const want = { x: (dx / d) * sp, y: (dy / d) * sp };
      r.vx += (want.x - r.vx) * Math.min(1, dt * 6);
      r.vy += (want.y - r.vy) * Math.min(1, dt * 6);
      if (r.held != null && d < this.u * 0.06) { r.state = 'drag'; r.t = 0; }       // долетела до пальца — «прилипла»
      else if (r.held == null && (d < this.u * 0.06 || r.t > 2.2)) { this.explode(r); r.dead = true; return; }
    } else if (r.state === 'drag') {
      // у пальца: идёт за ним плотно, без кружения; скорость — по реальному движению
      const nx = r.x + (r.tx - r.x) * Math.min(1, dt * 22);
      const ny = r.y + (r.ty - r.y) * Math.min(1, dt * 22);
      r.vx = (nx - r.x) / Math.max(dt, 1e-3); r.vy = (ny - r.y) / Math.max(dt, 1e-3);
      r.x = nx; r.y = ny;
      this.sparks(r, Math.hypot(r.vx, r.vy) > this.u * 0.3 ? 3 : 1);
      return;
    } else if (r.state === 'free') {
      // свободный полёт: инерция и лёгкое торможение
      const k = Math.exp(-0.75 * dt);
      r.vx *= k; r.vy *= k;
      const m = this.u * 0.03;
      let hit = false;
      if (r.x < m && r.vx < 0) { r.x = m; r.vx = -r.vx * 0.85; hit = true; }
      if (r.x > w - m && r.vx > 0) { r.x = w - m; r.vx = -r.vx * 0.85; hit = true; }
      if (r.y < m && r.vy < 0) { r.y = m; r.vy = -r.vy * 0.85; hit = true; }
      if (r.y > h - m && r.vy > 0) { r.y = h - m; r.vy = -r.vy * 0.85; hit = true; }
      if (hit) this.bounce(r);
      const v = Math.hypot(r.vx, r.vy);
      if ((v < this.u * 0.35 && r.t > 0.25) || r.t > 4 || r.bounces > 5) { this.explode(r); r.dead = true; return; }
    }
    r.x += r.vx * dt; r.y += r.vy * dt;
    this.sparks(r, 3);
  }

  /** Искры за ракетой. */
  sparks(r, n) {
    for (let i = 0; i < n; i++) {
      this.parts.push({ x: r.x, y: r.y, vx: -r.vx * 0.15 + rnd(-40, 40), vy: -r.vy * 0.15 + rnd(-40, 40) + this.u * 0.1, life: 0, max: rnd(0.25, 0.55), c: Math.random() < 0.5 ? '#FFE8A3' : r.palette[0], r: this.u * 0.004, drag: 3, g: this.u * 0.3 });
    }
  }

  /** Отскок от края: «дзинь», вспышка искр. */
  bounce(r) {
    r.bounces++;
    const p = this.pan(r.x);
    tone({ freq: rnd(900, 1200), to: rnd(1500, 1800), dur: 0.09, type: 'triangle', gain: 0.06, attack: 0.002, pan: p, wet: 0.6 });
    noise({ dur: 0.05, gain: 0.05, type: 'bandpass', freq: 3500, q: 2, pan: p, wet: 0.4 });
    for (let i = 0; i < 14; i++) {
      const a = rnd(0, Math.PI * 2), s = this.u * rnd(0.2, 0.6);
      this.parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rnd(0.2, 0.4), c: '#FFF3BF', r: this.u * 0.004, drag: 4, g: this.u * 0.2 });
    }
    haptic(0);
  }

  // ---------- Взрыв ----------

  explode(r) {
    const { x, y } = r;
    const u = this.u;
    const kind = Math.random() < 0.65 ? pick(['ball', 'ball', 'ring', 'willow', 'glitter']) : pick(['heart', 'star', 'chick']);
    const pal = r.palette;
    const size = u * rnd(0.28, 0.4);
    const add = (vx, vy, c, extra = {}) => {
      if (this.parts.length > MAX_PARTICLES) return;
      this.parts.push({ x, y, vx, vy, life: 0, max: rnd(1.1, 1.8), c, r: u * rnd(0.005, 0.008), drag: 1.6, g: u * 0.22, ...extra });
    };
    if (kind === 'heart' || kind === 'star' || kind === 'chick') {
      const pts = kind === 'heart' ? heartPts(90) : kind === 'star' ? starPts(90) : chickPts(100);
      const c = kind === 'heart' ? '#FF6B8A' : kind === 'chick' ? '#FFD43B' : pick(pal);
      for (const [px, py] of pts) add(px * size * 1.6, py * size * 1.6, c, { drag: 2.2, g: u * 0.08, max: rnd(1.4, 1.9) });
      // глазик цыплёнку
      if (kind === 'chick') add(0.35 * size * 1.6, -0.5 * size * 1.6, '#FFFFFF', { drag: 2.2, g: u * 0.08, max: 1.8 });
    } else {
      const n = kind === 'glitter' ? 120 : 140;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd(-0.05, 0.05);
        const s = kind === 'ring' ? size * 1.9 : size * rnd(0.6, 2.0);
        const extra = kind === 'willow' ? { drag: 1.0, g: u * 0.45, max: rnd(1.8, 2.5), r: u * 0.004 } : kind === 'glitter' ? { glitter: true } : {};
        add(Math.cos(a) * s, Math.sin(a) * s, pick(pal), extra);
      }
    }
    this.flashes.push({ x, y, t: 0, c: pal[0] });
    this.boom(x, kind);
    haptic(2);
  }

  /** «Бабах» + потрескивание. */
  boom(x, kind) {
    const p = this.pan(x);
    const big = rnd(0.8, 1.1);
    tone({ freq: 140 * big, to: 38, dur: 0.5, type: 'sine', gain: 0.8, attack: 0.003, release: 0.4, pan: p, wet: 0.7 });
    noise({ dur: 1.0, gain: 0.55, type: 'lowpass', freq: 2600, to: 180, q: 0.7, attack: 0.002, pan: p, wet: 1 });
    noise({ dur: 0.06, gain: 0.4, type: 'highpass', freq: 2500, attack: 0.001, pan: p, wet: 0.5 });
    // треск искр
    const n = kind === 'glitter' ? 22 : 12;
    for (let i = 0; i < n; i++) {
      noise({ dur: 0.02, gain: rnd(0.05, 0.12), type: 'bandpass', freq: rnd(3000, 7000), q: 3, at: 0.35 + rnd(0, 1.0), pan: p + rnd(-0.2, 0.2), wet: 0.6 });
    }
    if (kind === 'heart' || kind === 'star' || kind === 'chick') {
      [1046.5, 1318.5, 1568, 2093].forEach((f, i) => chime(f, { gain: 0.06, dur: 1.0, at: 0.25 + i * 0.07, pan: p }));
    }
  }

  // ---------- Время ----------

  update(dt) {
    this.time += dt;
    for (const r of this.rockets) this.updateRocket(r, dt);
    this.rockets = this.rockets.filter((r) => !r.dead);
    for (const q of this.parts) {
      q.life += dt;
      q.vx *= 1 - Math.min(1, dt * q.drag);
      q.vy = q.vy * (1 - Math.min(1, dt * q.drag)) + q.g * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
    }
    this.parts = this.parts.filter((q) => q.life < q.max);
    for (const f of this.flashes) f.t += dt;
    this.flashes = this.flashes.filter((f) => f.t < 0.35);
  }

  resize(prev, next) {
    const sx = next.w / prev.w, sy = next.h / prev.h;
    for (const r of this.rockets) { r.x *= sx; r.y *= sy; r.tx *= sx; r.ty *= sy; }
    this.parts = [];
  }

  draw(ctx) {
    const { w, h } = this.stage;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0A1238');
    g.addColorStop(0.7, '#1A215B');
    g.addColorStop(1, '#33296E');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flashes) {
      const k = 1 - f.t / 0.35;
      const rg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, this.u * 0.5);
      rg.addColorStop(0, `rgba(255,240,210,${0.45 * k})`);
      rg.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(f.x - this.u * 0.5, f.y - this.u * 0.5, this.u, this.u);
    }
    for (const q of this.parts) {
      let a = 1 - q.life / q.max;
      if (q.glitter && q.life > 0.4) a *= Math.random() < 0.5 ? 1 : 0.15;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = q.c;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r * (0.6 + 0.4 * a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // головки ракет
    for (const r of this.rockets) {
      ctx.fillStyle = '#FFF3BF';
      ctx.beginPath(); ctx.arc(r.x, r.y, this.u * 0.011, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  destroy() {}
}
