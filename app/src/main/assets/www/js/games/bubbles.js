// Пузыри. Белый фон.
// Тап по пустому месту → пузырь. Проведение → поток пузырей. Тап по пузырю → лопается.
// Удержание → пузырь надувается: передержал — лопается дождём маленьких, отпустил раньше — улетает большим.
import { tone, noise, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const HUES = 16;
const SPR = 256;           // размер картинки пузыря
const SR = SPR * 0.46;     // радиус пузыря на картинке
const MAX_BUBBLES = 360;

// ---------- Картинки пузырей (рисуются один раз) ----------

const spriteCache = { bodies: [], highlight: null };

function makeCanvas(n) {
  return typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(n, n) : Object.assign(document.createElement('canvas'), { width: n, height: n });
}

function bodySprite(i) {
  if (spriteCache.bodies[i]) return spriteCache.bodies[i];
  const hue = (i / HUES) * 360;
  const cv = makeCanvas(SPR);
  const c = cv.getContext('2d');
  c.translate(SPR / 2, SPR / 2);
  // плёнка: почти прозрачная в центре, цветная к краю
  const g = c.createRadialGradient(0, 0, 0, 0, 0, SR);
  g.addColorStop(0, `hsla(${hue},90%,92%,0.05)`);
  g.addColorStop(0.62, `hsla(${hue + 30},90%,85%,0.12)`);
  g.addColorStop(0.88, `hsla(${hue + 70},90%,72%,0.32)`);
  g.addColorStop(1, `hsla(${hue + 110},90%,62%,0.55)`);
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, SR, 0, Math.PI * 2); c.fill();
  // радужный край
  const cg = c.createConicGradient(0, 0, 0);
  for (let k = 0; k <= 6; k++) {
    cg.addColorStop(k / 6, `hsla(${hue + k * 60},95%,62%,${k % 2 ? 0.55 : 0.25})`);
  }
  c.strokeStyle = cg;
  c.lineWidth = SR * 0.14;
  c.beginPath(); c.arc(0, 0, SR * 0.92, 0, Math.PI * 2); c.stroke();
  // тонкий контур, чтобы пузырь читался на белом
  c.strokeStyle = 'rgba(74,44,23,0.22)';
  c.lineWidth = SR * 0.025;
  c.beginPath(); c.arc(0, 0, SR, 0, Math.PI * 2); c.stroke();
  spriteCache.bodies[i] = cv;
  return cv;
}

function highlightSprite() {
  if (spriteCache.highlight) return spriteCache.highlight;
  const cv = makeCanvas(SPR);
  const c = cv.getContext('2d');
  c.translate(SPR / 2, SPR / 2);
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,255,255,0.95)';
  c.lineWidth = SR * 0.1;
  c.beginPath(); c.arc(0, 0, SR * 0.7, Math.PI * 1.08, Math.PI * 1.42); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.beginPath(); c.arc(-SR * 0.22, -SR * 0.66, SR * 0.06, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.beginPath(); c.arc(SR * 0.5, SR * 0.48, SR * 0.07, 0, Math.PI * 2); c.fill();
  spriteCache.highlight = cv;
  return cv;
}

// ---------- Игра ----------

export default class BubblesGame {
  static erasable = false;
  static background = '#FFFFFF';

  constructor(stage) {
    this.stage = stage;
    this.bubbles = [];
    this.drops = [];   // брызги после лопания
    this.rings = [];   // расходящиеся кольца
    this.time = 0;
    this.emitCount = 0;
  }

  get u() { return this.stage.unit; }

  pan(x) { return panFor(x, this.stage.w); }

  newBubble(x, y, r, vx = 0, vy = 0) {
    if (this.bubbles.length >= MAX_BUBBLES) {
      // лопаем самый верхний, чтобы освободить место
      let top = null;
      for (const b of this.bubbles) if (!b.held && (!top || b.y < top.y)) top = b;
      if (top) this.pop(top, false);
    }
    const b = {
      x, y, r, vx, vy,
      hue: Math.floor(Math.random() * HUES),
      rot: rnd(0, Math.PI * 2), spin: rnd(-0.6, 0.6),
      phase: rnd(0, 10), born: this.time, held: null, grow: 0,
      lifespan: Math.random() < 0.12 ? rnd(4, 12) : Infinity,
    };
    this.bubbles.push(b);
    return b;
  }

  hit(x, y) {
    let best = null;
    for (const b of this.bubbles) {
      if (b.held) continue;
      const d = Math.hypot(x - b.x, y - b.y);
      if (d < b.r * 1.05 && (!best || b.r < best.r)) best = b;
    }
    return best;
  }

  // ---------- Звуки ----------

  blub(b, quiet = false) {
    const size = b.r / this.u;
    const f = 900 - Math.min(1, size / 0.3) * 600;
    tone({ freq: f * 0.6, to: f * 1.4, dur: 0.12, type: 'sine', gain: quiet ? 0.07 : 0.16, attack: 0.005, pan: this.pan(b.x), wet: 0.5 });
  }

