// Мультитач: каждый палец — отдельный «указатель» со своей историей.
// Игра получает onDown / onMove / onUp с объектом пальца.

export class Input {
  constructor(el, handlers) {
    this.el = el;
    this.h = handlers;
    this.pointers = new Map();
    this._down = (e) => this.down(e);
    this._move = (e) => this.move(e);
    this._up = (e) => this.up(e);
    el.addEventListener('pointerdown', this._down);
    el.addEventListener('pointermove', this._move);
    el.addEventListener('pointerup', this._up);
    el.addEventListener('pointercancel', this._up);
    el.addEventListener('lostpointercapture', this._up);
    this._ctx = (e) => e.preventDefault();
    el.addEventListener('contextmenu', this._ctx);
  }

  _xy(e) {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  down(e) {
    e.preventDefault();
    try { this.el.setPointerCapture(e.pointerId); } catch (_) {}
    const { x, y } = this._xy(e);
    const t = performance.now();
    const p = {
      id: e.pointerId, x, y, startX: x, startY: y, lastX: x, lastY: y,
      vx: 0, vy: 0, speed: 0, t0: t, t, dist: 0, moved: false, data: {},
    };
    this.pointers.set(e.pointerId, p);
    this.h.onDown && this.h.onDown(p);
  }

  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    // Берём все промежуточные точки — линии и потоки пузырей получаются плавными.
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (events.length ? events : [e])) {
      const { x, y } = this._xy(ev);
      const t = performance.now();
      const dt = Math.max(1, t - p.t);
      const dx = x - p.x, dy = y - p.y;
      p.lastX = p.x; p.lastY = p.y;
      p.x = x; p.y = y;
      const k = 0.35;
      p.vx = p.vx * (1 - k) + (dx / dt) * 1000 * k;
      p.vy = p.vy * (1 - k) + (dy / dt) * 1000 * k;
      p.speed = Math.hypot(p.vx, p.vy);
      p.dist += Math.hypot(dx, dy);
      p.t = t;
      if (!p.moved && Math.hypot(x - p.startX, y - p.startY) > 14) p.moved = true;
      this.h.onMove && this.h.onMove(p);
    }
  }

  up(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    p.duration = performance.now() - p.t0;
    this.h.onUp && this.h.onUp(p);
  }

  /** Свернули приложение / позвонили: отпускаем все пальцы, чтобы ничего не «залипло» (струйка, гудок, рост капли). */
  releaseAll() {
    for (const p of [...this.pointers.values()]) {
      this.pointers.delete(p.id);
      p.duration = performance.now() - p.t0;
      this.h.onUp && this.h.onUp(p);
    }
  }

  destroy() {
    const el = this.el;
    el.removeEventListener('pointerdown', this._down);
    el.removeEventListener('pointermove', this._move);
    el.removeEventListener('pointerup', this._up);
    el.removeEventListener('pointercancel', this._up);
    el.removeEventListener('lostpointercapture', this._up);
    el.removeEventListener('contextmenu', this._ctx);
    this.pointers.clear();
  }
}
