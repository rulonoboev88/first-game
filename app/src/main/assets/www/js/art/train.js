// Паровозик, вагоны, станции и пейзаж. Всё рисуется в «единицах вагона»: 1 = длина вагона.
// Начало координат каждого предмета — на уровне верха рельсов (y = 0), вверх — минус.
// Поезд и персонажи — с тёмным контуром (как во всей игре); фон — без контура, приглушённый.
import { INK } from './chick.js';

export const LW = 0.016;

export const WAGON = {
  len: 1.0,
  wheels: [0.22, 0.78], r: 0.11,
  win: { x: 0.17, y: -0.78, w: 0.66, h: 0.42 },
  sill: -0.36,
};

export const LOCO = {
  len: 1.38,
  chimney: { x: 1.01, y: -1.1 },
  headlight: { x: 1.25, y: -0.84 },
  cabWin: { x: 0.09, y: -0.88, w: 0.26, h: 0.24 },
  drive: [0.5, 0.86], driveR: 0.16,
};

export const WAGON_COLORS = [
  { body: '#FFC94A', roof: '#D9822B' },
  { body: '#7BD389', roof: '#3E9F5C' },
  { body: '#6EC3F4', roof: '#2F7FC1' },
];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function fs(ctx, fill, lw = LW) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
}
function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}
function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

// ---------- Колёса ----------

export function wheel(ctx, x, y, r, ang, fill = '#E8463A', { spokes = 8, counter = false } = {}) {
  circle(ctx, x, y, r); fs(ctx, '#3B3B48');
  circle(ctx, x, y, r * 0.8); ctx.fillStyle = fill; ctx.fill();
  if (counter) {
    // противовес — полумесяц напротив пальца шатуна
    ctx.beginPath();
    ctx.arc(x, y, r * 0.72, ang + Math.PI - 0.9, ang + Math.PI + 0.9);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
  }
  ctx.lineWidth = LW * 0.75; ctx.strokeStyle = 'rgba(40,20,10,0.55)';
  ctx.beginPath();
  for (let i = 0; i < spokes; i++) {
    const a = ang + (i * Math.PI * 2) / spokes;
    ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
    ctx.lineTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78);
  }
  ctx.stroke();
  circle(ctx, x, y, r * 0.8); ctx.lineWidth = LW * 0.8; ctx.strokeStyle = INK; ctx.stroke();
  circle(ctx, x, y, r * 0.2); fs(ctx, '#FFD166', LW * 0.8);
}

// ---------- Паровоз ----------

