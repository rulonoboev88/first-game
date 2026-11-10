// Морские жители: 12 видов рыбок и 5 обитателей дна. Плоско, с тёмным контуром.
// Рыбки смотрят вправо, центр тела в (0,0), длина ≈ 100 единиц.
import { INK } from './ink.js';

export const FISH = ['clown', 'blueTang', 'yellowTang', 'puffer', 'angel', 'goldfish', 'guppy', 'zebra', 'betta', 'shark', 'seahorse', 'jelly'];
export const BOTTOM = ['crab', 'snail', 'starfish', 'hermit', 'urchin'];

const LW = 3.4;

function darker(h, k) {
  const n = parseInt(h.slice(1), 16);
  return `rgb(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k))).join(',')})`;
}
/** Объём «контур с объёмом»: тень по краю + мягкий блик (только для сплошных цветов). */
function volume(ctx, p, fill, size, rim = true) {
  if (rim && typeof fill === 'string' && fill[0] === '#' && size > 5) {
    ctx.save(); ctx.clip(p);
    ctx.fillStyle = darker(fill, 0.14); ctx.fillRect(-200, -200, 400, 400);
    ctx.translate(-2.4, -3.4); ctx.fillStyle = fill; ctx.fill(p);
    ctx.restore();
  }
  if (size > 5) gloss(ctx, p);
}
function gloss(ctx, p) {
  ctx.save(); ctx.clip(p);
  const g = ctx.createLinearGradient(-50, -50, 50, 50);
  g.addColorStop(0, 'rgba(255,255,255,0.32)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(60,20,0,0.06)');
  ctx.fillStyle = g; ctx.fillRect(-200, -200, 400, 400);
  ctx.restore();
}

function E(ctx, x, y, rx, ry, fill, { rot = 0, stroke = true, lw = LW } = {}) {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(p); if (stroke) volume(ctx, p, fill, Math.min(rx, ry)); }
  else if (stroke) gloss(ctx, p); // повторный контур поверх полосок — возвращаем блик
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(p); }
}
function poly(ctx, pts, fill, stroke = true) {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(p); if (stroke) volume(ctx, p, fill, 10, false); }
  if (stroke) { ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke(p); }
}
/** Живой глаз: белок, цветная радужка, зрачок, два блика; lash — ресницы, brow — бровка. */
function eye(ctx, x, y, r, blink, { lash = false, brow = false, iris = '#5B3A29' } = {}) {
  r *= 1.4;
  if (brow && !blink) {
    ctx.beginPath(); ctx.moveTo(x - r * 0.9, y - r * 1.3); ctx.quadraticCurveTo(x, y - r * 1.75, x + r * 0.9, y - r * 1.45);
    ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke();
  }
  if (blink) {
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * 0.7, x + r, y);
    ctx.lineWidth = LW * 0.8; ctx.strokeStyle = INK; ctx.stroke();
    return;
  }
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.95, r, 0, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(x + r * 0.28, y + r * 0.08, r * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1C120D'; ctx.beginPath(); ctx.arc(x + r * 0.32, y + r * 0.08, r * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x + r * 0.12, y - r * 0.2, r * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.5, y + r * 0.3, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.95, r, 0, 0, Math.PI * 2); ctx.lineWidth = 2.3; ctx.strokeStyle = INK; ctx.stroke();
  if (lash) {
    ctx.beginPath();
    for (const a of [-1.15, -0.7, -0.25]) {
      const ex = x + Math.cos(a) * r * 0.95, ey = y + Math.sin(a) * r;
      ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a) * r * 0.5, ey + Math.sin(a) * r * 0.5);
    }
    ctx.lineWidth = 2; ctx.stroke();
  }
}
function blush(ctx, x, y, r = 5) {
  ctx.fillStyle = 'rgba(255,120,130,0.45)';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
}
function mouth(ctx, x, y, open) {
  if (open > 0.1) { E(ctx, x, y, 3 + open * 3, 2 + open * 4, '#8C3B3B', { lw: 2.2 }); return; }
  ctx.beginPath(); ctx.arc(x - 4, y - 2, 5, 0.15, 1.45); ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke();
}

