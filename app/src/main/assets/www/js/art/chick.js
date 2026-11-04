// Цыплёнок — главный персонаж и иконка приложения. Координаты в коробке 100×100, смотрит вправо.

export const INK = '#4A2C17';

const BODY = new Path2D('M10 37 C14 56 24 76 46 78 C66 80 79 70 79 57 C79 52 77 49 75 46 C85 39 84 21 70 15 C57 10 45 18 46 30 C46 35 44 39 38 41 C30 44 20 42 10 37 Z');
const BEAK = new Path2D('M79 26 Q88 30 91 33 Q88 36 79 39 Z');
const WING = new Path2D('M30 55 C38 46 54 49 58 58 C52 67 36 66 30 55 Z');

export const CHICK_COLORS = {
  normal: { body: '#FFD43B', wing: '#F7C325', beak: '#FF9F1C', cheek: 'rgba(255,138,128,0.55)' },
  gold:   { body: '#FFC93C', wing: '#F0A500', beak: '#FF8C1A', cheek: 'rgba(255,120,90,0.55)' },
};

/**
 * Рисует цыплёнка. (x, y) — центр между лапками на земле, size — высота в пикселях.
 * step — фаза шага (0..1), flip — смотреть влево.
 */
export function drawChick(ctx, x, y, size, { flip = false, step = 0, colors = CHICK_COLORS.normal, wingUp = 0, blink = false } = {}) {
  const s = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.translate(-50, -91);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;

  // лапки (простая анимация шага)
  const a = Math.sin(step * Math.PI * 2) * 4;
  legs(ctx, 45, 77, -a);
  legs(ctx, 57, 77, a);

  ctx.fillStyle = colors.body;
  ctx.fill(BODY);
  ctx.stroke(BODY);

  ctx.fillStyle = colors.beak;
  ctx.fill(BEAK);
  ctx.stroke(BEAK);

  ctx.save();
  if (wingUp) {
    ctx.translate(34, 56);
    ctx.rotate(-wingUp * 0.6);
    ctx.translate(-34, -56);
  }
  ctx.fillStyle = colors.wing;
  ctx.fill(WING);
  ctx.stroke(WING);
  ctx.restore();

  if (blink) {
    ctx.beginPath();
    ctx.moveTo(65, 28);
    ctx.quadraticCurveTo(68, 30.5, 71, 28);
    ctx.stroke();
  } else {
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(68, 28, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(69.2, 26.8, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = colors.cheek;
  ctx.beginPath(); ctx.arc(71, 38, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function legs(ctx, x, y, swing) {
  const fx = x - 2 + swing, fy = y + 12;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(fx, fy);
  ctx.moveTo(fx, fy); ctx.lineTo(fx - 5, fy + 2);
  ctx.moveTo(fx, fy); ctx.lineTo(fx + 4, fy + 3);
  ctx.stroke();
}