/** Паровоз. ang — угол ведущих колёс; bob — покачивание кузова. */
export function drawLoco(ctx, { ang = 0, bob = 0 } = {}) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // колёса (ниже кузова, не качаются)
  wheel(ctx, 0.17, -0.09, 0.09, ang * 1.78, '#E8463A', { spokes: 6 });
  wheel(ctx, 1.15, -0.09, 0.09, ang * 1.78, '#E8463A', { spokes: 6 });
  for (const wx of LOCO.drive) wheel(ctx, wx, -0.16, LOCO.driveR, ang, '#E8463A', { spokes: 10, counter: true });

  ctx.save();
  ctx.translate(0, bob);
  // рама
  rr(ctx, -0.02, -0.34, 1.26, 0.1, 0.03); fs(ctx, '#3B3B48');
  // котёл
  rr(ctx, 0.4, -0.75, 0.78, 0.43, 0.08); fs(ctx, '#EF5A4C');
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(0.46, -0.69, 0.66, 0.06);
  for (const bx of [0.64, 0.92]) { rr(ctx, bx, -0.75, 0.04, 0.43, 0.01); fs(ctx, '#FFD166', LW * 0.8); }
  // дымовая коробка спереди
  rr(ctx, 1.1, -0.77, 0.13, 0.47, 0.05); fs(ctx, '#3B3B48');
  // паровой колпак
  rr(ctx, 0.7, -0.87, 0.15, 0.16, 0.07); fs(ctx, '#FFD166');
  // свисток
  rr(ctx, 0.527, -0.9, 0.046, 0.16, 0.012); fs(ctx, '#FFD166', LW * 0.8);
  rr(ctx, 0.51, -0.93, 0.08, 0.035, 0.012); fs(ctx, '#F2B92E', LW * 0.8);
  // труба
  poly(ctx, [[0.96, -0.75], [0.96, -0.97], [0.9, -1.1], [1.12, -1.1], [1.06, -0.97], [1.06, -0.75]]); fs(ctx, '#3B3B48');
  rr(ctx, 0.89, -1.13, 0.24, 0.05, 0.02); fs(ctx, '#EF5A4C', LW * 0.8);
  // фонарь
  rr(ctx, 1.13, -0.91, 0.1, 0.13, 0.025); fs(ctx, '#FFD166');
  circle(ctx, 1.235, -0.845, 0.04); fs(ctx, '#FFF4C2', LW * 0.8);
  // будка машиниста
  rr(ctx, -0.02, -1.0, 0.46, 0.72, 0.05); fs(ctx, '#3D7DD8');
  const cw = LOCO.cabWin;
  rr(ctx, cw.x, cw.y, cw.w, cw.h, 0.04); fs(ctx, '#D7F0FF');
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(cw.x + 0.03, cw.y + 0.03, 0.05, 0.12);
  rr(ctx, -0.07, -1.09, 0.56, 0.11, 0.05); fs(ctx, '#2C3E70');
  // передний брус и «скотосбрасыватель»
  rr(ctx, 1.2, -0.34, 0.07, 0.1, 0.02); fs(ctx, '#EF5A4C', LW * 0.8);
  ctx.restore();
  poly(ctx, [[1.19, -0.25], [1.38, -0.02], [1.19, -0.02]]); fs(ctx, '#C9382B');
  ctx.lineWidth = LW * 0.6; ctx.strokeStyle = 'rgba(40,20,10,0.5)';
  ctx.beginPath();
  for (const k of [0.33, 0.66]) { ctx.moveTo(1.19, -0.25 + 0.23 * k); ctx.lineTo(1.19 + 0.19 * k, -0.02); }
  ctx.stroke();

  // шатуны: спарник между ведущими колёсами и шатун к цилиндру
  const cr = 0.075;
  const p = LOCO.drive.map((x) => [x + Math.cos(ang) * cr, -0.16 + Math.sin(ang) * cr]);
  const xh = p[1][0] + 0.25;
  ctx.lineCap = 'round';
  for (const [w, col] of [[0.05, INK], [0.028, '#C9CCD6']]) {
    ctx.lineWidth = w; ctx.strokeStyle = col;
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p[1][0], p[1][1]); ctx.lineTo(xh, -0.235); ctx.stroke();
  }
  for (const [x, y] of p) { circle(ctx, x, y, 0.022); fs(ctx, '#FFD166', LW * 0.6); }
  // цилиндр
  rr(ctx, 1.0, -0.31, 0.17, 0.14, 0.035); fs(ctx, '#5A5A6E');
}

// ---------- Вагон ----------

export function drawWagon(ctx, { color, ang = 0, bob = 0, interior = '#FFF1D6' } = {}) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const wx of WAGON.wheels) wheel(ctx, wx, -WAGON.r, WAGON.r, ang * (LOCO.driveR / WAGON.r), '#3B3B48', { spokes: 6 });
  ctx.save();
  ctx.translate(0, bob);
  rr(ctx, 0.06, -0.28, 0.88, 0.08, 0.03); fs(ctx, '#3B3B48');
  rr(ctx, 0.02, -0.87, 0.96, 0.62, 0.06); fs(ctx, color.body);
  // светлая полоса понизу
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0.04, -0.3, 0.92, 0.04);
  const w = WAGON.win;
  rr(ctx, w.x, w.y, w.w, w.h, 0.07); fs(ctx, interior);
  // спинка сиденья внутри
  rr(ctx, w.x + 0.06, w.y + w.h - 0.17, w.w - 0.12, 0.17, 0.04);
  ctx.fillStyle = 'rgba(160,90,60,0.22)'; ctx.fill();
  // крыша
  rr(ctx, -0.04, -0.96, 1.08, 0.12, 0.06); fs(ctx, color.roof);
  ctx.restore();
}

/** Подоконник — рисуется поверх зверя, но под его лапками (лапки держатся за край). */
export function drawSill(ctx, bob = 0) {
  rr(ctx, 0.12, WAGON.sill + bob, 0.76, 0.055, 0.025); fs(ctx, '#FFF4DC', LW * 0.9);
}

/** Сцепка между вагонами. */
export function coupler(ctx, x0, x1, y = -0.22) {
  ctx.lineWidth = 0.045; ctx.strokeStyle = INK; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  ctx.lineWidth = 0.022; ctx.strokeStyle = '#8C8FA3';
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
}

