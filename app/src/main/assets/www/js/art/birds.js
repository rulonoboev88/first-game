// Птичий двор: все персонажи в едином стиле — плоская заливка + тёмный контур.
// Каждый описан в коробке 100×100, смотрит вправо, лапки стоят на y≈91.
// Части с name:'wing' машут крылом, остальное рисуется как есть.

import { INK } from './chick.js';

const P = (d) => new Path2D(d);

function circlePath(x, y, r) {
  const p = new Path2D();
  p.arc(x, y, r, 0, Math.PI * 2);
  return p;
}

const CHICK_BODY = 'M10 37 C14 56 24 76 46 78 C66 80 79 70 79 57 C79 52 77 49 75 46 C85 39 84 21 70 15 C57 10 45 18 46 30 C46 35 44 39 38 41 C30 44 20 42 10 37 Z';
const CHICK_WING = 'M30 55 C38 46 54 49 58 58 C52 67 36 66 30 55 Z';
const CHICK_BEAK = 'M79 26 Q88 30 91 33 Q88 36 79 39 Z';

export const BIRDS = {
  chick: {
    height: 1,
    legs: [[45, 77], [57, 77]], legLen: 12, legColor: INK, legWidth: 3.4,
    parts: [
      { path: P(CHICK_BODY), fill: '#FFD43B' },
      { path: P(CHICK_BEAK), fill: '#FF9F1C' },
      { path: P(CHICK_WING), fill: '#F7C325', name: 'wing', pivot: [34, 56] },
    ],
    eye: [68, 28, 3.6], cheek: [71, 38, 4],
  },

  gold: {
    height: 1.05,
    legs: [[45, 77], [57, 77]], legLen: 12, legColor: INK, legWidth: 3.4,
    parts: [
      { path: P(CHICK_BODY), fill: 'gold' }, // особая заливка — градиент
      { path: P(CHICK_BEAK), fill: '#FF8C1A' },
      { path: P(CHICK_WING), fill: '#F0A500', name: 'wing', pivot: [34, 56] },
    ],
    eye: [68, 28, 3.6], cheek: [71, 38, 4],
    sparkle: true,
  },

  duckling: {
    height: 1.05,
    legs: [[46, 78], [58, 78]], legLen: 11, legColor: '#FF922B', legWidth: 3.4, webbed: true,
    parts: [
      { path: P('M6 44 C10 62 24 78 48 78 C70 79 82 68 80 56 C79 50 75 47 70 45 C80 40 82 24 70 18 C58 12 45 20 49 33 C51 40 46 44 36 44 C25 44 15 38 6 44 Z'), fill: '#FFE066' },
      { path: P('M77 28 C86 26 95 30 93 35 C90 39 82 38 76 36 Z'), fill: '#FF922B' },
      { path: P('M30 57 C38 49 54 51 58 59 C52 67 37 67 30 57 Z'), fill: '#FAD643', name: 'wing', pivot: [34, 58] },
    ],
    eye: [67, 27, 3.6], cheek: [70, 37, 3.6],
  },

  gosling: {
    height: 1.2,
    legs: [[44, 78], [56, 78]], legLen: 12, legColor: '#868E96', legWidth: 3.4, webbed: true,
    parts: [
      { path: P('M8 48 C12 64 26 78 46 78 C66 79 78 70 76 58 C75 52 72 48 68 44 C68 36 68 28 70 22 C76 18 80 8 70 4 C60 0 52 8 56 18 C58 26 58 36 54 42 C46 46 36 46 28 46 C20 46 14 44 8 48 Z'), fill: '#E3DB91' },
      { path: P('M78 10 C86 10 90 13 88 16 C85 19 80 18 77 17 Z'), fill: '#5C636A' },
      { path: P('M28 59 C36 51 52 53 56 61 C50 69 35 69 28 59 Z'), fill: '#CFC57A', name: 'wing', pivot: [32, 60] },
    ],
    eye: [70, 10, 3.2], cheek: null,
  },

  hen: {
    height: 1.5,
    legs: [[44, 79], [58, 79]], legLen: 11, legColor: '#FF922B', legWidth: 3.6,
    parts: [
      // хвостик + тело + голова одним контуром
      { path: P('M16 22 C10 40 14 64 34 76 C50 84 70 80 78 66 C82 58 80 50 76 44 C82 40 86 30 82 20 C78 12 66 10 62 18 C60 24 60 32 56 38 C48 44 36 42 28 36 C26 30 24 26 16 22 Z'), fill: '#FFFBF2' },
      { path: P('M62 17 C59 8 66 5 68 11 C69 4 76 4 76 11 C79 6 85 10 81 16 Z'), fill: '#FF4D4F' },
      { path: P('M82 23 L92 27 L82 31 Z'), fill: '#FFB020' },
      { path: P('M80 31 C84 36 80 40 77 34 Z'), fill: '#FF4D4F' },
      { path: P('M34 52 C42 43 60 45 64 56 C58 67 41 67 34 52 Z'), fill: '#EFE5D2', name: 'wing', pivot: [38, 54] },
    ],
    eye: [73, 21, 3.4], cheek: null,
  },

  rooster: {
    height: 1.75,
    legs: [[44, 80], [58, 80]], legLen: 11, legColor: '#FF922B', legWidth: 3.6,
    parts: [
      // хвостовые перья (позади тела)
      { path: P('M30 40 C20 26 10 18 2 22 C10 24 18 34 22 46 Z'), fill: '#2B8A3E' },
      { path: P('M28 44 C16 36 6 36 0 44 C8 42 16 46 22 54 Z'), fill: '#0B7285' },
      { path: P('M32 36 C26 18 16 6 8 6 C16 12 22 26 24 42 Z'), fill: '#364FC7' },
      { path: P('M24 44 C18 58 22 72 36 78 C52 84 70 80 78 66 C82 58 80 50 76 44 C82 40 86 30 82 20 C78 12 66 10 62 18 C60 24 60 32 56 38 C48 44 36 46 24 44 Z'), fill: '#FF922B' },
      { path: P('M58 14 C54 2 62 -2 65 6 C66 -3 74 -3 74 6 C77 -1 85 2 82 10 C86 8 89 14 82 18 L62 20 Z'), fill: '#F03E3E' },
      { path: P('M82 23 L93 27 L82 31 Z'), fill: '#FFC078' },
      { path: P('M79 31 C86 38 81 45 76 36 Z'), fill: '#F03E3E' },
      { path: P('M34 54 C42 44 60 46 64 57 C58 68 41 68 34 54 Z'), fill: '#D9480F', name: 'wing', pivot: [38, 56] },
    ],
    eye: [73, 21, 3.4], cheek: null,
  },

  turkey: {
    height: 1.7,
    legs: [[44, 80], [58, 80]], legLen: 11, legColor: '#E8590C', legWidth: 3.6,
    fan: { x: 34, y: 48, r: 44, colors: ['#8B5A2B', '#C08457', '#5C3A1E', '#E0B07E'] },
    parts: [
      { path: P('M20 52 C18 68 30 80 46 80 C64 80 76 70 76 56 C76 50 72 46 68 44 C70 36 72 28 72 22 C72 14 64 12 60 18 C58 24 60 34 54 40 C44 44 30 44 20 52 Z'), fill: '#7A4A24' },
      { path: P('M60 18 C60 10 70 8 74 14 C76 18 74 24 70 26 C66 26 62 24 60 18 Z'), fill: '#A5D8FF' },
      { path: P('M74 15 L82 18 L74 21 Z'), fill: '#FFC078' },
      { path: P('M72 20 C76 28 72 34 68 26 Z'), fill: '#F03E3E' },
      { path: P('M32 58 C40 48 58 50 62 60 C56 70 40 70 32 58 Z'), fill: '#5C3A1E', name: 'wing', pivot: [36, 60] },
    ],
    eye: [67, 16, 2.8], cheek: null,
  },
};

