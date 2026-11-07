// Иконки плиток меню. Каждая функция рисует в квадрат S×S (CSS-пиксели).
import { drawChick, INK } from './chick.js';

function circle(ctx, x, y, r, fill, stroke = INK, lw) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function roundRect(ctx, x, y, w, h, r, fill, lw) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
}

function star(ctx, x, y, r1, r2, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = rot + (i * Math.PI) / n;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

export const ICONS = {
  test(ctx, S) {
    const lw = S * 0.028;
    const cols = ['#FF6B6B', '#4DABF7', '#51CF66', '#FFD43B'];
    [[0.36, 0.4, 0.2], [0.62, 0.36, 0.16], [0.5, 0.64, 0.18], [0.7, 0.66, 0.11]].forEach(([x, y, r], i) =>
      circle(ctx, x * S, y * S, r * S, cols[i], INK, lw));
  },

  chicks(ctx, S) {
    drawChick(ctx, S * 0.5, S * 0.93, S * 0.86);
  },

  bubbles(ctx, S) {
    const lw = S * 0.02;
    const b = [[0.4, 0.58, 0.24, '#C9E8FF'], [0.7, 0.36, 0.15, '#FFD1E8'], [0.68, 0.74, 0.11, '#D3F9D8'], [0.3, 0.25, 0.1, '#FFF3BF']];
    for (const [x, y, r, c] of b) {
      const g = ctx.createRadialGradient(x * S - r * S * 0.3, y * S - r * S * 0.3, r * S * 0.1, x * S, y * S, r * S);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, c);
      circle(ctx, x * S, y * S, r * S, g, 'rgba(74,44,23,0.55)', lw);
      ctx.beginPath();
      ctx.arc(x * S, y * S, r * S * 0.7, Math.PI * 1.1, Math.PI * 1.45);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = lw * 1.6; ctx.stroke();
    }
  },

  paint(ctx, S) {
    ctx.globalCompositeOperation = 'multiply';
    circle(ctx, S * 0.4, S * 0.42, S * 0.24, 'rgba(255,212,59,0.85)', null);
    circle(ctx, S * 0.6, S * 0.42, S * 0.24, 'rgba(77,171,247,0.8)', null);
    circle(ctx, S * 0.5, S * 0.62, S * 0.24, 'rgba(255,107,107,0.8)', null);
    ctx.globalCompositeOperation = 'source-over';
  },

  draw(ctx, S) {
    const cols = ['#FF6B6B', '#FFA94D', '#FFD43B', '#51CF66', '#4DABF7', '#9775FA'];
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.07;
    let px = S * 0.16, py = S * 0.62;
    for (let i = 0; i < 6; i++) {
      const nx = S * (0.16 + (i + 1) * 0.115), ny = S * (0.5 + Math.sin(i * 1.3) * 0.18);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny);
      ctx.strokeStyle = cols[i]; ctx.stroke();
      px = nx; py = ny;
    }
  },

  blocks(ctx, S) {
    const lw = S * 0.026, u = S * 0.22;
    roundRect(ctx, S * 0.2, S * 0.62, u, u, u * 0.16, '#4DABF7', lw);
    roundRect(ctx, S * 0.2 + u * 1.08, S * 0.62, u, u, u * 0.16, '#51CF66', lw);
    roundRect(ctx, S * 0.2 + u * 0.54, S * 0.62 - u * 1.04, u, u, u * 0.16, '#FF6B6B', lw);
    roundRect(ctx, S * 0.2 + u * 2.16, S * 0.62, u, u, u * 0.16, '#FFD43B', lw);
  },

  fish(ctx, S) {
    const lw = S * 0.028;
    ctx.save();
    ctx.translate(S * 0.5, S * 0.52);
    ctx.beginPath();
    ctx.moveTo(-S * 0.18, 0);
    ctx.lineTo(-S * 0.36, -S * 0.15);
    ctx.lineTo(-S * 0.36, S * 0.15);
    ctx.closePath();
    ctx.fillStyle = '#FFA94D'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(S * 0.04, 0, S * 0.27, S * 0.19, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FF922B'; ctx.fill(); ctx.stroke();
    circle(ctx, S * 0.16, -S * 0.04, S * 0.035, INK, null);
    ctx.restore();
  },

  sky(ctx, S) {
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#1B2A5C'); g.addColorStop(1, '#3B3F8F');
    ctx.beginPath(); ctx.roundRect(S * 0.1, S * 0.1, S * 0.8, S * 0.8, S * 0.18);
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = '#FFE066';
    star(ctx, S * 0.5, S * 0.5, S * 0.2, S * 0.09); ctx.fill();
    ctx.fillStyle = '#FFF3BF';
    star(ctx, S * 0.26, S * 0.28, S * 0.06, S * 0.025); ctx.fill();
    star(ctx, S * 0.75, S * 0.72, S * 0.05, S * 0.02); ctx.fill();
  },

  fireworks(ctx, S) {
    const cols = ['#FF6B6B', '#FFD43B', '#4DABF7', '#51CF66', '#F783AC', '#9775FA'];
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.04;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.strokeStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.moveTo(S * 0.5 + Math.cos(a) * S * 0.12, S * 0.5 + Math.sin(a) * S * 0.12);
      ctx.lineTo(S * 0.5 + Math.cos(a) * S * 0.34, S * 0.5 + Math.sin(a) * S * 0.34);
      ctx.stroke();
    }
  },

  hide(ctx, S) {
    const lw = S * 0.026;
    // уши
    ctx.fillStyle = '#C08457'; ctx.strokeStyle = INK; ctx.lineWidth = lw;
    for (const dx of [-0.1, 0.1]) {
      ctx.beginPath();
      ctx.ellipse(S * (0.5 + dx), S * 0.3, S * 0.06, S * 0.14, dx * 2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    // куст
    ctx.fillStyle = '#69DB7C';
    ctx.beginPath();
    ctx.arc(S * 0.3, S * 0.62, S * 0.17, Math.PI * 0.5, Math.PI * 1.6);
    ctx.arc(S * 0.5, S * 0.48, S * 0.18, Math.PI * 1.1, Math.PI * 1.9);
    ctx.arc(S * 0.7, S * 0.62, S * 0.17, Math.PI * 1.4, Math.PI * 0.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  },

  ducks(ctx, S) {
    const lw = S * 0.028;
    ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.fillStyle = '#FFD43B';
    ctx.beginPath();
    ctx.ellipse(S * 0.46, S * 0.62, S * 0.27, S * 0.16, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    circle(ctx, S * 0.62, S * 0.38, S * 0.14, '#FFD43B', INK, lw);
    ctx.beginPath();
    ctx.moveTo(S * 0.74, S * 0.36); ctx.quadraticCurveTo(S * 0.88, S * 0.38, S * 0.86, S * 0.44);
    ctx.quadraticCurveTo(S * 0.8, S * 0.46, S * 0.73, S * 0.43);
    ctx.fillStyle = '#FF922B'; ctx.fill(); ctx.stroke();
    circle(ctx, S * 0.65, S * 0.35, S * 0.025, INK, null);
  },

  train(ctx, S) {
    const lw = S * 0.026;
    roundRect(ctx, S * 0.18, S * 0.42, S * 0.5, S * 0.26, S * 0.04, '#FF6B6B', lw);
    roundRect(ctx, S * 0.5, S * 0.24, S * 0.22, S * 0.44, S * 0.04, '#FF6B6B', lw);
    roundRect(ctx, S * 0.55, S * 0.3, S * 0.12, S * 0.11, S * 0.02, '#D0EBFF', lw);
    roundRect(ctx, S * 0.24, S * 0.28, S * 0.08, S * 0.14, S * 0.02, '#495057', lw);
    for (const x of [0.3, 0.6]) circle(ctx, S * x, S * 0.72, S * 0.08, '#495057', INK, lw);
  },

  animals(ctx, S) {
    const lw = S * 0.026;
    ctx.strokeStyle = INK; ctx.lineWidth = lw;
    // кошачья мордочка, выглядывающая снизу
    ctx.fillStyle = '#FFA94D';
    for (const dx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(S * (0.5 + dx * 0.24), S * 0.5);
      ctx.lineTo(S * (0.5 + dx * 0.27), S * 0.22);
      ctx.lineTo(S * (0.5 + dx * 0.06), S * 0.38);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.62, S * 0.3, S * 0.27, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    circle(ctx, S * 0.4, S * 0.58, S * 0.03, INK, null);
    circle(ctx, S * 0.6, S * 0.58, S * 0.03, INK, null);
    ctx.beginPath();
    ctx.moveTo(S * 0.47, S * 0.67); ctx.quadraticCurveTo(S * 0.5, S * 0.71, S * 0.53, S * 0.67);
    ctx.stroke();
  },

  ink(ctx, S) {
    // клубы чернил в воде
    ctx.globalCompositeOperation = 'multiply';
    const blob = (x, y, r, c) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    blob(S * 0.4, S * 0.45, S * 0.3, 'rgba(51,154,240,0.95)');
    blob(S * 0.62, S * 0.58, S * 0.28, 'rgba(240,101,149,0.9)');
    blob(S * 0.5, S * 0.32, S * 0.2, 'rgba(252,196,25,0.9)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = S * 0.03; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(S * 0.5, S * 0.5, S * 0.16, 0.3, 3.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(S * 0.5, S * 0.5, S * 0.06, 2.5, 5.6); ctx.stroke();
  },

  drip(ctx, S) {
    const cols = ['#FF6B6B', '#FCC419', '#339AF0'];
    cols.forEach((c, i) => {
      const x = S * (0.28 + i * 0.22), len = S * (0.3 + (i % 2) * 0.18);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x - S * 0.09, S * 0.18);
      ctx.lineTo(x + S * 0.09, S * 0.18);
      ctx.lineTo(x + S * 0.04, S * 0.18 + len);
      ctx.arc(x, S * 0.18 + len, S * 0.05, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = '#FF6B6B'; ctx.fillRect(S * 0.12, S * 0.12, S * 0.76, S * 0.1);
  },

  finger(ctx, S) {
    const lw = S * 0.026;
    // мазки гуаши
    ctx.lineCap = 'round';
    [['#FCC419', 0.62], ['#51CF66', 0.74], ['#339AF0', 0.86]].forEach(([c, y]) => {
      ctx.strokeStyle = c; ctx.lineWidth = S * 0.11;
      ctx.beginPath(); ctx.moveTo(S * 0.14, S * y); ctx.quadraticCurveTo(S * 0.5, S * (y - 0.1), S * 0.86, S * y); ctx.stroke();
    });
    // пальчик
    ctx.fillStyle = '#FFD8B5'; ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.roundRect(S * 0.42, S * 0.12, S * 0.18, S * 0.46, S * 0.09); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath(); ctx.ellipse(S * 0.51, S * 0.5, S * 0.07, S * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  },

  surprise(ctx, S) {
    const lw = S * 0.028;
    roundRect(ctx, S * 0.2, S * 0.42, S * 0.6, S * 0.4, S * 0.05, '#F783AC', lw);
    roundRect(ctx, S * 0.16, S * 0.32, S * 0.68, S * 0.14, S * 0.04, '#F06595', lw);
    ctx.fillStyle = '#FFD43B';
    ctx.fillRect(S * 0.45, S * 0.32, S * 0.1, S * 0.5);
    ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.strokeRect(S * 0.45, S * 0.32, S * 0.1, S * 0.5);
    ctx.fillStyle = '#FFD43B';
    for (const dx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(S * (0.5 + dx * 0.1), S * 0.25, S * 0.1, S * 0.06, dx * 0.5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  },
};
