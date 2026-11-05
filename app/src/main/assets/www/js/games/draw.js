// Рисовалка. Белый фон.
// Рисуешь пальцем; каждое новое касание — новый цвет.
// Линия звучит: выше на экране — выше нота (приятная пентатоника), быстрее ведёшь — громче.
import { createVoice, pentaFreq, panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';

const COLORS = ['#FF4D4F', '#FF922B', '#FCC419', '#51CF66', '#20C997', '#339AF0', '#5C7CFA', '#9775FA', '#F06595', '#845EF7'];
const MAX_VOICES = 4;

export default class DrawGame {
  static erasable = true;
  static background = '#FFFFFF';

  constructor(stage) {
    this.stage = stage;
    this.colorIdx = Math.floor(Math.random() * COLORS.length);
    this.voices = new Map();
    this.layer = this.makeLayer();
  }

  get u() { return this.stage.unit; }

  makeLayer() {
    const { width, height } = this.stage.canvas;
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : Object.assign(document.createElement('canvas'), { width, height });
    const g = c.getContext('2d');
    g.setTransform(this.stage.dpr, 0, 0, this.stage.dpr, 0, 0);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    return { c, g };
  }

  noteFor(y) {
    const step = Math.round((1 - y / this.stage.h) * 11);
    return pentaFreq(step, 261.63);
  }

  onDown(p) {
    const color = COLORS[this.colorIdx];
    this.colorIdx = (this.colorIdx + 1) % COLORS.length;
    p.data.color = color;
    p.data.pts = [{ x: p.x, y: p.y }];
    p.data.w = this.u * 0.024;
    // точка-клякса, даже если палец не двигается
    const g = this.layer.g;
    g.fillStyle = color;
    g.beginPath();
    g.arc(p.x, p.y, p.data.w * 0.55, 0, Math.PI * 2);
    g.fill();
    if (this.voices.size < MAX_VOICES) {
      const v = createVoice({ type: 'triangle', freq: this.noteFor(p.y), pan: panFor(p.x, this.stage.w) });
      if (v) {
        v.setGain(0.12, 0.02);
        this.voices.set(p.id, { v, gain: 0.12 });
      }
    }
    haptic(0);
  }

  onMove(p) {
    const pts = p.data.pts;
    if (!pts) return;
    const last = pts[pts.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) return;
    pts.push({ x: p.x, y: p.y });
    if (pts.length > 3) pts.shift();
    // плавная линия: кривая через середины отрезков
    const g = this.layer.g;
    const speedK = Math.min(0.35, p.speed / 4000);
    g.lineWidth = p.data.w * (1.1 - speedK);
    g.strokeStyle = p.data.color;
    g.beginPath();
    if (pts.length === 2) {
      g.moveTo(pts[0].x, pts[0].y);
      g.lineTo(pts[1].x, pts[1].y);
    } else {
      const [a, b, c] = pts;
      g.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
      g.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
    }
    g.stroke();

    const voice = this.voices.get(p.id);
    if (voice) {
      voice.v.setFreq(this.noteFor(p.y), 0.04);
      voice.v.setPan(panFor(p.x, this.stage.w));
      voice.gain = Math.min(0.26, 0.05 + p.speed / 2600);
      voice.v.setGain(voice.gain, 0.04);
      voice.lastMove = performance.now();
    }
  }

  onUp(p) {
    const voice = this.voices.get(p.id);
    if (voice) { voice.v.stop(); this.voices.delete(p.id); }
    p.data.pts = null;
  }

  update() {
    // палец остановился — звук мягко затихает до тихого «гула»
    const now = performance.now();
    for (const voice of this.voices.values()) {
      if (voice.lastMove && now - voice.lastMove > 90 && voice.gain > 0.04) {
        voice.gain *= 0.85;
        voice.v.setGain(voice.gain, 0.08);
      }
    }
  }

  erase() {
    const { width, height } = this.stage.canvas;
    this.layer.g.save();
    this.layer.g.setTransform(1, 0, 0, 1, 0, 0);
    this.layer.g.clearRect(0, 0, width, height);
    this.layer.g.restore();
  }

  resize(prev, next) {
    const old = this.layer;
    this.layer = this.makeLayer();
    // переносим рисунок без искажений: равный масштаб, по центру
    const s = Math.min(next.w / prev.w, next.h / prev.h);
    const ox = (next.w - prev.w * s) / 2, oy = (next.h - prev.h * s) / 2;
    this.layer.g.drawImage(old.c, ox, oy, prev.w * s, prev.h * s);
  }

  draw(ctx) {
    const { w, h } = this.stage;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(this.layer.c, 0, 0, w, h);
  }

  destroy() {
    for (const voice of this.voices.values()) voice.v.stop();
    this.voices.clear();
  }
}