// ---------- Дым ----------

export function drawPuff(ctx, x, y, r, a, shade = 0) {
  ctx.globalAlpha = a;
  const c = Math.round(250 - shade * 40);
  ctx.fillStyle = `rgb(${c},${c},${Math.min(255, c + 4)})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x - r * 0.6, y + r * 0.25, r * 0.7, 0, Math.PI * 2);
  ctx.arc(x + r * 0.55, y + r * 0.3, r * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------- Пейзаж: дальний план ----------

export function hill(ctx, x, w, h, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, 0.2);
  ctx.bezierCurveTo(x - w * 0.3, -h, x + w * 0.3, -h, x + w / 2, 0.2);
  ctx.closePath();
  ctx.fill();
}

export function mountain(ctx, x, w, h, col, snow = true) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, 0.2);
  ctx.lineTo(x - w * 0.08, -h + h * 0.04);
  ctx.quadraticCurveTo(x, -h - h * 0.03, x + w * 0.08, -h + h * 0.04);
  ctx.lineTo(x + w / 2, 0.2);
  ctx.closePath();
  ctx.fill();
  if (snow) {
    ctx.fillStyle = '#F4F8FF';
    ctx.beginPath();
    const k = 0.3;
    ctx.moveTo(x - w * 0.5 * k - w * 0.03, -h + h * k);
    ctx.lineTo(x - w * 0.08, -h + h * 0.04);
    ctx.quadraticCurveTo(x, -h - h * 0.03, x + w * 0.08, -h + h * 0.04);
    ctx.lineTo(x + w * 0.5 * k + w * 0.03, -h + h * k);
    ctx.lineTo(x + w * 0.06, -h + h * k * 0.8);
    ctx.lineTo(x, -h + h * k * 1.05);
    ctx.lineTo(x - w * 0.07, -h + h * k * 0.82);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------- Пейзаж: средний план (без контуров, мягкие цвета) ----------

export function roundTree(ctx, x, y, k, col = '#6DBE5A', trunk = '#9C6B45') {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - 0.035 * k, y - 0.45 * k, 0.07 * k, 0.45 * k);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y - 0.68 * k, 0.3 * k, 0, Math.PI * 2);
  ctx.arc(x - 0.2 * k, y - 0.52 * k, 0.2 * k, 0, Math.PI * 2);
  ctx.arc(x + 0.21 * k, y - 0.54 * k, 0.2 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.beginPath(); ctx.arc(x - 0.08 * k, y - 0.78 * k, 0.13 * k, 0, Math.PI * 2); ctx.fill();
}

export function pineTree(ctx, x, y, k, col = '#4F9E5B', trunk = '#8B5E3C') {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - 0.03 * k, y - 0.25 * k, 0.06 * k, 0.25 * k);
  ctx.fillStyle = col;
  for (let i = 0; i < 3; i++) {
    const by = y - 0.18 * k - i * 0.26 * k;
    const hw = (0.3 - i * 0.07) * k;
    ctx.beginPath();
    ctx.moveTo(x - hw, by);
    ctx.lineTo(x, by - 0.42 * k);
    ctx.lineTo(x + hw, by);
    ctx.closePath();
    ctx.fill();
  }
}

export function willow(ctx, x, y, k, col = '#8CCB6B') {
  ctx.fillStyle = '#8B6A4A';
  ctx.fillRect(x - 0.04 * k, y - 0.5 * k, 0.08 * k, 0.5 * k);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x, y - 0.7 * k, 0.38 * k, 0.26 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 0.05 * k; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    const sx = x + i * 0.11 * k;
    ctx.moveTo(sx, y - 0.62 * k);
    ctx.quadraticCurveTo(sx + 0.04 * k, y - 0.35 * k, sx - 0.02 * k, y - 0.22 * k);
  }
  ctx.stroke();
}

export function bush(ctx, x, y, k, col = '#7CC765') {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x - 0.14 * k, y - 0.1 * k, 0.13 * k, Math.PI, 0);
  ctx.arc(x, y - 0.16 * k, 0.16 * k, Math.PI, 0);
  ctx.arc(x + 0.15 * k, y - 0.1 * k, 0.13 * k, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
}

export function rock(ctx, x, y, k, col = '#B7B3AA') {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - 0.26 * k, y);
  ctx.lineTo(x - 0.18 * k, y - 0.2 * k);
  ctx.lineTo(x + 0.02 * k, y - 0.28 * k);
  ctx.lineTo(x + 0.22 * k, y - 0.14 * k);
  ctx.lineTo(x + 0.27 * k, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(x - 0.18 * k, y - 0.2 * k); ctx.lineTo(x + 0.02 * k, y - 0.28 * k); ctx.lineTo(x - 0.02 * k, y - 0.12 * k);
  ctx.closePath(); ctx.fill();
}

/** Домик вдали; окно — источник света ночью. */
export function house(ctx, x, y, k, wall, roof, lights) {
  ctx.fillStyle = wall;
  ctx.fillRect(x - 0.3 * k, y - 0.42 * k, 0.6 * k, 0.42 * k);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 0.38 * k, y - 0.4 * k);
  ctx.lineTo(x, y - 0.72 * k);
  ctx.lineTo(x + 0.38 * k, y - 0.4 * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(80,60,50,0.35)';
  ctx.fillRect(x - 0.18 * k, y - 0.3 * k, 0.14 * k, 0.13 * k);
  ctx.fillRect(x + 0.06 * k, y - 0.22 * k, 0.12 * k, 0.22 * k);
  if (lights) lights.push({ kind: 'rect', x: x - 0.18 * k, y: y - 0.3 * k, w: 0.14 * k, h: 0.13 * k, col: '#FFD98A' });
}

export function windmill(ctx, x, y, k, ang) {
  ctx.fillStyle = '#EDE3D1';
  ctx.beginPath();
  ctx.moveTo(x - 0.17 * k, y); ctx.lineTo(x - 0.1 * k, y - 0.75 * k);
  ctx.lineTo(x + 0.1 * k, y - 0.75 * k); ctx.lineTo(x + 0.17 * k, y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#C97C5D';
  ctx.beginPath(); ctx.moveTo(x - 0.14 * k, y - 0.74 * k); ctx.lineTo(x, y - 0.9 * k); ctx.lineTo(x + 0.14 * k, y - 0.74 * k); ctx.closePath(); ctx.fill();
  ctx.save();
  ctx.translate(x, y - 0.78 * k);
  ctx.rotate(ang);
  ctx.fillStyle = '#F6F0E4';
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(0.02 * k, -0.035 * k, 0.42 * k, 0.07 * k);
  }
  ctx.fillStyle = '#8B6A4A';
  ctx.beginPath(); ctx.arc(0, 0, 0.04 * k, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function sunflower(ctx, x, y, k, sway = 0) {
  const hx = x + sway * 0.04 * k, hy = y - 0.62 * k;
  ctx.strokeStyle = '#5E9E45'; ctx.lineWidth = 0.035 * k; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y - 0.35 * k, hx, hy); ctx.stroke();
  ctx.fillStyle = '#6DAF4F';
  ctx.beginPath(); ctx.ellipse(x + 0.08 * k, y - 0.3 * k, 0.09 * k, 0.04 * k, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFC83D';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.moveTo(hx, hy);
    ctx.ellipse(hx + Math.cos(a) * 0.1 * k, hy + Math.sin(a) * 0.1 * k, 0.07 * k, 0.035 * k, a, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = '#7A4E2D';
  ctx.beginPath(); ctx.arc(hx, hy, 0.065 * k, 0, Math.PI * 2); ctx.fill();
}

export function haystack(ctx, x, y, k) {
  ctx.fillStyle = '#E9C46A';
  ctx.beginPath();
  ctx.moveTo(x - 0.3 * k, y);
  ctx.quadraticCurveTo(x - 0.3 * k, y - 0.5 * k, x, y - 0.52 * k);
  ctx.quadraticCurveTo(x + 0.3 * k, y - 0.5 * k, x + 0.3 * k, y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(150,110,40,0.35)'; ctx.lineWidth = 0.02 * k;
  ctx.beginPath();
  for (const dy of [0.15, 0.3]) { ctx.moveTo(x - 0.27 * k, y - dy * k); ctx.quadraticCurveTo(x, y - (dy + 0.06) * k, x + 0.27 * k, y - dy * k); }
  ctx.stroke();
}

export function reeds(ctx, x, y, k, sway = 0) {
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    const bx = x + i * 0.05 * k, h = (0.42 + ((i * 7) % 3) * 0.06) * k;
    ctx.strokeStyle = '#6E9F4A'; ctx.lineWidth = 0.025 * k;
    ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx, y - h * 0.6, bx + sway * 0.03 * k + i * 0.01 * k, y - h); ctx.stroke();
    if (i % 2 === 0) {
      ctx.strokeStyle = '#8B5A34'; ctx.lineWidth = 0.05 * k;
      ctx.beginPath(); ctx.moveTo(bx + sway * 0.03 * k + i * 0.01 * k, y - h + 0.02 * k); ctx.lineTo(bx + sway * 0.03 * k + i * 0.01 * k, y - h + 0.12 * k); ctx.stroke();
    }
  }
}

// ---------- Пейзаж у самой дороги (под рельсами) ----------

export function flower(ctx, x, y, k, col) {
  ctx.strokeStyle = '#5FA046'; ctx.lineWidth = 0.02 * k; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 0.14 * k); ctx.stroke();
  ctx.fillStyle = col;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * 0.035 * k, y - 0.15 * k + Math.sin(a) * 0.035 * k, 0.03 * k, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#FFE066';
  ctx.beginPath(); ctx.arc(x, y - 0.15 * k, 0.022 * k, 0, Math.PI * 2); ctx.fill();
}

export function tuft(ctx, x, y, k, col = '#6FB552') {
  ctx.strokeStyle = col; ctx.lineWidth = 0.022 * k; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [dx, h] of [[-0.05, 0.1], [-0.02, 0.15], [0.02, 0.13], [0.05, 0.09]]) {
    ctx.moveTo(x + dx * 0.4 * k, y); ctx.quadraticCurveTo(x + dx * 0.6 * k, y - h * 0.6 * k, x + dx * k, y - h * k);
  }
  ctx.stroke();
}

export function stone(ctx, x, y, k) {
  ctx.fillStyle = '#C9C3B8';
  ctx.beginPath(); ctx.ellipse(x, y - 0.03 * k, 0.07 * k, 0.04 * k, 0, 0, Math.PI * 2); ctx.fill();
}

/** Телеграфный столб за путями. */
export function pole(ctx, x) {
  ctx.fillStyle = '#9B7653';
  ctx.fillRect(x - 0.025, -1.62, 0.05, 1.6);
  ctx.fillRect(x - 0.16, -1.52, 0.32, 0.04);
  ctx.fillStyle = '#E8E4DA';
  for (const dx of [-0.13, 0.13]) { ctx.beginPath(); ctx.arc(x + dx, -1.55, 0.022, 0, Math.PI * 2); ctx.fill(); }
}

// ---------- Колокол ----------

export function bell(ctx, x, y, swing = 0) {
  ctx.save();
  ctx.translate(x, y);
  // кронштейн
  ctx.strokeStyle = INK; ctx.lineWidth = LW;
  rr(ctx, -0.16, -0.05, 0.32, 0.04, 0.015); fs(ctx, '#7A5236');
  ctx.rotate(swing);
  ctx.beginPath();
  ctx.moveTo(-0.03, -0.01);
  ctx.quadraticCurveTo(-0.11, 0.02, -0.12, 0.17);
  ctx.lineTo(0.12, 0.17);
  ctx.quadraticCurveTo(0.11, 0.02, 0.03, -0.01);
  ctx.closePath();
  fs(ctx, '#F2B92E');
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-0.07, 0.04, 0.025, 0.1);
  circle(ctx, Math.sin(-swing * 2) * 0.03, 0.19, 0.03); fs(ctx, '#7A5236', LW * 0.7);
  ctx.restore();
}

/** Фонарь на стене / столбе; свет — в список источников. */
export function lantern(ctx, x, y, lights) {
  rr(ctx, x - 0.05, y - 0.08, 0.1, 0.14, 0.025); fs(ctx, '#FFF0B3', LW * 0.8);
  rr(ctx, x - 0.065, y - 0.11, 0.13, 0.04, 0.015); fs(ctx, '#3B3B48', LW * 0.8);
  if (lights) lights.push({ kind: 'glow', x, y: y - 0.01, r: 0.5, col: '255,214,120' });
}

// ---------- Станции ----------

/**
 * Здание станции позади поезда. x — левый край поезда при остановке.
 * theme: farm / village / lake. icon(ctx, x, y, size) — картинка-вывеска (зверь станции).
 */
export function stationBuilding(ctx, x, theme, lights, icon) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const L = x + 0.7, R = x + 4.0, top = -1.62, cx = (L + R) / 2;
  if (theme === 'farm') {
    // красный амбар с ломаной крышей
    rr(ctx, L, top, R - L, -top, 0.02); fs(ctx, '#D9574A');
    ctx.strokeStyle = 'rgba(120,30,20,0.25)'; ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (let xx = L + 0.18; xx < R; xx += 0.18) { ctx.moveTo(xx, top + 0.02); ctx.lineTo(xx, -0.02); }
    ctx.stroke();
    poly(ctx, [[L - 0.12, top + 0.02], [L + 0.35, top - 0.42], [cx, top - 0.62], [R - 0.35, top - 0.42], [R + 0.12, top + 0.02]]);
    fs(ctx, '#7C3B33');
    // белая окантовка и окошко-вывеска
    circle(ctx, cx, top - 0.22, 0.24); fs(ctx, '#FFF8EC');
    icon(ctx, cx, top - 0.22, 0.34);
    lantern(ctx, cx - 0.85, top + 0.3, lights);
    lantern(ctx, cx + 0.85, top + 0.3, lights);
  } else if (theme === 'village') {
    rr(ctx, L, top + 0.05, R - L, -top - 0.05, 0.02); fs(ctx, '#F6E7C8');
    // окна с занавесками
    for (const wx of [L + 0.45, R - 0.75]) {
      rr(ctx, wx, top + 0.28, 0.3, 0.3, 0.03); fs(ctx, '#BEE3F8', LW * 0.8);
      if (lights) lights.push({ kind: 'rect', x: wx, y: top + 0.28, w: 0.3, h: 0.3, col: '#FFD98A' });
      rr(ctx, wx - 0.04, top + 0.58, 0.38, 0.07, 0.02); fs(ctx, '#C97C5D', LW * 0.7);
      for (let i = 0; i < 3; i++) { circle(ctx, wx + 0.05 + i * 0.1, top + 0.56, 0.035); fs(ctx, ['#FF6B6B', '#FFD43B', '#F783AC'][i], LW * 0.5); }
    }
    poly(ctx, [[L - 0.18, top + 0.08], [cx, top - 0.7], [R + 0.18, top + 0.08]]); fs(ctx, '#E07A5F');
    rr(ctx, R - 0.9, top - 0.6, 0.18, 0.35, 0.02); fs(ctx, '#A65A45');
    circle(ctx, cx, top - 0.18, 0.24); fs(ctx, '#FFF8EC');
    icon(ctx, cx, top - 0.18, 0.34);
    lantern(ctx, cx - 0.55, top + 0.42, lights);
    lantern(ctx, cx + 0.55, top + 0.42, lights);
  } else {
    // бревенчатая избушка у озера
    rr(ctx, L, top + 0.05, R - L, -top - 0.05, 0.02); fs(ctx, '#B07D4F');
    ctx.strokeStyle = 'rgba(70,40,20,0.35)'; ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (let yy = top + 0.2; yy < 0; yy += 0.14) { ctx.moveTo(L + 0.02, yy); ctx.lineTo(R - 0.02, yy); }
    ctx.stroke();
    for (const wx of [L + 0.4, R - 0.7]) {
      rr(ctx, wx, top + 0.3, 0.3, 0.28, 0.03); fs(ctx, '#BEE3F8', LW * 0.8);
      if (lights) lights.push({ kind: 'rect', x: wx, y: top + 0.3, w: 0.3, h: 0.28, col: '#FFD98A' });
    }
    poly(ctx, [[L - 0.2, top + 0.08], [cx, top - 0.62], [R + 0.2, top + 0.08]]); fs(ctx, '#5E8C61');
    circle(ctx, cx, top - 0.16, 0.24); fs(ctx, '#FFF8EC');
    icon(ctx, cx, top - 0.16, 0.34);
    lantern(ctx, cx - 0.55, top + 0.42, lights);
    lantern(ctx, cx + 0.55, top + 0.42, lights);
  }
}

/** Перрон перед путями (поверх рельсов). x0..x1 — края. */
export function platform(ctx, x0, x1) {
  rr(ctx, x0, 0.0, x1 - x0, 0.2, 0.02); fs(ctx, '#C9B79C');
  ctx.fillStyle = '#E8DCC6';
  ctx.fillRect(x0 + 0.01, 0.0, x1 - x0 - 0.02, 0.05);
  ctx.strokeStyle = 'rgba(90,60,40,0.22)'; ctx.lineWidth = 0.012;
  ctx.beginPath();
  for (let xx = x0 + 0.3; xx < x1; xx += 0.3) { ctx.moveTo(xx, 0.05); ctx.lineTo(xx, 0.2); }
  ctx.moveTo(x0, 0.125); ctx.lineTo(x1, 0.125);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0, 0.05); ctx.lineTo(x1, 0.05);
  ctx.lineWidth = LW * 0.8; ctx.strokeStyle = INK; ctx.stroke();
}

// ---------- Переезд ----------

/** Дорога к переезду: трапеция от путей к нижнему краю. */
export function road(ctx, x, bottom) {
  ctx.fillStyle = '#B9B2A6';
  ctx.beginPath();
  ctx.moveTo(x - 0.32, 0.12); ctx.lineTo(x + 0.32, 0.12);
  ctx.lineTo(x + 0.75, bottom); ctx.lineTo(x - 0.75, bottom);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.025; ctx.setLineDash([0.08, 0.1]);
  ctx.beginPath(); ctx.moveTo(x, 0.16); ctx.lineTo(x, bottom); ctx.stroke();
  ctx.setLineDash([]);
}

/** Шлагбаум: up — 0 (опущен) .. 1 (поднят). blink — какая лампа горит (0/1). */
export function barrier(ctx, x, y, up, blink, lights) {
  ctx.lineJoin = 'round';
  // стойка с лампами
  rr(ctx, x - 0.025, y - 0.5, 0.05, 0.5, 0.01); fs(ctx, '#F1F3F5');
  rr(ctx, x - 0.14, y - 0.56, 0.28, 0.1, 0.04); fs(ctx, '#3B3B48');
  for (const [i, dx] of [[0, -0.075], [1, 0.075]]) {
    circle(ctx, x + dx, y - 0.51, 0.035);
    fs(ctx, blink === i ? '#FF4040' : '#6B2A2A', LW * 0.6);
    if (blink === i && lights) lights.push({ kind: 'glow', x: x + dx, y: y - 0.51, r: 0.3, col: '255,70,60', always: true });
  }
  // стрела
  ctx.save();
  ctx.translate(x, y - 0.25);
  ctx.rotate(-up * Math.PI * 0.45);
  rr(ctx, 0, -0.025, 1.0, 0.05, 0.02); fs(ctx, '#FFFFFF', LW * 0.8);
  ctx.fillStyle = '#E8463A';
  for (let i = 0; i < 5; i++) ctx.fillRect(0.06 + i * 0.2, -0.022, 0.1, 0.044);
  ctx.restore();
  circle(ctx, x, y - 0.25, 0.04); fs(ctx, '#3B3B48', LW * 0.6);
}

/** Машинка спереди (смотрит на нас). squash — сжатие при «бип». */
export function car(ctx, x, y, k, col, squash = 0, lightsOn = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k * (1 + squash * 0.12), k * (1 - squash * 0.12));
  ctx.lineJoin = 'round';
  // колёса
  for (const s of [-1, 1]) { rr(ctx, s * 0.27 - 0.06, -0.08, 0.12, 0.1, 0.03); fs(ctx, '#3B3B48'); }
  // кузов
  rr(ctx, -0.36, -0.3, 0.72, 0.24, 0.08); fs(ctx, col);
  // кабина
  ctx.beginPath();
  ctx.moveTo(-0.26, -0.29); ctx.lineTo(-0.2, -0.5); ctx.lineTo(0.2, -0.5); ctx.lineTo(0.26, -0.29); ctx.closePath();
  fs(ctx, col);
  ctx.beginPath();
  ctx.moveTo(-0.21, -0.31); ctx.lineTo(-0.16, -0.46); ctx.lineTo(0.16, -0.46); ctx.lineTo(0.21, -0.31); ctx.closePath();
  fs(ctx, '#CDEBFA', LW * 0.7);
  // фары-глазки и решётка
  for (const s of [-1, 1]) {
    circle(ctx, s * 0.22, -0.2, 0.055); fs(ctx, lightsOn > 0 ? '#FFF7C2' : '#FFFBEA', LW * 0.8);
  }
  rr(ctx, -0.1, -0.21, 0.2, 0.06, 0.02); fs(ctx, '#8C8FA3', LW * 0.6);
  ctx.restore();
}
