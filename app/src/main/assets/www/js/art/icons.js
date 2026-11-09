// Иконки плиток меню. Каждая функция рисует в квадрат S×S (CSS-пиксели).
import { INK } from './chick.js';
import { drawBird } from './birds.js';
import { drawAnimal } from './animals.js';
import { drawFish } from './sea.js';
import { drawLoco } from './train.js';
import { drawRubberDuck } from '../games/ducks.js';
import { drawFood } from './food.js';

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
    drawBird(ctx, 'chick', S * 0.5, S * 0.88, S * 0.78, { step: 0.25 });
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
    drawFish(ctx, 'clown', S * 0.52, S * 0.52, S * 0.78, 1, { t: 0.3 });
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
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, S, S * 0.62); ctx.clip();
    drawAnimal(ctx, 'rabbit', S * 0.5, S * 0.47, S * 0.6, { body: false, paws: false, look: 0.6 });
    ctx.restore();
    ctx.fillStyle = '#69DB7C'; ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(S * 0.28, S * 0.74, S * 0.16, Math.PI * 0.5, Math.PI * 1.6);
    ctx.arc(S * 0.5, S * 0.62, S * 0.18, Math.PI * 1.1, Math.PI * 1.9);
    ctx.arc(S * 0.72, S * 0.74, S * 0.16, Math.PI * 1.4, Math.PI * 0.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  },

  ducks(ctx, S) {
    ctx.save();
    ctx.translate(S * 0.06, S * 0.12);
    ctx.scale(S * 0.0088, S * 0.0088);
    drawRubberDuck(ctx, { body: '#FFD43B', wing: '#F5C518', beak: '#FF922B' }, 'bow');
    ctx.restore();
  },

  train(ctx, S) {
    ctx.save();
    ctx.translate(S * 0.08, S * 0.8);
    ctx.scale(S * 0.6, S * 0.6);
    drawLoco(ctx, { ang: 0.6 });
    ctx.restore();
  },

  feed(ctx, S) {
    drawAnimal(ctx, 'bear', S * 0.46, S * 0.48, S * 0.66, { body: false, paws: false, mood: 'yum', chew: 0.3 });
    drawFood(ctx, 'honey', S * 0.72, S * 0.74, S * 0.4, { rot: 0.15 });
  },

  flashlight(ctx, S) {
    // ночь, луч фонарика выхватывает котика, рядом в темноте светятся глазки
    ctx.save();
    ctx.beginPath(); ctx.roundRect(S * 0.08, S * 0.08, S * 0.84, S * 0.84, S * 0.18);
    ctx.fillStyle = '#1B2558'; ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#FFF3BF';
    for (const [x, y, r] of [[0.2, 0.22, 0.012], [0.32, 0.15, 0.008], [0.8, 0.2, 0.01], [0.86, 0.36, 0.007]]) { ctx.beginPath(); ctx.arc(S * x, S * y, S * r, 0, Math.PI * 2); ctx.fill(); }
    const lx = S * 0.58, ly = S * 0.5, R = S * 0.3;
    ctx.beginPath(); ctx.arc(lx, ly, R, 0, Math.PI * 2);
    ctx.fillStyle = '#8FCB72'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#9DC3F2'; ctx.fillRect(lx - R, ly - R, R * 2, R * 0.95);
    drawAnimal(ctx, 'cat', lx, ly + S * 0.04, S * 0.4, { body: false, paws: false, open: 0.3 });
    ctx.restore();
    ctx.lineWidth = S * 0.012; ctx.strokeStyle = 'rgba(255,240,190,0.7)';
    ctx.beginPath(); ctx.arc(lx, ly, R, 0, Math.PI * 2); ctx.stroke();
    for (const x of [0.18, 0.28]) {
      const g = ctx.createRadialGradient(S * x, S * 0.72, 0, S * x, S * 0.72, S * 0.07);
      g.addColorStop(0, 'rgba(230,255,150,0.6)'); g.addColorStop(1, 'rgba(230,255,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(S * x, S * 0.72, S * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F5FFBE'; ctx.beginPath(); ctx.ellipse(S * x, S * 0.72, S * 0.025, S * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.lineWidth = S * 0.026; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.roundRect(S * 0.08, S * 0.08, S * 0.84, S * 0.84, S * 0.18); ctx.stroke();
  },

  animals(ctx, S) {
    drawAnimal(ctx, 'dog', S * 0.47, S * 0.56, S * 0.76, { body: false, paws: false });
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

  ebru(ctx, S) {
    // кольца краски, протянутые пальцем в завиток
    const cols = ['#1D3557', '#E9C46A', '#E63946', '#2A9D8F', '#F3EDE1', '#F4A261'];
    const cx = S * 0.5, cy = S * 0.5;
    cols.forEach((c, i) => {
      const R = S * (0.4 - i * 0.065);
      ctx.beginPath();
      for (let k = 0; k <= 96; k++) {
        const a = (k / 96) * Math.PI * 2;
        const r = R + Math.sin(a * 2 + i * 0.5) * S * 0.025 * (1 + i * 0.3);
        const sw = Math.exp(-((a - Math.PI * 0.5) ** 2) * 1.5) * S * 0.08 * (1 - i * 0.12);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r + sw;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = c; ctx.fill();
      ctx.lineWidth = S * 0.008; ctx.strokeStyle = 'rgba(40,20,10,0.35)'; ctx.stroke();
    });
  },

  ebru2(ctx, S) {
    // временная плитка для сравнения: та же картинка + «2» в уголке
    ICONS.ebru(ctx, S);
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = S * 0.025;
    ctx.beginPath(); ctx.arc(S * 0.8, S * 0.2, S * 0.13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = `900 ${S * 0.18}px Nunito, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('2', S * 0.8, S * 0.21);
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