/** Хвост с покачиванием. */
function tail(ctx, x, w, h, fill, wag, kind = 'fork') {
  ctx.save();
  ctx.translate(x, 0);
  ctx.rotate(wag * 0.35);
  if (kind === 'fork') poly(ctx, [[4, 0], [-w, -h], [-w * 0.65, 0], [-w, h]], fill);
  else if (kind === 'fan') {
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.bezierCurveTo(-w * 0.4, -h * 1.3, -w * 1.2, -h * 1.1, -w, 0);
    ctx.bezierCurveTo(-w * 1.2, h * 1.1, -w * 0.4, h * 1.3, 4, 0);
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
  } else E(ctx, -w * 0.5, 0, w * 0.55, h, fill);
  ctx.restore();
}

function stripes(ctx, clipRx, clipRy, xs, color, width) {
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, clipRx, clipRy, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = color;
  for (const x of xs) ctx.fillRect(x - width / 2, -clipRy, width, clipRy * 2);
  ctx.restore();
}

/** o: { t — время (для хвоста), open — рот, blink } */
export function drawFish(ctx, kind, x, y, size, flipK = 1, o = {}) {
  const { t = 0, open = 0, blink = false } = o;
  const wag = Math.sin(t * 9);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((size / 100) * flipK, size / 100);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  FISH_DRAW[kind](ctx, wag, open, blink, t);
  ctx.restore();
}

