// Ночное небо. Тёмно-синий с лёгким градиентом.
// Тап → зажигается звезда в случайном месте (подальше от других — не кучно), разной формы, оттенка и чуть разного размера.
// Проведение пальцем → падающая звезда. Стирание — кнопка (2 с).
import { chime, tone, noise, pentaFreq, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const HUES = ['#FFF6D5', '#FFE066', '#FFD8A8', '#D0EBFF', '#E5DBFF', '#FFDEEB', '#FFFFFF'];
const SHAPES = ['star5', 'star4', 'star6', 'round'];
const MAX_STARS = 220;

export default class SkyGame {
  static erasable = true;
  static background = '#0B1640';

  constructor(stage) {
    this.stage = stage;
    this.stars = [];
    this.shooting = [];
    this.sparks = [];
    this.time = 0;
    this.makeDust();
  }

  get u() { return this.stage.unit; }

  makeDust() {
    // едва заметная звёздная пыль — для естественности
    const { w, h } = this.stage;
    this.dust = Array.from({ length: Math.round((w * h) / 22000) }, () => ({ x: rnd(0, w), y: rnd(0, h * 0.85), r: rnd(0.5, 1.2), ph: rnd(0, 6) }));
  }

  pan(x) { return panFor(x, this.stage.w); }

  /** Лучшее свободное место: из нескольких случайных точек берём самую удалённую от других звёзд. */
  freeSpot() {
    const { w, h } = this.stage;
    const m = this.u * 0.06;
    let best = null, bd = -1;
    for (let i = 0; i < 24; i++) {
      const x = rnd(m, w - m), y = rnd(m, h - m);
      let d = Infinity;
      for (const s of this.stars) d = Math.min(d, Math.hypot(s.x - x, s.y - y));
      if (d > bd) { bd = d; best = { x, y }; }
    }
    return best;
  }

  addStar() {
    if (this.stars.length >= MAX_STARS) this.stars.shift();
    const { x, y } = this.freeSpot();
    const s = { x, y, r: this.u * rnd(0.022, 0.036), shape: pick(SHAPES), color: pick(HUES), rot: rnd(0, Math.PI), born: this.time, ph: rnd(0, 6) };
    this.stars.push(s);
    // звон: выше звезда — выше нота
    const step = Math.round((1 - y / this.stage.h) * 12);
    chime(pentaFreq(step, 523.25), { gain: 0.14, dur: 1.6, pan: this.pan(x) });
    for (let i = 0; i < 10; i++) {
      const a = rnd(0, Math.PI * 2), sp = this.u * rnd(0.05, 0.18);
      this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rnd(0.4, 0.8), c: s.color });
    }
    haptic(0);
  }

  onDown(p) {
    p.data.last = { x: p.x, y: p.y, t: this.time };
    p.data.shot = false;
    this.addStar();
  }

  onMove(p) {
    const l = p.data.last;
    const d = Math.hypot(p.x - l.x, p.y - l.y);
    // быстрое проведение — падающая звезда (не чаще пары раз за жест)
    if (d > this.u * 0.12 && this.time - l.t > 0.12) {
      const vx = p.x - l.x, vy = p.y - l.y;
      this.shoot(p.x, p.y, vx / d, vy / d);
      p.data.last = { x: p.x, y: p.y, t: this.time };
    }
  }

  onUp() {}

  shoot(x, y, dx, dy) {
    if (this.shooting.length > 8) return;
    const sp = this.u * rnd(1.4, 2.0);
    this.shooting.push({ x, y, vx: dx * sp, vy: dy * sp, trail: [], life: 0, color: pick(HUES) });
    const p = this.pan(x);
    noise({ dur: 0.6, gain: 0.07, type: 'bandpass', freq: 3000, to: 900, q: 1.2, pan: p, wet: 1 });
    [1568, 1318.5, 1046.5, 784].forEach((f, i) => chime(f, { gain: 0.05, dur: 0.8, at: i * 0.07, pan: p }));
    tone({ freq: 2200, to: 900, dur: 0.5, type: 'sine', gain: 0.04, pan: p, wet: 1 });
    haptic(0);
  }

  erase() {
    for (const s of this.stars) for (let i = 0; i < 3; i++) {
      const a = rnd(0, Math.PI * 2), sp = this.u * rnd(0.05, 0.2);
      this.sparks.push({ x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rnd(0.4, 0.9), c: s.color });
    }
    this.stars = [];
    [2093, 1568, 1318.5, 1046.5, 784, 523.25].forEach((f, i) => chime(f, { gain: 0.06, dur: 0.9, at: i * 0.06 }));
  }

  update(dt) {
    this.time += dt;
    const { w, h } = this.stage;
    for (const s of this.shooting) {
      s.life += dt;
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 22) s.trail.shift();
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (Math.random() < 0.6) this.sparks.push({ x: s.x, y: s.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0, max: rnd(0.3, 0.6), c: s.color });
    }
    this.shooting = this.shooting.filter((s) => s.x > -100 && s.x < w + 100 && s.y > -100 && s.y < h + 100 && s.life < 3);
    for (const p of this.sparks) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 2; p.vy *= 1 - dt * 2; }
    this.sparks = this.sparks.filter((p) => p.life < p.max);
  }

  resize(prev, next) {
    const sx = next.w / prev.w, sy = next.h / prev.h;
    for (const s of this.stars) { s.x *= sx; s.y *= sy; }
    this.makeDust();
  }

  starPath(ctx, shape, r) {
    ctx.beginPath();
    if (shape === 'round') { ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); return; }
    const n = shape === 'star4' ? 4 : shape === 'star6' ? 6 : 5;
    const inner = shape === 'star4' ? 0.35 : 0.45;
    for (let i = 0; i < n * 2; i++) {
      const rr = i % 2 ? r * inner : r;
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  draw(ctx) {
    const { w, h } = this.stage;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0B1640');
    g.addColorStop(0.65, '#1D2463');
    g.addColorStop(1, '#3A2F7A');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (const d of this.dust) {
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(this.time * 1.5 + d.ph);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(d.x, d.y, d.r, d.r);
    }
    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.shooting) {
      for (let i = 1; i < s.trail.length; i++) {
        const k = i / s.trail.length;
        ctx.strokeStyle = `rgba(255,240,200,${k * 0.6})`;
        ctx.lineWidth = this.u * 0.012 * k;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.trail[i - 1].x, s.trail[i - 1].y); ctx.lineTo(s.trail[i].x, s.trail[i].y); ctx.stroke();
      }
    }
    for (const p of this.sparks) {
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, this.u * 0.004, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    for (const s of this.stars) {
      const age = this.time - s.born;
      const pop = age < 0.4 ? Math.sin((age / 0.4) * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1;
      const tw = 1 + Math.sin(this.time * 2.2 + s.ph) * 0.08;
      const r = s.r * pop * tw;
      ctx.save();
      ctx.translate(s.x, s.y);
      // мягкое свечение
      const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
      gl.addColorStop(0, 'rgba(255,245,210,0.35)');
      gl.addColorStop(1, 'rgba(255,245,210,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(s.rot + Math.sin(this.time * 0.6 + s.ph) * 0.08);
      this.starPath(ctx, s.shape, r);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.restore();
    }
    // мерцающие на свету «лучики» у самой свежей звезды
    const last = this.stars[this.stars.length - 1];
    if (last && this.time - last.born < 1.2) {
      const k = 1 - (this.time - last.born) / 1.2;
      ctx.save(); ctx.translate(last.x, last.y);
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * k})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + this.time; ctx.beginPath(); ctx.moveTo(Math.cos(a) * last.r * 1.2, Math.sin(a) * last.r * 1.2); ctx.lineTo(Math.cos(a) * last.r * 2.6, Math.sin(a) * last.r * 2.6); ctx.stroke(); }
      ctx.restore();
    }
  }

  destroy() {}
}
