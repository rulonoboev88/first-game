// Мордочки зверей анфас (для «Зверей из-за угла» и «Пряток»).
// Центр головы в (0,0), голова ≈ 100 единиц в ширину. Единый стиль: заливка + тёмный контур.
import { INK } from './chick.js';

export const ANIMALS = ['cow', 'pig', 'sheep', 'goat', 'horse', 'dog', 'cat', 'frog', 'owl', 'mouse', 'rabbit', 'hedgehog'];

const LW = 3.6;

function E(ctx, x, y, rx, ry, fill, { rot = 0, stroke = true, lw = LW } = {}) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); }
}

function poly(ctx, pts, fill, { stroke = true, close = true } = {}) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke(); }
}

function eyes(ctx, dx, y, r, { blink = false, look = 0 } = {}) {
  for (const s of [-1, 1]) {
    const x = s * dx;
    if (blink) {
      ctx.beginPath();
      ctx.moveTo(x - r, y);
      ctx.quadraticCurveTo(x, y + r * 0.8, x + r, y);
      ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    } else {
      E(ctx, x + look * r * 0.2, y, r * 0.78, r, INK, { stroke: false });
      E(ctx, x + look * r * 0.2 + r * 0.25, y - r * 0.35, r * 0.28, r * 0.28, '#fff', { stroke: false });
    }
  }
}

function cheeks(ctx, dx, y, r = 7) {
  for (const s of [-1, 1]) E(ctx, s * dx, y, r, r * 0.7, 'rgba(255,138,128,0.45)', { stroke: false });
}

function mouth(ctx, y, w, open) {
  ctx.lineWidth = LW; ctx.strokeStyle = INK;
  if (open > 0.05) {
    E(ctx, 0, y + 3 * open, w * 0.45, 7 * open + 2, '#8C3B3B');
  } else {
    ctx.beginPath();
    ctx.moveTo(-w / 2, y);
    ctx.quadraticCurveTo(-w / 4, y + 6, 0, y);
    ctx.quadraticCurveTo(w / 4, y + 6, w / 2, y);
    ctx.stroke();
  }
}

function whiskers(ctx, y) {
  ctx.lineWidth = 2.2; ctx.strokeStyle = INK;
  for (const s of [-1, 1]) {
    for (const k of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 16, y + k * 3);
      ctx.lineTo(s * 40, y + k * 7 - 2);
      ctx.stroke();
    }
  }
}

/** Лапки, держащиеся за край (рисуются под мордочкой). */
export function drawPaws(ctx, kind, wave = 0) {
  const col = PAW[kind] || '#ccc';
  E(ctx, -26, 46, 14, 11, col);
  ctx.save();
  ctx.translate(26, 46);
  ctx.rotate(-wave * 1.2);
  ctx.translate(0, -wave * 26);
  E(ctx, 0, 0, 14, 11, col);
  ctx.restore();
}

const PAW = {
  cow: '#FFFFFF', pig: '#FFB3C6', sheep: '#5C5552', goat: '#EADBC8', horse: '#9C5B2E', dog: '#E2B07A',
  cat: '#FFA94D', frog: '#7BD389', owl: '#A47148', mouse: '#B8B8C4', rabbit: '#F2F2F2', hedgehog: '#E9C9A0',
};

/**
 * Рисует мордочку. o: { blink, open (рот 0..1), ear (покачивание ушей -1..1), look (-1..1) }
 */
