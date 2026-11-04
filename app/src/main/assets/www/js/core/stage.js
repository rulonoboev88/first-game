// Полноэкранный холст с учётом плотности пикселей и смены размера (Fold: сложил/разложил).

export class Stage {
  constructor(host) {
    this.host = host;
    this.canvas = document.createElement('canvas');
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.w = 0;      // ширина в CSS-пикселях
    this.h = 0;      // высота в CSS-пикселях
    this.dpr = 1;
    this.onResize = null;
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(host);
    this.resize();
  }

  resize() {
    const r = this.host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    const prev = { w: this.w, h: this.h };
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.onResize && prev.w) this.onResize(prev, { w, h });
  }

  /** Базовая «единица размера» персонажей: зависит от меньшей стороны экрана. */
  get unit() {
    return Math.min(this.w, this.h);
  }

  destroy() {
    this._ro.disconnect();
    this.canvas.remove();
  }
}
