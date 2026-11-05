// Звери из-за угла. Сплошной белый фон.
// Тап → из-за ближайшего к пальцу края выглядывает зверь со своим голосом и ненадолго остаётся.
// Тап по выглянувшему зверю → трюк (прыжок, кружение, «апчхи», машет лапой) и задерживается подольше.
import { drawAnimal, ANIMALS } from '../art/animals.js';
import { panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';
import { animalVoice, preloadAnimals, sneeze, whoosh, boing, swirl } from '../sounds/animals.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const TRICKS = ['hop', 'spin', 'sneeze', 'wave'];

export default class AnimalsGame {
  static erasable = false;
  static background = '#FFFFFF';

  constructor(stage) {
    this.stage = stage;
    this.peeks = [];
    this.time = 0;
    this.lastKind = null;
    this.bag = [];
    preloadAnimals();
  }

  get size() { return clamp(this.stage.unit * 0.24, 90, 210); }

  nextKind() {
    // «мешочек»: все звери по очереди в случайном порядке — без повторов подряд
    if (!this.bag.length) {
      this.bag = [...ANIMALS].sort(() => Math.random() - 0.5);
      if (this.bag[0] === this.lastKind) this.bag.push(this.bag.shift());
    }
    this.lastKind = this.bag.shift();
    return this.lastKind;
  }

  // ---------- Касания ----------

  hit(x, y) {
    for (let i = this.peeks.length - 1; i >= 0; i--) {
      const a = this.peeks[i];
      const c = this.headPos(a);
      if (Math.hypot(x - c.x, y - c.y) < a.size * 0.6) return a;
    }
    return null;
  }

  onDown(p) {
    const a = this.hit(p.x, p.y);
    if (a) { this.trick(a); return; }
    this.spawn(p.x, p.y);
  }
  onMove() {}
  onUp() {}

  spawn(x, y) {
    const { w, h } = this.stage;
    // ближайший край
    const d = { left: x, right: w - x, top: y, bottom: h - y };
    const edge = Object.keys(d).reduce((a, b) => (d[a] < d[b] ? a : b));
    const size = this.size;
    // не даём двум зверям вылезти в одном месте
    let along = edge === 'left' || edge === 'right' ? y : x;
    const span = edge === 'left' || edge === 'right' ? h : w;
    along = clamp(along, size * 0.6, span - size * 0.6);
    for (const o of this.peeks) {
      if (o.edge === edge && Math.abs(o.along - along) < size * 0.9 && o.state !== 'out') {
        this.trick(o);
        return;
      }
    }
    const kind = this.nextKind();
    const a = {
      kind, edge, along, size, t: 0, state: 'in', stay: rnd(2.2, 3.0),
      blinkAt: rnd(0.6, 1.6), blink: 0, open: 0, ear: 0, trick: null, trickT: 0,
      tilt: rnd(-0.18, 0.18),
    };
    this.peeks.push(a);
    whoosh(this.pan(a));
    setTimeout(() => { this.speak(a); }, 250);
    haptic(1);
  }

  speak(a, excited = false) {
    animalVoice(a.kind, this.pan(a), { excited });
    a.talk = 0.7;
  }

  trick(a) {
    if (a.state === 'out') { a.state = 'stay'; a.t = 0; }
    a.trick = TRICKS[Math.floor(Math.random() * TRICKS.length)];
    a.trickT = 0;
    a.stay += 1.8; // задерживается подольше
    const p = this.pan(a);
    if (a.trick === 'hop') boing(p);
    if (a.trick === 'spin') swirl(p);
    if (a.trick === 'sneeze') sneeze(p);
    if (a.trick !== 'sneeze') setTimeout(() => this.speak(a, true), 120);
    haptic(1);
  }

  pan(a) {
    const c = this.headPos(a);
    return panFor(c.x, this.stage.w);
  }

  // ---------- Положение ----------

  /** Насколько зверь высунулся: 0 — спрятан, 1 — выглядывает. */
  reveal(a) {
    if (a.state === 'in') return easeOutBack(Math.min(1, a.t / 0.45));
    if (a.state === 'out') return 1 - Math.min(1, a.t / 0.35) ** 2;
    return 1;
  }

  /** Угол поворота мордочки: «вверх» — от края к центру экрана. */
  angle(a) {
    // сбоку — наклон ~60°, как будто выглядывает из-за угла; сверху — вниз головой, смешно
    return { bottom: 0, top: Math.PI, left: Math.PI / 2 - 0.5, right: -Math.PI / 2 + 0.5 }[a.edge];
  }

  headPos(a) {
    const { w, h } = this.stage;
    const k = this.reveal(a);
    let out = a.size * (0.62 * k - 0.1);
    if (a.trick === 'hop') out += Math.sin(Math.min(1, a.trickT / 0.6) * Math.PI) * a.size * 0.35;
    switch (a.edge) {
      case 'bottom': return { x: a.along, y: h - out };
      case 'top': return { x: a.along, y: out };
      case 'left': return { x: out, y: a.along };
      default: return { x: w - out, y: a.along };
    }
  }

  // ---------- Время ----------

  update(dt) {
    this.time += dt;
    for (const a of this.peeks) {
      a.t += dt;
      if (a.trick) { a.trickT += dt; if (a.trickT > 0.9) a.trick = null; }
      if (a.state === 'in' && a.t > 0.45) { a.state = 'stay'; a.t = 0; }
      else if (a.state === 'stay' && a.t > a.stay) { a.state = 'out'; a.t = 0; whoosh(this.pan(a)); }
      a.blinkAt -= dt;
      if (a.blinkAt <= 0) { a.blink = 0.13; a.blinkAt = rnd(1.4, 3.2); }
      if (a.blink > 0) a.blink -= dt;
      if (a.talk > 0) { a.talk -= dt; a.open = Math.abs(Math.sin(a.talk * 14)) * Math.min(1, a.talk * 3); } else a.open = 0;
      a.ear = Math.sin(this.time * 3 + a.along) * 0.4;
    }
    this.peeks = this.peeks.filter((a) => !(a.state === 'out' && a.t > 0.35));
  }

  resize(prev, next) {
    const ky = next.h / prev.h, kx = next.w / prev.w;
    for (const a of this.peeks) {
      a.along *= a.edge === 'left' || a.edge === 'right' ? ky : kx;
      a.size = this.size;
    }
  }

  // ---------- Рисование ----------

  draw(ctx) {
    const { w, h } = this.stage;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    for (const a of this.peeks) {
      const c = this.headPos(a);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(this.angle(a) + a.tilt * this.reveal(a));
      let sx = 1, sy = 1, rot = 0;
      if (a.trick === 'spin') rot = Math.min(1, a.trickT / 0.7) * Math.PI * 2;
      if (a.trick === 'sneeze') {
        const k = a.trickT;
        if (k < 0.3) { sy = 1 + k * 0.4; sx = 1 - k * 0.2; }
        else if (k < 0.45) { sy = 0.82; sx = 1.12; }
        else { const r = Math.min(1, (k - 0.45) / 0.3); sy = 0.82 + 0.18 * r; sx = 1.12 - 0.12 * r; }
      }
      ctx.rotate(rot);
      ctx.scale(sx, sy);
      const wave = a.trick === 'wave' ? Math.abs(Math.sin(a.trickT * 9)) : 0;
      drawAnimal(ctx, a.kind, 0, 0, a.size, {
        blink: a.blink > 0 || (a.trick === 'sneeze' && a.trickT > 0.25 && a.trickT < 0.5),
        open: a.trick === 'sneeze' && a.trickT > 0.28 && a.trickT < 0.5 ? 1 : a.open,
        ear: a.ear, wave,
      });
      ctx.restore();
    }
  }

  destroy() {}
}