const FISH_DRAW = {
  clown(ctx, wag, open, blink) {
    tail(ctx, -36, 22, 18, '#FF8C1A', wag, 'round');
    E(ctx, -2, -24, 16, 9, '#FF8C1A');
    E(ctx, 0, 0, 40, 25, '#FF8C1A');
    stripes(ctx, 40, 25, [-20, 6, 26], '#FFFFFF', 9);
    E(ctx, 0, 0, 40, 25, null);
    blush(ctx, 26, 8); eye(ctx, 24, -6, 7, blink); mouth(ctx, 38, 6, open);
  },
  blueTang(ctx, wag, open, blink) {
    tail(ctx, -38, 20, 18, '#FCC419', wag);
    poly(ctx, [[-30, -20], [10, -34], [24, -22]], '#2F6FDE');
    E(ctx, 0, 0, 42, 26, '#3B82F6');
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 42, 26, 0, 0, Math.PI * 2); ctx.clip();
    E(ctx, -6, -6, 26, 8, '#1E3A8A', { stroke: false, rot: 0.2 }); ctx.restore();
    E(ctx, 0, 0, 42, 26, null);
    blush(ctx, 28, 8); eye(ctx, 26, -6, 7, blink, { lash: true, iris: '#1C4FB0' }); mouth(ctx, 40, 6, open);
  },
  yellowTang(ctx, wag, open, blink) {
    tail(ctx, -30, 16, 16, '#FFD43B', wag);
    poly(ctx, [[-26, -14], [6, -44], [24, -20]], '#FFD43B');
    poly(ctx, [[-26, 14], [6, 42], [24, 20]], '#FFD43B');
    E(ctx, 0, 0, 34, 30, '#FFE066');
    blush(ctx, 18, 6); eye(ctx, 18, -8, 7, blink);
    poly(ctx, [[30, 2], [42, 4], [30, 9]], '#FFE066');
    if (open > 0.1) E(ctx, 40, 5, 3, 2 + open * 3, '#8C3B3B', { lw: 2 });
  },
  puffer(ctx, wag, open, blink) {
    tail(ctx, -38, 14, 12, '#E9C46A', wag, 'round');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      poly(ctx, [[Math.cos(a - 0.12) * 34, Math.sin(a - 0.12) * 34], [Math.cos(a) * 44, Math.sin(a) * 44], [Math.cos(a + 0.12) * 34, Math.sin(a + 0.12) * 34]], '#E9C46A');
    }
    E(ctx, 0, 0, 36, 36, '#F6D98A');
    E(ctx, 0, 14, 26, 16, '#FFF6DA', { stroke: false });
    for (const [sx, sy] of [[-16, -14], [-2, -22], [-24, 2], [8, -10]]) E(ctx, sx, sy, 3.5, 3.5, '#B5803A', { stroke: false });
    E(ctx, 0, 0, 36, 36, null);
    blush(ctx, 20, 8, 6); eye(ctx, 16, -8, 8, blink, { brow: true }); mouth(ctx, 32, 8, open);
  },
  angel(ctx, wag, open, blink) {
    tail(ctx, -24, 16, 16, '#74C0FC', wag);
    poly(ctx, [[-14, -18], [0, -60], [16, -20]], '#FFD43B');
    poly(ctx, [[-14, 18], [0, 60], [16, 20]], '#FFD43B');
    E(ctx, 0, 0, 28, 30, '#A5D8FF');
    stripes(ctx, 28, 30, [-12, 6], '#1C7ED6', 7);
    E(ctx, 0, 0, 28, 30, null);
    blush(ctx, 16, 6); eye(ctx, 14, -8, 6.5, blink, { lash: true }); mouth(ctx, 26, 6, open);
  },
  goldfish(ctx, wag, open, blink) {
    tail(ctx, -30, 34, 26, '#FFA94D', wag, 'fan');
    poly(ctx, [[-12, -22], [4, -38], [18, -22]], '#FF922B');
    E(ctx, 0, 0, 36, 26, '#FF922B');
    E(ctx, 6, 8, 18, 10, '#FFC078', { stroke: false });
    E(ctx, 0, 0, 36, 26, null);
    blush(ctx, 22, 8); eye(ctx, 20, -6, 7.5, blink, { lash: true }); mouth(ctx, 34, 6, open);
  },
  guppy(ctx, wag, open, blink) {
    ctx.save(); ctx.translate(-22, 0); ctx.rotate(wag * 0.3);
    const g = ctx.createLinearGradient(-40, 0, 0, 0);
    g.addColorStop(0, '#F06595'); g.addColorStop(0.5, '#FFD43B'); g.addColorStop(1, '#4DABF7');
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.bezierCurveTo(-20, -40, -48, -36, -46, 0); ctx.bezierCurveTo(-48, 36, -20, 40, 4, 0);
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
    E(ctx, 8, 0, 30, 16, '#C5D3E8');
    blush(ctx, 26, 6, 4); eye(ctx, 24, -3, 6, blink); mouth(ctx, 36, 4, open);
  },
  zebra(ctx, wag, open, blink) {
    tail(ctx, -36, 18, 16, '#F783AC', wag);
    E(ctx, 0, 0, 40, 20, '#FFC9DE');
    stripes(ctx, 40, 20, [-22, -10, 2, 14], '#9C36B5', 5);
    E(ctx, 0, 0, 40, 20, null);
    blush(ctx, 26, 7, 4); eye(ctx, 24, -4, 6.5, blink); mouth(ctx, 38, 5, open);
  },
  betta(ctx, wag, open, blink) {
    ctx.save(); ctx.translate(-18, 0); ctx.rotate(wag * 0.25);
    ctx.beginPath(); ctx.moveTo(6, 0);
    ctx.bezierCurveTo(-20, -60, -56, -40, -50, 0); ctx.bezierCurveTo(-56, 40, -20, 60, 6, 0);
    ctx.fillStyle = '#C2255C'; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
    poly(ctx, [[-14, -14], [-10, -40], [16, -16]], '#9C36B5');
    E(ctx, 6, 0, 30, 18, '#7048E8');
    blush(ctx, 24, 6, 4); eye(ctx, 22, -4, 6.5, blink, { lash: true, iris: '#7A1E4A' }); mouth(ctx, 34, 4, open);
  },
  shark(ctx, wag, open, blink) {
    tail(ctx, -40, 20, 22, '#ADB5BD', wag);
    poly(ctx, [[-6, -16], [4, -42], [18, -16]], '#ADB5BD');
    E(ctx, 0, 0, 46, 20, '#ADB5BD');
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 46, 20, 0, 0, Math.PI * 2); ctx.clip();
    E(ctx, 4, 16, 44, 12, '#F1F3F5', { stroke: false }); ctx.restore();
    E(ctx, 0, 0, 46, 20, null);
    poly(ctx, [[0, 12], [-8, 28], [12, 14]], '#ADB5BD');
    eye(ctx, 28, -5, 6, blink, { brow: true, iris: '#3B5BA9' });
    // добрая улыбка с зубками
    ctx.beginPath(); ctx.moveTo(24, 7); ctx.quadraticCurveTo(35, 16, 44, 6); ctx.quadraticCurveTo(35, 11, 24, 7); ctx.closePath();
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 9); ctx.lineTo(31, 12); ctx.moveTo(36, 10); ctx.lineTo(37, 13); ctx.lineWidth = 1.4; ctx.stroke();
    blush(ctx, 24, 2, 4);
  },
  seahorse(ctx, wag, open, blink, t) {
    ctx.save(); ctx.rotate(Math.sin(t * 2) * 0.08);
    ctx.lineWidth = 12; ctx.strokeStyle = INK;
    const curl = new Path2D('M -2 34 C 2 50 -14 56 -18 46 C -20 40 -12 38 -10 42');
    ctx.stroke(curl); ctx.lineWidth = 7.5; ctx.strokeStyle = '#FFA94D'; ctx.stroke(curl);
    poly(ctx, [[-14, -6], [-28, -14 + wag * 3], [-26, 6 + wag * 3]], '#FFD8A8');
    E(ctx, 0, 6, 15, 28, '#FFA94D');
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-6, -8 + i * 9); ctx.lineTo(8, -10 + i * 9); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(74,44,23,0.5)'; ctx.stroke(); }
    E(ctx, 6, -26, 14, 11, '#FFA94D');
    poly(ctx, [[14, -30], [32, -28], [32, -22], [16, -22]], '#FFA94D');
    poly(ctx, [[-2, -36], [2, -46], [8, -36]], '#FF922B');
    blush(ctx, 2, -22, 3.5); eye(ctx, 8, -28, 5, blink, { lash: true });
    ctx.restore();
  },
  jelly(ctx, wag, open, blink, t) {
    const pulse = Math.sin(t * 3) * 0.08;
    ctx.save(); ctx.rotate(-Math.PI / 2 * 0); // медуза не разворачивается
    // щупальца
    for (let i = 0; i < 5; i++) {
      const x0 = -18 + i * 9;
      ctx.beginPath(); ctx.moveTo(x0, 6);
      for (let k = 1; k <= 4; k++) ctx.lineTo(x0 + Math.sin(t * 4 + i + k) * 4, 6 + k * 11);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(214,51,132,0.7)'; ctx.stroke();
    }
    ctx.scale(1 + pulse, 1 - pulse);
    ctx.beginPath();
    ctx.moveTo(-28, 6); ctx.bezierCurveTo(-30, -30, 30, -30, 28, 6);
    ctx.quadraticCurveTo(14, 12, 0, 6); ctx.quadraticCurveTo(-14, 12, -28, 6);
    ctx.fillStyle = 'rgba(247,131,172,0.85)'; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    E(ctx, -8, -14, 6, 4, 'rgba(255,255,255,0.6)', { stroke: false, rot: -0.4 });
    for (const s of [-1, 1]) {
      if (blink) { ctx.beginPath(); ctx.moveTo(s * 8 - 3, -4); ctx.lineTo(s * 8 + 3, -4); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke(); }
      else eye(ctx, s * 8, -5, 3.6, false, { lash: s > 0 });
    }
    E(ctx, -15, 0, 3.5, 2.5, 'rgba(255,138,128,0.6)', { stroke: false });
    E(ctx, 15, 0, 3.5, 2.5, 'rgba(255,138,128,0.6)', { stroke: false });
    ctx.restore();
  },
};

