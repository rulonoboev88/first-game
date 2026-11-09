// Кнопка, которую нужно удерживать: вокруг значка заполняется кольцо.
// Тодлер случайно не нажмёт, а взрослый легко.

const ICONS = {
  home: `<path d="M14 25 L26 14 L38 25 M18 22 V36 H34 V22" fill="none" stroke="#4A2C17" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  gear: `<g fill="none" stroke="#4A2C17" stroke-width="2.8" stroke-linejoin="round"><path d="M35.2 23.1 L38.5 23.4 L38.5 28.6 L35.2 28.9 L34.5 30.5 L36.7 33.1 L33.1 36.7 L30.5 34.5 L28.9 35.2 L28.6 38.5 L23.4 38.5 L23.1 35.2 L21.5 34.5 L18.9 36.7 L15.3 33.1 L17.5 30.5 L16.8 28.9 L13.5 28.6 L13.5 23.4 L16.8 23.1 L17.5 21.5 L15.3 18.9 L18.9 15.3 L21.5 17.5 L23.1 16.8 L23.4 13.5 L28.6 13.5 L28.9 16.8 L30.5 17.5 L33.1 15.3 L36.7 18.9 L34.5 21.5 Z"/><circle cx="26" cy="26" r="4.4"/></g>`,
  power: `<path d="M20 18.5 A10 10 0 1 0 32 18.5 M26 14 V26" fill="none" stroke="#4A2C17" stroke-width="3.2" stroke-linecap="round"/>`,
  moon: `<path d="M31 14 A12 12 0 1 0 38 31 A9.5 9.5 0 1 1 31 14 Z" fill="#FFE066" stroke="#4A2C17" stroke-width="2.6" stroke-linejoin="round"/>`,
  erase: `<path d="M17 31 L28 18 L37 26 L28 36 H20 Z M23 25 L32 33" fill="none" stroke="#4A2C17" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
};

export class HoldButton {
  constructor(el, { icon = 'home', duration = 1500, onDone }) {
    this.el = el;
    this.duration = duration;
    this.onDone = onDone;
    this.raf = 0;
    const R = 22, C = 2 * Math.PI * R;
    this.C = C;
    el.innerHTML = `
      <svg viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="24" fill="rgba(255,255,255,0.85)" stroke="rgba(74,44,23,0.25)" stroke-width="2"/>
        ${ICONS[icon] || ''}
        <circle class="ring" cx="26" cy="26" r="${R}" fill="none" stroke="#FF9F1C" stroke-width="4"
          stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"
          transform="rotate(-90 26 26)"/>
      </svg>`;
    this.ring = el.querySelector('.ring');

    this._down = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      this.start();
    };
    this._up = (e) => { e.stopPropagation(); this.cancel(); };
    el.addEventListener('pointerdown', this._down);
    el.addEventListener('pointerup', this._up);
    el.addEventListener('pointercancel', this._up);
    el.addEventListener('lostpointercapture', this._up);
  }

  start() {
    cancelAnimationFrame(this.raf);
    this.t0 = performance.now();
    this.el.classList.add('holding');
    const step = () => {
      const k = Math.min(1, (performance.now() - this.t0) / this.duration);
      this.ring.style.strokeDashoffset = String(this.C * (1 - k));
      if (k >= 1) {
        this.reset();
        this.onDone && this.onDone();
        return;
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  setDuration(ms) { this.duration = ms; }

  cancel() {
    this.reset();
  }

  reset() {
    cancelAnimationFrame(this.raf);
    this.el.classList.remove('holding');
    this.ring.style.strokeDashoffset = String(this.C);
  }

  destroy() {
    this.reset();
    const el = this.el;
    el.removeEventListener('pointerdown', this._down);
    el.removeEventListener('pointerup', this._up);
    el.removeEventListener('pointercancel', this._up);
    el.removeEventListener('lostpointercapture', this._up);
  }
}
