// Тестовая песочница этапа 0: проверка касаний, мультитача, звука, вибрации и Fold.
// Тап — цветной кружок с нотой (выше на экране — выше нота), проведение — дорожка кружков.
import { tone, pentaFreq, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const COLORS = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#4DABF7', '#9775FA', '#F783AC'];

export default class TestGame {
  static erasable = true;
  static background = '#FFFFFF';

  constructor(stage) {
    this.stage = stage;
    this.dots = [];
    this.count = 0;
  }

  color() {
    return COLORS[Math.floor(this.count / 12) % COLORS.length];
  }

  add(x, y, r, sound = true) {
    this.dots.push({ x, y, r, c: this.color(), born: performance.now() });
    this.count++;
    if (sound) {
      const step = Math.round((1 - y / this.stage.h) * 14);
      tone({ freq: pentaFreq(step), dur: 0.35, type: 'triangle', gain: 0.25, pan: panFor(x, this.stage.w) });
    }
  }

  onDown(p) {
    const u = this.stage.unit;
    this.add(p.x, p.y, u * (0.05 + Math.random() * 0.03));
    p.data.lastX = p.x; p.data.lastY = p.y;
    haptic(1);
  }

  onMove(p) {
    const u = this.stage.unit;
    const d = Math.hypot(p.x - p.data.lastX, p.y - p.data.lastY);
    if (d > u * 0.04) {
      const quiet = this.count % 3 !== 0;
      this.add(p.x, p.y, u * 0.025, !quiet);
      p.data.lastX = p.x; p.data.lastY = p.y;
      if (!quiet) haptic(0);
    }
  }

  onUp() {}

  erase() {
    this.dots = [];
  }

  // При раскладывании Fold пропорционально переносим кружки на новый размер.
  resize(prev, next) {
    const sx = next.w / prev.w, sy = next.h / prev.h;
    for (const d of this.dots) { d.x *= sx; d.y *= sy; }
  }

  update() {}

  draw(ctx) {
    const { w, h } = this.stage;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    const now = performance.now();
    for (const d of this.dots) {
      const k = Math.min(1, (now - d.born) / 180);
      const s = 1 + Math.sin(k * Math.PI) * 0.25; // лёгкий «пружинящий» рост
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * k * s, 0, Math.PI * 2);
      ctx.fillStyle = d.c;
      ctx.fill();
    }
    // Номер версии мелко в углу — чтобы было видно, какая сборка стоит.
    ctx.fillStyle = 'rgba(74,44,23,0.35)';
    ctx.font = '800 12px Nunito, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`v${window.FG_VERSION || 'dev'} · ${w}×${h}`, w - 12, h - 12);
  }

  destroy() {}
}
