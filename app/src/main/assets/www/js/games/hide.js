// Прятки. Белый фон, простые укрытия: куст, стог сена, домик с окошком.
// Из-за куста и стога торчат ушки, в тёмном окошке моргают глазки.
// Тап по укрытию → зверь выпрыгивает: «ку-ку!» — и снова прячется (иногда меняется на другого).
import { drawAnimal, ANIMALS } from '../art/animals.js';
import { INK } from '../art/chick.js';
import { panFor, noise } from '../core/audio.js';
import { haptic } from '../core/haptics.js';
import { animalVoice, preloadAnimals, cuckoo, whoosh } from '../sounds/animals.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const TYPES = ['bush', 'hay', 'house'];
const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

export default class HideGame {
  static erasable = false;
  static background = '#FFFFFF';

  constructor(stage) {
    this.stage = stage;
    this.time = 0;
    this.nextTease = 2;
    preloadAnimals();
    this.layout();
  }

  layout() {
    const { w, h } = this.stage;
    const land = w > h * 1.15;
    const n = land ? (w > h * 1.6 ? 5 : 4) : 4;
    const cols = land ? n : 2;
    const rows = Math.ceil(n / cols);
    const cw = w / cols, ch = h / rows;
    const prev = this.spots || [];
    const used = new Set();
    this.spots = [];
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const objW = Math.min(cw * 0.78, ch * 0.62);
      const old = prev[i];
      const kind = old ? old.kind : this.freshKind(used);
      used.add(kind);
      this.spots.push({
        type: old ? old.type : TYPES[i % TYPES.length],
        x: cw * (c + 0.5),
        y: ch * (r + 0.5) + objW * 0.25 + (land && i % 2 ? ch * 0.08 : 0), // земля под укрытием
        w: objW,
        kind, state: old ? old.state : 'hidden', t: old ? old.t : 0, tease: 0, blinkAt: rnd(1, 3), blink: 0, talk: 0,
      });
    }
  }

  freshKind(used) {
    const free = ANIMALS.filter((k) => !used.has(k) && !(this.spots || []).some((s) => s.kind === k));
    const list = free.length ? free : ANIMALS;
    return list[Math.floor(Math.random() * list.length)];
  }

  // ---------- Касания ----------

  onDown(p) {
    for (const s of this.spots) {
      const top = this.objTop(s);
      if (Math.abs(p.x - s.x) < s.w * 0.6 && p.y > top - s.w * 0.6 && p.y < s.y + s.w * 0.1) {
        this.reveal(s);
        return;
      }
    }
  }
  onMove() {}
  onUp() {}

  reveal(s) {
    const pan = panFor(s.x, this.stage.w);
    if (s.state === 'out') {
      // уже снаружи — ещё раз «ку-ку» и подпрыгнуть
      s.t = Math.min(s.t, 0.5);
      s.bump = 0;
      animalVoice(s.kind, pan, { excited: true });
      s.talk = 0.7;
      haptic(1);
      return;
    }
    s.state = 'out';
    s.t = 0;
    s.bump = null;
    cuckoo(pan);
    setTimeout(() => { animalVoice(s.kind, pan); s.talk = 0.7; }, 420);
    haptic(1);
  }

  objTop(s) {
    return s.y - s.w * (s.type === 'house' ? 1.05 : s.type === 'hay' ? 0.62 : 0.6);
  }

  // ---------- Время ----------

  update(dt) {
    this.time += dt;
    for (const s of this.spots) {
      s.t += dt;
      if (s.bump != null) s.bump += dt;
      s.blinkAt -= dt;
      if (s.blinkAt <= 0) { s.blink = 0.14; s.blinkAt = rnd(1.5, 3.5); }
      if (s.blink > 0) s.blink -= dt;
      if (s.talk > 0) s.talk -= dt;
      if (s.state === 'out' && s.t > 2.6) {
        s.state = 'back'; s.t = 0;
        whoosh(panFor(s.x, this.stage.w));
      } else if (s.state === 'back' && s.t > 0.4) {
        s.state = 'hidden'; s.t = 0;
        if (Math.random() < 0.65) s.kind = this.freshKind(new Set());
      }
      if (s.tease > 0) s.tease = Math.max(0, s.tease - dt);
    }
    // время от времени кто-то шуршит и чуть выглядывает — зовёт поиграть
    this.nextTease -= dt;
    if (this.nextTease <= 0) {
      this.nextTease = rnd(2.5, 5);
      const hidden = this.spots.filter((s) => s.state === 'hidden');
      if (hidden.length) {
        const s = hidden[Math.floor(Math.random() * hidden.length)];
        s.tease = 0.9;
        noise({ dur: 0.35, gain: 0.05, type: 'bandpass', freq: 2500, q: 0.8, pan: panFor(s.x, this.stage.w), wet: 0.3 });
      }
    }
  }

  resize() {
    this.layout();
  }

  // ---------- Рисование ----------

  /** Насколько зверь выглянул: 0 — только ушки, 1 — весь над укрытием. */
  out(s) {
    if (s.state === 'out') return easeOutBack(Math.min(1, s.t / 0.4));
    if (s.state === 'back') return 1 - Math.min(1, s.t / 0.4);
    return Math.sin((s.tease / 0.9) * Math.PI) * 0.18;
  }

  draw(ctx) {
    const { w, h } = this.stage;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const sorted = [...this.spots].sort((a, b) => a.y - b.y);
    for (const s of sorted) {
      // тень-земля
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.w * 0.55, s.w * 0.09, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(74,44,23,0.07)';
      ctx.fill();
      if (s.type === 'house') this.drawHouseSpot(ctx, s);
      else this.drawUpSpot(ctx, s);
    }
  }

  animalOpts(s) {
    return { blink: s.blink > 0, open: s.talk > 0 ? Math.abs(Math.sin(s.talk * 14)) : 0, ear: Math.sin(this.time * 4 + s.x) * 0.5 };
  }

  /** Куст / стог: зверь сидит позади и поднимается над верхом укрытия. */
  drawUpSpot(ctx, s) {
    const size = s.w * 0.62;
    const top = this.objTop(s);
    const k = this.out(s);
    const bump = s.bump != null ? Math.sin(Math.min(1, s.bump / 0.35) * Math.PI) * size * 0.2 : 0;
    // спрятан: видны только ушки/макушка; выглянул: лапки на краю укрытия
    const hiddenY = top + size * 0.3;
    const outY = top - size * 0.48; // лапки ложатся на край укрытия
    const y = hiddenY + (outY - hiddenY) * k - bump;
    // всё, что ниже земли, не рисуем
    ctx.save();
    ctx.beginPath(); ctx.rect(s.x - s.w * 2, -10000, s.w * 4, s.y + 10000); ctx.clip();
    drawAnimal(ctx, s.kind, s.x, y, size, { ...this.animalOpts(s), paws: k > 0.5 });
    if (s.type === 'bush') this.drawBush(ctx, s); else this.drawHay(ctx, s);
    ctx.restore();
  }

  drawBush(ctx, s) {
    const W = s.w, x = s.x, y = s.y;
    const puffs = [[-0.34, -0.2, 0.24], [-0.14, -0.42, 0.26], [0.14, -0.44, 0.27], [0.36, -0.22, 0.24], [0, -0.22, 0.3]];
    ctx.lineWidth = Math.max(2.5, W * 0.025);
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#69DB7C';
    ctx.beginPath();
    for (const [dx, dy, r] of puffs) { ctx.moveTo(x + dx * W + r * W, y + dy * W); ctx.arc(x + dx * W, y + dy * W, r * W, 0, Math.PI * 2); }
    ctx.stroke();
    ctx.fill();
    ctx.fillRect(x - W * 0.5, y - W * 0.25, W, W * 0.25);
    // ровный низ куста по земле
    ctx.beginPath(); ctx.moveTo(x - W * 0.58, y - ctx.lineWidth / 2); ctx.lineTo(x + W * 0.6, y - ctx.lineWidth / 2);
    ctx.stroke();
    // светлые пятнышки
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const [dx, dy] of [[-0.2, -0.5], [0.12, -0.55], [0.32, -0.3]]) {
      ctx.beginPath(); ctx.ellipse(x + dx * W, y + dy * W, W * 0.05, W * 0.03, -0.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawHay(ctx, s) {
    const W = s.w, x = s.x, y = s.y;
    ctx.lineWidth = Math.max(2.5, W * 0.025);
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#FFD43B';
    ctx.beginPath();
    ctx.moveTo(x - W * 0.55, y);
    ctx.bezierCurveTo(x - W * 0.55, y - W * 0.5, x - W * 0.25, y - W * 0.66, x, y - W * 0.66);
    ctx.bezierCurveTo(x + W * 0.25, y - W * 0.66, x + W * 0.55, y - W * 0.5, x + W * 0.55, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // соломинки
    ctx.strokeStyle = '#E0A800';
    ctx.lineWidth = Math.max(1.5, W * 0.012);
    for (let i = 0; i < 9; i++) {
      const sx = x + (i / 8 - 0.5) * W * 0.8;
      ctx.beginPath(); ctx.moveTo(sx, y - W * 0.08); ctx.lineTo(sx + W * 0.03, y - W * (0.3 + (i % 3) * 0.06)); ctx.stroke();
    }
  }

  /** Домик: в тёмном окошке моргают глазки, «ку-ку» — зверь высовывается из окна. */
  drawHouseSpot(ctx, s) {
    const W = s.w, x = s.x, y = s.y;
    const lw = Math.max(2.5, W * 0.025);
    const wallTop = y - W * 0.6;
    ctx.lineWidth = lw; ctx.strokeStyle = INK;
    // стены
    ctx.fillStyle = '#FFE8CC';
    ctx.beginPath(); ctx.roundRect(x - W * 0.42, wallTop, W * 0.84, W * 0.6, W * 0.03); ctx.fill(); ctx.stroke();
    // крыша
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.moveTo(x - W * 0.55, wallTop + W * 0.02); ctx.lineTo(x, y - W * 1.05); ctx.lineTo(x + W * 0.55, wallTop + W * 0.02); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // окошко
    const wx = x, wy = wallTop + W * 0.28, ww = W * 0.36, wh = W * 0.3;
    ctx.fillStyle = '#3B2A20';
    ctx.beginPath(); ctx.roundRect(wx - ww / 2, wy - wh / 2, ww, wh, W * 0.04); ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.roundRect(wx - ww / 2, wy - wh / 2, ww, wh, W * 0.04); ctx.stroke();
    const k = this.out(s);
    const size = W * 0.56;
    const sill = wy + wh / 2;
    if (s.state === 'hidden' && k < 0.05) {
      // глазки в темноте
      if (!(s.blink > 0)) {
        ctx.fillStyle = '#FFF3BF';
        for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(wx + d * ww * 0.18, wy, W * 0.025, W * 0.035, 0, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    // подоконник
    ctx.fillStyle = '#C08457';
    ctx.beginPath(); ctx.roundRect(wx - ww * 0.62, sill, ww * 1.24, W * 0.05, W * 0.02); ctx.fill(); ctx.stroke();
    if (!(s.state === 'hidden' && k < 0.05)) {
      // зверь высовывается из окна поверх стены, лапки на подоконнике
      ctx.save();
      ctx.beginPath(); ctx.rect(wx - W, sill - W * 2, W * 2, W * 2 + W * 0.01); ctx.clip();
      const yIn = sill + size * 0.5;
      const yOut = sill - size * 0.42;
      drawAnimal(ctx, s.kind, wx, yIn + (yOut - yIn) * k, size * (0.7 + 0.3 * k), { ...this.animalOpts(s), paws: k > 0.6 });
      ctx.restore();
    }
    // дверка
    ctx.fillStyle = '#C08457';
    ctx.beginPath(); ctx.roundRect(x + W * 0.18, y - W * 0.22, W * 0.16, W * 0.22, [W * 0.08, W * 0.08, 0, 0]); ctx.fill(); ctx.stroke();
  }

  destroy() {}
}
