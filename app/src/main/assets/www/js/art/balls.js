// Мячики для «Мячиков» (наклон телефона). Стиль как у зверей и еды: заливка + объём + тёмный контур.
// Мяч — круг радиуса 40 в коробке 100×100 с центром (0,0); size — ширина в пикселях на 100 единиц.
// Узор крутится вместе с мячом (rot), а блик и тень остаются на месте — так он выглядит круглым и катится.
import { INK } from './animals.js';

export const BALLS = ['soccer', 'tennis', 'beach', 'basket', 'bell', 'fluffy', 'star'];

/** Свойства для физики: упругость, трение, плотность (относительные), размер (доля базового). */
export const BALL_PHYS = {
  soccer: { size: 1.0, bounce: 0.72, friction: 0.02, density: 1.0 },
  tennis: { size: 0.62, bounce: 0.8, friction: 0.03, density: 0.8 },
  beach: { size: 1.35, bounce: 0.6, friction: 0.01, density: 0.25 },
  basket: { size: 1.1, bounce: 0.75, friction: 0.04, density: 1.2 },
  bell: { size: 0.7, bounce: 0.45, friction: 0.03, density: 0.9 },
  fluffy: { size: 0.85, bounce: 0.15, friction: 0.25, density: 0.5 },
  star: { size: 0.55, bounce: 0.95, friction: 0.01, density: 0.9 },
};

const R = 40;
const C = (x, y, r) => { const p = new Path2D(); p.arc(x, y, r, 0, Math.PI * 2); return p; };
const BALL = C(0, 0, R);

function poly(n, r, a0 = -Math.PI / 2, cx = 0, cy = 0) {
  const p = new Path2D();
  for (let i = 0; i < n; i++) {
    const a = a0 + (i * Math.PI * 2) / n;
    if (i) p.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); else p.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  p.closePath();
  return p;
}

const ART = {
  soccer(ctx) {
    ctx.fillStyle = '#FFFFFF'; ctx.fill(BALL);
    const dark = '#33394A';
    ctx.fillStyle = dark; ctx.fill(poly(5, 12.5));
    ctx.lineWidth = 2.4; ctx.strokeStyle = '#8A8F9C';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const b = a + Math.PI / 5;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12.5, Math.sin(a) * 12.5); ctx.lineTo(Math.cos(a) * 25, Math.sin(a) * 25); ctx.stroke();
      ctx.fillStyle = dark; ctx.fill(poly(5, 11, b + Math.PI, Math.cos(b) * 37, Math.sin(b) * 37));
    }
  },
  tennis(ctx) {
    ctx.fillStyle = '#D9EE4A'; ctx.fill(BALL);
    // ворс — мелкие точки
    ctx.fillStyle = 'rgba(150,170,20,0.35)';
    for (let i = 0; i < 40; i++) { const a = i * 2.39996, r = Math.sqrt(i / 40) * 37; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * 56, 0, 36, s > 0 ? Math.PI * 0.62 : -Math.PI * 0.38, s > 0 ? Math.PI * 1.38 : Math.PI * 0.38);
      ctx.lineWidth = 6.5; ctx.strokeStyle = 'rgba(120,140,0,0.35)'; ctx.stroke();
      ctx.lineWidth = 4.5; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
    }
  },
  beach(ctx) {
    const cols = ['#FF5A5F', '#FFFFFF', '#3FA9F5', '#FFD43B', '#FFFFFF', '#51CF66'];
    for (let i = 0; i < 6; i++) {
      const a0 = (i * Math.PI * 2) / 6, a1 = a0 + (Math.PI * 2) / 6;
      ctx.beginPath(); ctx.moveTo(0, 0);
      // дольки чуть закручены — как у настоящего надувного мяча сверху
      ctx.bezierCurveTo(Math.cos(a0 + 0.35) * 18, Math.sin(a0 + 0.35) * 18, Math.cos(a0 + 0.15) * 32, Math.sin(a0 + 0.15) * 32, Math.cos(a0) * 46, Math.sin(a0) * 46);
      ctx.arc(0, 0, 46, a0, a1);
      ctx.bezierCurveTo(Math.cos(a1 + 0.15) * 32, Math.sin(a1 + 0.15) * 32, Math.cos(a1 + 0.35) * 18, Math.sin(a1 + 0.35) * 18, 0, 0);
      ctx.fillStyle = cols[i]; ctx.fill();
    }
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(61,38,20,0.35)'; ctx.stroke();
  },
  basket(ctx) {
    ctx.fillStyle = '#F08A3A'; ctx.fill(BALL);
    ctx.fillStyle = 'rgba(120,50,0,0.18)';
    for (let i = 0; i < 50; i++) { const a = i * 2.39996, r = Math.sqrt(i / 50) * 37; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1, 0, Math.PI * 2); ctx.fill(); }
    ctx.lineWidth = 3; ctx.strokeStyle = '#3D2614'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(0, R); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 50, 0, 32, s > 0 ? Math.PI * 0.68 : -Math.PI * 0.32, s > 0 ? Math.PI * 1.32 : Math.PI * 0.32); ctx.stroke(); }
  },
  bell(ctx) {
    // пластиковый мячик с дырочками, внутри — золотой бубенчик
    ctx.fillStyle = '#FF8FB8'; ctx.fill(BALL);
    const holes = [[0, 0, 11], [0, -27, 8], [24, 14, 8], [-24, 14, 8], [24, -14, 6], [-24, -14, 6], [0, 28, 6]];
    for (const [x, y, r] of holes) {
      ctx.fillStyle = '#9C3A64'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(61,38,20,0.5)'; ctx.stroke();
    }
    ctx.fillStyle = '#FFD43B'; ctx.beginPath(); ctx.arc(1.5, 1.5, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFF3BF'; ctx.beginPath(); ctx.arc(-1, -1.5, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#B07C00'; ctx.fillRect(-0.8, 2, 4.6, 5);
  },
  fluffy(ctx) {
    // мягкий плюшевый помпон: края пушистые, внутри «шерстинки»
    ctx.fillStyle = '#B197FC'; ctx.fill(BALL);
    ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const a = i * 2.39996, r = Math.sqrt((i + 0.5) / 70) * 36, d = a + 0.8;
      ctx.lineWidth = 2.2; ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(90,50,170,0.28)';
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a) * r + Math.cos(d) * 5, Math.sin(a) * r + Math.sin(d) * 5); ctx.stroke();
    }
  },
  star(ctx) {
    // мячик-попрыгунчик со звёздочкой
    ctx.fillStyle = '#FF4D6D'; ctx.fill(BALL);
    ctx.fillStyle = '#3D7DFF'; ctx.beginPath(); ctx.ellipse(0, 0, R, 12, 0, 0, Math.PI * 2); ctx.fill();
    const st = new Path2D();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 9 : 20;
      if (i) st.lineTo(Math.cos(a) * r, Math.sin(a) * r); else st.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    st.closePath();
    ctx.fillStyle = '#FFE066'; ctx.fill(st);
    ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(61,38,20,0.6)'; ctx.lineJoin = 'round'; ctx.stroke(st);
  },
};

