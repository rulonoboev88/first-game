// Уточки в ванне. Однотонная вода.
// Резиновые уточки качаются на волнах. Тап по уточке → «пи-ик!» и она сжимается, как резиновая.
// Тап по воде → «плюх», круги по воде, иногда плюхается новая уточка. Проведение пальцем → волны, уточки отплывают.
import { INK } from '../art/chick.js';
import { tone, noise, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const COLORS = [
  { body: '#FFD43B', wing: '#F5C518', beak: '#FF922B' },
  { body: '#FFD43B', wing: '#F5C518', beak: '#FF922B' },
  { body: '#FFA8C5', wing: '#F78DB0', beak: '#FF922B' },
  { body: '#8CE0FF', wing: '#6CCDF2', beak: '#FFA94D' },
  { body: '#A9E34B', wing: '#94D82D', beak: '#FF922B' },
];
const MAX_DUCKS = 16;

const BODY = new Path2D('M8 58 C6 76 26 88 52 88 C78 88 94 76 92 58 C90 48 82 46 74 48 C70 50 62 50 56 46 C46 40 28 42 18 46 C12 40 4 40 4 46 C4 50 6 54 8 58 Z');
const HEAD = new Path2D('M50 40 C44 22 54 8 68 8 C82 8 90 20 86 34 C84 42 76 48 66 48 C58 48 52 46 50 40 Z');
const BEAK = new Path2D('M84 26 C92 24 100 26 100 30 C100 34 92 36 84 34 Z');
const WING = new Path2D('M30 58 C36 48 54 50 60 60 C54 70 36 70 30 58 Z');

export default class DucksGame {
  static erasable = false;
  static background = '#9FDFF5';

  constructor(stage) {
    this.stage = stage;
    this.ducks = [];
    this.ripples = [];
    this.drops = [];
    this.time = 0;
    const { w, h } = stage;
    for (let i = 0; i < 5; i++) this.addDuck(rnd(w * 0.15, w * 0.85), rnd(h * 0.2, h * 0.85), false);
  }

  get u() { return this.stage.unit; }
  get duckSize() { return clamp(this.u * 0.14, 56, 130); }
  pan(x) { return panFor(x, this.stage.w); }

  addDuck(x, y, drop = true) {
    if (this.ducks.length >= MAX_DUCKS) return null;
    const baby = Math.random() < 0.3;
    const d = {
      x, y, vx: rnd(-1, 1) * this.u * 0.03, vy: rnd(-1, 1) * this.u * 0.02,
      size: this.duckSize * (baby ? 0.65 : rnd(0.9, 1.1)), c: COLORS[Math.floor(Math.random() * COLORS.length)],
      flip: Math.random() < 0.5, ph: rnd(0, 6), squish: 0, born: this.time, drop: drop ? 1 : 0, spin: 0, baby,
    };
    this.ducks.push(d);
    return d;
  }

  // ---------- Звуки ----------

  squeak(d) {
    // резиновая пищалка: «пи-ик»
    const base = d.baby ? rnd(1500, 1700) : rnd(1050, 1250);
    const p = this.pan(d.x);
    tone({ freq: base, to: base * 1.25, dur: 0.12, type: 'square', gain: 0.1, attack: 0.008, pan: p, wet: 0.5, filter: { type: 'bandpass', freq: base * 1.8, q: 3 }, vibrato: 25, vibratoRate: 30 });
    tone({ freq: base * 1.25, to: base * 0.95, dur: 0.16, type: 'square', gain: 0.1, attack: 0.008, at: 0.12, pan: p, wet: 0.5, filter: { type: 'bandpass', freq: base * 1.8, q: 3 }, vibrato: 25, vibratoRate: 30 });
    noise({ dur: 0.25, gain: 0.04, type: 'bandpass', freq: 2500, q: 2, pan: p, wet: 0.2 });
  }

  splash(x, big = false) {
    const p = this.pan(x);
    noise({ dur: big ? 0.45 : 0.28, gain: big ? 0.25 : 0.16, type: 'bandpass', freq: 900, to: 300, q: 0.8, pan: p, wet: 0.6 });
    tone({ freq: big ? 260 : 380, to: big ? 700 : 900, dur: 0.12, type: 'sine', gain: 0.14, attack: 0.004, pan: p, wet: 0.6 });
  }

  // ---------- Касания ----------

  hit(x, y) {
    for (let i = this.ducks.length - 1; i >= 0; i--) {
      const d = this.ducks[i];
      if (Math.abs(x - d.x) < Math.max(d.size * 0.55, 30) && Math.abs(y - (d.y - d.size * 0.15)) < Math.max(d.size * 0.5, 30)) return d;
    }
    return null;
  }

  onDown(p) {
    p.data.last = { x: p.x, y: p.y };
    const d = this.hit(p.x, p.y);
    if (d) {
      d.squish = 0.01;
      d.vy -= this.u * 0.05;
      this.squeak(d);
      haptic(1);
      p.data.duck = d;
      return;
    }
    this.ripple(p.x, p.y, 1);
    this.splash(p.x);
    if (Math.random() < 0.5 || this.ducks.length < 3) {
      const nd = this.addDuck(p.x, p.y);
      if (nd) setTimeout(() => { this.splash(nd.x, true); this.ripple(nd.x, nd.y, 1.4); }, 300);
    }
    haptic(0);
  }

  onMove(p) {
    const l = p.data.last;
    const d = Math.hypot(p.x - l.x, p.y - l.y);
    if (d < this.u * 0.09) return;
    // волна от пальца: круги + толчок уточкам
    this.ripple(p.x, p.y, 0.45);
    for (const k of this.ducks) {
      const dx = k.x - p.x, dy = k.y - p.y, dist = Math.hypot(dx, dy) || 1;
      if (dist < this.u * 0.35) {
        const f = (1 - dist / (this.u * 0.35)) * this.u * 0.6;
        k.vx += (dx / dist) * f * 0.5 + p.vx * 0.05;
        k.vy += (dy / dist) * f * 0.5 + p.vy * 0.05;
      }
    }
    if (Math.random() < 0.35) noise({ dur: 0.18, gain: 0.07, type: 'bandpass', freq: 700, to: 400, q: 0.8, pan: this.pan(p.x), wet: 0.4 });
    p.data.last = { x: p.x, y: p.y };
  }

  onUp() {}

  ripple(x, y, k) {
    if (this.ripples.length > 24) this.ripples.shift();
    this.ripples.push({ x, y, t: 0, k });
    if (k >= 1) for (let i = 0; i < 8; i++) {
      const a = rnd(Math.PI * 1.1, Math.PI * 1.9), sp = this.u * rnd(0.2, 0.5) * k;
      this.drops.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0 });
    }
  }

  // ---------- Время ----------

  update(dt) {
    this.time += dt;
    const { w, h } = this.stage;
    for (const d of this.ducks) {
      // кольца волн толкают уточек
      for (const r of this.ripples) {
        const rad = r.t * this.u * 0.32;
        const dist = Math.hypot(d.x - r.x, d.y - r.y);
        if (Math.abs(dist - rad) < this.u * 0.04 && dist > 1) {
          const f = this.u * 0.25 * r.k * (1 - r.t / 1.1) * dt * 10;
          d.vx += ((d.x - r.x) / dist) * f;
          d.vy += ((d.y - r.y) / dist) * f;
        }
      }
      d.vx *= 1 - Math.min(1, dt * 0.8);
      d.vy *= 1 - Math.min(1, dt * 0.8);
      // лёгкий дрейф
      d.vx += Math.sin(this.time * 0.3 + d.ph) * this.u * 0.004 * dt * 10;
      d.x += d.vx * dt; d.y += d.vy * dt;
      const m = d.size * 0.5;
      if (d.x < m) { d.x = m; d.vx = Math.abs(d.vx) * 0.6; }
      if (d.x > w - m) { d.x = w - m; d.vx = -Math.abs(d.vx) * 0.6; }
      if (d.y < d.size * 0.6) { d.y = d.size * 0.6; d.vy = Math.abs(d.vy) * 0.6; }
      if (d.y > h - d.size * 0.15) { d.y = h - d.size * 0.15; d.vy = -Math.abs(d.vy) * 0.6; }
      if (Math.abs(d.vx) > this.u * 0.05) d.flip = d.vx < 0;
      if (d.squish > 0) { d.squish += dt; if (d.squish > 0.45) d.squish = 0; }
      if (d.drop > 0) d.drop = Math.max(0, d.drop - dt / 0.3);
    }
    // уточки мягко расталкивают друг друга
    for (let i = 0; i < this.ducks.length; i++) for (let j = i + 1; j < this.ducks.length; j++) {
      const a = this.ducks[i], b = this.ducks[j];
      const dx = b.x - a.x, dy = (b.y - a.y) * 1.6, d = Math.hypot(dx, dy) || 1;
      const min = (a.size + b.size) * 0.42;
      if (d < min) { const k = (min - d) / 2; a.x -= (dx / d) * k; b.x += (dx / d) * k; a.y -= (dy / d) * k * 0.6; b.y += (dy / d) * k * 0.6; }
    }
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter((r) => r.t < 1.1);
    for (const q of this.drops) { q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += this.u * 1.6 * dt; }
    this.drops = this.drops.filter((q) => q.life < 0.5);
  }

  resize(prev, next) {
    const sx = next.w / prev.w, sy = next.h / prev.h;
    for (const d of this.ducks) { d.x *= sx; d.y *= sy; d.size = this.duckSize * (d.baby ? 0.65 : 1); }
    this.ripples = [];
  }

  // ---------- Рисование ----------

  drawDuck(ctx, d) {
    const bob = Math.sin(this.time * 2 + d.ph) * d.size * 0.03;
    const rock = Math.sin(this.time * 1.6 + d.ph) * 0.07 + clamp(d.vx / (this.u * 2), -0.2, 0.2);
    let sx = 1, sy = 1;
    if (d.squish > 0) { const k = Math.sin((d.squish / 0.45) * Math.PI); sx = 1 + k * 0.18; sy = 1 - k * 0.22; }
    const dropY = d.drop * d.size * 1.2;
    const s = d.size / 100;
    // тень/отражение на воде
    ctx.beginPath();
    ctx.ellipse(d.x, d.y + d.size * 0.02, d.size * 0.48, d.size * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30,90,130,0.18)';
    ctx.fill();
    ctx.save();
    ctx.translate(d.x, d.y + bob - dropY);
    ctx.rotate(rock);
    ctx.scale((d.flip ? -1 : 1) * s * sx, s * sy);
    ctx.translate(-50, -78);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 3.6;
    ctx.fillStyle = d.c.body; ctx.fill(BODY); ctx.stroke(BODY);
    ctx.fill(HEAD); ctx.stroke(HEAD);
    ctx.fillStyle = d.c.beak; ctx.fill(BEAK); ctx.stroke(BEAK);
    ctx.fillStyle = d.c.wing; ctx.fill(WING); ctx.stroke(WING);
    // глаз и блик
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(72, 24, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(73.5, 22, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(60, 18, 6, 3.5, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,138,128,0.45)'; ctx.beginPath(); ctx.arc(78, 34, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // вода у «ватерлинии» — уточка сидит в воде
    ctx.beginPath();
    ctx.ellipse(d.x, d.y + d.size * 0.06, d.size * 0.52, d.size * 0.07, 0, 0, Math.PI);
    ctx.fillStyle = 'rgba(159,223,245,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = Math.max(1.5, d.size * 0.02);
    ctx.beginPath(); ctx.ellipse(d.x, d.y + d.size * 0.06, d.size * 0.52, d.size * 0.07, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }

  draw(ctx) {
    const { w, h } = this.stage;
    ctx.fillStyle = '#9FDFF5';
    ctx.fillRect(0, 0, w, h);
    // круги на воде
    for (const r of this.ripples) {
      const k = r.t / 1.1;
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * (1 - k) * Math.min(1, r.k * 1.4)})`;
      ctx.lineWidth = Math.max(1.5, this.u * 0.006 * (1 - k));
      for (const m of [1, 0.65]) {
        const rad = r.t * this.u * 0.32 * m;
        if (rad <= 0) continue;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    const sorted = [...this.ducks].sort((a, b) => a.y - b.y);
    for (const d of sorted) this.drawDuck(ctx, d);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const q of this.drops) { ctx.beginPath(); ctx.arc(q.x, q.y, this.u * 0.006 * (1 - q.life / 0.5), 0, Math.PI * 2); ctx.fill(); }
  }

  destroy() {}
}
