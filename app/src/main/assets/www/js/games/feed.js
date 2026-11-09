// Покорми зверят. Зверь выглядывает из-за стола на пикнике, перед ним три тарелки с угощением.
// Тащишь еду пальцем ко рту (или просто тапаешь) — любимое зверь ест: жуёт, глотает, радуется,
// машет лапкой, вылетают сердечки. Не то — зажмуривается и «бе-е!», еда отпрыгивает обратно.
// Пока тащишь еду, зверь следит за ней глазами; к любимой тянется с открытым ртом.
// Покормил два раза — зверь машет «пока» и прячется, выглядывает следующий.
import { drawAnimal, drawPaws } from '../art/animals.js';
import { drawFood } from '../art/food.js';
import { panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';
import { mouthFrom } from '../core/lipsync.js';
import { animalVoice, preloadAnimals, whoosh, boing } from '../sounds/animals.js';
import { cluck, crow, quack, honk, preloadFarm } from '../sounds/farm.js';
import { crunch, munch, gulp, yuck, plate, pick, plop, hearts, tapEmpty } from '../sounds/feed.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeInOut = (t) => t * t * (3 - 2 * t);

/** Кто что любит. Сова не участвует — ей нечего предложить из стола. */
const LIKES = {
  cow: ['hay'], pig: ['melon', 'apple', 'corn'], sheep: ['hay', 'cabbage'], goat: ['cabbage', 'hay'],
  horse: ['carrot', 'apple'], dog: ['bone'], cat: ['fish', 'milk'], frog: ['fly'], mouse: ['cheese'],
  rabbit: ['carrot', 'cabbage'], hedgehog: ['apple'], bear: ['honey'], fox: ['fish'], squirrel: ['acorn'],
  hen: ['corn'], rooster: ['corn'], duck: ['bread'], goose: ['bread'],
};
const KINDS = Object.keys(LIKES);
const ALL_FOODS = [...new Set(Object.values(LIKES).flat())];
const HARD = new Set(['carrot', 'apple', 'bone', 'acorn', 'cabbage', 'corn', 'fly', 'hay']);
const CRUMB = {
  carrot: '#FF8A2A', apple: '#EF4B3F', bone: '#FFF3DC', fish: '#5CB8F0', cheese: '#FFC93C', honey: '#FFB627', acorn: '#E0A458',
  cabbage: '#93D46E', hay: '#6CC04A', corn: '#FFD43B', bread: '#E3A456', milk: '#FFFFFF', fly: '#58688A', melon: '#FF5B6E',
};
/** Рот в единицах мордочки (центр головы — 0,0). */
const MOUTH = { frog: [0, 8], hen: [0, 12], rooster: [0, 12], duck: [0, 12], goose: [14, 8], cat: [0, 18], squirrel: [0, 16], mouse: [0, 19], fox: [0, 26] };
const FEEDS = 2;

export default class FeedGame {
  static erasable = false;
  static background = '#CFEFFF';
  static maxDpr = 2.5;

  constructor(stage) {
    this.stage = stage;
    this.time = 0;
    this.idle = 0;
    this.bag = [];
    this.last = null;
    this.parts = [];
    this.foods = [];
    preloadAnimals();
    preloadFarm();
    this.layout();
    this.newAnimal(0.3);
  }

  // ---------- Раскладка ----------

  layout() {
    const { w, h } = this.stage;
    const land = w > h * 0.9;
    this.tableTop = h * (land ? 0.6 : 0.6);
    const below = h - this.tableTop;
    this.S = Math.min(this.stage.unit * (land ? 0.5 : 0.52), this.tableTop * 0.62);
    this.F = Math.min(this.stage.unit * 0.2, below * 0.55, w / 3 * 0.62);
    this.ax = w / 2;
    this.ay = this.tableTop - this.S * 0.46;
    this.slots = [0, 1, 2].map((i) => ({ x: w * (0.5 + (i - 1) * (land ? 0.27 : 0.31)), y: this.tableTop + below * 0.5 }));
    for (const f of this.foods) {
      const s = this.slots[f.slot];
      f.hx = s.x; f.hy = s.y;
      if (f.state === 'home' || f.state === 'in') { f.x = s.x; f.y = s.y; }
    }
    this.bg = null;
  }

  resize() { this.layout(); }

  nextKind() {
    if (!this.bag.length) {
      this.bag = [...KINDS].sort(() => Math.random() - 0.5);
      if (this.bag[0] === this.last) this.bag.push(this.bag.shift());
    }
    this.last = this.bag.shift();
    return this.last;
  }

  newAnimal(delay = 0) {
    const kind = this.nextKind();
    this.a = {
      kind, state: 'enter', t: -delay, fed: 0, blink: 0, blinkAt: rnd(1, 3), open: 0, voice: null, vt: 0,
      look: 0, lookT: 0, mood: null, wave: 0, shake: 0, hop: 0, ear: 0, reach: 0,
    };
    this.deal(delay + 0.35);
  }

  /** Новые три угощения: одно любимое + два чужих, в случайном порядке. */
  deal(delay = 0) {
    for (const f of this.foods) if (f.state !== 'gone' && f.state !== 'fly') { f.state = 'out'; f.t = 0; }
    const likes = LIKES[this.a.kind];
    const good = likes[Math.floor(Math.random() * likes.length)];
    const bad = ALL_FOODS.filter((k) => !likes.includes(k)).sort(() => Math.random() - 0.5).slice(0, 2);
    const kinds = [good, ...bad].sort(() => Math.random() - 0.5);
    kinds.forEach((kind, slot) => {
      const s = this.slots[slot];
      this.foods.push({ kind, slot, x: s.x, y: s.y, hx: s.x, hy: s.y, state: 'in', t: -delay - slot * 0.12, sc: 0, pid: null, rot: 0, hopT: 9, played: false });
    });
    this.idle = 0;
  }

  likes(kind) { return LIKES[this.a.kind].includes(kind); }

  mouth() {
    const [mx, my] = MOUTH[this.a.kind] || [0, 22];
    const k = this.S / 100;
    return { x: this.ax + mx * k, y: this.ay + this.dy() + my * k };
  }

  /** Насколько зверь опущен за стол (для появления/ухода). */
  dy() {
    const a = this.a;
    if (a.state === 'enter') return a.t < 0 ? this.S * 1.6 : (1 - easeOutBack(clamp(a.t / 0.55, 0, 1))) * this.S * 1.6;
    if (a.state === 'leave') return easeInOut(clamp((a.t - 0.5) / 0.45, 0, 1)) * this.S * 1.6;
    return -Math.max(0, Math.sin(clamp(a.hop, 0, 1) * Math.PI)) * this.S * 0.1;
  }

  pan(x) { return panFor(x, this.stage.w); }

  voice(excited = false) {
    const p = this.pan(this.ax), k = this.a.kind;
    if (k === 'hen') return cluck(p);
    if (k === 'rooster') return crow(p);
    if (k === 'duck') return quack(p, false);
    if (k === 'goose') return honk(p, false);
    return animalVoice(k, p, { excited });
  }

  say(excited) {
    const a = this.a;
    a.voice = this.voice(excited);
    a.vt = 0;
  }

  // ---------- Касания ----------

  onDown(p) {
    this.idle = 0;
    // еда (сверху — ближе к пальцу)
    let best = null, bd = this.F * 0.62;
    for (const f of this.foods) {
      if (f.pid != null || !(f.state === 'home' || f.state === 'back' || f.state === 'in')) continue;
      const d = Math.hypot(p.x - f.x, p.y - f.y);
      if (d < bd) { bd = d; best = f; }
    }
    if (best) {
      best.state = 'drag'; best.pid = p.id; best.ox = best.x - p.x; best.oy = best.y - p.y; best.t = 0; best.sc = 1;
      pick(this.pan(best.x));
      haptic(0);
      return;
    }
    // зверь
    const a = this.a;
    const hy = this.ay + this.dy();
    if (a.state === 'idle' && Math.abs(p.x - this.ax) < this.S * 0.55 && p.y > hy - this.S * 0.7 && p.y < this.tableTop) {
      this.say(true);
      a.hop = 0.001;
      a.ear = 1;
      haptic(1);
      return;
    }
    // пустое место: мягкий звук, кружок на месте касания, зверь смотрит на палец — ни одно касание не остаётся без ответа
    tapEmpty(this.pan(p.x), p.y > this.tableTop);
    this.parts.push({ ring: true, x: p.x, y: p.y, vx: 0, vy: 0, r: this.S * 0.12, t: 0, life: 0.45 });
    if (a.state === 'idle') { a.lookAt = clamp((p.x - this.ax) / (this.S * 1.1), -1, 1); a.lookT = 1.2; a.ear = 1; }
    haptic(0);
  }

  onMove(p) {
    for (const f of this.foods) {
      if (f.pid !== p.id) continue;
      f.x = p.x + f.ox * 0.6; f.y = p.y + f.oy * 0.6;
      f.ox *= 0.9; f.oy *= 0.9;
    }
  }

  onUp(p) {
    for (const f of this.foods) {
      if (f.pid !== p.id) continue;
      f.pid = null;
      const m = this.mouth();
      const near = Math.hypot(f.x - m.x, f.y - m.y) < this.S * 0.5;
      if (near || !p.moved) this.offer(f, !near);
      else this.sendBack(f);
    }
  }

  /** Угощение подлетает ко рту (fly=true — само, по тапу). */
  offer(f, fly) {
    const a = this.a;
    if (a.state !== 'idle') { this.sendBack(f); return; }
    if (this.likes(f.kind)) {
      f.state = 'fly'; f.t = 0; f.fx = f.x; f.fy = f.y; f.dur = fly ? 0.38 : 0.16;
      a.state = 'gobble'; a.t = 0;
    } else if (fly) {
      // тапнули по чужой еде: подлетает, зверь отворачивается
      f.state = 'tease'; f.t = 0; f.fx = f.x; f.fy = f.y;
    } else {
      this.reject(f);
    }
  }

  reject(f) {
    const a = this.a;
    a.state = 'yuck'; a.t = 0; a.mood = 'yuck'; a.shake = 1;
    yuck(this.pan(this.ax));
    haptic(1);
    this.sendBack(f, true);
  }

  sendBack(f, toss = false) {
    f.state = 'back'; f.t = 0; f.fx = f.x; f.fy = f.y; f.toss = toss;
  }

  // ---------- Время ----------

  update(dt) {
    this.time += dt;
    this.idle += dt;
    const a = this.a;
    a.t += dt;
    // моргание
    a.blinkAt -= dt;
    if (a.blinkAt <= 0) { a.blink = 0.13; a.blinkAt = rnd(1.6, 3.8); }
    if (a.blink > 0) a.blink -= dt;
    if (a.voice) { a.vt += dt; if (a.vt > a.voice.dur + 0.2) a.voice = null; }
    a.open = mouthFrom(a.voice, a.open, dt);
    if (a.hop > 0) { a.hop += dt * 2.6; if (a.hop >= 1) a.hop = 0; }
    a.ear *= Math.exp(-dt * 4);
    a.shake *= Math.exp(-dt * 3.5);

    // куда смотрит: на еду в пальце, иначе — по сторонам на тарелки
    const drag = this.foods.find((f) => f.state === 'drag');
    let targetLook = 0, reach = 0;
    if (drag) {
      targetLook = clamp((drag.x - this.ax) / (this.S * 1.1), -1, 1);
      const m = this.mouth();
      const d = Math.hypot(drag.x - m.x, drag.y - m.y);
      const prox = clamp(1 - d / (this.S * 1.5), 0, 1);
      if (a.state === 'idle') {
        if (this.likes(drag.kind)) reach = prox;
        else if (prox > 0.45) { a.mood = 'yuck'; a.shake = Math.max(a.shake, 0.25); }
        else a.mood = null;
      }
    } else {
      a.lookT -= dt;
      if (a.lookT <= 0) {
        a.lookT = rnd(1.2, 2.6);
        const home = this.foods.filter((f) => f.state === 'home');
        const f = home[Math.floor(Math.random() * home.length)];
        a.lookAt = f && Math.random() < 0.75 ? clamp((f.x - this.ax) / (this.S * 1.1), -1, 1) : 0;
      }
      targetLook = a.lookAt || 0;
      if (a.state === 'idle' && a.mood === 'yuck') a.mood = null;
    }
    a.look += (targetLook - a.look) * Math.min(1, dt * 10);
    a.reach += (reach - a.reach) * Math.min(1, dt * 12);

    this.updateAnimal(dt);
    this.updateFoods(dt);

    // подсказка: давно не играли — любимое угощение подпрыгивает, зверь на него смотрит
    if (this.idle > 5 && a.state === 'idle') {
      this.idle = 2.5;
      const f = this.foods.find((x) => x.state === 'home' && this.likes(x.kind));
      if (f) { f.hopT = 0; a.lookAt = clamp((f.x - this.ax) / (this.S * 1.1), -1, 1); a.lookT = 2; plate(this.pan(f.x)); }
    }

    for (const q of this.parts) {
      q.t += dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.heart) { q.vy -= 10 * dt; q.vx *= 0.98; } else if (!q.ring) q.vy += this.S * 6 * dt;
    }
    this.parts = this.parts.filter((q) => q.t < q.life);
  }

  updateAnimal() {
    const a = this.a;
    const pan = this.pan(this.ax);
    switch (a.state) {
      case 'enter':
        if (a.t >= 0 && !a.played) { a.played = true; boing(pan); }
        if (a.t > 0.55) { a.state = 'idle'; a.t = 0; this.say(false); }
        break;
      case 'gobble':
        // ждём, пока еда долетит до рта
        break;
      case 'chew': {
        a.mood = 'yum';
        const n = Math.floor(a.t / 0.26);
        if (n !== a.bites && n < 5) {
          a.bites = n;
          if (HARD.has(a.food)) crunch(pan); else munch(pan);
          const m = this.mouth();
          for (let i = 0; i < 3; i++) {
            this.parts.push({ x: m.x + rnd(-1, 1) * this.S * 0.1, y: m.y, vx: rnd(-1, 1) * this.S * 0.9, vy: -rnd(0.4, 1.2) * this.S, r: this.S * rnd(0.018, 0.03), col: CRUMB[a.food], t: 0, life: 0.7 });
          }
        }
        if (a.t > 1.35) { a.state = 'happy'; a.t = 0; gulp(pan); a.mood = null; }
        break;
      }
      case 'happy':
        if (a.t > 0.18 && !a.said) {
          a.said = true;
          this.say(true);
          hearts(pan);
          a.hop = 0.001;
          for (let i = 0; i < 4; i++) {
            this.parts.push({ heart: true, x: this.ax + rnd(-0.5, 0.5) * this.S, y: this.ay - this.S * 0.35, vx: rnd(-0.3, 0.3) * this.S, vy: -rnd(0.35, 0.6) * this.S, r: this.S * rnd(0.09, 0.13), t: -i * 0.12, life: 1.6 });
          }
        }
        a.wave = Math.sin(clamp(a.t / 1.4, 0, 1) * Math.PI) * (0.6 + 0.4 * Math.sin(a.t * 14));
        if (a.t > 1.5) {
          a.wave = 0; a.said = false;
          if (a.fed >= FEEDS) { a.state = 'leave'; a.t = 0; for (const f of this.foods) if (f.state !== 'gone') { f.state = 'out'; f.t = 0; } }
          else { a.state = 'idle'; a.t = 0; this.deal(0.1); }
        }
        break;
      case 'yuck':
        if (a.t > 1.0) { a.state = 'idle'; a.t = 0; a.mood = null; }
        break;
      case 'leave':
        a.wave = a.t < 0.6 ? Math.sin(a.t / 0.6 * Math.PI) * (0.6 + 0.4 * Math.sin(a.t * 16)) : 0;
        if (a.t > 0.5 && !a.whooshed) { a.whooshed = true; whoosh(pan); }
        if (a.t > 1.05) this.newAnimal(0.25);
        break;
    }
  }

  updateFoods(dt) {
    const a = this.a;
    for (const f of this.foods) {
      f.t += dt;
      f.hopT += dt;
      switch (f.state) {
        case 'in':
          if (f.t >= 0 && !f.played) { f.played = true; plate(this.pan(f.x)); }
          f.sc = f.t < 0 ? 0 : easeOutBack(clamp(f.t / 0.35, 0, 1));
          if (f.t > 0.35) { f.state = 'home'; f.sc = 1; }
          break;
        case 'out':
          f.sc = Math.max(0, 1 - f.t / 0.22);
          if (f.t > 0.22) f.state = 'gone';
          break;
        case 'fly': {
          const m = this.mouth();
          const k = clamp(f.t / f.dur, 0, 1), e = easeInOut(k);
          f.x = f.fx + (m.x - f.fx) * e;
          f.y = f.fy + (m.y - f.fy) * e - Math.sin(k * Math.PI) * this.S * 0.25 * (f.dur > 0.2 ? 1 : 0);
          f.sc = 1 - e * 0.55;
          if (k >= 1) {
            f.state = 'gone';
            a.state = 'chew'; a.t = 0; a.bites = -1; a.food = f.kind; a.fed++;
            haptic(1);
          }
          break;
        }
        case 'tease': {
          // подлетает поближе к носу и, не дождавшись, — «бе-е!»
          const m = this.mouth();
          const k = clamp(f.t / 0.3, 0, 1), e = easeInOut(k);
          f.x = f.fx + (m.x - f.fx) * e * 0.7;
          f.y = f.fy + (m.y + this.S * 0.25 - f.fy) * e * 0.7;
          if (k >= 1) { if (a.state === 'idle') this.reject(f); else this.sendBack(f); }
          break;
        }
        case 'back': {
          const k = clamp(f.t / (f.toss ? 0.5 : 0.3), 0, 1), e = easeInOut(k);
          f.x = f.fx + (f.hx - f.fx) * e;
          f.y = f.fy + (f.hy - f.fy) * e - Math.sin(k * Math.PI) * this.S * (f.toss ? 0.35 : 0.08);
          f.rot = f.toss ? Math.sin(k * Math.PI) * 0.9 * (f.hx < this.ax ? -1 : 1) : 0;
          f.sc = 1;
          if (k >= 1) { f.state = 'home'; f.rot = 0; f.x = f.hx; f.y = f.hy; plop(this.pan(f.x)); }
          break;
        }
      }
    }
    this.foods = this.foods.filter((f) => f.state !== 'gone');
  }

  erase() {}
  destroy() {}

  // ---------- Рисование ----------

  drawBg() {
    const { w, h } = this.stage;
    const dpr = this.stage.dpr;
    const c = document.createElement('canvas');
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const T = this.tableTop, u = this.stage.unit;
    // небо
    const sky = g.createLinearGradient(0, 0, 0, T);
    sky.addColorStop(0, '#9FDBFF'); sky.addColorStop(1, '#E4F6FF');
    g.fillStyle = sky; g.fillRect(0, 0, w, T + 2);
    // солнышко
    const sx = w * 0.12 + u * 0.05, sy = Math.min(T * 0.2, u * 0.16);
    const glow = g.createRadialGradient(sx, sy, 0, sx, sy, u * 0.22);
    glow.addColorStop(0, 'rgba(255,240,170,0.9)'); glow.addColorStop(1, 'rgba(255,240,170,0)');
    g.fillStyle = glow; g.fillRect(sx - u * 0.25, sy - u * 0.25, u * 0.5, u * 0.5);
    g.fillStyle = '#FFE066'; g.beginPath(); g.arc(sx, sy, u * 0.065, 0, Math.PI * 2); g.fill();
    // облака
    g.fillStyle = 'rgba(255,255,255,0.92)';
    for (const [cx, cy, s] of [[0.78, 0.1, 1], [0.42, 0.06, 0.7], [0.95, 0.24, 0.6]]) {
      const x = w * cx, y = T * cy + u * 0.03, r = u * 0.05 * s;
      g.beginPath();
      g.arc(x - r * 1.2, y + r * 0.3, r * 0.8, 0, Math.PI * 2);
      g.arc(x, y, r * 1.1, 0, Math.PI * 2);
      g.arc(x + r * 1.2, y + r * 0.35, r * 0.75, 0, Math.PI * 2);
      g.rect(x - r * 1.2, y + r * 0.3, r * 2.4, r * 0.8);
      g.fill();
    }
    // холмы
    const hill = (cx, top, rx, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(cx, T, rx, T - top, 0, Math.PI, 0); g.fill(); };
    hill(w * 0.15, T - u * 0.3, w * 0.45, '#B9E59A');
    hill(w * 0.85, T - u * 0.26, w * 0.5, '#A9DD88');
    hill(w * 0.5, T - u * 0.14, w * 0.7, '#95D474');
    // деревья по краям
    const tree = (x, s) => {
      const y = T - u * 0.06;
      g.fillStyle = '#A87B54'; g.fillRect(x - u * 0.012 * s, y - u * 0.12 * s, u * 0.024 * s, u * 0.12 * s);
      g.fillStyle = '#6FC25A';
      for (const [dx, dy, r] of [[0, -0.2, 0.075], [-0.055, -0.15, 0.06], [0.055, -0.15, 0.06]]) { g.beginPath(); g.arc(x + dx * u * s, y + dy * u * s, r * u * s, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(x - u * 0.02 * s, y - u * 0.23 * s, u * 0.03 * s, 0, Math.PI * 2); g.fill();
    };
    tree(w * 0.07, 1.1); tree(w * 0.93, 0.95);
    // цветочки на траве
    for (let i = 0; i < 14; i++) {
      const x = ((i * 0.618) % 1) * w, y = T - u * (0.015 + ((i * 0.37) % 1) * 0.08);
      g.fillStyle = ['#FFFFFF', '#FFD6E7', '#FFF3A3'][i % 3];
      for (let k = 0; k < 5; k++) { const an = k / 5 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(an) * u * 0.006, y + Math.sin(an) * u * 0.006, u * 0.005, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#FFC233'; g.beginPath(); g.arc(x, y, u * 0.004, 0, Math.PI * 2); g.fill();
    }
    this.bg = c;
  }

  /** Скатерть в клетку — поверх зверя (он «за столом»). */
  drawTable(ctx) {
    const { w, h } = this.stage;
    const T = this.tableTop, u = this.stage.unit;
    ctx.fillStyle = '#FFFDF8'; ctx.fillRect(0, T, w, h - T);
    const cell = u * 0.07;
    ctx.fillStyle = 'rgba(242,95,95,0.42)';
    for (let x = -cell / 2 + (w / 2) % (cell * 2); x < w; x += cell * 2) ctx.fillRect(x, T, cell, h - T);
    for (let y = T + cell * 0.5; y < h; y += cell * 2) ctx.fillRect(0, y, w, cell);
    // край стола
    const lip = u * 0.022;
    ctx.fillStyle = 'rgba(160,60,40,0.12)'; ctx.fillRect(0, T + lip, w, lip * 0.8);
    ctx.fillStyle = '#F7EBDD'; ctx.fillRect(0, T - 1, w, lip);
    ctx.lineWidth = Math.max(2, u * 0.006); ctx.strokeStyle = '#3D2614';
    ctx.beginPath(); ctx.moveTo(0, T - 1); ctx.lineTo(w, T - 1); ctx.stroke();
    // тарелки
    for (const s of this.slots) {
      const rx = this.F * 0.62, ry = this.F * 0.2, py = s.y + this.F * 0.28;
      ctx.fillStyle = 'rgba(80,30,10,0.12)'; ctx.beginPath(); ctx.ellipse(s.x, py + ry * 0.35, rx * 1.02, ry * 1.05, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(s.x, py, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = Math.max(2, u * 0.005); ctx.strokeStyle = '#3D2614'; ctx.stroke();
      ctx.strokeStyle = 'rgba(90,160,220,0.55)'; ctx.lineWidth = Math.max(1.5, u * 0.004);
      ctx.beginPath(); ctx.ellipse(s.x, py, rx * 0.72, ry * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  drawFoodItem(ctx, f) {
    if (f.sc <= 0.01) return;
    let y = f.y, rot = f.rot;
    if (f.state === 'home' && f.hopT < 0.9) {
      const k = f.hopT / 0.9;
      y -= Math.abs(Math.sin(k * Math.PI * 2)) * this.F * 0.25 * (1 - k * 0.5);
      rot += Math.sin(k * Math.PI * 4) * 0.15;
    }
    if (f.state === 'drag') rot += Math.sin(this.time * 9) * 0.06;
    const lift = f.state === 'drag' ? 1.12 : 1;
    if (f.state === 'drag') {
      ctx.fillStyle = 'rgba(60,30,10,0.14)';
      ctx.beginPath(); ctx.ellipse(f.x + this.F * 0.08, f.y + this.F * 0.45, this.F * 0.36, this.F * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    }
    drawFood(ctx, f.kind, f.x, y, this.F * f.sc * lift, { rot });
  }

  draw(ctx) {
    const { w, h } = this.stage;
    if (!this.bg) this.drawBg();
    ctx.drawImage(this.bg, 0, 0, w, h);
    const a = this.a, S = this.S;
    const dy = this.dy();
    const blink = a.blink > 0 && !a.mood;
    const chew = a.state === 'chew' ? 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(a.t * 24)) : 0;
    const open = Math.max(a.open, a.reach * 0.85);
    const o = {
      blink, open, look: a.look, ear: a.ear + a.reach * 0.4, mood: a.mood, chew, props: false, paws: false, wave: a.wave,
    };
    // зверь за столом
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w, this.tableTop + 2); ctx.clip();
    ctx.translate(this.ax, this.ay + dy);
    const sh = a.shake > 0.02 ? Math.sin(this.time * 30) * 0.09 * a.shake : 0;
    ctx.rotate(sh);
    const breathe = 1 + Math.sin(this.time * 2.2) * 0.008;
    ctx.scale(1 + a.reach * 0.04, breathe + a.reach * 0.04);
    drawAnimal(ctx, a.kind, 0, 0, S, o);
    ctx.restore();

    this.drawTable(ctx);

    // лапки на краю стола
    if (a.state !== 'enter' || a.t > 0.3) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, w, this.tableTop + S * 0.14); ctx.clip();
      ctx.translate(this.ax, this.ay + Math.max(0, dy));
      ctx.scale(S / 100, S / 100);
      drawPaws(ctx, a.kind, a.wave, false);
      ctx.restore();
    }

    // угощение: на тарелках, затем то, что в пальце/в полёте — сверху
    const order = [...this.foods].sort((p, q) => (p.state === 'home' || p.state === 'in' ? 0 : 1) - (q.state === 'home' || q.state === 'in' ? 0 : 1));
    for (const f of order) this.drawFoodItem(ctx, f);

    // крошки и сердечки
    for (const q of this.parts) {
      if (q.t < 0) continue;
      const al = clamp(1 - q.t / q.life, 0, 1);
      if (q.ring) {
        // расходящийся кружок от пальца
        const k = q.t / q.life;
        ctx.globalAlpha = (1 - k) * 0.5;
        ctx.lineWidth = Math.max(2, this.S * 0.025) * (1 - k * 0.6);
        ctx.strokeStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (0.3 + k), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      if (q.heart) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, al * 2);
        ctx.translate(q.x + Math.sin(q.t * 5) * this.S * 0.04, q.y);
        const s = q.r * Math.min(1, q.t * 6) / 20;
        ctx.scale(s, s);
        const p = new Path2D('M0 14 C-22 0 -16 -16 -6 -14 C-2 -13 0 -10 0 -8 C0 -10 2 -13 6 -14 C16 -16 22 0 0 14 Z');
        ctx.fillStyle = '#FF6B8B'; ctx.fill(p);
        ctx.lineWidth = 2.6; ctx.strokeStyle = '#3D2614'; ctx.lineJoin = 'round'; ctx.stroke(p);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(-8, -6, 3, 2, -0.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.globalAlpha = al;
        ctx.fillStyle = q.col;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
}
