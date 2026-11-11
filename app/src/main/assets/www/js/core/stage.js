// Полноэкранный холст с учётом плотности пикселей и смены размера (Fold: сложил/разложил).

// Потолок по числу точек: большой планшет рисует не больше точек, чем разложенный Fold (≈900×810)
// при той же maxDpr, — на нём всё проверено. На 14" планшете тяжёлые игры чуть мягче, зато плавные.
const REF_AREA = 900 * 810;

export class Stage {
  constructor(host, { webgl = false, maxDpr = 3 } = {}) {
    this.host = host;
    this.webgl = webgl;
    this.maxDpr = maxDpr;
    this.canvas = document.createElement('canvas');
    host.appendChild(this.canvas);
    // WebGL-игры сами создают свой контекст; остальным — обычный 2D.
    this.ctx = webgl ? null : this.canvas.getContext('2d', { alpha: false, desynchronized: true });
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
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    const cap = this.maxDpr * Math.sqrt(Math.min(1, REF_AREA / (w * h)));
    const dpr = Math.min(window.devicePixelRatio || 1, Math.max(1, cap));
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    const prev = { w: this.w, h: this.h };
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
