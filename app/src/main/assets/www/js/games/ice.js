// Ковзанка. Каток с бортиками, на нём утята и пингвинчики. Наклони телефон — едут, растопырив крылышки,
// оставляют следы. Сильно ударились о бортик — «кря!»/«пиу!», крутятся волчком или плюхаются на попу.
// Тап — подпрыгивают и машут крыльями; можно взять пальцем и запустить. Тап по льду — снежный пшик.
import { TiltWorld, rnd, clamp } from './tiltWorld.js';
import { drawBird } from '../art/birds.js';
import { INK } from '../art/ink.js';
import { haptic } from '../core/haptics.js';
import { tone, noise } from '../core/audio.js';
import * as F from '../sounds/farm.js';

const KINDS = ['duckling', 'penguin', 'duckling', 'penguin', 'duckling', 'penguin'];
const HEIGHT = { duckling: 1.05, penguin: 1.25 };
const TRAIL_LIFE = 1.4;

export default class IceGame extends TiltWorld {
  static erasable = false;
  static background = '#DDF1FC';
  static volume = 1.3;

  constructor(stage) {
    super(stage, { accel: 4, inset: 0.035, top: 0.1 });
    F.preloadFarm();
    this.S = this.u * 0.13;
    this.puffs = [];
    this.voices = [];
    this.lastVoice = -1;
    this.flakes = Array.from({ length: 36 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(1.4, 3.2), sp: rnd(0.015, 0.04), ph: rnd(0, 6) }));
    for (const kind of KINDS) {
      const r = this.S * (kind === 'penguin' ? 0.36 : 0.32);
      const at = this.freeSpot(r * 1.4);
      this.addThing({
        kind, r, size: this.S, flip: Math.random() < 0.5, wing: 0, flapT: 0, spinT: -1, sitT: 0,
        blinkT: 0, nextBlink: rnd(1, 4), trail: [], trailD: 0, lastFeet: null,
      }, at.x, at.y, { restitution: 0.35, friction: 0, frictionAir: 0.006, density: kind === 'penguin' ? 0.0013 : 0.001 });
    }
    this.bg = null;
  }

  // сугробы в углах — тоже препятствия
  buildWalls() {
    super.buildWalls();
    const M = this.M, { w, h } = this.stage, i = this.inset, R = this.u * 0.075;
    const o = { isStatic: true, restitution: 0, friction: 0, plugin: { wall: true } };
    const corners = [[i, i], [w - i, i], [i, h - i], [w - i, h - i]].map(([x, y]) => M.Bodies.circle(x, y, R, o));
    M.Composite.add(this.world, corners);
    this.walls.push(...corners);
  }

  feet(t) { const p = t.body.position; return { x: p.x, y: p.y + t.r * 0.45 }; }
  hitCenter(t) { const f = this.feet(t); return { x: f.x, y: f.y - t.size * HEIGHT[t.kind] * 0.45 - t.z * t.size * 0.9 }; }

  // ---------- Голоса ----------

  voice(t, at = 0) {
    if (at > 0) { this.voices.push({ t, at: this.time + at }); return; }
    if (this.time - this.lastVoice < 0.12) return;
    this.lastVoice = this.time;
    const pan = this.pan(t.body.position.x);
    if (t.kind === 'penguin') F.penguinPeep(pan); else F.quack(pan, true);
  }

  thud(k, pan) {
    noise({ dur: 0.07, gain: 0.2 + k * 0.22, type: 'lowpass', freq: 700, pan, wet: 0.3 });
    tone({ freq: 140, to: 95, dur: 0.09, type: 'sine', gain: 0.18 + k * 0.2, attack: 0.002, pan, wet: 0.3 });
  }

  snowPuff(x, y, n, k = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = this.u * rnd(0.15, 0.5) * k;
      this.puffs.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: this.u * rnd(0.008, 0.016), life: 0, max: rnd(0.4, 0.8) });
    }
  }

  // ---------- События ----------

  onHit(t, k, other, pt) {
    const pan = this.pan(t.body.position.x);
    if (!other) {
      if (k > 0.55 && t.spinT < 0 && t.sitT <= 0) {
        if (Math.random() < 0.5) t.spinT = 0; else t.sitT = 0.9;
        this.voice(t);
        this.thud(k, pan);
        this.snowPuff(pt.x, pt.y, 8, 1);
        haptic(1);
      } else if (k > 0.22) {
        this.thud(k * 0.7, pan);
        if (Math.random() < 0.35) this.voice(t);
        this.snowPuff(pt.x, pt.y, 3, 0.6);
        haptic(0);
      } else {
        this.thud(k * 0.4, pan);
      }
    } else {
      // столкнулись друг с другом — мягкий «бумп»
      tone({ freq: rnd(200, 240), to: 150, dur: 0.07, type: 'sine', gain: 0.1 + k * 0.12, attack: 0.003, pan, wet: 0.4 });
      if (Math.random() < 0.5) this.voice(t);
      if (k > 0.5) haptic(0);
    }
  }

  onTap(t) { t.flapT = 0.7; this.voice(t); haptic(0); }

  onThrow(t, k) {
    noise({ dur: 0.25 + k * 0.2, gain: 0.06 + k * 0.08, type: 'highpass', freq: 3500, to: 2200, pan: this.pan(t.body.position.x), wet: 0.4 });
    if (k > 0.4) this.voice(t, 0.05);
  }

  onLand(t, k) {
    const f = this.feet(t);
    t.squash = Math.max(t.squash, 0.12 + k * 0.1);
    noise({ dur: 0.05, gain: 0.08 + k * 0.08, type: 'bandpass', freq: 2600, q: 1.2, pan: this.pan(f.x), wet: 0.3 });
    this.snowPuff(f.x, f.y, 3, 0.4);
  }

  onEmpty(x, y) {
    this.snowPuff(x, y, 12, 1);
    const pan = this.pan(x);
    for (let i = 0; i < 3; i++) noise({ dur: 0.05, gain: 0.3, type: 'bandpass', freq: rnd(2200, 3800), q: 1.2, at: i * 0.05, pan, wet: 0.3 });
    tone({ freq: 620, to: 900, dur: 0.12, type: 'sine', gain: 0.08, attack: 0.006, pan, wet: 0.7 });
    haptic(0);
  }

  onShake() {
    this.things.forEach((t, i) => { t.flapT = 0.8; this.voice(t, 0.05 + i * 0.13); });
    haptic(1);
  }

  onResize(prev, next) {
    this.S *= next.unit / Math.max(1, prev.unit);
    this.bg = null;
    for (const t of this.things) t.trail = [];
  }

  // ---------- Шаг ----------

  afterUpdate(dt) {
    const u = this.u;
    for (const t of this.things) {
      const v = this.vel(t), s = Math.hypot(v.x, v.y);
      if (Math.abs(v.x) > u * 0.06) t.flip = v.x < 0;
      t.flapT = Math.max(0, t.flapT - dt);
      const want = t.flapT > 0 ? 0.5 + 0.5 * Math.sin(this.time * 28) : s > u * 0.35 ? 0.55 : 0;
      t.wing += (want - t.wing) * Math.min(1, dt * (t.flapT > 0 ? 40 : 8));
      if (t.spinT >= 0) { t.spinT += dt / 0.55; if (t.spinT >= 1) t.spinT = -1; }
      if (t.sitT > 0) t.sitT -= dt;
      t.blinkT = Math.max(0, t.blinkT - dt);
      t.nextBlink -= dt;
      if (t.nextBlink <= 0) { t.blinkT = 0.13; t.nextBlink = rnd(2, 5); }

      // следы коньков
      const f = this.feet(t);
      if (t.lastFeet && t.z === 0 && s > u * 0.12) {
        t.trailD += Math.hypot(f.x - t.lastFeet.x, f.y - t.lastFeet.y);
        if (t.trailD > u * 0.025) { t.trailD = 0; t.trail.push({ x: f.x, y: f.y, t: this.time }); }
      } else if ((s <= u * 0.12 || t.z > 0) && t.trail.length && t.trail[t.trail.length - 1] !== null) {
        t.trail.push(null); // разрыв следа
      }
      t.lastFeet = f;
      while (t.trail.length && (t.trail[0] === null || this.time - t.trail[0].t > TRAIL_LIFE)) t.trail.shift();
      if (t.trail.length > 60) t.trail.splice(0, t.trail.length - 60);
    }

    for (const v of this.voices) if (this.time >= v.at) { v.done = true; this.lastVoice = -1; this.voice(v.t); }
    this.voices = this.voices.filter((v) => !v.done);

    for (const p of this.puffs) {
      p.life += dt;
      p.vx *= 1 - Math.min(1, dt * 5); p.vy *= 1 - Math.min(1, dt * 5);
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.puffs = this.puffs.filter((p) => p.life < p.max);

    for (const fl of this.flakes) {
      fl.y += fl.sp * dt;
      fl.x += Math.sin(this.time * 0.8 + fl.ph) * 0.004 * dt;
      if (fl.y > 1.02) { fl.y = -0.02; fl.x = Math.random(); }
    }
  }

  get still() { return false; } // снег идёт всегда

  // ---------- Рисование ----------

  buildBg() {
    const { w, h } = this.stage, dpr = this.stage.dpr || 1, U = this.u;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
    g.addColorStop(0, '#EAF7FF'); g.addColorStop(1, '#CBEAFB');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round';
    const n = Math.round(10 + (w * h) / (U * U) * 4);
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h, rr = U * (0.15 + r() * 0.35), a = r() * 6;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, rr, a, a + 0.6 + r() * 0.8); ctx.stroke();
    }
    for (let i = 0; i < n * 0.4; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.ellipse(r() * w, r() * h, U * 0.12, U * 0.025, -0.5, 0, Math.PI * 2); ctx.fill();
    }
    // бортики
    const b = this.inset;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.rect(b, b, w - 2 * b, h - 2 * b); ctx.fill('evenodd');
    ctx.fillStyle = '#4DABF7';
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.rect(b * 0.45, b * 0.45, w - b * 0.9, h - b * 0.9); ctx.fill('evenodd');
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(b, b, w - 2 * b, h - 2 * b);
    // сугробы в углах
    const R = U * 0.075;
    for (const [x, y] of [[b, b], [w - b, b], [b, h - b], [w - b, h - b]]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(x, y, R * 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(61,38,20,0.5)'; ctx.stroke();
      ctx.fillStyle = 'rgba(180,215,240,0.6)';
      ctx.beginPath(); ctx.arc(x + R * 0.25, y + R * 0.3, R * 0.55, 0, Math.PI * 2); ctx.fill();
    }
    this.bg = c;
  }

  draw(ctx) {
    const { w, h } = this.stage, u = this.u;
    if (!this.bg || this.bg.width !== Math.round(w * (this.stage.dpr || 1))) this.buildBg();
    ctx.drawImage(this.bg, 0, 0, w, h);

    // следы коньков: две тонкие полоски, тают со временем
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, u * 0.006);
    for (const t of this.things) {
      const tr = t.trail, off = t.size * 0.07;
      for (let i = 1; i < tr.length; i++) {
        const a = tr[i - 1], b = tr[i];
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        const px = (-dy / d) * off, py = (dx / d) * off;
        ctx.strokeStyle = `rgba(110,170,215,${0.5 * (1 - (this.time - b.t) / TRAIL_LIFE)})`;
        ctx.beginPath();
        ctx.moveTo(a.x + px, a.y + py); ctx.lineTo(b.x + px, b.y + py);
        ctx.moveTo(a.x - px, a.y - py); ctx.lineTo(b.x - px, b.y - py);
        ctx.stroke();
      }
    }

    for (const r of this.rings) {
      const k = r.t / r.max;
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
      ctx.lineWidth = u * 0.012 * (1 - k * 0.6);
      ctx.beginPath(); ctx.arc(r.x, r.y, u * (0.05 + k * 0.4), 0, Math.PI * 2); ctx.stroke();
    }

    // птицы — по глубине (кто ниже на экране, тот ближе)
    const list = [...this.things].sort((a, b) => a.body.position.y - b.body.position.y);
    for (const t of list) {
      const f = this.feet(t), S = t.size;
      const z = t.z;
      ctx.fillStyle = `rgba(40,90,140,${0.18 * (1 - z * 0.5)})`;
      ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, S * 0.38 * (1 - z * 0.35), S * 0.1 * (1 - z * 0.35), 0, 0, Math.PI * 2); ctx.fill();
      const v = this.vel(t), s = Math.hypot(v.x, v.y);
      const sit = t.sitT > 0 ? Math.min(1, t.sitT / 0.25, (0.9 - t.sitT) / 0.12 + 0.2) : 0;
      const lean = clamp(s / (u * 2.5), 0, 0.28);
      drawBird(ctx, t.kind, f.x, f.y - z * S * 0.9, S, {
        flip: t.flip,
        wing: t.wing,
        tilt: lean - sit * 0.3,
        squash: Math.max(t.squash, sit * 0.22),
        spin: t.spinT >= 0 ? t.spinT * Math.PI * 2 : 0,
        blink: t.blinkT > 0 || sit > 0.5,
      });
    }

    for (const p of this.puffs) {
      ctx.fillStyle = `rgba(255,255,255,${0.95 * (1 - p.life / p.max)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + p.life * 1.5), 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const fl of this.flakes) { ctx.beginPath(); ctx.arc(fl.x * w, fl.y * h, fl.r, 0, Math.PI * 2); ctx.fill(); }
  }
}
