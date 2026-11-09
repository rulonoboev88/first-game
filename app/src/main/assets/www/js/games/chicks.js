// Цыплята — главная игра. Белый фон.
// Тап → цыплёнок (иногда сюрприз: яйцо, курица, петух, золотой, утята, гусята, индюк, очень редко лиса).
// Тап по птице → прыжок с кувырком. Проведение → зёрнышки, птицы сбегаются клевать.
import { drawBird, drawEgg, drawFox, drawGrain, BIRDS } from '../art/birds.js';
import { panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';
import * as S from '../sounds/farm.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const GRAIN_COLORS = ['#E0A458', '#D4A24C', '#C98E3E', '#F0C27B', '#B8863B'];

// Насколько быстро ходит каждая птица (в высотах цыплёнка в секунду).
const SPEED = { chick: [0.9, 2.4], gold: [1.0, 2.1], duckling: [0.8, 2.1], gosling: [0.75, 1.8], hen: [0.6, 1.3], rooster: [0.6, 1.2], turkey: [0.5, 1.0] };

export default class ChicksGame {
  static volume = 0.9;       // выравнивание громкости между играми (tools/audit.js)
  static erasable = false;
  static background = '#FFFFFF';

  constructor(stage) {
    this.stage = stage;
    this.birds = [];
    this.eggs = [];
    this.grains = [];
    this.fox = null;
    this.taps = 0;
    this.lastFoxAt = -999;
    this.time = 0;
    S.preloadFarm(); // натуральные голоса птиц
  }

  get size() {
    return clamp(this.stage.unit * 0.058, 30, 64);
  }

  pan(x) {
    return panFor(x, this.stage.w);
  }

  // ---------- Создание ----------

  chooseSpawn() {
    const r = Math.random();
    const alive = this.birds.length;
    if (!this.fox && this.taps > 15 && alive >= 6 && this.time - this.lastFoxAt > 25 && r < 0.014) return 'fox';
    const table = [
      ['rooster', 0.045], ['hen', 0.065], ['egg', 0.08], ['gold', 0.022],
      ['duckling', 0.05], ['gosling', 0.04], ['turkey', 0.016],
    ];
    let acc = 0;
    const r2 = Math.random();
    for (const [k, p] of table) {
      acc += p;
      if (r2 < acc) return k;
    }
    return 'chick';
  }

  spawnBird(kind, x, y, { appear = true, heading = null } = {}) {
    const sz = this.size;
    // Направление: в основном влево/вправо, но с наклоном вверх или вниз.
    const a = heading != null ? heading : (Math.random() < 0.5 ? 0 : Math.PI) + rnd(-1.0, 1.0);
    const [s0, s1] = SPEED[kind];
    const sp = rnd(s0, s1) * sz;
    const b = {
      kind, x, y, sz,
      dir: a, speed: sp, baseSpeed: sp,
      state: appear ? 'appear' : 'walk', st: 0,
      step: Math.random(), hop: 0, spin: 0, wing: 0, tilt: 0, squash: 0,
      flip: Math.cos(a) < 0,
      nextAct: rnd(1.2, 3.5), blinkAt: rnd(1, 4), blink: 0,
      layAt: kind === 'hen' ? rnd(2.5, 5) : Infinity,
      target: null, born: this.time,
    };
    this.birds.push(b);
    return b;
  }

  voice(b, loud = false) {
    const p = this.pan(b.x);
    switch (b.kind) {
      case 'chick': S.chirp({ pan: p, loud }); break;
      case 'gold': S.goldChirp(p); break;
      case 'duckling': S.quack(p, true); break;
      case 'gosling': S.honk(p); break;
      case 'hen': S.cluck(p, loud); break;
      case 'rooster': S.crow(p); break;
      case 'turkey': S.gobble(p); break;
    }
  }

  spawnAt(x, y) {
    this.taps++;
    const kind = this.chooseSpawn();
    const sz = this.size;
    if (kind === 'fox') {
      this.startFox();
      haptic(2);
      return;
    }
    if (kind === 'egg') {
      this.eggs.push({ x, y: y + sz * 0.3, sz: sz * 0.62, t: 0, hatchAt: rnd(1.1, 1.8), gold: Math.random() < 0.1 });
      S.pop(this.pan(x));
      haptic(1);
      return;
    }
    const feetY = y + sz * BIRDS[kind].height * 0.42;
    const b = this.spawnBird(kind, x, feetY);
    if (kind === 'rooster') {
      b.state = 'crow'; b.st = 0;
      haptic(2);
    } else {
      haptic(1);
    }
    this.voice(b);
    if (this.fox) this.makeFlee(b);
  }

  // ---------- Лиса ----------

  startFox() {
    const { w, h } = this.stage;
    const fromLeft = Math.random() < 0.5;
    const sz = this.size * 1.9;
    this.fox = {
      fromLeft, sz, t: 0, run: 0,
      x: fromLeft ? -sz * 1.2 : w + sz * 1.2,
      y: h * rnd(0.5, 0.7),
      cx: w * rnd(0.4, 0.6), cy: h * rnd(0.45, 0.6),
      r: Math.min(w, h) * 0.22,
      phase: 'in', flip: !fromLeft, hop: 0,
    };
    this.lastFoxAt = this.time;
    S.foxEnter(this.pan(this.fox.x));
    for (const b of this.birds) this.makeFlee(b);
    // Писк паники «волной»
    this.birds.slice(0, 8).forEach((b, i) => setTimeout(() => S.panicChirp(this.pan(b.x)), i * 90));
  }

  makeFlee(b) {
    if (!this.fox) return;
    const f = this.fox;
    let a = Math.atan2(b.y - f.y, b.x - f.x);
    a += rnd(-0.4, 0.4);
    b.dir = a;
    b.speed = b.sz * rnd(3.5, 5);
    b.state = 'flee';
    b.st = 0;
    b.target = null;
    b.flip = Math.cos(a) < 0;
  }

  updateFox(dt) {
    const f = this.fox;
    if (!f) return;
    const { w } = this.stage;
    f.t += dt;
    const speed = f.sz * 3.2;
    let px = f.x, py = f.y;
    if (f.phase === 'in') {
      const tx = f.cx + (f.fromLeft ? -f.r : f.r), ty = f.cy;
      const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
      if (d < speed * dt * 1.5) { f.phase = 'loop'; f.ang = f.fromLeft ? Math.PI : 0; f.loopT = 0; }
      else { f.x += (dx / d) * speed * dt; f.y += (dy / d) * speed * dt; }
    } else if (f.phase === 'loop') {
      const angSpeed = speed / f.r;
      f.loopT += angSpeed * dt;
      const dirSign = f.fromLeft ? 1 : -1;
      f.ang += dirSign * angSpeed * dt;
      f.x = f.cx + Math.cos(f.ang) * f.r;
      f.y = f.cy + Math.sin(f.ang) * f.r * 0.55;
      if (f.loopT > Math.PI * 2) { f.phase = 'out'; S.foxSigh(this.pan(f.x)); }
    } else {
      f.x += (f.fromLeft ? 1 : -1) * speed * dt;
      if (f.x < -f.sz * 2 || f.x > w + f.sz * 2) { this.fox = null; return; }
    }
    const vx = f.x - px;
    if (Math.abs(vx) > 0.01) f.flip = vx < 0;
    f.run += dt * 2.6;
    if (f.hop > 0) f.hop = Math.max(0, f.hop - dt * 2.2);
    // Птицы рядом с лисой продолжают убегать
    for (const b of this.birds) {
      if (b.state !== 'flee' && Math.hypot(b.x - f.x, b.y - f.y) < f.sz * 3) this.makeFlee(b);
    }
  }

  // ---------- Касания ----------

  hitBird(x, y) {
    // Сверху (ближе к зрителю) — те, у кого y больше
    let best = null, bestY = -Infinity;
    for (const b of this.birds) {
      const H = b.sz * BIRDS[b.kind].height;
      const cx = b.x, cy = b.y - H * 0.48 - b.hop;
      const rx = Math.max(H * 0.5, 26), ry = Math.max(H * 0.52, 26); // палец малыша толще птички
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1 && b.y > bestY) { best = b; bestY = b.y; }
    }
    return best;
  }

  hitEgg(x, y) {
    return this.eggs.find((e) => e.t < e.hatchAt && Math.hypot(x - e.x, y - (e.y - e.sz * 0.4)) < Math.max(e.sz * 0.55, 24));
  }

  hitFox(x, y) {
    const f = this.fox;
    if (!f) return false;
    return Math.abs(x - f.x) < Math.max(f.sz * 0.8, 40) && y < f.y + 10 && y > f.y - Math.max(f.sz * 0.9, 50);
  }

  onDown(p) {
    p.data.lastGrain = { x: p.x, y: p.y };
    if (this.hitFox(p.x, p.y)) {
      this.fox.hop = 1;
      S.foxBoing(this.pan(p.x));
      haptic(1);
      p.data.reacted = true;
      return;
    }
    const egg = this.hitEgg(p.x, p.y);
    if (egg) {
      egg.t = Math.max(egg.t, egg.hatchAt - 0.15);
      haptic(1);
      p.data.reacted = true;
      return;
    }
    const b = this.hitBird(p.x, p.y);
    if (b) {
      this.react(b);
      p.data.reacted = true;
      return;
    }
    this.spawnAt(p.x, p.y);
  }

  react(b) {
    if (b.state === 'hopflip') return;
    b.prevState = b.state === 'flee' ? 'flee' : 'walk';
    b.state = 'hopflip';
    b.st = 0;
    this.voice(b, true);
    haptic(1);
  }

  onMove(p) {
    const step = this.size * 0.22;
    const lg = p.data.lastGrain;
    let d = Math.hypot(p.x - lg.x, p.y - lg.y);
    if (d < step) return;
    // Сыпем зёрнышки вдоль пути пальца
    const n = Math.floor(d / step);
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      const gx = lg.x + (p.x - lg.x) * k + rnd(-1, 1) * step * 0.6;
      const gy = lg.y + (p.y - lg.y) * k + rnd(-1, 1) * step * 0.6;
      this.addGrain(gx, gy);
    }
    p.data.lastGrain = { x: p.x, y: p.y };
  }

  addGrain(x, y) {
    if (this.grains.length > 500) this.grains.shift();
    this.grains.push({ x, y, rot: rnd(0, Math.PI), c: pick(GRAIN_COLORS), born: this.time, r: Math.max(2.2, this.size * rnd(0.06, 0.08)), taken: 0 });
    if (Math.random() < 0.35) S.grainTick(this.pan(x));
    if (Math.random() < 0.3) haptic(0);
  }

  onUp() {}

  // ---------- Жизнь ----------

  nearestGrain(b) {
    let best = null, bd = Infinity;
    const range = Math.max(this.stage.w, this.stage.h) * 0.7;
    for (const g of this.grains) {
      if (g.eaten) continue;
      const d = Math.hypot(g.x - b.x, g.y - b.y) + g.taken * b.sz * 0.6; // не все к одному зерну
      if (d < bd && d < range) { bd = d; best = g; }
    }
    return best;
  }

  onScreen(b) {
    const { w, h } = this.stage;
    return b.x > -b.sz * 0.2 && b.x < w + b.sz * 0.2 && b.y > b.sz * 0.3 && b.y < h + b.sz * 0.2;
  }

  update(dt) {
    this.time += dt;
    const { w, h } = this.stage;
    this.updateFox(dt);

    // Яйца
    for (const e of this.eggs) {
      e.t += dt;
      if (e.t >= e.hatchAt && !e.hatched) {
        e.hatched = true;
        S.eggCrack(this.pan(e.x));
        haptic(1);
        setTimeout(() => {
          const b = this.spawnBird(e.gold ? 'gold' : 'chick', e.x, e.y);
          this.voice(b);
          if (this.fox) this.makeFlee(b);
        }, 260);
      }
    }
    this.eggs = this.eggs.filter((e) => e.t < e.hatchAt + 1.6);

    // Зёрна стареют и исчезают через ~25 с
    this.grains = this.grains.filter((g) => !g.eaten && this.time - g.born < 25);

    for (const b of this.birds) this.updateBird(b, dt);

    this.birds = this.birds.filter((b) => {
      const m = b.sz * 2.2;
      return b.x > -m && b.x < w + m && b.y > -b.sz * 0.05 && b.y < h + b.sz * BIRDS[b.kind].height * 1.2;
    });
  }

  updateBird(b, dt) {
    b.st += dt;
    const sz = b.sz;
    let moving = false;

    // моргание
    b.blinkAt -= dt;
    if (b.blinkAt <= 0) { b.blink = 0.12; b.blinkAt = rnd(1.8, 5); }
    if (b.blink > 0) b.blink -= dt;

    // Голодные идут к зёрнам (кроме убегающих и занятых)
    if ((b.state === 'walk' || b.state === 'look') && this.grains.length && this.onScreen(b)) {
      const g = this.nearestGrain(b);
      if (g) { b.state = 'seek'; b.target = g; g.taken++; b.st = 0; }
    }

    switch (b.state) {
      case 'appear': {
        if (b.st > 0.45) { b.state = 'walk'; b.st = 0; }
        break;
      }
      case 'crow': {
        b.tilt = -0.18 * Math.sin(Math.min(1, b.st / 0.3) * Math.PI / 2);
        b.wing = (Math.sin(b.st * 22) + 1) * 0.5;
        if (b.st > 1.6) { b.state = 'walk'; b.st = 0; b.tilt = 0; b.wing = 0; }
        break;
      }
      case 'walk': {
        moving = true;
        b.dir += rnd(-0.6, 0.6) * dt; // лёгкое блуждание
        b.nextAct -= dt;
        if (b.nextAct <= 0) {
          const r = Math.random();
          b.st = 0;
          if (r < 0.35) b.state = 'peck';
          else if (r < 0.6) b.state = 'look';
          else if (r < 0.8) b.state = 'hop';
          b.nextAct = rnd(1.5, 4);
        }
        if (b.kind === 'hen') {
          b.layAt -= dt;
          if (b.layAt <= 0 && this.onScreen(b)) { b.state = 'lay'; b.st = 0; b.layAt = rnd(5, 9); S.cluck(this.pan(b.x), true); }
        }
        break;
      }
      case 'peck': {
        b.tilt = 0.4 * Math.abs(Math.sin(b.st * Math.PI * 3));
        if (b.st > 0.66) { b.state = 'walk'; b.tilt = 0; }
        break;
      }
      case 'look': {
        if (b.st > 0.25 && !b.looked) { b.flip = !b.flip; b.looked = true; }
        if (b.st > 0.7) { b.flip = Math.cos(b.dir) < 0; b.looked = false; b.state = 'walk'; }
        break;
      }
      case 'hop': {
        moving = true;
        b.hop = Math.sin(Math.min(1, b.st / 0.35) * Math.PI) * sz * 0.18;
        if (b.st > 0.35) { b.hop = 0; b.state = 'walk'; }
        break;
      }
      case 'hopflip': {
        const T = 0.62;
        const k = Math.min(1, b.st / T);
        b.hop = Math.sin(k * Math.PI) * sz * 0.55;
        b.spin = k * Math.PI * 2;
        b.wing = Math.sin(k * Math.PI);
        if (k >= 1) { b.hop = 0; b.spin = 0; b.wing = 0; b.state = b.prevState || 'walk'; b.st = 0; }
        if (b.prevState === 'flee') moving = true;
        break;
      }
      case 'lay': {
        b.squash = 0.14 * Math.sin(Math.min(1, b.st / 0.9) * Math.PI);
        if (b.st > 0.5 && !b.laid) {
          b.laid = true;
          const back = b.flip ? 1 : -1;
          this.eggs.push({ x: b.x + back * sz * 0.55, y: b.y, sz: sz * 0.55, t: 0, hatchAt: rnd(1.6, 2.4), gold: Math.random() < 0.08 });
          S.pop(this.pan(b.x));
        }
        if (b.st > 1.0) { b.state = 'walk'; b.squash = 0; b.laid = false; }
        break;
      }
      case 'seek': {
        const g = b.target;
        if (!g || g.eaten || !this.grains.includes(g)) { b.state = 'walk'; b.target = null; b.speed = b.baseSpeed; break; }
        const dx = g.x - b.x, dy = g.y - b.y, d = Math.hypot(dx, dy);
        b.dir = Math.atan2(dy, dx);
        b.speed = b.baseSpeed * 1.9 + sz * 0.4;
        if (d < sz * 0.22) { b.state = 'eat'; b.st = 0; b.flip = dx < 0 ? true : dx > 0 ? false : b.flip; }
        else moving = true;
        break;
      }
      case 'eat': {
        const prev = Math.floor((b.st - dt) / 0.28);
        const cur = Math.floor(b.st / 0.28);
        b.tilt = 0.5 * Math.abs(Math.sin((b.st / 0.28) * Math.PI));
        if (cur !== prev && cur > 0) S.peck(this.pan(b.x));
        if (b.st > 0.84) {
          if (b.target) b.target.eaten = true;
          b.target = null;
          b.tilt = 0;
          b.speed = b.baseSpeed;
          if (Math.random() < 0.4) this.voice(b);
          const g = this.nearestGrain(b);
          if (g) { b.state = 'seek'; b.target = g; g.taken++; }
          else { b.state = 'walk'; b.dir = (Math.random() < 0.5 ? 0 : Math.PI) + rnd(-1, 1); }
          b.st = 0;
        }
        break;
      }
      case 'flee': {
        moving = true;
        b.wing = (Math.sin(b.st * 30) + 1) * 0.5;
        b.hop = Math.abs(Math.sin(b.st * 14)) * sz * 0.06;
        break;
      }
    }

    if (moving) {
      b.x += Math.cos(b.dir) * b.speed * dt;
      b.y += Math.sin(b.dir) * b.speed * dt * 0.75;
      b.step += (b.speed / sz) * dt * 1.6;
      if (b.state !== 'look' && Math.abs(Math.cos(b.dir)) > 0.05) b.flip = Math.cos(b.dir) < 0;
    }
  }

  // ---------- Fold: перестройка ----------

  resize(prev, next) {
    const sx = next.w / prev.w, sy = next.h / prev.h;
    const k = this.size / (this.birds[0] ? this.birds[0].sz : this.size);
    const move = (o) => { o.x *= sx; o.y *= sy; };
    this.birds.forEach((b) => { move(b); b.sz *= k; b.speed *= k; b.baseSpeed *= k; });
    this.eggs.forEach((e) => { move(e); e.sz *= k; });
    this.grains.forEach((g) => { move(g); g.r *= k; });
    if (this.fox) { move(this.fox); this.fox.cx *= sx; this.fox.cy *= sy; this.fox.r *= Math.min(sx, sy); this.fox.sz *= k; }
  }

  // ---------- Рисование ----------

  draw(ctx) {
    const { w, h } = this.stage;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    for (const g of this.grains) {
      const age = this.time - g.born;
      const a = Math.min(1, age * 8) * Math.min(1, (25 - age) / 2);
      ctx.globalAlpha = a;
      drawGrain(ctx, g.x, g.y, g.r, g.rot, g.c);
    }
    ctx.globalAlpha = 1;

    // Все объекты по глубине (y)
    const items = [];
    for (const b of this.birds) items.push({ y: b.y, b });
    for (const e of this.eggs) items.push({ y: e.y, e });
    if (this.fox) items.push({ y: this.fox.y, f: this.fox });
    items.sort((a, b) => a.y - b.y);

    for (const it of items) {
      if (it.b) this.drawBirdItem(ctx, it.b);
      else if (it.e) this.drawEggItem(ctx, it.e);
      else this.drawFoxItem(ctx, it.f);
    }
  }

  shadow(ctx, x, y, rx, alpha = 0.08) {
    ctx.beginPath();
    ctx.ellipse(x, y + rx * 0.05, rx, rx * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(74,44,23,${alpha})`;
    ctx.fill();
  }

  drawBirdItem(ctx, b) {
    const H = b.sz * BIRDS[b.kind].height;
    // появление «пружинкой»
    let scale = 1;
    const age = this.time - b.born;
    if (age < 0.45) {
      const k = age / 0.45;
      scale = k < 0.6 ? (k / 0.6) * 1.15 : 1.15 - ((k - 0.6) / 0.4) * 0.15;
    }
    const shadowK = 1 - Math.min(0.5, b.hop / (b.sz * 0.6));
    this.shadow(ctx, b.x, b.y, H * 0.32 * scale * shadowK);
    const waddle = b.state === 'walk' || b.state === 'seek' || b.state === 'flee' ? Math.sin(b.step * Math.PI * 2) * 0.06 : 0;
    const bob = (b.state === 'walk' || b.state === 'seek') ? Math.abs(Math.sin(b.step * Math.PI * 2)) * b.sz * 0.025 : 0;
    ctx.save();
    ctx.translate(b.x, b.y - b.hop - bob);
    if (waddle) ctx.rotate(waddle);
    drawBird(ctx, b.kind, 0, 0, b.sz * scale, {
      flip: b.flip, step: b.step, wing: b.wing, blink: b.blink > 0,
      tilt: b.tilt, squash: b.squash, spin: b.spin, t: this.time, cache: true,
    });
    ctx.restore();
  }

  drawEggItem(ctx, e) {
    const k = e.t / e.hatchAt;
    const wobble = k < 1 ? Math.sin(e.t * (8 + k * 14)) * 0.12 * Math.min(1, k * 1.6) : 0;
    const crack = k > 0.55 ? (k - 0.55) / 0.45 : 0;
    const open = e.t > e.hatchAt ? Math.min(1.2, (e.t - e.hatchAt) / 0.5) : 0;
    const fade = e.t > e.hatchAt + 0.9 ? 1 - (e.t - e.hatchAt - 0.9) / 0.7 : 1;
    const appear = Math.min(1, e.t / 0.25);
    ctx.globalAlpha = Math.max(0, fade);
    this.shadow(ctx, e.x, e.y, e.sz * 0.3);
    drawEgg(ctx, e.x, e.y, e.sz * (0.6 + 0.4 * appear), { wobble, crack, open, gold: e.gold });
    ctx.globalAlpha = 1;
  }

  drawFoxItem(ctx, f) {
    this.shadow(ctx, f.x, f.y, f.sz * 0.6, 0.1);
    const hop = Math.sin(f.hop * Math.PI) * f.sz * 0.4;
    drawFox(ctx, f.x, f.y - hop, f.sz, { flip: f.flip, run: f.run, blink: false });
  }

  destroy() {}
}
