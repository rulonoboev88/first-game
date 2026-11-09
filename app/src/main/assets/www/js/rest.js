// «Пора отдохнуть» — экран по окончании времени игры: зверята под одеялком машут «пока»,
// зевают и засыпают; звучит тихая колыбельная. Продолжить может только взрослый — удерживая луну.
import { drawAnimal, drawPaws } from './art/animals.js';
import { chime } from './core/audio.js';
import { tone } from './core/audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const KINDS = ['bear', 'rabbit', 'cat', 'dog', 'pig', 'sheep', 'mouse', 'fox', 'hedgehog', 'squirrel', 'owl', 'cow'];
// Колыбельная Брамса (1868, общественное достояние) — первая фраза.
const LULLABY = [[330, 1], [330, 1], [392, 2.5], [330, 1], [330, 1], [392, 2.5], [330, 1], [392, 1], [523, 1.6], [494, 1.6], [440, 1.4], [440, 1], [392, 3]];

export class RestScene {
  constructor(stage) {
    this.stage = stage;
    this.t = 0;
    const pool = [...KINDS].sort(() => Math.random() - 0.5);
    this.kids = pool.slice(0, 3).map((kind, i) => ({ kind, i, blink: 0, blinkAt: rnd(0.5, 2) }));
    this.stars = Array.from({ length: 50 }, () => ({ x: Math.random(), y: Math.random() * 0.55, r: rnd(0.6, 1.8), ph: rnd(0, 6.3) }));
    let at = 0.6;
    for (const [f, d] of LULLABY) { chime(f, { gain: 0.07, dur: 1.4, at }); at += d * 0.32; }
    // зевок
    for (const k of this.kids) {
      const a = 2.2 + k.i * 0.7;
      tone({ freq: 300 - k.i * 30, to: 190 - k.i * 20, dur: 0.9, type: 'triangle', gain: 0.05, attack: 0.15, at: a, wet: 0.8, filter: { type: 'lowpass', freq: 900, q: 1 } });
    }
  }

  update(dt) {
    this.t += dt;
    for (const k of this.kids) {
      k.blinkAt -= dt;
      if (k.blinkAt <= 0) { k.blink = 0.14; k.blinkAt = rnd(1.5, 3); }
      if (k.blink > 0) k.blink -= dt;
    }
  }

  draw(ctx) {
    const { w, h, unit: u } = this.stage;
    const t = this.t;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#24306E'); sky.addColorStop(1, '#5B5FA8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    for (const s of this.stars) {
      const a = 0.4 + 0.5 * Math.sin(t * 1.5 + s.ph);
      ctx.fillStyle = `rgba(255,248,220,${a})`;
      ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2); ctx.fill();
    }
    // одеяльце
    const top = h * 0.7;
    const S = Math.min(u * 0.3, w / 3.6);
    const xs = [w * 0.5 - S * 1.15, w * 0.5, w * 0.5 + S * 1.15];
    // подушка
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(w * 0.5 - S * 1.9, top - S * 0.55, S * 3.8, S * 0.6, S * 0.25); ctx.fill();
    for (const k of this.kids) {
      const x = xs[k.i];
      const k0 = 2.2 + k.i * 0.7;           // начало зевка
      const wave = t < 2 ? Math.sin(t / 2 * Math.PI) * (0.6 + 0.4 * Math.sin(t * 14)) : 0;
      const y = t < k0 + 1.6 ? 0 : 1;
      const yawn = Math.max(0, Math.sin(Math.min(1, Math.max(0, (t - k0) / 1.4)) * Math.PI));
      const asleep = t > k0 + 1.4;
      const tilt = asleep ? (k.i - 1) * 0.12 + Math.sin(t * 1.2 + k.i) * 0.02 : 0;
      ctx.save();
      ctx.translate(x, top - S * 0.46 + y * S * 0.08);
      ctx.rotate(tilt);
      drawAnimal(ctx, k.kind, 0, 0, S, {
        body: false, paws: false, open: yawn, blink: asleep || (yawn > 0.3) || k.blink > 0, props: false,
      });
      ctx.restore();
      if (!asleep) {
        ctx.save(); ctx.translate(x, top - S * 0.46); ctx.scale(S / 100, S / 100);
        drawPaws(ctx, k.kind, wave, false);
        ctx.restore();
      } else {
        // «з-з-з»
        const zz = (t * 0.35 + k.i * 0.33) % 1;
        ctx.fillStyle = `rgba(255,255,255,${Math.sin(zz * Math.PI) * 0.85})`;
        ctx.font = `800 ${S * (0.14 + zz * 0.1)}px Nunito, sans-serif`;
        ctx.fillText('z', x + S * (0.35 + zz * 0.2), top - S * (1.05 + zz * 0.45));
      }
    }
    // одеяло в горошек
    ctx.fillStyle = '#8EC5FF';
    ctx.beginPath();
    ctx.moveTo(0, top);
    for (let x = 0; x <= w; x += S * 0.4) ctx.quadraticCurveTo(x + S * 0.2, top - S * 0.06, x + S * 0.4, top);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    ctx.lineWidth = Math.max(2, u * 0.006); ctx.strokeStyle = '#3D2614'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let y = top + S * 0.25; y < h; y += S * 0.32) {
      for (let x = ((y / (S * 0.32)) % 2) * S * 0.2; x < w; x += S * 0.4) { ctx.beginPath(); ctx.arc(x, y, S * 0.05, 0, Math.PI * 2); ctx.fill(); }
    }
  }
}