  popSound(b, big = false) {
    const size = b.r / this.u;
    const p = this.pan(b.x);
    noise({ dur: 0.05, gain: big ? 0.35 : 0.22, type: 'bandpass', freq: big ? 1300 : 2600 - size * 3000, q: 1.2, pan: p, wet: 0.5 });
    tone({ freq: big ? 500 : 1100 - size * 1500, to: big ? 160 : 380, dur: big ? 0.18 : 0.09, type: 'sine', gain: big ? 0.25 : 0.16, attack: 0.002, pan: p, wet: 0.6 });
  }

  // ---------- Лопание ----------

  pop(b, sound = true) {
    const i = this.bubbles.indexOf(b);
    if (i < 0) return;
    this.bubbles.splice(i, 1);
    const n = Math.round(8 + Math.min(14, b.r / this.u * 40));
    const hue = (b.hue / HUES) * 360;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rnd(-0.2, 0.2);
      const sp = b.r * rnd(2.5, 4.5);
      this.drops.push({
        x: b.x + Math.cos(a) * b.r * 0.9, y: b.y + Math.sin(a) * b.r * 0.9,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.max(1.5, b.r * rnd(0.05, 0.1)),
        life: 0, max: rnd(0.35, 0.6), c: `hsla(${hue + k * 25},90%,65%,`,
      });
    }
    this.rings.push({ x: b.x, y: b.y, r: b.r, t: 0, hue });
    if (sound) this.popSound(b);
  }

  burst(b) {
    // огромный пузырь лопается дождём маленьких
    this.pop(b, false);
    this.popSound(b, true);
    haptic(2);
    const n = 22;
    for (let k = 0; k < n; k++) {
      const a = rnd(0, Math.PI * 2);
      const d = rnd(0, b.r * 0.8);
      const sp = this.u * rnd(0.25, 0.7);
      this.newBubble(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, this.u * rnd(0.018, 0.05), Math.cos(a) * sp, Math.sin(a) * sp - this.u * 0.1);
    }
  }

  // ---------- Касания ----------

  onDown(p) {
    const hitB = this.hit(p.x, p.y);
    if (hitB) {
      this.pop(hitB);
      haptic(1);
      p.data.popped = true;
      return;
    }
    const b = this.newBubble(p.x, p.y, this.u * rnd(0.038, 0.062));
    b.held = p.id;
    b.holdStart = this.time;
    b.r0 = b.r;
    p.data.b = b;
    p.data.last = { x: p.x, y: p.y };
    this.blub(b);
    haptic(0);
  }

  onMove(p) {
    if (p.data.popped) {
      // провёл пальцем после лопания — тоже лопаем всё по пути
      const hb = this.hit(p.x, p.y);
      if (hb) { this.pop(hb); haptic(0); }
      return;
    }
    const b = p.data.b;
    if (b && b.held === p.id) {
      if (p.moved) {
        b.held = null;
        b.vx = p.vx * 0.15; b.vy = p.vy * 0.15;
        p.data.b = null;
      } else {
        b.x = p.x; b.y = p.y;
        return;
      }
    }
    // поток пузырей вдоль пальца
    const step = this.u * 0.045;
    const l = p.data.last;
    const d = Math.hypot(p.x - l.x, p.y - l.y);
    if (d < step) return;
    const n = Math.min(6, Math.floor(d / step));
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      const x = l.x + (p.x - l.x) * k + rnd(-1, 1) * step * 0.4;
      const y = l.y + (p.y - l.y) * k + rnd(-1, 1) * step * 0.4;
      const nb = this.newBubble(x, y, this.u * rnd(0.016, 0.042), p.vx * rnd(0.05, 0.2), p.vy * rnd(0.05, 0.2));
      this.emitCount++;
      if (this.emitCount % 3 === 0) { this.blub(nb, true); }
      if (this.emitCount % 4 === 0) haptic(0);
    }
    p.data.last = { x: p.x, y: p.y };
  }

  onUp(p) {
    const b = p.data.b;
    if (b && b.held === p.id) {
      b.held = null;
      b.vy = -this.u * 0.05;
    }
  }

  // ---------- Физика ----------

  update(dt) {
    this.time += dt;
    const { w, h } = this.stage;
    const u = this.u;
    const rMax = u * 0.3;

    for (const b of [...this.bubbles]) {
      b.rot += b.spin * dt;
      if (b.held) {
        // надувание: начинается после короткой паузы
        const ht = this.time - b.holdStart;
        if (ht > 0.18) {
          const prevR = b.r;
          b.r = Math.min(rMax * 1.02, b.r0 + (ht - 0.18) * u * 0.065 * (1 + (ht - 0.18) * 0.15));
          // «пуп-пуп-пуп» по мере роста
          const step = Math.floor(b.r / (u * 0.03));
          if (step !== Math.floor(prevR / (u * 0.03))) {
            const k = (b.r - b.r0) / (rMax - b.r0);
            tone({ freq: 300 + k * 500, to: 380 + k * 600, dur: 0.07, type: 'sine', gain: 0.1, attack: 0.004, pan: this.pan(b.x), wet: 0.4 });
            haptic(0);
          }
          if (b.r >= rMax) { this.burst(b); continue; }
        }
        b.vx = 0; b.vy = 0;
        continue;
      }
      // всплывание: маленькие быстрее, большие плавно
      const size = b.r / u;
      const rise = u * (0.16 - Math.min(0.08, size * 0.22));
      b.vy += (-rise - b.vy) * Math.min(1, dt * 1.2);
      b.vx *= 1 - Math.min(1, dt * 1.4);
      b.x += (b.vx + Math.sin(this.time * 1.4 + b.phase) * u * 0.02) * dt;
      b.y += b.vy * dt;
      // стенки
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.5; }
      if (b.x > w - b.r) { b.x = w - b.r; b.vx = -Math.abs(b.vx) * 0.5; }
      if (b.y > h - b.r) { b.y = h - b.r; b.vy = Math.min(b.vy, 0); }
      // некоторые лопаются сами
      if (this.time - b.born > b.lifespan) { this.pop(b); }
    }

    this.collide();

    this.bubbles = this.bubbles.filter((b) => b.y + b.r > -20);

    for (const d of this.drops) {
      d.life += dt;
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.vx *= 1 - dt * 3; d.vy = d.vy * (1 - dt * 3) + u * 0.6 * dt;
    }
    this.drops = this.drops.filter((d) => d.life < d.max);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < 0.3);
  }

  collide() {
    // Пузыри мягко расталкивают друг друга. Сетка ускоряет поиск соседей.
    const cell = this.u * 0.14;
    const grid = new Map();
    const key = (cx, cy) => cx * 73856093 ^ cy * 19349663;
    for (const b of this.bubbles) {
      const cx = Math.floor(b.x / cell), cy = Math.floor(b.y / cell);
      const k = key(cx, cy);
      let arr = grid.get(k);
      if (!arr) grid.set(k, (arr = []));
      arr.push(b);
    }
    for (const a of this.bubbles) {
      const reach = Math.ceil((a.r * 2) / cell);
      const cx = Math.floor(a.x / cell), cy = Math.floor(a.y / cell);
      for (let ix = cx - reach; ix <= cx + reach; ix++) {
        for (let iy = cy - reach; iy <= cy + reach; iy++) {
          const arr = grid.get(key(ix, iy));
          if (!arr) continue;
          for (const b of arr) {
            if (b === a || b.r > a.r || (b.r === a.r && b.x < a.x)) continue; // каждую пару один раз
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 0.001;
            const overlap = a.r + b.r - d;
            if (overlap <= 0) continue;
            const nx = dx / d, ny = dy / d;
            const ma = a.held ? 0 : a.r * a.r, mb = b.held ? 0 : b.r * b.r;
            const tot = ma + mb || 1;
            const k = overlap * 0.5;
            if (!a.held) { a.x -= nx * k * (mb / tot) * 2; a.y -= ny * k * (mb / tot) * 2; }
            if (!b.held) { b.x += nx * k * (ma / tot) * 2; b.y += ny * k * (ma / tot) * 2; }
          }
        }
      }
    }
  }

  resize(prev, next) {
    const sx = next.w / prev.w, sy = next.h / prev.h;
    const k = Math.min(next.w, next.h) / Math.min(prev.w, prev.h);
    for (const b of this.bubbles) { b.x *= sx; b.y *= sy; b.r *= k; if (b.r0) b.r0 *= k; }
    this.drops = []; this.rings = [];
  }

  // ---------- Рисование ----------

  draw(ctx) {
    const { w, h } = this.stage;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const hl = highlightSprite();
    for (const b of this.bubbles) {
      // появление и «дыхание» плёнки
      const age = this.time - b.born;
      const appear = age < 0.25 ? 0.4 + (age / 0.25) * 0.6 : 1;
      const wob = 1 + Math.sin(this.time * 6 + b.phase) * (b.held ? 0.035 : 0.018);
      const rx = b.r * appear * wob, ry = b.r * appear / wob;
      const scale = 1 / SR;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(rx * scale, ry * scale);
      ctx.save();
      ctx.rotate(b.rot);
      ctx.drawImage(bodySprite(b.hue), -SPR / 2, -SPR / 2);
      ctx.restore();
      ctx.drawImage(hl, -SPR / 2, -SPR / 2);
      ctx.restore();
    }

    for (const r of this.rings) {
      const k = r.t / 0.3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * (1 + k * 0.5), 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${r.hue},80%,65%,${0.5 * (1 - k)})`;
      ctx.lineWidth = Math.max(1, r.r * 0.06 * (1 - k));
      ctx.stroke();
    }
    for (const d of this.drops) {
      const a = 1 - d.life / d.max;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = d.c + (0.8 * a) + ')';
      ctx.fill();
    }
  }

  destroy() {}
}
