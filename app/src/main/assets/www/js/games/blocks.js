// Кубики. Белый фон.
// Тап → под пальцем появляется кубик и с настоящей физикой падает на другие.
// Тап по кубику → подпрыгивает и меняет цвет.
// Иногда появляется радужный кубик: тап по нему — взрыв конфетти, кубики разлетаются, экран чистый.
import { loadScript } from '../core/loadScript.js';
import { tone, noise, chime, pentaFreq, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';
import { INK } from '../art/chick.js';

const COLORS = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#38D9A9', '#4DABF7', '#748FFC', '#B197FC', '#F783AC'];
const MAX_BLOCKS = 160;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default class BlocksGame {
  static erasable = false;
  static background = '#FFFFFF';

  static prepare() {
    return loadScript('vendor/matter.min.js');
  }

  constructor(stage) {
    this.stage = stage;
    const M = (this.M = window.Matter);
    this.engine = M.Engine.create({ enableSleeping: true });
    this.engine.gravity.y = 1;
    this.engine.gravity.scale = 0.0016;
    this.world = this.engine.world;
    this.blocks = [];
    this.flying = [];    // кубики, разлетающиеся после взрыва
    this.confetti = [];
    this.walls = [];
    this.acc = 0;
    this.time = 0;
    this.sinceRainbow = 0;
    this.lastTok = 0;
    this.colorIdx = 0;
    this.buildWalls();
    M.Events.on(this.engine, 'collisionStart', (e) => this.onCollide(e));
  }

  get u() { return this.stage.unit; }
  get size() { return clamp(this.u * 0.07, 30, 66); }

  buildWalls() {
    const M = this.M;
    const { w, h } = this.stage;
    if (this.walls.length) M.Composite.remove(this.world, this.walls);
    const T = 200;
    this.walls = [
      M.Bodies.rectangle(w / 2, h + T / 2, w * 3, T, { isStatic: true, friction: 0.8 }),
      M.Bodies.rectangle(-T / 2, h / 2 - h, T, h * 4, { isStatic: true }),
      M.Bodies.rectangle(w + T / 2, h / 2 - h, T, h * 4, { isStatic: true }),
    ];
    M.Composite.add(this.world, this.walls);
  }

  pan(x) { return panFor(x, this.stage.w); }

  // ---------- Создание ----------

  nextColor() {
    let i;
    do { i = Math.floor(Math.random() * COLORS.length); } while (i === this.colorIdx);
    this.colorIdx = i;
    return COLORS[i];
  }

  spawn(x, y) {
    const M = this.M;
    const s = this.size * rnd(0.92, 1.08);
    if (this.blocks.length >= MAX_BLOCKS) this.removeBlock(this.blocks[0]);
    this.sinceRainbow++;
    const rainbow = this.sinceRainbow > 6 && (Math.random() < 0.08 || this.sinceRainbow > 18);
    if (rainbow) this.sinceRainbow = 0;
    const body = M.Bodies.rectangle(x, y, s, s, {
      chamfer: { radius: s * 0.2 },
      restitution: 0.12, friction: 0.7, frictionStatic: 0.9, density: 0.0015,
      angle: rnd(-0.25, 0.25),
    });
    M.Body.setAngularVelocity(body, rnd(-0.05, 0.05));
    const b = { body, s, color: this.nextColor(), rainbow, born: this.time, lastTok: 0, note: Math.floor(Math.random() * 10) };
    body.plugin.block = b;
    M.Composite.add(this.world, body);
    this.blocks.push(b);
    tone({ freq: 380, to: 720, dur: 0.09, type: 'sine', gain: 0.12, attack: 0.004, pan: this.pan(x), wet: 0.3 });
    if (rainbow) [1046.5, 1318.5, 1568].forEach((f, i) => chime(f, { gain: 0.06, dur: 0.6, at: i * 0.06, pan: this.pan(x) }));
    haptic(0);
  }

  removeBlock(b) {
    this.M.Composite.remove(this.world, b.body);
    this.blocks.splice(this.blocks.indexOf(b), 1);
  }

  // ---------- Звук ударов ----------

  onCollide(e) {
    const now = this.time;
    for (const pair of e.pairs) {
      const a = pair.bodyA.plugin.block, c = pair.bodyB.plugin.block;
      const ba = pair.bodyA, bb = pair.bodyB;
      const rv = Math.hypot(ba.velocity.x - bb.velocity.x, ba.velocity.y - bb.velocity.y);
      if (rv < 2.2) continue;
      const blk = a || c;
      if (!blk || now - blk.lastTok < 0.15 || now - this.lastTok < 0.035) continue;
      blk.lastTok = now;
      this.lastTok = now;
      const g = clamp((rv - 2) / 10, 0.05, 1);
      // деревянный «ток» — нота из пентатоники, стопка звучит музыкально
      const f = pentaFreq(blk.note + 10, 261.63);
      const p = this.pan(blk.body.position.x);
      tone({ freq: f, to: f * 0.92, dur: 0.11, type: 'sine', gain: 0.22 * g, attack: 0.002, pan: p, wet: 0.35 });
      tone({ freq: f * 2.76, dur: 0.05, type: 'sine', gain: 0.06 * g, attack: 0.001, pan: p, wet: 0.2 });
      noise({ dur: 0.02, gain: 0.08 * g, type: 'bandpass', freq: 2600, q: 2, pan: p, wet: 0.1 });
      if (g > 0.35) haptic(0);
    }
  }

  // ---------- Касания ----------

  hit(x, y) {
    const pad = 10;
    let best = null, bd = Infinity;
    for (const b of this.blocks) {
      const p = b.body.position;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < b.s * 0.62 + pad && d < bd) { bd = d; best = b; }
    }
    return best;
  }

  onDown(p) {
    const b = this.hit(p.x, p.y);
    if (b) {
      if (b.rainbow) this.explode(b);
      else this.jump(b);
      return;
    }
    this.spawn(p.x, p.y);
  }

  onMove() {}
  onUp() {}

  jump(b) {
    const M = this.M;
    M.Sleeping.set(b.body, false);
    M.Body.setVelocity(b.body, { x: rnd(-2, 2), y: -rnd(12, 15) });
    M.Body.setAngularVelocity(b.body, rnd(-0.25, 0.25));
    let c;
    do { c = COLORS[Math.floor(Math.random() * COLORS.length)]; } while (c === b.color);
    b.color = c;
    b.flash = this.time;
    // соседей сверху тоже «будим», чтобы стопка реагировала
    for (const o of this.blocks) if (o !== b) M.Sleeping.set(o.body, false);
    const p = this.pan(b.body.position.x);
    tone({ freq: 300, to: 820, dur: 0.22, type: 'sine', gain: 0.18, attack: 0.004, pan: p, wet: 0.4, vibrato: 25, vibratoRate: 16, curve: 'lin' });
    haptic(1);
  }

  explode(rb) {
    const M = this.M;
    const c = rb.body.position;
    const p = this.pan(c.x);
    // волшебный звук без «бахов»: вихрь + перезвон вверх
    noise({ dur: 0.7, gain: 0.18, type: 'bandpass', freq: 600, to: 4000, q: 0.8, pan: p, wet: 1 });
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => chime(f, { gain: 0.09, dur: 1.2, at: i * 0.055, pan: p }));
    haptic(2);
    // все кубики превращаются в разлетающиеся (без физики стенок) и улетают за экран
    for (const b of this.blocks) {
      const q = b.body.position;
      let dx = q.x - c.x, dy = q.y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const sp = this.u * rnd(1.6, 2.6);
      this.flying.push({
        x: q.x, y: q.y, a: b.body.angle, s: b.s, color: b.color, rainbow: b.rainbow,
        vx: dx * sp + rnd(-60, 60), vy: dy * sp - this.u * rnd(0.6, 1.2), va: rnd(-8, 8),
      });
      M.Composite.remove(this.world, b.body);
    }
    this.blocks = [];
    // конфетти
    for (let i = 0; i < 160; i++) {
      const a = rnd(0, Math.PI * 2), sp = this.u * rnd(0.4, 1.6);
      this.confetti.push({
        x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - this.u * 0.5,
        a: rnd(0, 6), va: rnd(-12, 12), w: this.u * rnd(0.012, 0.022), h: this.u * rnd(0.006, 0.012),
        color: COLORS[i % COLORS.length], life: 0, max: rnd(2, 3.2),
      });
    }
  }

  // ---------- Время ----------

  update(dt) {
    this.time += dt;
    this.acc += dt;
    const step = 1 / 120;
    let n = 0;
    while (this.acc >= step && n < 8) {
      this.M.Engine.update(this.engine, step * 1000);
      this.acc -= step;
      n++;
    }
    if (n === 8) this.acc = 0;

    const { w, h } = this.stage;
    const g = this.u * 2.2;
    for (const f of this.flying) {
      f.vy += g * dt;
      f.x += f.vx * dt; f.y += f.vy * dt; f.a += f.va * dt;
    }
    this.flying = this.flying.filter((f) => f.y < h + f.s * 2 && f.x > -f.s * 2 && f.x < w + f.s * 2);
    for (const c of this.confetti) {
      c.life += dt;
      c.vx *= 1 - dt * 1.8; c.vy = c.vy * (1 - dt * 1.8) + this.u * 0.9 * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt;
    }
    this.confetti = this.confetti.filter((c) => c.life < c.max && c.y < h + 20);
  }

  // ---------- Fold ----------

  resize(prev, next) {
    const M = this.M;
    const sx = next.w / prev.w, sy = next.h / prev.h;
    this.buildWalls();
    for (const b of this.blocks) {
      const p = b.body.position;
      M.Body.setPosition(b.body, { x: clamp(p.x * sx, b.s, next.w - b.s), y: Math.min(p.y * sy, next.h - b.s) });
      M.Sleeping.set(b.body, false);
    }
  }

  // ---------- Рисование ----------

  drawBlock(ctx, x, y, a, s, color, rainbow, flash = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    const r = s * 0.2, hs = s / 2;
    ctx.beginPath();
    ctx.roundRect(-hs, -hs, s, s, r);
    if (rainbow) {
      const g = ctx.createLinearGradient(-hs, -hs, hs, hs);
      const t = this.time * 0.4;
      ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#4DABF7', '#B197FC'].forEach((c, i) => g.addColorStop(((i / 6) + t) % 1, c));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = color;
    }
    ctx.fill();
    // блик сверху и лёгкая тень снизу — объём
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-hs, -hs, s, s * 0.22);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(-hs, hs - s * 0.18, s, s * 0.18);
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(-hs, -hs, s, s); }
    ctx.restore();
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.strokeStyle = INK;
    ctx.stroke();
    if (rainbow) {
      // звёздочка-подсказка «нажми меня»
      const k = 0.75 + Math.sin(this.time * 6) * 0.15;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = (i % 2 ? 0.12 : 0.28) * s * k;
        const an = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  draw(ctx) {
    const { w, h } = this.stage;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    for (const b of this.blocks) {
      const p = b.body.position;
      // появление «пружинкой»
      const age = this.time - b.born;
      const k = age < 0.2 ? 0.6 + (age / 0.2) * 0.4 : 1;
      const flash = b.flash ? Math.max(0, 0.6 - (this.time - b.flash) * 3) : 0;
      this.drawBlock(ctx, p.x, p.y, b.body.angle, b.s * k, b.color, b.rainbow, flash);
    }
    for (const f of this.flying) this.drawBlock(ctx, f.x, f.y, f.a, f.s, f.color, f.rainbow);
    for (const c of this.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.a);
      ctx.globalAlpha = Math.min(1, (c.max - c.life) * 2);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w * Math.abs(Math.cos(c.a * 0.7)), c.h);
      ctx.restore();
    }
  }

  destroy() {
    this.M.Engine.clear(this.engine);
  }
}