// ---------- Дно ----------

/** Обитатели дна. (x, y) — точка на песке, size ≈ ширина. */
export function drawBottom(ctx, kind, x, y, size, o = {}) {
  const { t = 0, flip = false, blink = false, walk = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((size / 100) * (flip ? -1 : 1), size / 100);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  BOTTOM_DRAW[kind](ctx, t, blink, walk);
  ctx.restore();
}

const BOTTOM_DRAW = {
  crab(ctx, t, blink, walk) {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const a = Math.sin(walk * 12 + i) * 4;
      ctx.beginPath(); ctx.moveTo(s * (14 + i * 8), -16); ctx.lineTo(s * (26 + i * 8), -8 + a); ctx.lineTo(s * (30 + i * 8), 0);
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    }
    for (const s of [-1, 1]) {
      const c = Math.sin(t * 5 + s) * 0.2;
      ctx.save(); ctx.translate(s * 30, -40); ctx.rotate(s * c);
      E(ctx, 0, 0, 12, 10, '#FF6B6B');
      poly(ctx, [[0, -2], [s * 10, -10], [s * 4, 2]], '#FFFFFF', false);
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(s * 18, -24); ctx.lineTo(s * 28, -32); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    }
    E(ctx, 0, -20, 32, 18, '#FF6B6B');
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 7, -34); ctx.lineTo(s * 9, -46); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      if (blink) { ctx.beginPath(); ctx.moveTo(s * 9 - 4, -48); ctx.lineTo(s * 9 + 4, -48); ctx.stroke(); }
      else eye(ctx, s * 9, -48, 4.6, false);
    }
    ctx.beginPath(); ctx.moveTo(-9, -17); ctx.quadraticCurveTo(0, -8, 9, -17); ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke();
    blush(ctx, -18, -18, 4.5); blush(ctx, 18, -18, 4.5);
  },
  snail(ctx, t, blink) {
    const s = Math.sin(t * 2) * 2;
    ctx.beginPath();
    ctx.moveTo(-40, 0); ctx.quadraticCurveTo(-40, -12, -10, -12); ctx.lineTo(30 + s, -12);
    ctx.quadraticCurveTo(44 + s, -14, 44 + s, -26); ctx.quadraticCurveTo(46 + s, -36, 36 + s, -36);
    ctx.quadraticCurveTo(28 + s, -36, 28 + s, -22); ctx.lineTo(28 + s, 0); ctx.closePath();
    ctx.fillStyle = '#C5E99B'; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    for (const dx of [32, 40]) { ctx.beginPath(); ctx.moveTo(dx + s, -34); ctx.lineTo(dx + 2 + s, -46); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke(); eye(ctx, dx + 2 + s, -49, 3.6, blink); }
    ctx.beginPath(); ctx.arc(37 + s, -22, 4, 0.3, Math.PI - 0.3); ctx.lineWidth = 2.2; ctx.stroke(); blush(ctx, 42 + s, -18, 3);
    E(ctx, -8, -30, 26, 24, '#FFA94D');
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.2) { const r = 22 - a * 1.35; ctx.lineTo(-8 + Math.cos(a) * r, -30 + Math.sin(a) * r * 0.92); }
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  },
  starfish(ctx, t, blink) {
    ctx.save(); ctx.translate(0, -24); ctx.rotate(Math.sin(t * 0.8) * 0.15);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 13 : 32; const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fillStyle = '#FF922B'; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    for (const [x, y] of [[0, -18], [16, -4], [-16, -4], [10, 14], [-10, 14]]) E(ctx, x, y, 2.5, 2.5, '#FFD8A8', { stroke: false });
    for (const s of [-1, 1]) eye(ctx, s * 7, -3, 4, blink);
    blush(ctx, -12, 4, 3.5); blush(ctx, 12, 4, 3.5);
    ctx.beginPath(); ctx.arc(0, 2, 4, 0.3, Math.PI - 0.3); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.restore();
  },
  hermit(ctx, t, blink, walk) {
    for (let i = 0; i < 3; i++) {
      const a = Math.sin(walk * 12 + i) * 3;
      ctx.beginPath(); ctx.moveTo(20, -14 + i * 4); ctx.lineTo(34, -6 + a + i * 2); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke();
    }
    E(ctx, 26, -22, 12, 10, '#FF8787');
    for (const dx of [28, 35]) { ctx.beginPath(); ctx.moveTo(dx, -30); ctx.lineTo(dx + 2, -40); ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke(); eye(ctx, dx + 2, -44, 3.4, blink); }
    // раковина-домик
    ctx.beginPath(); ctx.moveTo(-36, 0); ctx.quadraticCurveTo(-40, -52, 4, -44); ctx.quadraticCurveTo(28, -36, 20, 0); ctx.closePath();
    ctx.fillStyle = '#E9D8FD'; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    for (const k of [0.3, 0.55, 0.8]) { ctx.beginPath(); ctx.arc(-6, -6, 40 * k, Math.PI * 1.05, Math.PI * 1.8); ctx.lineWidth = 2.2; ctx.stroke(); }
  },
  urchin(ctx, t) {
    ctx.save(); ctx.translate(0, -22);
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.sin(t * 3) * 0.04;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); ctx.lineTo(Math.cos(a) * 36, Math.sin(a) * 36);
      ctx.lineWidth = 4; ctx.strokeStyle = '#5F3DC4'; ctx.stroke();
    }
    E(ctx, 0, 0, 22, 22, '#845EF7');
    for (const s of [-1, 1]) eye(ctx, s * 8, -3, 4.4, false);
    ctx.beginPath(); ctx.arc(0, 6, 4, 0.3, Math.PI - 0.3); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke();
    blush(ctx, -13, 5, 3.5); blush(ctx, 13, 5, 3.5);
    ctx.restore();
  },
};
