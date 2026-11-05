// Морские жители: 12 видов рыбок и 5 обитателей дна. Плоско, с тёмным контуром.
// Рыбки смотрят вправо, центр тела в (0,0), длина ≈ 100 единиц.
import { INK } from './chick.js';

export const FISH = ['clown', 'blueTang', 'yellowTang', 'puffer', 'angel', 'goldfish', 'guppy', 'zebra', 'betta', 'shark', 'seahorse', 'jelly'];
export const BOTTOM = ['crab', 'snail', 'starfish', 'hermit', 'urchin'];

const LW = 3.4;

function E(ctx, x, y, rx, ry, fill, { rot = 0, stroke = true, lw = LW } = {}) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); }
}
function poly(ctx, pts, fill, stroke = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke(); }
}
function eye(ctx, x, y, r, blink) {
  if (blink) {
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * 0.7, x + r, y);
    ctx.lineWidth = LW * 0.8; ctx.strokeStyle = INK; ctx.stroke();
    return;
  }
  E(ctx, x, y, r, r, '#fff', { lw: 2.4 });
  E(ctx, x + r * 0.2, y, r * 0.55, r * 0.6, INK, { stroke: false });
  E(ctx, x + r * 0.35, y - r * 0.25, r * 0.2, r * 0.2, '#fff', { stroke: false });
}
function mouth(ctx, x, y, open) {
  if (open > 0.1) { E(ctx, x, y, 3 + open * 3, 2 + open * 4, '#8C3B3B', { lw: 2.2 }); return; }
  ctx.beginPath(); ctx.arc(x - 3, y - 1, 4, 0.2, 1.4); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke();
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
    eye(ctx, 24, -6, 7, blink); mouth(ctx, 38, 6, open);
  },
  blueTang(ctx, wag, open, blink) {
    tail(ctx, -38, 20, 18, '#FCC419', wag);
    poly(ctx, [[-30, -20], [10, -34], [24, -22]], '#2F6FDE');
    E(ctx, 0, 0, 42, 26, '#3B82F6');
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 42, 26, 0, 0, Math.PI * 2); ctx.clip();
    E(ctx, -6, -6, 26, 8, '#1E3A8A', { stroke: false, rot: 0.2 }); ctx.restore();
    E(ctx, 0, 0, 42, 26, null);
    eye(ctx, 26, -6, 7, blink); mouth(ctx, 40, 6, open);
  },
  yellowTang(ctx, wag, open, blink) {
    tail(ctx, -30, 16, 16, '#FFD43B', wag);
    poly(ctx, [[-26, -14], [6, -44], [24, -20]], '#FFD43B');
    poly(ctx, [[-26, 14], [6, 42], [24, 20]], '#FFD43B');
    E(ctx, 0, 0, 34, 30, '#FFE066');
    eye(ctx, 18, -8, 7, blink);
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
    eye(ctx, 16, -8, 8, blink); mouth(ctx, 32, 8, open);
  },
  angel(ctx, wag, open, blink) {
    tail(ctx, -24, 16, 16, '#74C0FC', wag);
    poly(ctx, [[-14, -18], [0, -60], [16, -20]], '#FFD43B');
    poly(ctx, [[-14, 18], [0, 60], [16, 20]], '#FFD43B');
    E(ctx, 0, 0, 28, 30, '#A5D8FF');
    stripes(ctx, 28, 30, [-12, 6], '#1C7ED6', 7);
    E(ctx, 0, 0, 28, 30, null);
    eye(ctx, 14, -8, 6.5, blink); mouth(ctx, 26, 6, open);
  },
  goldfish(ctx, wag, open, blink) {
    tail(ctx, -30, 34, 26, '#FFA94D', wag, 'fan');
    poly(ctx, [[-12, -22], [4, -38], [18, -22]], '#FF922B');
    E(ctx, 0, 0, 36, 26, '#FF922B');
    E(ctx, 6, 8, 18, 10, '#FFC078', { stroke: false });
    E(ctx, 0, 0, 36, 26, null);
    eye(ctx, 20, -6, 7.5, blink); mouth(ctx, 34, 6, open);
  },
  guppy(ctx, wag, open, blink) {
    ctx.save(); ctx.translate(-22, 0); ctx.rotate(wag * 0.3);
    const g = ctx.createLinearGradient(-40, 0, 0, 0);
    g.addColorStop(0, '#F06595'); g.addColorStop(0.5, '#FFD43B'); g.addColorStop(1, '#4DABF7');
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.bezierCurveTo(-20, -40, -48, -36, -46, 0); ctx.bezierCurveTo(-48, 36, -20, 40, 4, 0);
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
    E(ctx, 8, 0, 30, 16, '#C5D3E8');
    eye(ctx, 24, -3, 6, blink); mouth(ctx, 36, 4, open);
  },
  zebra(ctx, wag, open, blink) {
    tail(ctx, -36, 18, 16, '#F783AC', wag);
    E(ctx, 0, 0, 40, 20, '#FFC9DE');
    stripes(ctx, 40, 20, [-22, -10, 2, 14], '#9C36B5', 5);
    E(ctx, 0, 0, 40, 20, null);
    eye(ctx, 24, -4, 6.5, blink); mouth(ctx, 38, 5, open);
  },
  betta(ctx, wag, open, blink) {
    ctx.save(); ctx.translate(-18, 0); ctx.rotate(wag * 0.25);
    ctx.beginPath(); ctx.moveTo(6, 0);
    ctx.bezierCurveTo(-20, -60, -56, -40, -50, 0); ctx.bezierCurveTo(-56, 40, -20, 60, 6, 0);
    ctx.fillStyle = '#C2255C'; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
    poly(ctx, [[-14, -14], [-10, -40], [16, -16]], '#9C36B5');
    E(ctx, 6, 0, 30, 18, '#7048E8');
    eye(ctx, 22, -4, 6.5, blink); mouth(ctx, 34, 4, open);
  },
  shark(ctx, wag, open, blink) {
    tail(ctx, -40, 20, 22, '#ADB5BD', wag);
    poly(ctx, [[-6, -16], [4, -42], [18, -16]], '#ADB5BD');
    E(ctx, 0, 0, 46, 20, '#ADB5BD');
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 46, 20, 0, 0, Math.PI * 2); ctx.clip();
    E(ctx, 4, 16, 44, 12, '#F1F3F5', { stroke: false }); ctx.restore();
    E(ctx, 0, 0, 46, 20, null);
    poly(ctx, [[0, 12], [-8, 28], [12, 14]], '#ADB5BD');
    eye(ctx, 28, -5, 6, blink);
    // улыбка
    ctx.beginPath(); ctx.moveTo(26, 8); ctx.quadraticCurveTo(36, 14, 44, 6);
    ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke();
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
    eye(ctx, 8, -28, 5, blink);
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
      else E(ctx, s * 8, -4, 2.5, 3.2, INK, { stroke: false });
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
      else { E(ctx, s * 9, -48, 5, 5, '#fff', { lw: 2.2 }); E(ctx, s * 9, -48, 2.5, 2.5, INK, { stroke: false }); }
    }
    ctx.beginPath(); ctx.moveTo(-8, -16); ctx.quadraticCurveTo(0, -10, 8, -16); ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke();
  },
  snail(ctx, t, blink) {
    const s = Math.sin(t * 2) * 2;
    ctx.beginPath();
    ctx.moveTo(-40, 0); ctx.quadraticCurveTo(-40, -12, -10, -12); ctx.lineTo(30 + s, -12);
    ctx.quadraticCurveTo(44 + s, -14, 44 + s, -26); ctx.quadraticCurveTo(46 + s, -36, 36 + s, -36);
    ctx.quadraticCurveTo(28 + s, -36, 28 + s, -22); ctx.lineTo(28 + s, 0); ctx.closePath();
    ctx.fillStyle = '#C5E99B'; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    for (const dx of [32, 40]) { ctx.beginPath(); ctx.moveTo(dx + s, -34); ctx.lineTo(dx + 2 + s, -48); ctx.stroke(); E(ctx, dx + 2 + s, -50, 3.5, 3.5, INK, { stroke: false }); }
    E(ctx, -8, -30, 26, 24, '#FFA94D');
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.2) { const r = 22 - a * 1.35; ctx.lineTo(-8 + Math.cos(a) * r, -30 + Math.sin(a) * r * 0.92); }
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    void blink;
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
    for (const s of [-1, 1]) { if (blink) { ctx.beginPath(); ctx.moveTo(s * 6 - 3, -2); ctx.lineTo(s * 6 + 3, -2); ctx.lineWidth = 2.4; ctx.stroke(); } else E(ctx, s * 6, -2, 2.5, 3.2, INK, { stroke: false }); }
    ctx.beginPath(); ctx.arc(0, 2, 4, 0.3, Math.PI - 0.3); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.restore();
  },
  hermit(ctx, t, blink, walk) {
    for (let i = 0; i < 3; i++) {
      const a = Math.sin(walk * 12 + i) * 3;
      ctx.beginPath(); ctx.moveTo(20, -14 + i * 4); ctx.lineTo(34, -6 + a + i * 2); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke();
    }
    E(ctx, 26, -22, 12, 10, '#FF8787');
    for (const dx of [28, 34]) { ctx.beginPath(); ctx.moveTo(dx, -30); ctx.lineTo(dx + 2, -42); ctx.lineWidth = 2.6; ctx.stroke(); if (!blink) E(ctx, dx + 2, -44, 3, 3, INK, { stroke: false }); }
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
    for (const s of [-1, 1]) E(ctx, s * 7, -2, 2.5, 3.2, INK, { stroke: false });
    ctx.beginPath(); ctx.arc(0, 4, 4, 0.3, Math.PI - 0.3); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  },
};