/** Заливка золотого цыплёнка — переливающийся градиент. */
function goldFill(ctx) {
  const g = ctx.createLinearGradient(10, 10, 90, 80);
  g.addColorStop(0, '#FFF3A0');
  g.addColorStop(0.45, '#FFC93C');
  g.addColorStop(1, '#F59F00');
  return g;
}

/**
 * Рисует птицу. (x, y) — точка на земле между лапками, size — высота цыплёнка (базовая единица).
 * opts: flip, step (фаза шага 0..1), wing (0..1), blink, tilt (наклон вперёд, рад), squash.
 */
export function drawBird(ctx, kind, x, y, size, opts = {}) {
  const def = BIRDS[kind];
  const s = (size * def.height) / 100;
  const { flip = false, step = 0, wing = 0, blink = false, tilt = 0, squash = 0, spin = 0, t = 0 } = opts;
  ctx.save();
  ctx.translate(x, y);
  if (spin) {
    ctx.translate(0, -size * def.height * 0.45);
    ctx.rotate(flip ? -spin : spin);
    ctx.translate(0, size * def.height * 0.45);
  }
  ctx.scale(flip ? -s : s, s * (1 - squash));
  if (squash) ctx.scale(1 + squash * 0.6, 1);
  if (tilt) ctx.rotate(tilt);
  ctx.translate(-50, -91);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;

  if (def.fan) drawFan(ctx, def.fan);

  // лапки
  const a = Math.sin(step * Math.PI * 2) * 4;
  ctx.strokeStyle = def.legColor;
  ctx.lineWidth = def.legWidth;
  def.legs.forEach(([lx, ly], i) => {
    const sw = i ? a : -a;
    const fx = lx - 2 + sw, fy = ly + def.legLen;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(fx, fy);
    if (def.webbed) {
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx - 5, fy + 2); ctx.lineTo(fx + 5, fy + 2); ctx.lineTo(fx, fy - 1); ctx.closePath();
      ctx.fillStyle = def.legColor; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = def.legColor; ctx.lineWidth = def.legWidth;
    } else {
      ctx.moveTo(fx, fy); ctx.lineTo(fx - 5, fy + 2);
      ctx.moveTo(fx, fy); ctx.lineTo(fx + 4, fy + 3);
      ctx.stroke();
    }
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;

  for (const part of def.parts) {
    const fill = part.fill === 'gold' ? goldFill(ctx) : part.fill;
    if (part.name === 'wing' && wing) {
      ctx.save();
      ctx.translate(part.pivot[0], part.pivot[1]);
      ctx.rotate(-wing * 0.7);
      ctx.translate(-part.pivot[0], -part.pivot[1]);
      ctx.fillStyle = fill; ctx.fill(part.path); ctx.stroke(part.path);
      ctx.restore();
    } else {
      ctx.fillStyle = fill; ctx.fill(part.path); ctx.stroke(part.path);
    }
  }

  const [ex, ey, er] = def.eye;
  if (blink) {
    ctx.beginPath();
    ctx.moveTo(ex - er, ey);
    ctx.quadraticCurveTo(ex, ey + er * 0.7, ex + er, ey);
    ctx.stroke();
  } else {
    ctx.fillStyle = INK; ctx.fill(circlePath(ex, ey, er));
    ctx.fillStyle = '#fff'; ctx.fill(circlePath(ex + er * 0.33, ey - er * 0.33, er * 0.3));
  }
  if (def.cheek) {
    ctx.fillStyle = 'rgba(255,138,128,0.5)';
    ctx.fill(circlePath(def.cheek[0], def.cheek[1], def.cheek[2]));
  }
  if (def.sparkle) drawSparkles(ctx, t);
  ctx.restore();
}

function drawFan(ctx, fan) {
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (1.05 + (i / (n - 1)) * 0.95);
    const px = fan.x + Math.cos(a) * fan.r;
    const py = fan.y + Math.sin(a) * fan.r;
    ctx.save();
    ctx.translate(fan.x, fan.y);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, -fan.r * 0.55, fan.r * 0.2, fan.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = fan.colors[i % 2];
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -fan.r * 0.92, fan.r * 0.12, fan.r * 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = fan.colors[3];
    ctx.fill();
    ctx.restore();
    void px; void py;
  }
}

