// Фонарик. Ночная полянка: темно, светит луна, мигают звёзды, в кустах светятся чьи-то глазки.
// Палец — фонарик: где он, там светло и всё видно в цвете. Луч нашёл зверя — «ой!», зверь
// выглядывает, здоровается своим голосом и машет лапкой; пока светишь — сидит, ушёл свет — прячется.
// Тап по луне — она просыпается и освещает всю полянку, все зверята выглядывают разом.
import { drawAnimal, drawPaws, ANIMALS, INK } from '../art/animals.js';
import { panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';
import { mouthFrom } from '../core/lipsync.js';
import { animalVoice, preloadAnimals, whoosh } from '../sounds/animals.js';
import { torchClick, cricket, ohh, moonGlow, moonSleep } from '../sounds/night.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeInOut = (t) => t * t * (3 - 2 * t);

const EYES = {
  cow: [-15, -8, 15, -8], pig: [-15, -8, 15, -8], sheep: [-11, 2, 11, 2], goat: [-12, -10, 12, -10],
  horse: [-13, -8, 13, -8], dog: [-14, -8, 14, -8], cat: [-15, -4, 15, -4], frog: [-22, -26, 22, -26],
  owl: [-16, -6, 16, -6], mouse: [-11, -8, 11, -8], rabbit: [-13, -9, 13, -9], hedgehog: [-11, -8, 11, -8],
  bear: [-14, -9, 14, -9], fox: [-12, -11, 12, -11], squirrel: [-11, -9, 11, -9],
};
// ночные жители — чаще; остальные тоже заглядывают
const NIGHT = ['owl', 'cat', 'hedgehog', 'fox', 'mouse', 'frog', 'rabbit', 'bear', 'squirrel', 'dog'];
const PITCH = { mouse: 1.6, frog: 1.2, squirrel: 1.45, hedgehog: 1.3, rabbit: 1.25, cat: 1.15, owl: 0.95, fox: 1.1, dog: 1, bear: 0.75, cow: 0.75, horse: 0.85, pig: 1, sheep: 1.1, goat: 1.05 };
const COVERS = ['bush', 'log', 'fence', 'hay', 'stump', 'rock'];
const HIDDEN = 1.0; // насколько зверь спрятан (в долях размера головы)

export default class FlashlightGame {
  static volume = 2.0;       // выравнивание громкости между играми (tools/audit.js)
  static erasable = false;
  static background = '#0B1236';
  static maxDpr = 2;

  constructor(stage) {
    this.stage = stage;
    this.time = 0;
    this.lights = new Map();
    this.fading = [];
    this.moon = { awake: 0, t: 0, on: false };
    this.cricketT = 1;
    this.bag = [];
    preloadAnimals();
    this.stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(0.6, 1.8), ph: rnd(0, 6.28), sp: rnd(1, 3) }));
    this.flies = Array.from({ length: 9 }, () => ({ x: Math.random(), y: rnd(0.55, 0.95), ph: rnd(0, 6.28), sp: rnd(0.3, 0.7) }));
    this.layout();
  }

  // ---------- Раскладка ----------

  layout() {
    const { w, h } = this.stage;
    const u = this.stage.unit;
    const land = w > h * 0.9;
    this.horizon = h * (land ? 0.5 : 0.48);
    // [x, y-низ укрытия, масштаб]
    const pos = land
      ? [[0.17, 0.66, 0.78], [0.5, 0.62, 0.72], [0.83, 0.66, 0.78], [0.31, 0.93, 1], [0.69, 0.93, 1]]
      : [[0.27, 0.62, 0.85], [0.73, 0.62, 0.85], [0.5, 0.77, 0.9], [0.25, 0.94, 1], [0.75, 0.94, 1]];
    const base = Math.min(u * (land ? 0.3 : 0.36), w / (land ? 4.2 : 2.6));
    const prev = this.spots || [];
    const used = new Set();
    this.spots = pos.map(([px, py, sc], i) => {
      const old = prev[i];
      const S = base * sc;
      const kind = old ? old.kind : this.freshKind(used);
      used.add(kind);
      return {
        x: w * px, bottom: h * py, S,
        cover: old ? old.cover : COVERS[i % COVERS.length],
        kind, state: old ? old.state : 'hidden', t: old ? old.t : 0, lit: 0, unlit: 9,
        blink: 0, blinkAt: rnd(0.5, 3), open: 0, voice: null, vt: 0, wave: 0, look: 0, hop: 0, wide: 0,
      };
    });
    // высота укрытия: зверь сидит лапками на его верхнем крае
    for (const s of this.spots) {
      s.ch = s.S * (s.cover === 'fence' ? 0.62 : s.cover === 'log' ? 0.5 : 0.58);
      s.top = s.bottom - s.ch;
      s.cw = s.S * (s.cover === 'log' ? 1.25 : s.cover === 'fence' ? 1.15 : 1.05);
    }
    this.R = Math.max(80, u * 0.21);
    this.moonPos = { x: w * (land ? 0.86 : 0.78), y: Math.min(this.horizon * 0.3, u * 0.17), r: u * 0.075 };
    this.bg = null;
    this.ov = null;
  }

  resize() { this.layout(); }

  freshKind(used) {
    const taken = new Set([...(this.spots || []).map((s) => s.kind), ...used]);
    if (!this.bag.length) this.bag = [...NIGHT, ...NIGHT, ...ANIMALS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < this.bag.length; i++) {
      if (!taken.has(this.bag[i])) return this.bag.splice(i, 1)[0];
    }
    return this.bag.shift();
  }

  pan(x) { return panFor(x, this.stage.w); }

  // ---------- Касания ----------

  onDown(p) {
    const m = this.moonPos;
    if (Math.hypot(p.x - m.x, p.y - m.y) < m.r * 1.6) {
      this.wakeMoon();
      return;
    }
    // тап по уже выглянувшему зверю — ещё раз поздороваться
    for (const s of this.spots) {
      if (s.state !== 'out') continue;
      const hy = s.top - s.S * 0.46;
      if (Math.abs(p.x - s.x) < s.S * 0.5 && p.y > hy - s.S * 0.55 && p.y < s.top + s.S * 0.1) {
        this.greet(s, true);
      }
    }
    this.lights.set(p.id, { x: p.x, y: p.y, a: 0 });
    torchClick(this.pan(p.x));
    haptic(0);
  }

  onMove(p) {
    const l = this.lights.get(p.id);
    if (l) { l.x = p.x; l.y = p.y; }
  }

  onUp(p) {
    const l = this.lights.get(p.id);
    if (l) { this.lights.delete(p.id); this.fading.push(l); }
  }

  wakeMoon() {
    const mo = this.moon;
    if (mo.on) return;
    mo.on = true; mo.t = 0;
    moonGlow();
    haptic(1);
  }

  greet(s, again = false) {
    s.voice = animalVoice(s.kind, this.pan(s.x), { excited: again });
    s.vt = 0;
    s.hop = 0.001;
    s.waveT = 0;
    if (again) haptic(1);
  }

  // ---------- Время ----------

  /** Насколько освещена точка (0..1) — сумма лучей и лунного света. */
  lightAt(x, y) {
    let v = this.moonLight();
    for (const l of [...this.lights.values(), ...this.fading]) {
      const d = Math.hypot(x - l.x, y - l.y) / this.R;
      v = Math.max(v, l.a * clamp(1.15 - d, 0, 1));
    }
    return v;
  }

  moonLight() {
    return easeInOut(clamp(this.moon.awake, 0, 1));
  }

  update(dt) {
    this.time += dt;
    for (const l of this.lights.values()) l.a = Math.min(1, l.a + dt * 8);
    for (const l of this.fading) l.a -= dt * 2.5;
    this.fading = this.fading.filter((l) => l.a > 0);

    // луна: просыпается, светит ~3 с, засыпает
    const mo = this.moon;
    if (mo.on) {
      mo.t += dt;
      mo.awake = Math.min(1, mo.awake + dt * 1.8);
      if (mo.t > 3.6) { mo.on = false; moonSleep(); }
    } else mo.awake = Math.max(0, mo.awake - dt * 0.9);

    for (const s of this.spots) {
      s.t += dt;
      const lit = this.lightAt(s.x, s.top - s.S * 0.2);
      if (lit > 0.45) { s.lit += dt; s.unlit = 0; } else { s.lit = 0; s.unlit += dt; }
      s.blinkAt -= dt;
      if (s.blinkAt <= 0) { s.blink = 0.15; s.blinkAt = rnd(1.2, 3.5); }
      if (s.blink > 0) s.blink -= dt;
      if (s.voice) { s.vt += dt; if (s.vt > s.voice.dur + 0.2) s.voice = null; }
      s.open = mouthFrom(s.voice, s.open, dt);
      if (s.hop > 0) { s.hop += dt * 2.4; if (s.hop >= 1) s.hop = 0; }
      s.wide *= Math.exp(-dt * 2.5);
      if (s.waveT != null) {
        s.waveT += dt;
        s.wave = s.waveT < 1.3 ? Math.sin(s.waveT / 1.3 * Math.PI) * (0.6 + 0.4 * Math.sin(s.waveT * 15)) : 0;
        if (s.waveT >= 1.3) s.waveT = null;
      }
      // зверь смотрит на ближайший луч
      let tx = 0, best = Infinity;
      for (const l of this.lights.values()) {
        const d = Math.hypot(l.x - s.x, l.y - s.top);
        if (d < best) { best = d; tx = clamp((l.x - s.x) / (s.S * 1.5), -1, 1); }
      }
      s.look += (tx - s.look) * Math.min(1, dt * 6);

      switch (s.state) {
        case 'hidden':
          if (s.lit > 0.18) {
            s.state = 'up'; s.t = 0; s.wide = 1;
            ohh(this.pan(s.x), PITCH[s.kind] || 1);
            haptic(0);
          }
          break;
        case 'up':
          if (s.t > 0.45) { s.state = 'out'; s.t = 0; this.greet(s); }
          break;
        case 'out':
          if (s.unlit > 1.4 && !s.voice) { s.state = 'down'; s.t = 0; whoosh(this.pan(s.x)); }
          break;
        case 'down':
          if (s.t > 0.45) {
            s.state = 'hidden'; s.t = 0;
            if (Math.random() < 0.6) { const old = s.kind; s.kind = '_'; s.kind = this.freshKind(new Set([old])); }
          }
          break;
      }
    }

    this.cricketT -= dt;
    if (this.cricketT <= 0) { this.cricketT = rnd(1.8, 4.5); cricket(rnd(-0.8, 0.8)); }
  }

  /** Насколько зверь опущен за укрытие (0 — выглянул, 1 — спрятан). */
  sink(s) {
    if (s.state === 'hidden') return 1;
    if (s.state === 'up') return 1 - easeOutBack(clamp(s.t / 0.4, 0, 1));
    if (s.state === 'down') return easeInOut(clamp(s.t / 0.4, 0, 1));
    return 0;
  }

  erase() {}
  destroy() {}

  // ---------- Рисование ----------

  drawBg() {
    const { w, h } = this.stage;
    const dpr = this.stage.dpr, u = this.stage.unit;
    const c = document.createElement('canvas');
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const H = this.horizon;
    // небо — сумеречно-синее (под лучом видно, что это вечер, а не чернота)
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#3E5BB8'); sky.addColorStop(1, '#8FB3F0');
    g.fillStyle = sky; g.fillRect(0, 0, w, H + 2);
    // дальний лес
    g.fillStyle = '#4F8F6A';
    for (let i = 0; i <= 26; i++) {
      const x = (i / 26) * w, r = u * (0.045 + ((i * 0.37) % 1) * 0.03);
      g.beginPath(); g.arc(x, H - r * 0.2, r, 0, Math.PI * 2); g.fill();
    }
    // трава
    const grass = g.createLinearGradient(0, H, 0, h);
    grass.addColorStop(0, '#7CC765'); grass.addColorStop(1, '#5DB24E');
    g.fillStyle = grass; g.fillRect(0, H, w, h - H);
    // кочки и травинки
    g.strokeStyle = '#4E9E40'; g.lineWidth = Math.max(1.5, u * 0.004); g.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const x = ((i * 0.618) % 1) * w, y = H + ((i * 0.381) % 1) * (h - H);
      const s = u * 0.012 * (0.6 + (y - H) / (h - H));
      g.beginPath(); g.moveTo(x - s, y); g.lineTo(x - s * 1.3, y - s * 1.6); g.moveTo(x, y); g.lineTo(x, y - s * 2); g.moveTo(x + s, y); g.lineTo(x + s * 1.4, y - s * 1.5); g.stroke();
    }
    // цветочки
    for (let i = 0; i < 18; i++) {
      const x = ((i * 0.737 + 0.1) % 1) * w, y = H + ((i * 0.523 + 0.05) % 1) * (h - H) * 0.95;
      const r = u * 0.006 * (0.7 + (y - H) / (h - H));
      g.fillStyle = ['#FFFFFF', '#FFD6E7', '#FFF3A3', '#D0BFFF'][i % 4];
      for (let k = 0; k < 5; k++) { const an = k / 5 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(an) * r, y + Math.sin(an) * r, r * 0.85, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#FFC233'; g.beginPath(); g.arc(x, y, r * 0.6, 0, Math.PI * 2); g.fill();
    }
    // большое дерево сбоку
    const tx = w * 0.03, ty = H + u * 0.02;
    g.fillStyle = '#8A6142'; g.fillRect(tx - u * 0.025, ty - u * 0.32, u * 0.05, u * 0.34);
    g.fillStyle = '#3F8F4E';
    for (const [dx, dy, r] of [[0, -0.42, 0.13], [0.09, -0.34, 0.1], [-0.08, -0.33, 0.1], [0.03, -0.27, 0.09]]) { g.beginPath(); g.arc(tx + dx * u, ty + dy * u, r * u, 0, Math.PI * 2); g.fill(); }
    this.bg = c;
  }

  drawCover(ctx, s) {
    const { x, bottom: b, top: t, cw, S } = s;
    const lw = Math.max(2, S * 0.032);
    ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
    const shadow = () => { ctx.fillStyle = 'rgba(20,40,20,0.22)'; ctx.beginPath(); ctx.ellipse(x, b, cw * 0.55, S * 0.06, 0, 0, Math.PI * 2); ctx.fill(); };
    shadow();
    switch (s.cover) {
      case 'bush': {
        const p = new Path2D();
        const bumps = [[-0.42, 0.42, 0.2], [-0.22, 0.12, 0.26], [0.05, 0.02, 0.28], [0.3, 0.14, 0.25], [0.46, 0.42, 0.18]];
        for (const [dx, dy, r] of bumps) { p.moveTo(x + dx * cw + r * cw, t + dy * s.ch); p.arc(x + dx * cw, t + dy * s.ch + r * cw * 0.6, r * cw, 0, Math.PI * 2); }
        p.rect(x - cw * 0.55, t + s.ch * 0.45, cw * 1.1, s.ch * 0.55);
        ctx.lineWidth = lw * 2; ctx.stroke(p);
        ctx.fillStyle = '#4CAF50'; ctx.fill(p);
        ctx.fillStyle = '#6CC56A';
        for (const [dx, dy, r] of bumps) { ctx.beginPath(); ctx.arc(x + dx * cw - r * cw * 0.25, t + dy * s.ch + r * cw * 0.35, r * cw * 0.55, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#FF6B8B';
        for (const [dx, dy] of [[-0.3, 0.35], [0.12, 0.25], [0.35, 0.55], [-0.05, 0.7]]) { ctx.beginPath(); ctx.arc(x + dx * cw, t + dy * s.ch, S * 0.022, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'log': {
        const r = s.ch * 0.5;
        const p = new Path2D(); p.roundRect(x - cw / 2, t, cw - r, s.ch, r * 0.4);
        ctx.fillStyle = '#9A6A43'; ctx.fill(p); ctx.lineWidth = lw; ctx.stroke(p);
        ctx.strokeStyle = 'rgba(70,40,20,0.45)'; ctx.lineWidth = lw * 0.7;
        ctx.beginPath(); ctx.moveTo(x - cw * 0.4, t + s.ch * 0.35); ctx.lineTo(x + cw * 0.05, t + s.ch * 0.35); ctx.moveTo(x - cw * 0.25, t + s.ch * 0.68); ctx.lineTo(x + cw * 0.2, t + s.ch * 0.68); ctx.stroke();
        const ex = x + cw / 2 - r;
        ctx.fillStyle = '#E9C38E'; ctx.beginPath(); ctx.ellipse(ex, t + r, r * 0.7, r, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
        ctx.strokeStyle = 'rgba(140,90,40,0.6)'; ctx.lineWidth = lw * 0.6;
        for (const k of [0.62, 0.32]) { ctx.beginPath(); ctx.ellipse(ex, t + r, r * 0.7 * k, r * k, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = '#6CC56A';
        ctx.beginPath(); ctx.ellipse(x - cw * 0.2, t + s.ch * 0.04, S * 0.08, S * 0.035, -0.2, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'fence': {
        const n = 4, pw = cw / n;
        ctx.fillStyle = '#E8C9A0';
        for (const ry of [0.3, 0.7]) { const p = new Path2D(); p.rect(x - cw * 0.56, t + s.ch * ry, cw * 1.12, s.ch * 0.14); ctx.fill(p); ctx.lineWidth = lw; ctx.stroke(p); }
        for (let i = 0; i < n; i++) {
          const px = x - cw / 2 + i * pw + pw * 0.1, ww = pw * 0.8;
          const p = new Path2D(); p.moveTo(px, b); p.lineTo(px, t + ww * 0.4); p.lineTo(px + ww / 2, t - ww * 0.1); p.lineTo(px + ww, t + ww * 0.4); p.lineTo(px + ww, b); p.closePath();
          ctx.fillStyle = '#F5DDB8'; ctx.fill(p); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(p);
          ctx.fillStyle = 'rgba(160,110,60,0.25)'; ctx.fillRect(px + ww * 0.68, t + ww * 0.4, ww * 0.25, b - t - ww * 0.4 - lw);
        }
        break;
      }
      case 'hay': {
        const p = new Path2D(); p.moveTo(x - cw * 0.55, b); p.bezierCurveTo(x - cw * 0.55, t - s.ch * 0.25, x + cw * 0.55, t - s.ch * 0.25, x + cw * 0.55, b); p.closePath();
        ctx.fillStyle = '#F2C94C'; ctx.fill(p); ctx.lineWidth = lw; ctx.stroke(p);
        ctx.save(); ctx.clip(p);
        ctx.strokeStyle = 'rgba(190,130,30,0.55)'; ctx.lineWidth = lw * 0.6;
        for (let i = 0; i < 12; i++) { const xx = x - cw * 0.5 + (i / 11) * cw; ctx.beginPath(); ctx.moveTo(xx, b); ctx.quadraticCurveTo(xx + (i - 5.5) * S * 0.01, t + s.ch * 0.5, xx + (i - 5.5) * S * 0.02, t); ctx.stroke(); }
        ctx.restore();
        break;
      }
      case 'stump': {
        const p = new Path2D(); p.moveTo(x - cw * 0.42, t + S * 0.06); p.lineTo(x - cw * 0.46, b - S * 0.02); p.quadraticCurveTo(x - cw * 0.58, b, x - cw * 0.6, b); p.lineTo(x + cw * 0.6, b); p.quadraticCurveTo(x + cw * 0.5, b, x + cw * 0.46, b - S * 0.02); p.lineTo(x + cw * 0.42, t + S * 0.06); p.closePath();
        ctx.fillStyle = '#8A5D3B'; ctx.fill(p); ctx.lineWidth = lw; ctx.stroke(p);
        ctx.strokeStyle = 'rgba(60,35,15,0.45)'; ctx.lineWidth = lw * 0.7;
        for (const dx of [-0.2, 0.05, 0.25]) { ctx.beginPath(); ctx.moveTo(x + dx * cw, t + S * 0.15); ctx.lineTo(x + dx * cw * 1.1, b - S * 0.05); ctx.stroke(); }
        ctx.fillStyle = '#E9C38E'; ctx.beginPath(); ctx.ellipse(x, t + S * 0.06, cw * 0.42, S * 0.07, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
        ctx.strokeStyle = 'rgba(140,90,40,0.6)'; ctx.lineWidth = lw * 0.6;
        ctx.beginPath(); ctx.ellipse(x, t + S * 0.06, cw * 0.25, S * 0.04, 0, 0, Math.PI * 2); ctx.stroke();
        // грибочек
        const mx = x + cw * 0.5, my = b - S * 0.02;
        ctx.fillStyle = '#FFF4E0'; ctx.fillRect(mx - S * 0.02, my - S * 0.09, S * 0.04, S * 0.09); ctx.lineWidth = lw * 0.7; ctx.strokeRect(mx - S * 0.02, my - S * 0.09, S * 0.04, S * 0.09);
        ctx.fillStyle = '#F04E3E'; ctx.beginPath(); ctx.ellipse(mx, my - S * 0.09, S * 0.07, S * 0.05, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx - S * 0.025, my - S * 0.11, S * 0.01, 0, Math.PI * 2); ctx.arc(mx + S * 0.02, my - S * 0.115, S * 0.008, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'rock': {
        const p = new Path2D(); p.moveTo(x - cw * 0.55, b); p.bezierCurveTo(x - cw * 0.6, t + s.ch * 0.2, x - cw * 0.2, t - s.ch * 0.05, x + cw * 0.1, t); p.bezierCurveTo(x + cw * 0.45, t + s.ch * 0.05, x + cw * 0.62, t + s.ch * 0.5, x + cw * 0.55, b); p.closePath();
        ctx.fillStyle = '#A9B1BE'; ctx.fill(p); ctx.lineWidth = lw; ctx.stroke(p);
        ctx.save(); ctx.clip(p);
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(x - cw * 0.2, t + s.ch * 0.3, cw * 0.18, s.ch * 0.12, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7CC36A'; ctx.beginPath(); ctx.ellipse(x + cw * 0.25, t + s.ch * 0.15, cw * 0.16, s.ch * 0.1, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        break;
      }
    }
  }

  drawSpot(ctx, s) {
    const sink = this.sink(s);
    const S = s.S;
    const hop = s.hop > 0 ? Math.sin(s.hop * Math.PI) * S * 0.08 : 0;
    const hx = s.x, hy = s.top - S * 0.46 + sink * S * HIDDEN - hop;
    ctx.save();
    ctx.beginPath(); ctx.rect(s.x - S * 1.2, 0, S * 2.4, s.bottom - s.ch * 0.15); ctx.clip();
    drawAnimal(ctx, s.kind, hx, hy, S, {
      blink: s.blink > 0, open: Math.max(s.open, s.wide * 0.35), look: s.look, ear: s.wide, paws: false, wave: s.wave,
    });
    ctx.restore();
    this.drawCover(ctx, s);
    if (sink < 0.25) {
      ctx.save();
      ctx.translate(s.x, s.top - S * 0.46 + sink * S * 0.6);
      ctx.scale(S / 100, S / 100);
      drawPaws(ctx, s.kind, s.wave);
      ctx.restore();
    }
  }

  drawMoon(ctx) {
    const { x, y, r } = this.moonPos;
    const aw = this.moonLight();
    const glow = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * (3 + aw * 2));
    glow.addColorStop(0, `rgba(255,246,200,${0.35 + aw * 0.3})`); glow.addColorStop(1, 'rgba(255,246,200,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * (3 + aw * 2), 0, Math.PI * 2); ctx.fill();
    const lw = Math.max(2, r * 0.07);
    ctx.fillStyle = '#FFF2B0'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(230,200,110,0.55)';
    for (const [dx, dy, rr] of [[0.35, -0.35, 0.16], [0.45, 0.25, 0.1], [-0.1, 0.5, 0.12]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2); ctx.fill(); }
    ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    // личико: спит (дужки) / проснулась (глазки)
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const ex = x + s * r * 0.33 - r * 0.08, ey = y - r * 0.08;
      if (aw > 0.3) {
        ctx.fillStyle = '#3D2614'; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.1, r * 0.13 * aw, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - r * 0.03, ey - r * 0.04, r * 0.035, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(ex, ey - r * 0.04, r * 0.11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      }
    }
    ctx.beginPath(); ctx.arc(x - r * 0.08, y + r * 0.2, r * (0.12 + aw * 0.08), 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(255,140,140,0.5)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.55, y + r * 0.15, r * 0.12, r * 0.08, 0, 0, Math.PI * 2); ctx.ellipse(x + r * 0.35, y + r * 0.15, r * 0.12, r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    // «з-з-з», пока спит
    if (aw < 0.2) {
      ctx.fillStyle = `rgba(255,246,200,${0.5 + 0.4 * Math.sin(this.time * 2)})`;
      ctx.font = `700 ${r * 0.45}px sans-serif`;
      const k = (this.time * 0.4) % 1;
      ctx.fillText('z', x + r * (1 + k * 0.5), y - r * (0.6 + k * 0.8));
      ctx.font = `700 ${r * 0.32}px sans-serif`;
      ctx.fillText('z', x + r * (0.85 + k * 0.3), y - r * (0.25 + k * 0.4));
    }
  }

  draw(ctx) {
    const { w, h } = this.stage;
    const dpr = this.stage.dpr;
    if (!this.bg) this.drawBg();
    ctx.drawImage(this.bg, 0, 0, w, h);
    const order = [...this.spots].sort((a, b) => a.bottom - b.bottom);
    for (const s of order) this.drawSpot(ctx, s);

    // темнота с «дырками» от фонариков
    if (!this.ov) {
      this.ov = document.createElement('canvas');
      this.ov.width = Math.round(w * dpr); this.ov.height = Math.round(h * dpr);
      this.octx = this.ov.getContext('2d');
    }
    const o = this.octx;
    o.setTransform(dpr, 0, 0, dpr, 0, 0);
    o.globalCompositeOperation = 'source-over';
    o.clearRect(0, 0, w, h);
    const night = 0.9 - this.moonLight() * 0.72;
    const sky = o.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, `rgba(6,10,40,${night})`); sky.addColorStop(1, `rgba(8,16,38,${night})`);
    o.fillStyle = sky; o.fillRect(0, 0, w, h);
    o.globalCompositeOperation = 'destination-out';
    const R = this.R;
    for (const l of [...this.lights.values(), ...this.fading]) {
      const g = o.createRadialGradient(l.x, l.y, 0, l.x, l.y, R);
      g.addColorStop(0, `rgba(0,0,0,${l.a})`); g.addColorStop(0.62, `rgba(0,0,0,${l.a * 0.96})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = g; o.beginPath(); o.arc(l.x, l.y, R, 0, Math.PI * 2); o.fill();
    }
    ctx.drawImage(this.ov, 0, 0, w, h);

    // тёплый отсвет фонарика
    for (const l of [...this.lights.values(), ...this.fading]) {
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, R);
      g.addColorStop(0, `rgba(255,236,170,${0.16 * l.a})`); g.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,240,190,${0.25 * l.a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(l.x, l.y, R * 0.97, 0, Math.PI * 2); ctx.stroke();
    }

    // звёзды
    const H = this.horizon;
    const starA = 1 - this.moonLight() * 0.6;
    for (const st of this.stars) {
      const x = st.x * w, y = st.y * H * 0.92;
      if (this.lightAt(x, y) > 0.5) continue;
      const tw = 0.5 + 0.5 * Math.sin(this.time * st.sp + st.ph);
      ctx.fillStyle = `rgba(255,250,220,${(0.35 + tw * 0.65) * starA})`;
      ctx.beginPath(); ctx.arc(x, y, st.r * (0.8 + tw * 0.4), 0, Math.PI * 2); ctx.fill();
    }
    this.drawMoon(ctx);

    // светлячки
    for (const f of this.flies) {
      const x = ((f.x + Math.sin(this.time * f.sp * 0.5 + f.ph) * 0.05 + this.time * 0.008 * f.sp) % 1) * w;
      const y = (f.y + Math.sin(this.time * f.sp + f.ph * 2) * 0.03) * h;
      const tw = Math.max(0, Math.sin(this.time * f.sp * 3 + f.ph));
      if (tw < 0.05) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
      g.addColorStop(0, `rgba(230,255,140,${tw})`); g.addColorStop(1, 'rgba(230,255,140,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
    }

    // светящиеся глазки в темноте
    for (const s of this.spots) {
      if (s.state !== 'hidden') continue;
      const eyes = EYES[s.kind] || [-12, -8, 12, -8];
      const k = s.S / 100;
      const hy = s.top - s.S * 0.46 + s.S * HIDDEN * 0.62;
      const lit = this.lightAt(s.x, hy);
      const a = clamp(1 - lit * 1.6, 0, 1);
      if (a <= 0.02) continue;
      const blink = s.blink > 0 ? 0.15 : 1;
      for (const [ex, ey] of [[eyes[0], eyes[1]], [eyes[2], eyes[3]]]) {
        const x = s.x + ex * k * 0.9, y = hy + ey * k * 0.5;
        const r = s.S * 0.05;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
        g.addColorStop(0, `rgba(230,255,150,${0.45 * a})`); g.addColorStop(1, 'rgba(230,255,150,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(245,255,190,${a})`;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.1 * blink, 0, 0, Math.PI * 2); ctx.fill();
        if (blink > 0.5) { ctx.fillStyle = `rgba(30,40,10,${0.8 * a})`; ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + r * 0.1, r * 0.4, r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  }
}