/** Пушистый край помпона (контур вместо ровного круга). */
const FLUFF = (() => {
  const p = new Path2D();
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const a = (i * Math.PI * 2) / n, am = a - Math.PI / n;
    const x = Math.cos(a) * R, y = Math.sin(a) * R;
    if (!i) { p.moveTo(x, y); continue; }
    p.quadraticCurveTo(Math.cos(am) * (R + 5), Math.sin(am) * (R + 5), x, y);
  }
  p.closePath();
  return p;
})();

/**
 * Мячик. (x, y) — центр, size — ширина на 100 единиц (мяч ≈ 0.8·size в диаметре).
 * o: rot — поворот узора (катится), squash — сплющивание при ударе (0..0.4), dir — направление сплющивания (рад),
 *    lift — мяч подпрыгнул над полом (0..1): тень остаётся на полу, мяч выше и чуть крупнее.
 */
export function drawBall(ctx, kind, x, y, size, o = {}) {
  const fn = ART[kind];
  if (!fn) return;
  const { rot = 0, squash = 0, dir = 0, lift = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const shape = kind === 'fluffy' ? FLUFF : BALL;

  // тень на полу (при прыжке — меньше и бледнее)
  ctx.fillStyle = `rgba(60,30,10,${0.16 * (1 - lift * 0.55)})`;
  ctx.beginPath(); ctx.ellipse(6 + lift * 10, 10 + lift * 26, R * (0.98 - lift * 0.25), R * (0.92 - lift * 0.25), 0, 0, Math.PI * 2); ctx.fill();
  if (lift) { ctx.translate(0, -lift * R * 0.7); ctx.scale(1 + lift * 0.22, 1 + lift * 0.22); }
  if (squash) { ctx.rotate(dir); ctx.scale(1 - squash, 1 + squash * 0.6); ctx.rotate(-dir); }

  if (kind === 'fluffy') { ctx.fillStyle = '#B197FC'; ctx.fill(shape); }
  ctx.save();
  ctx.clip(shape);
  ctx.rotate(rot);
  fn(ctx);
  ctx.restore();

  // объём: свет сверху-слева, тень снизу-справа — не крутится с мячом
  ctx.save();
  ctx.clip(shape);
  const g = ctx.createRadialGradient(-14, -16, 2, -4, -4, R * 1.25);
  g.addColorStop(0, 'rgba(255,255,255,0.42)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.06)');
  g.addColorStop(0.75, 'rgba(60,25,0,0.06)');
  g.addColorStop(1, 'rgba(60,25,0,0.28)');
  ctx.fillStyle = g; ctx.fillRect(-R - 8, -R - 8, R * 2 + 16, R * 2 + 16);
  ctx.restore();
  if (kind !== 'fluffy' && kind !== 'tennis') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(-16, -20, 9, 5, -0.6, 0, Math.PI * 2); ctx.fill();
  }

  ctx.lineWidth = 3.4; ctx.strokeStyle = INK; ctx.stroke(shape);
  ctx.restore();
}
