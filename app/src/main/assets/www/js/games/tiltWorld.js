// Общая основа игр «наклони телефон» (Мʼячики, Ковзанка): вид сверху, физика matter.js.
// · наклон телефона = «гравитация» по плоскости экрана (core/tilt.js);
// · тап по предмету — подпрыгивает (z) и получает лёгкий толчок; держать и вести — тянется за пальцем,
//   отпустил — летит со скоростью пальца (телефон может лежать на столе — играть всё равно можно);
// · тап мимо — волна, ближние предметы отталкиваются; встряска — всё подпрыгивает.
// Игра-наследник рисует и озвучивает: onHit, onTap, onLand, onEmpty, onShake, afterUpdate, draw.
import { loadScript } from '../core/loadScript.js';
import { createTilt } from '../core/tilt.js';
import { panFor } from '../core/audio.js';

const STEP = 1 / 120;
export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class TiltWorld {
  static background = '#FFFFFF';

  static prepare() {
    return loadScript('vendor/matter.min.js');
  }

  /**
   * accel — ускорение при полном наклоне, в долях unit в секунду². inset — толщина бортика по краю экрана.
   * top — сколько ещё отступить сверху (доля unit): у героев, нарисованных сбоку, голова выше точки опоры.
   */
  constructor(stage, { accel = 5, inset = 0, top = 0 } = {}) {
    this.stage = stage;
    const M = (this.M = window.Matter);
    this.engine = M.Engine.create({ enableSleeping: false });
    this.engine.gravity.x = 0;
    this.engine.gravity.y = 0;
    this.world = this.engine.world;
    this.accel = accel;
    this.insetK = inset;
    this.topK = top;
    this.things = [];
    this.walls = [];
    this.rings = [];
    this.grabs = new Map();
    this.time = 0;
    this.acc = 0;
    this.tilt = createTilt({ onShake: (k) => this.shake(k) });
    this.buildWalls();
    this._collide = (e) => this.collide(e);
    M.Events.on(this.engine, 'collisionStart', this._collide);
  }

  get u() { return this.stage.unit; }
  get inset() { return this.u * this.insetK; }
  get topInset() { return this.inset + this.u * this.topK; }
  pan(x) { return panFor(x, this.stage.w); }

  buildWalls() {
    const M = this.M;
    const { w, h } = this.stage;
    const T = 600, i = this.inset, it = this.topInset;
    if (this.walls.length) M.Composite.remove(this.world, this.walls);
    const o = { isStatic: true, restitution: 0, friction: 0, plugin: { wall: true } };
    this.walls = [
      M.Bodies.rectangle(w / 2, it - T / 2, w + 2 * T, T, o),
      M.Bodies.rectangle(w / 2, h - i + T / 2, w + 2 * T, T, o),
      M.Bodies.rectangle(i - T / 2, h / 2, T, h + 2 * T, o),
      M.Bodies.rectangle(w - i + T / 2, h / 2, T, h + 2 * T, o),
    ];
    M.Composite.add(this.world, this.walls);
  }

  /** Добавить предмет: t.r — радиус круга в физике. Остальное (вид, размер) — на совести игры. */
  addThing(t, x, y, opts) {
    const M = this.M;
    const body = M.Bodies.circle(x, y, t.r, { inertia: Infinity, frictionStatic: 0, ...opts });
    body.plugin.thing = t;
    Object.assign(t, { body, z: 0, vz: 0, squash: 0, dir: 0, lastHit: -1, rot: t.rot || 0 });
    this.things.push(t);
    M.Composite.add(this.world, body);
    return t;
  }

  /** Свободное место для нового предмета радиуса r. */
  freeSpot(r) {
    const { w, h } = this.stage;
    const m = this.inset + r * 1.1;
    const corner = this.u * 0.2; // углы свободны: там кнопки и (на катке) сугробы
    let best = null, bestD = -1;
    for (let k = 0; k < 40; k++) {
      const x = rnd(m, w - m), y = rnd(m + this.u * this.topK, h - m);
      if ((x < corner || x > w - corner) && (y < corner || y > h - corner)) continue;
      let d = Infinity;
      for (const t of this.things) d = Math.min(d, Math.hypot(t.body.position.x - x, t.body.position.y - y) - t.r - r);
      if (d > r * 0.3) return { x, y };
      if (d > bestD) { bestD = d; best = { x, y }; }
    }
    return best;
  }

  // ---------- Скорость (px/с) — в matter скорость в px за 1/60 с ----------
  vel(t) { const v = t.body.velocity; return { x: v.x * 60, y: v.y * 60 }; }
  setVel(t, vx, vy) { this.M.Body.setVelocity(t.body, { x: vx / 60, y: vy / 60 }); }
  speed(t) { const v = t.body.velocity; return Math.hypot(v.x, v.y) * 60; }

  // ---------- Шаг ----------

  update(dt) {
    this.time += dt;
    const g = this.engine.gravity;
    g.x = this.tilt.x;
    g.y = this.tilt.y;
    g.scale = (this.u * this.accel) / 1e6;

    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 6) {
      // за пальцем: каждую под-итерацию тянем к пальцу
      for (const gr of this.grabs.values()) {
        const p = gr.t.body.position;
        this.M.Body.setVelocity(gr.t.body, { x: (gr.x - p.x) * 0.9, y: (gr.y - p.y) * 0.9 });
      }
      this.M.Engine.update(this.engine, STEP * 1000);
      this.acc -= STEP;
      n++;
    }
    if (n === 6) this.acc = 0;

    for (const t of this.things) {
      if (t.z > 0 || t.vz > 0) {
        t.vz -= 11 * dt;
        t.z += t.vz * dt;
        if (t.z <= 0) { t.z = 0; const v = -t.vz; t.vz = 0; if (v > 1.2) this.onLand(t, Math.min(1, v / 4)); }
      }
      t.squash *= Math.exp(-dt * 13);
      if (t.squash < 0.004) t.squash = 0;
      // не дать вылезти за край (очень быстрый бросок, смена размера экрана)
      this.keepInside(t, 0.85);
    }
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.max);
    this.afterUpdate(dt);
  }

  collide(e) {
    for (const pair of e.pairs) {
      const a = pair.bodyA, b = pair.bodyB;
      const ta = a.plugin.thing, tb = b.plugin.thing;
      if (!ta && !tb) continue;
      const n = pair.collision.normal;
      const rv = Math.abs((a.velocity.x - b.velocity.x) * n.x + (a.velocity.y - b.velocity.y) * n.y) * 60;
      if (rv < this.u * 0.2) continue;
      const sup = pair.collision.supports && pair.collision.supports[0];
      const pt = sup ? { x: sup.x, y: sup.y } : { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 };
      const dir = Math.atan2(n.y, n.x);
      for (const [t, other] of [[ta, tb], [tb, ta]]) {
        if (!t) continue;
        t.squash = Math.max(t.squash, Math.min(0.28, rv / (this.u * 9)));
        t.dir = dir;
        if (this.time - t.lastHit < 0.07) continue;
        t.lastHit = this.time;
        this.onHit(t, Math.min(1, rv / (this.u * 3)), other || null, pt);
      }
    }
  }

  // ---------- Касания ----------

  /** Точка, по которой попадаем пальцем (у птиц — центр рисунка, не лапки). */
  hitCenter(t) { return t.body.position; }

  hit(x, y) {
    let best = null, bd = Infinity;
    for (const t of this.things) {
      const c = this.hitCenter(t);
      const d = Math.hypot(x - c.x, y - c.y);
      if (d < t.r * 1.25 + this.u * 0.025 && d < bd && ![...this.grabs.values()].some((g) => g.t === t)) { bd = d; best = t; }
    }
    return best;
  }

  onDown(p) {
    const t = this.hit(p.x, p.y);
    if (t) {
      const c = t.body.position;
      this.grabs.set(p.id, { t, x: c.x, y: c.y, dx: c.x - p.x, dy: c.y - p.y, moved: false });
      return;
    }
    this.emptyTap(p.x, p.y);
  }

  onMove(p) {
    const g = this.grabs.get(p.id);
    if (!g) return;
    if (p.moved) g.moved = true;
    if (g.moved) { g.x = p.x + g.dx; g.y = p.y + g.dy; }
  }

  onUp(p) {
    const g = this.grabs.get(p.id);
    if (!g) return;
    this.grabs.delete(p.id);
    const t = g.t;
    if (!g.moved) {
      // тап: подпрыгнуть и чуть сдвинуться в случайную сторону
      this.jump(t, 3.2);
      const a = Math.random() * Math.PI * 2, s = this.u * rnd(0.3, 0.7);
      const v = this.vel(t);
      this.setVel(t, v.x * 0.3 + Math.cos(a) * s, v.y * 0.3 + Math.sin(a) * s);
      this.onTap(t);
      return;
    }
    // бросок: скорость пальца (не быстрее разумного)
    let vx = p.vx || 0, vy = p.vy || 0;
    const max = this.u * 4.5, v = Math.hypot(vx, vy);
    if (v > max) { vx *= max / v; vy *= max / v; }
    this.setVel(t, vx, vy);
    this.onThrow(t, Math.min(1, v / max));
  }

  /** Вернуть предмет внутрь, если он залез за стенку глубже, чем на (1−k)·r. */
  keepInside(t, k = 1) {
    const p = t.body.position, { w, h } = this.stage, i = this.inset, it = this.topInset, r = t.r;
    const x0 = i + r * k, x1 = w - i - r * k, y0 = it + r * k, y1 = h - i - r * k;
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) {
      this.M.Body.setPosition(t.body, { x: clamp(p.x, i + r, w - i - r), y: clamp(p.y, it + r, h - i - r) });
    }
  }

  jump(t, vz) { if (t.z < 0.05) t.vz = vz; }

  emptyTap(x, y) {
    const R = this.u * 0.45;
    for (const t of this.things) {
      const c = t.body.position;
      const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy);
      if (d > R || d < 1) continue;
      const k = (1 - d / R) * this.u * 1.6;
      const v = this.vel(t);
      this.setVel(t, v.x + (dx / d) * k, v.y + (dy / d) * k);
    }
    this.rings.push({ x, y, t: 0, max: 0.6 });
    this.onEmpty(x, y);
  }

  shake(k) {
    for (const t of this.things) {
      this.jump(t, 2.6 + k * 2 + Math.random());
      const a = Math.random() * Math.PI * 2, s = this.u * (0.5 + k * 1.5) * rnd(0.6, 1.2);
      const v = this.vel(t);
      this.setVel(t, v.x + Math.cos(a) * s, v.y + Math.sin(a) * s);
    }
    this.onShake(k);
  }

  // ---------- Поворот экрана, Fold ----------

  resize(prev, next) {
    const kx = next.w / Math.max(1, prev.w), ky = next.h / Math.max(1, prev.h);
    const ku = next.unit / Math.max(1, prev.unit);
    for (const t of this.things) {
      const p = t.body.position;
      this.M.Body.setPosition(t.body, { x: p.x * kx, y: p.y * ky });
      if (Math.abs(ku - 1) > 1e-3) { this.M.Body.scale(t.body, ku, ku); t.r *= ku; t.size *= ku; this.M.Body.setInertia(t.body, Infinity); }
    }
    for (const g of this.grabs.values()) { g.x *= kx; g.y *= ky; }
    this.buildWalls();
    for (const t of this.things) this.keepInside(t);
    this.onResize(prev, next);
  }

  /** Ничего не движется — кадр можно не перерисовывать (бережём батарею, когда телефон лежит). */
  get still() {
    if (this.grabs.size || this.rings.length) return false;
    for (const t of this.things) if (t.z > 0 || t.squash > 0.004 || this.speed(t) > 2) return false;
    return true;
  }

  destroy() {
    this.tilt.destroy();
    this.M.Events.off(this.engine, 'collisionStart', this._collide);
    this.M.Composite.clear(this.world, false);
    this.M.Engine.clear(this.engine);
  }

  // ---------- Для наследника ----------
  onHit() {}
  onTap() {}
  onThrow() {}
  onLand() {}
  onEmpty() {}
  onShake() {}
  onResize() {}
  afterUpdate() {}
}