function drawSparkles(ctx, t) {
  const pts = [[18, 18], [88, 52], [30, 86], [92, 12]];
  pts.forEach(([x, y], i) => {
    const k = (Math.sin(t * 5 + i * 1.7) + 1) / 2;
    const r = 2 + k * 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.4 + k * 0.6;
    ctx.fillStyle = '#FFE066';
    ctx.beginPath();
    for (let j = 0; j < 8; j++) {
      const rr = j % 2 ? r * 0.3 : r;
      const a = (j * Math.PI) / 4;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

// ---------- Яйцо ----------

const EGG = P('M50 20 C66 20 76 46 76 62 C76 78 64 88 50 88 C36 88 24 78 24 62 C24 46 34 20 50 20 Z');

/** crack: 0 — целое, 0..1 — трещина растёт, >1 — раскололось (половинки разъезжаются). */
export function drawEgg(ctx, x, y, size, { wobble = 0, crack = 0, open = 0, gold = false } = {}) {
  const s = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wobble);
  ctx.scale(s, s);
  ctx.translate(-50, -89);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;
  const fill = gold ? '#FFE8A3' : '#FFF6E0';
  if (open > 0) {
    // нижняя половинка
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 58, 100, 40);
    ctx.clip();
    ctx.fillStyle = fill; ctx.fill(EGG); ctx.stroke(EGG);
    ctx.restore();
    // верхняя половинка улетает
    ctx.save();
    ctx.translate(open * 22, -open * 34);
    ctx.rotate(open * 0.9);
    ctx.globalAlpha = Math.max(0, 1 - open * 0.8);
    ctx.beginPath();
    ctx.rect(0, 0, 100, 58);
    ctx.clip();
    ctx.fillStyle = fill; ctx.fill(EGG); ctx.stroke(EGG);
    ctx.restore();
    zigzag(ctx, 1);
  } else {
    ctx.fillStyle = fill; ctx.fill(EGG); ctx.stroke(EGG);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(40, 44, 5, 9, 0.4, 0, Math.PI * 2); ctx.fill();
    if (crack > 0) zigzag(ctx, crack);
  }
  ctx.restore();
}

function zigzag(ctx, k) {
  const pts = [[26, 58], [34, 52], [40, 60], [47, 51], [54, 60], [61, 52], [67, 59], [74, 54]];
  const n = Math.max(2, Math.ceil(pts.length * Math.min(1, k)));
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

// ---------- Лиса ----------
// Коробка 160×100, смотрит вправо, лапы на y≈92.

const FOX = {
  tail: P('M36 52 C20 40 4 44 2 58 C0 72 16 76 30 66 C34 62 36 58 36 52 Z'),
  tailTip: P('M2 58 C0 72 16 76 22 70 C12 70 6 66 2 58 Z'),
  body: P('M30 50 C40 38 90 36 110 44 C120 48 122 60 116 68 C104 74 50 76 36 70 C28 64 26 56 30 50 Z'),
  head: P('M104 40 C108 26 118 20 128 22 C136 24 140 30 150 34 C156 36 156 42 150 44 C140 48 132 52 124 54 C114 56 104 50 104 40 Z'),
  muzzle: P('M128 42 C136 40 146 40 150 44 C140 48 132 52 124 54 C122 50 124 44 128 42 Z'),
  ear1: P('M112 30 L110 8 L124 22 Z'),
  ear2: P('M120 26 L126 6 L132 24 Z'),
  chest: P('M106 50 C110 58 112 64 108 70 C100 70 98 60 106 50 Z'),
};

export function drawFox(ctx, x, y, size, { flip = false, run = 0, blink = false } = {}) {
  const s = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.translate(-80, -92);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;

  const ph = run * Math.PI * 2;
  const bob = Math.abs(Math.sin(ph)) * -3;
  // лапы
  const legs = [[44, 66, 0], [58, 68, Math.PI], [100, 66, Math.PI * 0.5], [112, 64, Math.PI * 1.5]];
  for (const [lx, ly, off] of legs) {
    const sw = Math.sin(ph + off) * 9;
    ctx.beginPath();
    ctx.moveTo(lx, ly + bob);
    ctx.lineTo(lx + sw, 90);
    ctx.lineWidth = 7;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 4.2;
    ctx.strokeStyle = '#E8590C';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(lx + sw, 90, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = '#343A40';
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;

  ctx.save();
  ctx.translate(0, bob);
  // хвост
  ctx.save();
  ctx.translate(36, 54);
  ctx.rotate(Math.sin(ph * 0.5) * 0.15);
  ctx.translate(-36, -54);
  ctx.fillStyle = '#FF8A3D'; ctx.fill(FOX.tail); ctx.stroke(FOX.tail);
  ctx.fillStyle = '#FFFFFF'; ctx.fill(FOX.tailTip); ctx.stroke(FOX.tailTip);
  ctx.restore();
  ctx.fillStyle = '#FF8A3D'; ctx.fill(FOX.body); ctx.stroke(FOX.body);
  ctx.fillStyle = '#FFF4E6'; ctx.fill(FOX.chest);
  ctx.fillStyle = '#FF8A3D';
  ctx.fill(FOX.ear1); ctx.stroke(FOX.ear1);
  ctx.fill(FOX.ear2); ctx.stroke(FOX.ear2);
  ctx.fill(FOX.head); ctx.stroke(FOX.head);
  ctx.fillStyle = '#FFF4E6'; ctx.fill(FOX.muzzle);
  ctx.stroke(FOX.head);
  ctx.fillStyle = INK;
  ctx.fill(circlePath(151, 39, 3.6)); // нос
  if (blink) {
    ctx.beginPath(); ctx.moveTo(126, 32); ctx.quadraticCurveTo(130, 35, 134, 32); ctx.stroke();
  } else {
    ctx.fill(circlePath(130, 32, 3.4));
    ctx.fillStyle = '#fff'; ctx.fill(circlePath(131.2, 30.8, 1.1));
  }
  // улыбка
  ctx.beginPath(); ctx.moveTo(140, 47); ctx.quadraticCurveTo(144, 49, 147, 46); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ---------- Зёрнышко ----------
export function drawGrain(ctx, x, y, r, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.35);
  ctx.strokeStyle = 'rgba(74,44,23,0.7)';
  ctx.stroke();
  ctx.restore();
}