export function drawAnimal(ctx, kind, x, y, size, o = {}) {
  const { blink = false, open = 0, ear = 0, look = 0, paws = true, wave = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (paws) drawPaws(ctx, kind, wave);
  const f = HEADS[kind];
  f(ctx, { blink, open, ear, look });
  ctx.restore();
}

const HEADS = {
  cow(ctx, o) {
    // рожки и ушки
    for (const s of [-1, 1]) {
      poly(ctx, [[s * 18, -34], [s * 26, -52], [s * 30, -34]], '#FFF3D6');
      ctx.save(); ctx.translate(s * 40, -16); ctx.rotate(s * (0.3 + o.ear * 0.25));
      E(ctx, 0, 0, 16, 9, '#FFFFFF');
      E(ctx, s * 3, 0, 9, 4.5, '#FFB3C6', { stroke: false });
      ctx.restore();
    }
    E(ctx, 0, 0, 38, 42, '#FFFFFF');
    // пятна
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 0, 38, 42, 0, 0, Math.PI * 2); ctx.clip();
    E(ctx, -26, -24, 16, 13, '#3B3B3B', { stroke: false, rot: 0.4 });
    E(ctx, 28, -8, 11, 15, '#3B3B3B', { stroke: false, rot: -0.3 });
    ctx.restore();
    E(ctx, 0, 0, 38, 42, null);
    E(ctx, 0, 24, 30, 19, '#FFC2D1');
    E(ctx, -11, 24, 4, 5.5, INK, { stroke: false });
    E(ctx, 11, 24, 4, 5.5, INK, { stroke: false });
    eyes(ctx, 15, -8, 6.5, o);
    if (o.open > 0.05) E(ctx, 0, 37, 9, 4 * o.open + 1.5, '#8C3B3B', { lw: 2.5 });
  },

  pig(ctx, o) {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 26, -30); ctx.rotate(s * (0.35 + o.ear * 0.3));
      poly(ctx, [[-12, 6], [0, -18], [12, 6]], '#FF9EB7');
      ctx.restore();
    }
    E(ctx, 0, 0, 42, 37, '#FFB3C6');
    cheeks(ctx, 26, 12, 7);
    eyes(ctx, 15, -8, 6, o);
    E(ctx, 0, 12, 16, 12, '#FF8FAB');
    E(ctx, -5.5, 12, 3, 4.5, '#B34766', { stroke: false });
    E(ctx, 5.5, 12, 3, 4.5, '#B34766', { stroke: false });
    mouth(ctx, 29, 14, o.open);
  },

  sheep(ctx, o) {
    // кудряшки
    const wool = '#FBF6EE';
    const puffs = [[-34, -22], [-14, -38], [10, -40], [32, -26], [40, -2], [-40, 0], [-30, 22], [32, 22]];
    for (const [px, py] of puffs) E(ctx, px, py, 17, 16, wool);
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 42, 4); ctx.rotate(s * (0.4 + o.ear * 0.3));
      E(ctx, 0, 0, 15, 8, '#5C5552');
      ctx.restore();
    }
    E(ctx, 0, 6, 27, 32, '#5C5552');
    for (const [px, py] of [[-14, -26], [0, -32], [14, -26]]) E(ctx, px, py, 12, 11, wool);
    eyes(ctx, 11, 2, 6, o);
    ctx.save(); ctx.lineWidth = LW; ctx.strokeStyle = '#FBF6EE';
    ctx.beginPath(); ctx.moveTo(-6, 22); ctx.quadraticCurveTo(0, 27, 6, 22); ctx.stroke(); ctx.restore();
    if (o.open > 0.05) E(ctx, 0, 27, 6, 3 * o.open + 1.5, '#C27A7A', { lw: 2.2 });
  },

  goat(ctx, o) {
    for (const s of [-1, 1]) {
      // загнутые рожки
      ctx.beginPath();
      ctx.moveTo(s * 10, -34);
      ctx.quadraticCurveTo(s * 18, -66, s * 34, -56);
      ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = '#C9B79C'; ctx.stroke();
      ctx.save(); ctx.translate(s * 34, -12); ctx.rotate(s * (0.5 + o.ear * 0.3));
      E(ctx, 0, 0, 17, 8, '#EADBC8');
      E(ctx, s * 3, 0, 10, 4, '#F5C2C7', { stroke: false });
      ctx.restore();
    }
    poly(ctx, [[-8, 38], [0, 58], [8, 38]], '#D9C6AE');
    E(ctx, 0, 0, 27, 42, '#EADBC8');
    eyes(ctx, 12, -10, 6, o);
    E(ctx, 0, 24, 15, 11, '#F2D7C9');
    E(ctx, -5, 22, 2.5, 3.5, INK, { stroke: false });
    E(ctx, 5, 22, 2.5, 3.5, INK, { stroke: false });
    mouth(ctx, 33, 10, o.open);
  },

  horse(ctx, o) {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 16, -42); ctx.rotate(s * (0.2 + o.ear * 0.25));
      poly(ctx, [[-8, 8], [0, -16], [8, 8]], '#9C5B2E');
      ctx.restore();
    }
    E(ctx, 0, 0, 28, 44, '#B86B35');
    // чёлка
    poly(ctx, [[-14, -40], [-4, -24], [0, -44], [6, -26], [14, -40], [6, -48], [-6, -48]], '#4A2C17');
    E(ctx, 0, 28, 22, 17, '#E3B48A');
    E(ctx, -9, 28, 3.5, 5, INK, { stroke: false });
    E(ctx, 9, 28, 3.5, 5, INK, { stroke: false });
    eyes(ctx, 13, -8, 6, o);
    if (o.open > 0.05) E(ctx, 0, 41, 9, 3 * o.open + 1.5, '#8C3B3B', { lw: 2.5 });
  },

  dog(ctx, o) {
    E(ctx, 0, 0, 38, 36, '#E2B07A');
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 36, -8); ctx.rotate(s * (0.25 + o.ear * 0.35));
      E(ctx, 0, 12, 12, 26, '#9C5B2E');
      ctx.restore();
    }
    E(ctx, 14, -12, 12, 11, '#C98A4B', { stroke: false }); // пятнышко у глаза
    eyes(ctx, 14, -8, 6.5, o);
    E(ctx, 0, 16, 20, 15, '#F6DDBE');
    E(ctx, 0, 9, 8, 6, INK, { stroke: false });
    if (o.open > 0.05) {
      E(ctx, 0, 25, 9, 6 * o.open + 2, '#8C3B3B', { lw: 2.5 });
      E(ctx, 0, 29 + 4 * o.open, 6, 6, '#FF8FAB', { lw: 2.2 }); // язык
    } else mouth(ctx, 22, 14, 0);
    cheeks(ctx, 25, 10, 6);
  },

  cat(ctx, o) {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 26, -26); ctx.rotate(s * o.ear * 0.25);
      poly(ctx, [[-14, 6], [s * 4, -26], [14, 6]], '#FFA94D');
      poly(ctx, [[-7, 3], [s * 3, -14], [7, 3]], '#FFC9D4', { stroke: false });
      ctx.restore();
    }
    E(ctx, 0, 2, 40, 34, '#FFA94D');
    // полоски
    ctx.lineWidth = 4; ctx.strokeStyle = '#E8590C';
    for (const dx of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(dx, -30); ctx.lineTo(dx, -20); ctx.stroke(); }
    eyes(ctx, 15, -4, 6.5, o);
    poly(ctx, [[-4, 8], [4, 8], [0, 13]], '#FF8FAB', { stroke: false });
    mouth(ctx, 15, 14, o.open);
    whiskers(ctx, 12);
    cheeks(ctx, 24, 12, 6);
  },

  frog(ctx, o) {
    for (const s of [-1, 1]) {
      E(ctx, s * 22, -26, 16, 16, '#7BD389');
    }
    E(ctx, 0, 6, 46, 30, '#7BD389');
    for (const s of [-1, 1]) {
      if (o.blink) {
        ctx.beginPath(); ctx.moveTo(s * 22 - 8, -26); ctx.quadraticCurveTo(s * 22, -20, s * 22 + 8, -26);
        ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
      } else {
        E(ctx, s * 22, -26, 10, 10, '#fff', { lw: 2.5 });
        E(ctx, s * 22 + o.look * 2, -25, 5, 6, INK, { stroke: false });
      }
    }
    cheeks(ctx, 32, 12, 7);
    if (o.open > 0.05) E(ctx, 0, 16, 22, 8 * o.open + 2, '#C2455C');
    else {
      ctx.beginPath(); ctx.moveTo(-24, 12); ctx.quadraticCurveTo(0, 26, 24, 12);
      ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    }
  },

  owl(ctx, o) {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 26, -34); ctx.rotate(s * o.ear * 0.2);
      poly(ctx, [[-10, 8], [s * 6, -16], [12, 8]], '#8B5A34');
      ctx.restore();
    }
    E(ctx, 0, 2, 42, 40, '#A47148');
    E(ctx, 0, 20, 26, 20, '#E8D3B5', { stroke: false });
    for (const s of [-1, 1]) {
      E(ctx, s * 17, -6, 15, 15, '#FFF8E8');
      if (o.blink) {
        ctx.beginPath(); ctx.moveTo(s * 17 - 9, -6); ctx.quadraticCurveTo(s * 17, 0, s * 17 + 9, -6);
        ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
      } else {
        E(ctx, s * 17 + o.look * 2, -5, 8, 8, INK, { stroke: false });
        E(ctx, s * 17 + 3, -8, 2.5, 2.5, '#fff', { stroke: false });
      }
    }
    poly(ctx, [[-6, 8], [6, 8], [0, 18 + o.open * 4]], '#FFA94D');
  },

  mouse(ctx, o) {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 30, -26); ctx.rotate(s * o.ear * 0.25);
      E(ctx, 0, 0, 20, 20, '#B8B8C4');
      E(ctx, 0, 0, 12, 12, '#FFC9D4', { stroke: false });
      ctx.restore();
    }
    E(ctx, 0, 4, 32, 30, '#B8B8C4');
    eyes(ctx, 12, -2, 5.5, o);
    E(ctx, 0, 14, 5, 4, '#FF8FAB');
    whiskers(ctx, 16);
    if (o.open > 0.05) E(ctx, 0, 24, 5, 2.5 * o.open + 1.5, '#8C3B3B', { lw: 2.2 });
    cheeks(ctx, 20, 12, 5);
  },

  rabbit(ctx, o) {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 14, -30); ctx.rotate(s * (0.12 + o.ear * 0.2));
      E(ctx, 0, -28, 11, 30, '#F2F2F2');
      E(ctx, 0, -26, 5.5, 21, '#FFC9D4', { stroke: false });
      ctx.restore();
    }
    E(ctx, 0, 4, 34, 32, '#F2F2F2');
    eyes(ctx, 13, -2, 6, o);
    poly(ctx, [[-4, 10], [4, 10], [0, 15]], '#FF8FAB', { stroke: false });
    // зубки
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.rect(-5, 20, 10, 8 + o.open * 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, 28 + o.open * 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, 18); ctx.quadraticCurveTo(0, 22, 10, 18); ctx.stroke();
    cheeks(ctx, 22, 12, 6);
  },

  hedgehog(ctx, o) {
    // иголки венцом
    ctx.save();
    ctx.translate(0, 0);
    const n = 13;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1.0 + (i / (n - 1)) * 1.0) + o.ear * 0.03;
      const r1 = 30, r2 = 52;
      poly(ctx, [
        [Math.cos(a - 0.17) * r1, Math.sin(a - 0.17) * r1 + 4],
        [Math.cos(a) * r2, Math.sin(a) * r2 + 4],
        [Math.cos(a + 0.17) * r1, Math.sin(a + 0.17) * r1 + 4],
      ], '#7A5230');
    }
    ctx.restore();
    E(ctx, 0, 6, 32, 30, '#E9C9A0');
    eyes(ctx, 12, 0, 5.5, o);
    E(ctx, 0, 16, 6, 5, INK, { stroke: false });
    if (o.open > 0.05) E(ctx, 0, 26, 5, 2.5 * o.open + 1.5, '#8C3B3B', { lw: 2.2 });
    cheeks(ctx, 20, 14, 5);
  },
};
