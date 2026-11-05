// Аквариум. Мягкая голубая вода, песок, немного декора (водоросли, камни, ракушки, пузырьки).
// Тап в воде → рыбка (12 видов), рыбки остаются в аквариуме и плавают.
// Проведение пальцем → сыплется корм, рыбки сбегаются. Тап по дну → краб, улитка, звезда, рак-отшельник, ёжик.
// Тап по рыбке → она резко уплывает. Стирание — кнопка, удержание 2 с.
import { drawFish, drawBottom, FISH, BOTTOM } from '../art/sea.js';
import { INK } from '../art/chick.js';
import { tone, noise, chime, pentaFreq, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MAX_FISH = 70;
const MAX_BOTTOM = 24;

export default class FishGame {
  static erasable = true;
  static background = '#CDEFFF';

  constructor(stage) {
    this.stage = stage;
    this.fish = [];
    this.bottom = [];
    this.food = [];
    this.bubbles = [];
    this.time = 0;
    this.bag = [];
    this.bagB = [];
    this.makeDecor();
  }

  get u() { return this.stage.unit; }
  get sandTop() { return this.stage.h * 0.86; }
  get fishSize() { return clamp(this.u * 0.1, 42, 96); }

  // ---------- Декор ----------

  makeDecor() {
    const { w } = this.stage;
    const n = Math.max(4, Math.round(w / 140));
    this.weeds = [];
    for (let i = 0; i < n; i++) {
      this.weeds.push({ x: (i + rnd(0.2, 0.8)) * (w / n), hK: rnd(0.18, 0.32), ph: rnd(0, 6), c: Math.random() < 0.5 ? '#63C27A' : '#3FA563', wK: rnd(0.8, 1.2) });
    }
    this.rocks = [
      { x: w * rnd(0.15, 0.3), s: rnd(0.9, 1.2), c: '#B9C1CC' },
      { x: w * rnd(0.65, 0.85), s: rnd(0.7, 1), c: '#A5AFBD' },
    ];
    this.shells = [{ x: w * rnd(0.4, 0.55), c: '#FFD6E0' }, { x: w * rnd(0.85, 0.95), c: '#FFF0C2' }];
    this.bubbleSpots = [w * rnd(0.1, 0.35), w * rnd(0.6, 0.9)];
  }

  pan(x) { return panFor(x, this.stage.w); }

  // ---------- Создание ----------

  nextFish() {
    if (!this.bag.length) this.bag = [...FISH].sort(() => Math.random() - 0.5);
    return this.bag.shift();
  }

  nextBottom() {
    if (!this.bagB.length) this.bagB = [...BOTTOM].sort(() => Math.random() - 0.5);
    return this.bagB.shift();
  }

  spawnFish(x, y) {
    if (this.fish.length >= MAX_FISH) this.fish.shift();
    const kind = this.nextFish();
    const dir = Math.random() < 0.5 ? -1 : 1;
    const size = this.fishSize * rnd(0.85, 1.15) * (kind === 'shark' ? 1.25 : kind === 'guppy' ? 0.8 : 1);
    const f = {
      kind, x, y, size, dir, flip: dir, born: this.time,
      speed: size * rnd(0.6, 1.2), vy: 0, ty: y, ph: rnd(0, 6),
      dart: 0, eatT: 0, blinkAt: rnd(1, 4), blink: 0, target: null,
    };
    this.fish.push(f);
    // пузырьки и «блуп»
    for (let i = 0; i < 6; i++) this.addBubble(x + rnd(-1, 1) * size * 0.3, y + rnd(-1, 1) * size * 0.2, size * rnd(0.04, 0.09));
    const p = this.pan(x);
    tone({ freq: 300, to: 700, dur: 0.12, type: 'sine', gain: 0.16, attack: 0.004, pan: p, wet: 0.6 });
    tone({ freq: 420, to: 950, dur: 0.1, type: 'sine', gain: 0.12, attack: 0.004, at: 0.12, pan: p, wet: 0.6 });
    haptic(0);
  }

  spawnBottom(x) {
    if (this.bottom.length >= MAX_BOTTOM) this.bottom.shift();
    const kind = this.nextBottom();
    const size = this.fishSize * (kind === 'starfish' || kind === 'urchin' ? 0.75 : 0.85);
    const walker = kind === 'crab' || kind === 'hermit' || kind === 'snail';
    const b = {
      kind, x, size, born: this.time, flip: Math.random() < 0.5,
      speed: walker ? (kind === 'snail' ? size * 0.12 : size * rnd(0.5, 0.8)) : 0,
      walk: 0, pause: rnd(1, 3), blinkAt: rnd(1, 3), blink: 0, hop: 0,
    };
    this.bottom.push(b);
    this.bottomSound(b);
    noise({ dur: 0.18, gain: 0.08, type: 'lowpass', freq: 900, pan: this.pan(x), wet: 0.3 }); // песок
    haptic(0);
  }

  bottomSound(b) {
    const p = this.pan(b.x);
    if (b.kind === 'crab' || b.kind === 'hermit') {
      for (let i = 0; i < 3; i++) noise({ dur: 0.025, gain: 0.18, type: 'bandpass', freq: 3200, q: 4, at: i * 0.09, pan: p, wet: 0.2 });
    } else if (b.kind === 'starfish') chime(pentaFreq(9), { gain: 0.12, dur: 0.9, pan: p });
    else if (b.kind === 'urchin') tone({ freq: 250, to: 700, dur: 0.25, type: 'sine', gain: 0.16, attack: 0.004, pan: p, wet: 0.5, vibrato: 30, vibratoRate: 18, curve: 'lin' });
    else tone({ freq: 330, to: 260, dur: 0.35, type: 'triangle', gain: 0.12, attack: 0.03, pan: p, wet: 0.5 });
  }

  addBubble(x, y, r) {
    if (this.bubbles.length > 160) this.bubbles.shift();
    this.bubbles.push({ x, y, r, ph: rnd(0, 6), vy: -rnd(0.25, 0.45) * this.u });
  }

  // ---------- Касания ----------

  hitFish(x, y) {
    for (let i = this.fish.length - 1; i >= 0; i--) {
      const f = this.fish[i];
      if (Math.abs(x - f.x) < Math.max(f.size * 0.5, 24) && Math.abs(y - f.y) < Math.max(f.size * 0.35, 24)) return f;
    }
    return null;
  }

  hitBottom(x, y) {
    for (const b of this.bottom) if (Math.abs(x - b.x) < Math.max(b.size * 0.5, 24) && y > this.sandTop - b.size * 0.7) return b;
    return null;
  }

  onDown(p) {
    p.data.last = { x: p.x, y: p.y };
    const f = this.hitFish(p.x, p.y);
    if (f) { this.dart(f, p.x); p.data.used = true; return; }
    const b = this.hitBottom(p.x, p.y);
    if (b) { b.hop = 0.01; this.bottomSound(b); haptic(1); p.data.used = true; return; }
    p.data.pending = true; // решим на отпускании: тап → рыбка/житель дна, проведение → корм
  }

  onMove(p) {
    const l = p.data.last;
    if (!p.moved || Math.hypot(p.x - l.x, p.y - l.y) < this.u * 0.03) return;
    p.data.pending = false;
    p.data.last = { x: p.x, y: p.y };
    if (p.y < this.sandTop) this.dropFood(p.x, p.y);
  }

  onUp(p) {
    if (!p.data.pending) return;
    if (p.y >= this.sandTop - this.u * 0.02) this.spawnBottom(p.x);
    else this.spawnFish(p.x, clamp(p.y, this.stage.h * 0.08, this.sandTop - this.fishSize * 0.5));
  }

  dart(f, x) {
    f.dart = 0.7;
    f.dir = f.x > x ? 1 : -1;
    for (let i = 0; i < 5; i++) this.addBubble(f.x, f.y, f.size * rnd(0.04, 0.08));
    noise({ dur: 0.22, gain: 0.12, type: 'bandpass', freq: 700, to: 2000, q: 1, pan: this.pan(f.x), wet: 0.4 });
    tone({ freq: 500, to: 1100, dur: 0.12, type: 'sine', gain: 0.12, pan: this.pan(f.x), wet: 0.5 });
    haptic(1);
  }

  dropFood(x, y) {
    if (this.food.length > 220) this.food.shift();
    for (let i = 0; i < 2; i++) {
      this.food.push({ x: x + rnd(-1, 1) * this.u * 0.02, y: y + rnd(-1, 1) * this.u * 0.02, vx: rnd(-1, 1) * this.u * 0.02, rot: rnd(0, 6), c: Math.random() < 0.5 ? '#E8A33D' : '#C9742E', born: this.time, taken: 0 });
    }
    if (Math.random() < 0.3) noise({ dur: 0.03, gain: 0.04, type: 'bandpass', freq: 4500, q: 3, pan: this.pan(x), wet: 0.3 });
  }

  // ---------- Время ----------

  update(dt) {
    this.time += dt;
    const { w, h } = this.stage;
    const top = h * 0.07, bottom = this.sandTop;

    // корм медленно тонет
    for (const c of this.food) {
      if (c.y < bottom - 3) { c.y += this.u * 0.06 * dt; c.x += Math.sin(this.time * 2 + c.rot) * this.u * 0.01 * dt; c.rot += dt; }
    }
    this.food = this.food.filter((c) => !c.eaten && this.time - c.born < 22);

    for (const f of this.fish) this.updateFish(f, dt, top, bottom, w);

    for (const b of this.bottom) {
      b.blinkAt -= dt; if (b.blinkAt <= 0) { b.blink = 0.13; b.blinkAt = rnd(1.5, 4); }
      if (b.blink > 0) b.blink -= dt;
      if (b.hop > 0) { b.hop += dt; if (b.hop > 0.5) b.hop = 0; }
      if (b.speed) {
        b.pause -= dt;
        if (b.pause < 0) {
          b.walk += dt;
          b.x += (b.flip ? -1 : 1) * b.speed * dt;
          if (b.x < b.size * 0.5) { b.x = b.size * 0.5; b.flip = false; }
          if (b.x > w - b.size * 0.5) { b.x = w - b.size * 0.5; b.flip = true; }
          if (b.pause < -rnd(1.5, 3)) { b.pause = rnd(1, 3); if (Math.random() < 0.4) b.flip = !b.flip; }
        }
      }
    }

    // пузырьки: от декора и от рыбок
    for (const x of this.bubbleSpots) if (Math.random() < dt * 1.6) this.addBubble(x + rnd(-6, 6), bottom - 4, this.u * rnd(0.006, 0.014));
    for (const b of this.bubbles) { b.y += b.vy * dt; b.x += Math.sin(this.time * 3 + b.ph) * this.u * 0.02 * dt; }
    this.bubbles = this.bubbles.filter((b) => b.y > -10);
  }

  updateFish(f, dt, top, bottom, w) {
    f.blinkAt -= dt; if (f.blinkAt <= 0) { f.blink = 0.13; f.blinkAt = rnd(2, 5); }
    if (f.blink > 0) f.blink -= dt;
    if (f.eatT > 0) f.eatT -= dt;
    const margin = f.size * 0.5;
    let speed = f.speed;
    let tx = null, ty = null;

    // корм рядом — плывём к нему
    if (this.food.length && f.dart <= 0 && f.kind !== 'jelly') {
      if (!f.target || f.target.eaten || !this.food.includes(f.target)) {
        let best = null, bd = Infinity;
        for (const c of this.food) {
          const d = Math.hypot(c.x - f.x, c.y - f.y) + c.taken * f.size;
          if (d < bd) { bd = d; best = c; }
        }
        if (best && bd < this.u * 0.9) { f.target = best; best.taken++; }
      }
    } else f.target = null;

    if (f.target) {
      tx = f.target.x; ty = f.target.y;
      speed = f.speed * 2.2 + f.size * 0.4;
      if (Math.hypot(tx - (f.x + f.dir * f.size * 0.35), ty - f.y) < f.size * 0.25) {
        f.target.eaten = true; f.target = null; f.eatT = 0.3;
        tone({ freq: 220, to: 140, dur: 0.08, type: 'sine', gain: 0.16, attack: 0.003, pan: this.pan(f.x), wet: 0.3 });
        noise({ dur: 0.03, gain: 0.06, type: 'bandpass', freq: 1800, q: 2, pan: this.pan(f.x), wet: 0.2 });
      }
    }

    if (f.dart > 0) { f.dart -= dt; speed = f.speed * 4 + f.size; }

    if (f.kind === 'jelly') {
      // медуза: толчок вверх, потом медленно опускается
      f.ph += dt;
      const push = Math.max(0, Math.sin(f.ph * 1.6));
      f.y += (-push * f.size * 0.6 + f.size * 0.18) * dt;
      f.x += f.dir * f.size * 0.15 * dt;
    } else if (f.kind === 'seahorse' && tx == null) {
      f.ph += dt;
      f.y += Math.sin(f.ph * 1.2) * f.size * 0.3 * dt;
      f.x += f.dir * f.size * 0.2 * dt;
    } else if (tx != null) {
      const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1;
      f.x += (dx / d) * speed * dt;
      f.y += (dy / d) * speed * dt;
      if (Math.abs(dx) > f.size * 0.1) f.dir = dx > 0 ? 1 : -1;
    } else {
      f.x += f.dir * speed * dt;
      // плавное блуждание по высоте
      if (Math.random() < dt * 0.4) f.ty = rnd(top + margin, bottom - margin);
      f.y += (f.ty - f.y) * Math.min(1, dt * 0.5) + Math.sin(this.time * 1.5 + f.ph) * f.size * 0.08 * dt;
    }

    // стенки аквариума: разворот
    if (f.x < margin) { f.x = margin; f.dir = 1; }
    if (f.x > w - margin) { f.x = w - margin; f.dir = -1; }
    f.y = clamp(f.y, top + f.size * 0.3, bottom - f.size * 0.35);
    // плавный разворот (сжатие по ширине)
    f.flip += (f.dir - f.flip) * Math.min(1, dt * 7);
  }

  erase() {
    const p = 0;
    for (const f of this.fish) for (let i = 0; i < 3; i++) this.addBubble(f.x, f.y, f.size * rnd(0.04, 0.08));
    this.fish = []; this.bottom = []; this.food = [];
    noise({ dur: 0.8, gain: 0.15, type: 'bandpass', freq: 500, to: 2500, q: 0.8, pan: p, wet: 1 });
  }

  resize(prev, next) {
    const sx = next.w / prev.w, sy = next.h / prev.h;
    for (const f of this.fish) { f.x *= sx; f.y *= sy; f.ty *= sy; }
    for (const b of this.bottom) b.x *= sx;
    for (const c of this.food) { c.x *= sx; c.y *= sy; }
    this.bubbles = [];
    this.makeDecor();
  }

  // ---------- Рисование ----------

  draw(ctx) {
    const { w, h } = this.stage;
    const st = this.sandTop;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#D8F3FF');
    g.addColorStop(1, '#9AD8F2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // водоросли (за всем)
    for (const wd of this.weeds) this.drawWeed(ctx, wd, st);
    // камни и ракушки
    for (const r of this.rocks) {
      const s = this.u * 0.07 * r.s;
      ctx.beginPath(); ctx.ellipse(r.x, st + s * 0.1, s * 1.3, s * 0.85, 0, Math.PI, 0);
      ctx.fillStyle = r.c; ctx.fill(); ctx.lineWidth = Math.max(2, s * 0.06); ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(r.x - s * 0.4, st - s * 0.4, s * 0.25, s * 0.12, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
    }

    // песок с волнистым краем
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, st);
    for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, st + Math.sin(x * 0.02) * 4);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = '#F4DFA7'; ctx.fill();
    ctx.lineWidth = Math.max(2, this.u * 0.004); ctx.strokeStyle = 'rgba(74,44,23,0.35)'; ctx.stroke();
    ctx.fillStyle = 'rgba(201,160,90,0.35)';
    for (let i = 0; i < 26; i++) { const x = ((i * 137) % 100) / 100 * w, y = st + 10 + ((i * 59) % 100) / 100 * (h - st - 14); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
    for (const s of this.shells) this.drawShell(ctx, s.x, st + 8, this.u * 0.025, s.c);

    // корм
    for (const c of this.food) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.fillStyle = c.c; ctx.fillRect(-this.u * 0.006, -this.u * 0.004, this.u * 0.012, this.u * 0.008);
      ctx.restore();
    }

    // жители дна
    for (const b of this.bottom) {
      const age = this.time - b.born;
      const k = age < 0.3 ? age / 0.3 : 1;
      const hop = b.hop > 0 ? Math.sin((b.hop / 0.5) * Math.PI) * b.size * 0.25 : 0;
      drawBottom(ctx, b.kind, b.x, st + 6 - hop, b.size * (0.5 + 0.5 * k), { t: this.time + b.born, flip: b.flip, blink: b.blink > 0, walk: b.walk });
    }

    // рыбки
    for (const f of this.fish) {
      const age = this.time - f.born;
      const k = age < 0.35 ? 0.4 + (age / 0.35) * 0.6 : 1;
      const fk = f.kind === 'jelly' ? 1 : (Math.abs(f.flip) < 0.15 ? 0.15 * Math.sign(f.flip || 1) : f.flip);
      drawFish(ctx, f.kind, f.x, f.y, f.size * k, fk, { t: this.time * (f.dart > 0 ? 2.5 : 1) + f.ph, open: f.eatT > 0 ? 1 : 0, blink: f.blink > 0 });
    }

    // пузырьки (поверх)
    ctx.lineWidth = 1.5;
    for (const b of this.bubbles) {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
    }
  }

  drawWeed(ctx, wd, st) {
    const H = this.stage.h * wd.hK;
    const sw = Math.sin(this.time * 1.2 + wd.ph) * H * 0.12;
    const wdt = Math.max(8, this.u * 0.022) * wd.wK;
    ctx.beginPath();
    ctx.moveTo(wd.x, st + 4);
    ctx.bezierCurveTo(wd.x + sw * 0.3 - wdt, st - H * 0.35, wd.x - sw * 0.5, st - H * 0.7, wd.x + sw, st - H);
    ctx.lineWidth = wdt + 4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = wdt; ctx.strokeStyle = wd.c; ctx.stroke();
  }

  drawShell(ctx, x, y, s, c) {
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x - s, y - s * 1.3, x, y - s * 1.3);
    ctx.quadraticCurveTo(x + s, y - s * 1.3, x + s, y);
    ctx.closePath();
    ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    for (const d of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * s, y - s * 1.1); ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  destroy() {}
}
