// Зверята анфас — единый стиль «контур с объёмом»: заливка + тень по краю + блик + тёмный контур,
// живые глаза с бликами, у каждого свой характер и своя деталь.
// Центр головы в (0,0), голова ≈ 80–90 единиц в ширину; ниже — плечики (уходят за край / под подоконник).
// Лапки рисуются отдельно (drawPaws) — они «держатся» за край на y ≈ 46.
//
// Анимация голоса: o.open (0..1) — рот/клюв открыт; голова вытягивается вверх, уши приподнимаются, брови взлетают.

export const ANIMALS = ['cow', 'pig', 'sheep', 'goat', 'horse', 'dog', 'cat', 'frog', 'owl', 'mouse', 'rabbit', 'hedgehog', 'bear', 'fox', 'squirrel'];
export const BIRD_HEADS = ['hen', 'rooster', 'duck', 'goose'];

export const INK = '#3D2614';

const P = (d) => new Path2D(d);
const E = (x, y, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); return p; };
const C = (x, y, r) => E(x, y, r, r);

function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const toneCache = new Map();
function tone(h, k) {
  const key = h + k;
  let v = toneCache.get(key);
  if (v) return v;
  const c = rgb(h);
  const t = k > 0 ? 255 : 0, a = Math.abs(k);
  v = `rgb(${c.map((x) => Math.round(x + (t - x) * a)).join(',')})`;
  toneCache.set(key, v);
  return v;
}

// ---------- Кисть ----------

function kit(ctx) {
  const K = { ctx };
  /** Деталь с объёмом: заливка, тень по нижне-правому краю, мягкий блик, контур. */
  K.part = (p, fill, o = {}) => {
    ctx.fillStyle = fill; ctx.fill(p);
    if (!o.flat) {
      ctx.save(); ctx.clip(p);
      ctx.fillStyle = tone(fill, -0.15); ctx.fillRect(-300, -300, 600, 600);
      ctx.translate(-2.5, -3.5); ctx.fillStyle = fill; ctx.fill(p);
      ctx.restore();
      const [x0, y0, x1, y1] = o.box || [-50, -50, 50, 50];
      ctx.save(); ctx.clip(p);
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(80,30,0,0.08)');
      ctx.fillStyle = g; ctx.fillRect(-300, -300, 600, 600);
      ctx.restore();
    }
    if (o.lw !== 0) { ctx.lineWidth = o.lw || 3.2; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(p); }
  };
  /** Пятно/рисунок без контура (обычно внутри clip). */
  K.mark = (p, fill) => { ctx.fillStyle = fill; ctx.fill(p); };
  K.line = (p, w = 3.2, col = INK) => { ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(p); };
  K.clip = (p, fn) => { ctx.save(); ctx.clip(p); fn(); ctx.restore(); };
  K.blush = (x, y, rx = 7) => { ctx.fillStyle = 'rgba(255,128,128,0.42)'; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.62, 0, 0, Math.PI * 2); ctx.fill(); };

  /**
   * Глаз. o: look (-1..1), lid (0..1 — веко сверху), lash (+1/-1 — ресницы наружу), brow (подъём брови, null — без брови),
   * browTilt, skin (цвет века), iris, slit (кошачий зрачок), blink, wide (0..1 — удивление).
   */
  K.eye = (x, y, r, o = {}) => {
    const { look = 0, lid = 0, lash = 0, brow = null, browTilt = 0, skin = '#fff', iris = '#6B3F22', slit = false, blink = false, wide = 0 } = o;
    const ry = r * (1 + wide * 0.12);
    if (brow != null) {
      const by = y - ry * 1.45 - brow - wide * 3;
      const p = new Path2D(); p.moveTo(x - r * 0.75, by + r * 0.15 + browTilt); p.quadraticCurveTo(x, by - r * 0.25, x + r * 0.75, by + r * 0.15 - browTilt);
      K.line(p, 2.8);
    }
    if (blink) {
      const p = new Path2D(); p.moveTo(x - r * 0.9, y + r * 0.1); p.quadraticCurveTo(x, y + r * 0.6, x + r * 0.9, y + r * 0.1);
      K.line(p, 3);
      if (lash) {
        const q = new Path2D();
        for (let i = 0; i < 3; i++) { const ex = x + lash * r * (0.35 + i * 0.25); q.moveTo(ex, y + r * 0.3); q.lineTo(ex + lash * r * 0.25, y + r * 0.62); }
        K.line(q, 2);
      }
      return;
    }
    const s = E(x, y, r * 0.88, ry);
    ctx.fillStyle = '#fff'; ctx.fill(s);
    ctx.save(); ctx.clip(s);
    const ix = x + look * r * 0.32, iy = y + r * 0.12;
    ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(ix, iy, r * 0.64, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1C120D';
    ctx.beginPath();
    if (slit) ctx.ellipse(ix, iy, r * 0.16 + wide * r * 0.2, r * 0.5, 0, 0, Math.PI * 2);
    else ctx.arc(ix, iy, r * (0.4 + wide * 0.06), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ix - r * 0.2, iy - r * 0.26, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ix + r * 0.22, iy + r * 0.2, r * 0.09, 0, Math.PI * 2); ctx.fill();
    const l = lid * (1 - wide);
    if (l > 0.02) {
      const ly = y - ry + 2 * ry * l;
      ctx.fillStyle = skin; ctx.fillRect(x - r * 1.2, y - ry * 1.3, r * 2.4, ly - (y - ry * 1.3));
      const p = new Path2D(); p.moveTo(x - r, ly); p.quadraticCurveTo(x, ly + r * 0.18, x + r, ly);
      K.line(p, 3);
    }
    ctx.restore();
    ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke(s);
    if (lash) {
      const p = new Path2D();
      const top = y - ry + 2 * ry * l;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + lash * (0.7 + i * 0.3);
        const ex = x + Math.cos(a) * r * 0.85, ey = Math.max(top, y + Math.sin(a) * ry * 0.95);
        p.moveTo(ex, ey); p.lineTo(ex + Math.cos(a) * r * 0.45, ey + Math.sin(a) * r * 0.45);
      }
      K.line(p, 2.2);
    }
  };

  /**
   * Рот: закрыт — улыбка (или своя линия closed), открыт — тёмный рот с язычком.
   * x,y — уголки рта по центру, w — ширина, open 0..1.
   */
  K.mouth = (x, y, w, open, o = {}) => {
    const { smile = 5, tongue = true, teeth = 0, closed = null, h = 13, col = '#7A2E2E' } = o;
    if (open < 0.08) {
      K.line(closed || P(`M${x - w / 2} ${y} Q${x} ${y + smile} ${x + w / 2} ${y}`), 3);
      return;
    }
    const hh = 3 + open * h;
    const p = new Path2D();
    p.moveTo(x - w / 2, y);
    p.quadraticCurveTo(x, y + smile * 0.35, x + w / 2, y);
    p.bezierCurveTo(x + w * 0.45, y + hh * 1.25, x - w * 0.45, y + hh * 1.25, x - w / 2, y);
    p.closePath();
    ctx.fillStyle = col; ctx.fill(p);
    K.clip(p, () => {
      if (tongue) { ctx.fillStyle = '#FF8FAB'; ctx.beginPath(); ctx.ellipse(x, y + hh * 1.05, w * 0.3, hh * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
      if (teeth) { ctx.fillStyle = '#fff'; ctx.fillRect(x - teeth / 2, y - 2, teeth, 4.5); }
    });
    K.line(p, 2.8);
  };

  /** Клюв анфас: верхняя половинка + нижняя, при голосе нижняя опускается. */
  K.beak = (x, y, w, h, open, fill = '#FFB020') => {
    const d = open * h * 0.7;
    if (d > 0.5) {
      ctx.fillStyle = '#7A2E2E';
      ctx.beginPath(); ctx.ellipse(x, y + d * 0.55, w * 0.32, d * 0.6 + 1, 0, 0, Math.PI * 2); ctx.fill();
    }
    K.part(P(`M${x - w / 2} ${y} Q${x} ${y + h * 0.75 + d} ${x + w / 2} ${y} Q${x} ${y + h * 0.15 + d} ${x - w / 2} ${y} Z`), tone(fill, -0.08), { box: [x - w / 2, y, x + w / 2, y + h + d], lw: 2.6 });
    K.part(P(`M${x - w / 2} ${y} Q${x - w * 0.15} ${y - h * 0.5} ${x} ${y - h * 0.55} Q${x + w * 0.15} ${y - h * 0.5} ${x + w / 2} ${y} Q${x} ${y + h * 0.55} ${x - w / 2} ${y} Z`), fill, { box: [x - w / 2, y - h * 0.6, x + w / 2, y + h * 0.5], lw: 2.6 });
  };
  return K;
}

/** Симметричные детали: fn(1) справа, fn(-1) слева. */
const both = (fn) => { fn(-1); fn(1); };

/** Плечики — общая форма. */
function shoulders(K, fill, extra) {
  const body = P('M-46 92 C-46 54 -30 36 0 36 C30 36 46 54 46 92 Z');
  K.part(body, fill, { box: [-46, 36, 46, 92] });
  if (extra) K.clip(body, extra);
  return body;
}

/** Копытца / лапки на краю. */
function hooves(K, fill, tip, wave) {
  both((s) => {
    const ctx = K.ctx;
    ctx.save();
    ctx.translate(s * 25, 46);
    if (s > 0 && wave) { ctx.rotate(-wave * 1.1); ctx.translate(0, -wave * 22); }
    const p = E(0, 0, 11, 8.5);
    K.part(p, fill, { box: [-11, -8, 11, 8], lw: 0 });
    K.clip(p, () => K.mark(P('M-12 2 L12 2 L12 12 L-12 12 Z'), tip));
    K.line(P('M0 2 L0 8'), 1.8, 'rgba(0,0,0,0.35)');
    ctx.lineWidth = 3.2; ctx.strokeStyle = INK; ctx.stroke(p);
    ctx.restore();
  });
}
function pawsRound(K, fill, wave, toes = true, tipFill = null) {
  both((s) => {
    const ctx = K.ctx;
    ctx.save();
    ctx.translate(s * 25, 46);
    if (s > 0 && wave) { ctx.rotate(-wave * 1.1); ctx.translate(0, -wave * 22); }
    const p = E(0, 0, 11, 8.5);
    K.part(p, fill, { box: [-11, -8, 11, 8] });
    if (tipFill) { K.clip(p, () => K.mark(E(0, 6, 10, 5), tipFill)); ctx.lineWidth = 3.2; ctx.strokeStyle = INK; ctx.stroke(p); }
    if (toes) K.line(P('M-3.5 4 L-3.5 8 M3.5 4 L3.5 8'), 1.8);
    ctx.restore();
  });
}
function wings(K, fill, wave) {
  both((s) => {
    const ctx = K.ctx;
    ctx.save();
    ctx.translate(s * 26, 44);
    if (s > 0 && wave) { ctx.rotate(-wave * 1.1); ctx.translate(0, -wave * 22); }
    ctx.scale(s, 1);
    const p = P('M-12 -6 C-4 -10 10 -8 13 0 C14 6 10 10 6 8 C4 11 0 11 -2 8 C-5 11 -10 10 -11 6 C-14 2 -14 -3 -12 -6 Z');
    K.part(p, fill, { box: [-13, -10, 13, 11] });
    K.line(P('M2 0 L3 7 M-4 0 L-4 7'), 1.6, 'rgba(0,0,0,0.3)');
    ctx.restore();
  });
}


/** Птичья голова вполоборота: клюв в профиль смотрит вправо, дальний глаз чуть меньше. */
function birdQ(K, o, cfg) {
  const ctx = K.ctx;
  const { fill, beak, wattle = null, lash = false, proud = false, big = false, duck = false, tuft = false, goose = false, grumpy = false } = cfg;
  const head = goose ? P('M-22 -8 C-24 -30 22 -32 24 -10 C26 8 14 20 -2 20 C-16 20 -24 8 -22 -8 Z')
    : P('M-28 -6 C-30 -30 24 -34 27 -8 C30 14 16 32 -2 32 C-20 32 -28 16 -28 -6 Z');
  K.part(head, fill, { box: [-30, -34, 30, 32] });
  if (tuft) K.part(P('M-4 -28 C-12 -40 0 -46 2 -36 C6 -44 16 -40 8 -28 Z'), fill, { box: [-12, -46, 16, -28], lw: 2.6 });
  const ey = goose ? -12 : -9;
  const lid = proud ? 0.32 : grumpy ? 0.22 : 0;
  const skin = fill;
  K.eye(-9, ey, goose ? 8 : 9, { lash: lash ? -1 : 0, lid, look: 0.35 + o.look * 0.4, blink: o.blink, wide: o.open, skin, brow: proud || grumpy ? 2 : null, browTilt: grumpy ? 3 : proud ? 1.5 : 0 });
  K.eye(13, ey - 1, goose ? 6.8 : 7.5, { lash: lash ? 1 : 0, lid, look: 0.35 + o.look * 0.4, blink: o.blink, wide: o.open, skin, brow: proud || grumpy ? 2.5 : null, browTilt: grumpy ? -3 : proud ? -1.5 : 0 });
  K.blush(-18, goose ? 4 : 9, 6);
  // клюв в профиль
  const by = goose ? -2 : 0, sc = big ? 1.15 : 1;
  ctx.save();
  ctx.translate(18, by); ctx.scale(sc, sc);
  const a = o.open * (duck || goose ? 0.35 : 0.5);
  let up, lo;
  if (duck || goose) {
    up = P('M-2 -4 C8 -7 22 -5 27 1 C27 5 23 7 13 7 L-1 7 Z');
    lo = P('M-1 7 L13 7 C21 8 25 9 24 11 C19 14 7 14 -1 11 Z');
  } else {
    up = P('M0 -6 Q14 -5 22 4 Q12 6 1 6 Z');
    lo = P('M1 6 Q12 6 18 8 Q10 14 1 11 Z');
  }
  if (a > 0.02) {
    ctx.fillStyle = '#7A2E2E';
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(duck || goose ? 22 : 18, 6); ctx.lineTo((duck || goose ? 22 : 18) * Math.cos(a), 6 + 14 * Math.sin(a)); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill();
  }
  if (wattle) K.part(P(`M3 ${10 + a * 6} C2 ${20 + a * 6} 12 ${22 + a * 6} 11 ${12 + a * 6} Z`), wattle, { flat: true, lw: 2.4 });
  ctx.save(); ctx.translate(0, 6); ctx.rotate(a); ctx.translate(0, -6);
  K.part(lo, tone(beak, -0.1), { flat: true, lw: 2.6 });
  ctx.restore();
  K.part(up, beak, { box: [0, -7, 27, 7], lw: 2.6 });
  if (duck || goose) K.mark(E(4, -1, 1.6, 1.1), 'rgba(90,40,0,0.6)');
  if (goose) K.part(E(-1, -6, 4.5, 4), '#3B3B48', { flat: true, lw: 2 });
  ctx.restore();
}


function henBody(K) {
  shoulders(K, '#FFFBF2', () => { K.ctx.strokeStyle = 'rgba(200,180,150,0.6)'; K.ctx.lineWidth = 2; for (const [x, y] of [[-20, 56], [0, 52], [20, 56], [-10, 68], [10, 68]]) { K.ctx.beginPath(); K.ctx.arc(x, y, 6, 0.4, 2.7); K.ctx.stroke(); } });
}
function roosterBody(K) {
  shoulders(K, '#D9480F', () => K.mark(P('M-30 36 C-20 48 20 48 30 36 L30 46 C20 58 -20 58 -30 46 Z'), '#F59F00'));
}
function gooseBody(K) {
      shoulders(K, '#FFFFFF');
      K.part(P('M-12 44 L12 44 L14 6 C8 2 -8 2 -14 6 Z'), '#FFFFFF', { box: [-14, 2, 14, 44], lw: 0 });
      // шарф
      const s = P('M-20 30 Q0 40 20 30 L20 40 Q0 50 -20 40 Z');
      K.part(s, '#E8463A', { box: [-20, 30, 20, 50] });
      K.clip(s, () => { for (const x of [-12, 0, 12]) K.mark(P(`M${x - 3} 25 L${x + 3} 25 L${x + 3} 55 L${x - 3} 55 Z`), '#FFFFFF'); });
      K.ctx.lineWidth = 3.2; K.ctx.strokeStyle = INK; K.ctx.stroke(s);
      K.part(P('M10 38 L18 62 L8 64 L4 42 Z'), '#E8463A', { box: [4, 38, 18, 64] });
}
function rabbitPaws(K, o, col) {
      const ctx = K.ctx;
      ctx.save(); ctx.translate(0, 42 - (o.wave || 0) * 4); ctx.rotate(-0.12);
      for (const [dx, a] of [[-24, -0.5], [-24, 0], [-24, 0.5]]) {
        ctx.save(); ctx.translate(dx, 0); ctx.rotate(a);
        K.part(E(-7, 0, 8, 3.2), '#69DB7C', { flat: true, lw: 2 });
        ctx.restore();
      }
      K.part(P('M-22 -5 C-8 -7 10 -4 24 0 C10 4 -8 7 -22 5 Z'), '#FF922B', { box: [-22, -6, 24, 6] });
      K.line(P('M-10 -4 L-8 0 M2 -3 L4 1 M12 -1 L13 2'), 1.4, 'rgba(120,50,0,0.4)');
      ctx.restore();
      pawsRound(K, col, o.wave, true);
}

// ---------- Персонажи ----------
// back — позади головы (уши, рога, хохолки); head — голова и мордочка; paws — лапки на краю; body — плечики.

const CHARS = {
  // Корова-мечтательница: ресницы, пятно на глазу, чубчик, ромашка в зубах, колокольчик.
  cow: {
    body(K) {
      shoulders(K, '#FFFFFF', () => K.mark(P('M14 40 C30 36 44 48 42 62 C40 72 22 74 18 62 C14 54 6 48 14 40 Z'), '#3A3332'));
      K.part(P('M-27 37 Q0 49 27 37 L27 44 Q0 56 -27 44 Z'), '#E8463A', { box: [-27, 37, 27, 56] });
    },
    back(K, o) {
      const ctx = K.ctx;
      both((s) => {
        ctx.save(); ctx.translate(s * 44, -16); ctx.rotate(s * (0.42 + o.ear * 0.25 - o.open * 0.3));
        K.part(E(0, 0, 17, 8.5), '#FFFFFF', { box: [-17, -9, 17, 9] });
        K.mark(E(s * 2, 1, 10, 4.2), '#FFB8C8');
        ctx.restore();
        K.part(P(`M${s * 16} -36 C${s * 24} -44 ${s * 30} -50 ${s * 30} -62 C${s * 20} -58 ${s * 12} -50 ${s * 8} -40 Z`), '#FFF1CF', { box: [-30, -62, 30, -36] });
      });
    },
    head(K, o) {
      const head = P('M-34 -28 C-34 -46 34 -46 34 -28 C40 -10 44 8 37 24 C28 40 -28 40 -37 24 C-44 8 -40 -10 -34 -28 Z');
      K.part(head, '#FFFFFF', { box: [-44, -44, 44, 38] });
      K.clip(head, () => K.mark(P('M-38 -24 C-30 -36 -8 -34 -6 -18 C-4 -4 -14 2 -26 0 C-36 -2 -42 -14 -38 -24 Z'), '#3A3332'));
      K.part(P('M-13 -38 C-14 -50 -4 -54 0 -46 C4 -56 16 -50 12 -38 C6 -42 -6 -42 -13 -38 Z'), '#8B5A3C', { box: [-14, -56, 16, -38] });
      K.part(E(0, 20, 30, 18), '#FFB8C8', { box: [-30, 2, 30, 38] });
      K.mark(E(-11, 16, 4, 5.5, 0.35), '#9C4A5E');
      K.mark(E(11, 16, 4, 5.5, -0.35), '#9C4A5E');
      K.mouth(0, 28, 20, o.open, { smile: 5, closed: P('M-9 28 Q0 33 10 27') });
      // ромашка в уголке рта
      const ctx = K.ctx;
      K.line(P(`M10 ${28 + o.open * 3} Q22 34 32 44`), 2.6, '#4E9B47');
      ctx.save(); ctx.translate(33, 45);
      for (let i = 0; i < 7; i++) { ctx.rotate((Math.PI * 2) / 7); K.part(E(0, -6, 2.8, 5), '#FFFFFF', { flat: true, lw: 1.6 }); }
      K.part(C(0, 0, 3.4), '#FFD43B', { flat: true, lw: 1.6 });
      ctx.restore();
      K.eye(-16, -10, 9, { lid: 0.26, lash: -1, look: 0.2 + o.look * 0.6, skin: '#3A3332', blink: o.blink, wide: o.open });
      K.eye(16, -10, 9, { lid: 0.26, lash: 1, look: 0.2 + o.look * 0.6, blink: o.blink, wide: o.open });
      K.blush(-27, 8); K.blush(27, 8);
    },
    paws(K, o) { hooves(K, '#FFFFFF', '#7A6A64', o.wave); },
  },

  // Поросёнок-озорник: кудряшка на макушке, одно ухо загнуто, грязное пятнышко на щеке, хитрая улыбка.
  pig: {
    body(K) { shoulders(K, '#FFB3C6'); },
    back(K, o) {
      const r = o.ear * 0.2 - o.open * 0.25;
      const ctx = K.ctx;
      ctx.save(); ctx.translate(-26, -28); ctx.rotate(r);
      K.part(P('M4 -2 C-2 -18 -14 -26 -20 -24 C-22 -14 -16 -4 -6 4 Z'), '#FF9EB7', { box: [-22, -26, 4, 4] });
      K.mark(P('M0 -4 C-4 -14 -12 -19 -16 -18 C-16 -12 -12 -6 -5 0 Z'), '#FF7FA0');
      ctx.restore();
      ctx.save(); ctx.translate(26, -28); ctx.rotate(-r);
      K.part(P('M-4 -2 C2 -18 14 -26 20 -24 C20 -18 18 -14 16 -12 C22 -8 22 0 18 4 C12 2 6 2 -4 2 Z'), '#FF9EB7', { box: [-4, -26, 22, 4] });
      K.line(P('M16 -12 C12 -10 8 -8 4 -6'), 2, 'rgba(0,0,0,0.25)');
      ctx.restore();
    },
    head(K, o) {
      const head = P('M-36 -22 C-24 -40 24 -40 36 -22 C45 -8 45 12 36 24 C26 38 -26 38 -36 24 C-45 12 -45 -8 -36 -22 Z');
      K.part(head, '#FFB3C6', { box: [-44, -38, 44, 36] });
      K.clip(head, () => K.mark(P('M24 4 C30 0 38 4 36 12 C34 18 26 16 24 12 C20 10 20 6 24 4 Z'), 'rgba(150,95,60,0.45)'));
      K.line(P('M-3 -35 C-10 -46 3 -52 6 -45 C8 -40 2 -38 0 -42'), 2.8);
      K.eye(-15, -12, 8.5, { look: o.look * 0.6 + 0.2, brow: 1, browTilt: -1, blink: o.blink, wide: o.open });
      K.eye(15, -12, 8.5, { look: o.look * 0.6 + 0.2, brow: 4, browTilt: 1.5, blink: o.blink, wide: o.open });
      K.part(E(0, 9, 17, 12.5), '#FF8FAB', { box: [-17, -3, 17, 21] });
      K.mark(E(-6, 9, 3.2, 5), '#B34766'); K.mark(E(6, 9, 3.2, 5), '#B34766');
      K.mouth(1, 27, 22, o.open, { closed: P('M-10 26 Q2 33 12 24'), teeth: 0 });
      K.blush(-27, 10); K.blush(28, 14, 5);
    },
    paws(K, o) { hooves(K, '#FFB3C6', '#E07A93', o.wave); },
  },

  // Кудрявая овечка: шерстяная чёлка на один глаз, розовый бантик.
  sheep: {
    body(K) {
      const ctx = K.ctx;
      const body = P('M-48 92 C-50 70 -46 50 -34 42 C-30 34 -14 34 -6 38 C2 32 18 34 24 40 C36 40 48 52 48 66 C50 76 48 86 48 92 Z');
      K.part(body, '#FBF6EE', { box: [-48, 34, 48, 92] });
      K.clip(body, () => { ctx.strokeStyle = 'rgba(160,140,120,0.35)'; ctx.lineWidth = 2; for (const [x, y] of [[-30, 56], [-10, 52], [12, 58], [32, 54], [-20, 72], [20, 74]]) { ctx.beginPath(); ctx.arc(x, y, 6, 0.3, 2.6); ctx.stroke(); } });
    },
    back(K, o) {
      const ctx = K.ctx;
      const wool = '#FBF6EE';
      for (const [x, y, r] of [[-32, -16, 14], [-24, -32, 14], [-6, -40, 15], [14, -38, 14], [30, -26, 14], [34, -6, 12], [-35, 2, 11]]) K.part(C(x, y, r), wool, { box: [x - r, y - r, x + r, y + r] });
      both((s) => {
        ctx.save(); ctx.translate(s * 36, 2); ctx.rotate(s * (0.45 + o.ear * 0.3 - o.open * 0.3));
        K.part(E(s * 6, 0, 14, 7.5), '#5C5552', { box: [-20, -8, 20, 8] });
        K.mark(E(s * 7, 0.5, 8, 3.5), '#E8A0A8');
        ctx.restore();
      });
    },
    head(K, o) {
      const face = P('M-22 -20 C-14 -32 14 -32 22 -20 C29 -8 28 12 22 24 C14 36 -14 36 -22 24 C-28 12 -29 -8 -22 -20 Z');
      K.part(face, '#5C5552', { box: [-28, -32, 28, 34] });
      K.eye(-10, -4, 8, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#5C5552' });
      K.eye(11, -4, 8, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#5C5552' });
      // чёлка поверх лба, прикрывает один глаз
      const wool = '#FBF6EE';
      for (const [x, y, r] of [[9, -27, 10], [-5, -30, 11], [-17, -22, 9], [-16, -13, 6]]) K.part(C(x, y, r), wool, { box: [x - r, y - r, x + r, y + r] });
      // бантик
      const ctx = K.ctx;
      ctx.save(); ctx.translate(26, -38); ctx.rotate(0.3);
      K.part(P('M0 0 C-6 -8 -14 -6 -13 0 C-14 6 -6 8 0 0 Z'), '#FF8FB1', { box: [-14, -8, 0, 8], lw: 2.4 });
      K.part(P('M0 0 C6 -8 14 -6 13 0 C14 6 6 8 0 0 Z'), '#FF8FB1', { box: [0, -8, 14, 8], lw: 2.4 });
      K.part(C(0, 0, 3), '#FF6B9A', { flat: true, lw: 2 });
      ctx.restore();
      K.part(E(0, 16, 12, 9), '#7A716D', { box: [-12, 7, 12, 25], lw: 0 });
      K.mark(P('M-4 12 L4 12 L0 16 Z'), '#2E2725');
      K.mouth(0, 21, 12, o.open, { closed: P('M-6 20 Q-3 24 0 20 Q3 24 6 20'), h: 10, col: '#3E2020' });
      K.blush(-17, 10, 5); K.blush(17, 10, 5);
    },
    paws(K, o) { hooves(K, '#5C5552', '#2E2725', o.wave); },
  },

  // Козлик-хитрюга: изогнутые рога, бородка, бровь вскинута, ухмылка.
  goat: {
    body(K) { shoulders(K, '#EFE3D3'); },
    back(K, o) {
      const ctx = K.ctx;
      both((s) => {
        K.part(P(`M${s * 10} -34 C${s * 14} -54 ${s * 30} -66 ${s * 46} -58 C${s * 46} -52 ${s * 36} -52 ${s * 30} -50 C${s * 24} -46 ${s * 22} -40 ${s * 22} -32 Z`), '#D9C6A5', { box: [-46, -66, 46, -32] });
        K.line(P(`M${s * 16} -44 L${s * 22} -42 M${s * 20} -52 L${s * 26} -48 M${s * 28} -58 L${s * 32} -52`), 1.8, 'rgba(90,60,30,0.4)');
        ctx.save(); ctx.translate(s * 30, -14); ctx.rotate(s * (0.55 + o.ear * 0.3 - o.open * 0.3));
        K.part(E(s * 8, 0, 16, 7), '#EADBC8', { box: [-24, -7, 24, 7] });
        K.mark(E(s * 9, 0.5, 9, 3.4), '#F5C2C7');
        ctx.restore();
      });
    },
    head(K, o) {
      K.part(P('M-8 30 C-10 44 -4 56 2 62 C4 54 10 44 9 30 Z'), '#D9C6AE', { box: [-10, 30, 10, 62] });
      const head = P('M-24 -30 C-16 -42 16 -42 24 -30 C30 -16 28 8 20 24 C14 36 -14 36 -20 24 C-28 8 -30 -16 -24 -30 Z');
      K.part(head, '#EFE3D3', { box: [-30, -42, 30, 34] });
      K.clip(head, () => K.mark(P('M-6 -44 C-4 -30 -6 -20 -8 -12 L8 -12 C6 -20 4 -30 6 -44 Z'), '#B08563'));
      K.eye(-12, -10, 8, { lid: 0.22, look: 0.35 + o.look * 0.4, brow: 1, browTilt: 1, blink: o.blink, wide: o.open, skin: '#EFE3D3' });
      K.eye(12, -10, 8, { lid: 0.22, look: 0.35 + o.look * 0.4, brow: 6, browTilt: 2, blink: o.blink, wide: o.open, skin: '#EFE3D3' });
      K.part(E(0, 15, 15, 11), '#F5D9CF', { box: [-15, 4, 15, 26] });
      K.mark(E(-5, 12, 2.6, 3.6), '#8C5A50'); K.mark(E(5, 12, 2.6, 3.6), '#8C5A50');
      K.mouth(0, 25, 16, o.open, { closed: P('M-7 25 Q1 29 9 23'), teeth: o.open > 0.2 ? 6 : 0, h: 11 });
      K.blush(-19, 8, 5); K.blush(19, 8, 5);
    },
    paws(K, o) { hooves(K, '#EFE3D3', '#8C7462', o.wave); },
  },

  // Конь: круглая морда, тёмная грива-кудряшка, широко посаженные глаза.
  horse: {
    body(K) {
      shoulders(K, '#D08A4C');
      K.part(P('M-34 38 C-44 44 -48 58 -46 72 C-38 64 -30 52 -24 40 Z'), '#6B3E26', { box: [-48, 38, -24, 72] });
    },
    back(K, o) {
      const ctx = K.ctx;
      both((s) => {
        ctx.save(); ctx.translate(s * 22, -36); ctx.rotate(s * (0.3 + o.ear * 0.25 - o.open * 0.2));
        K.part(P('M-8 6 C-9 -6 -4 -16 0 -22 C4 -16 9 -6 8 6 Z'), '#D08A4C', { box: [-9, -22, 9, 6] });
        K.mark(P('M-4 3 C-4 -4 -2 -10 0 -14 C2 -10 4 -4 4 3 Z'), '#F2B58A');
        ctx.restore();
      });
      // грива сбоку
      K.part(P('M-30 -30 C-46 -24 -48 -4 -42 14 C-40 4 -36 -6 -30 -10 Z'), '#6B3E26', { box: [-48, -30, -30, 14] });
    },
    head(K, o) {
      const head = P('M-30 -28 C-22 -44 22 -44 30 -28 C36 -16 34 0 32 10 C30 34 -30 34 -32 10 C-34 0 -36 -16 -30 -28 Z');
      K.part(head, '#D08A4C', { box: [-36, -44, 36, 32] });
      K.clip(head, () => K.mark(P('M-4 -32 C-2 -20 -5 -10 -6 -2 L6 -2 C5 -10 2 -20 4 -32 Z'), '#FFF6E8'));
      K.eye(-16, -10, 9.5, { lash: -1, look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#D08A4C' });
      K.eye(16, -10, 9.5, { lash: 1, look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#D08A4C' });
      K.part(E(0, 18, 28, 16), '#F2C9A0', { box: [-28, 2, 28, 34] });
      K.mark(E(-11, 14, 3.6, 5.2, 0.25), '#7A4A2A'); K.mark(E(11, 14, 3.6, 5.2, -0.25), '#7A4A2A');
      K.mouth(0, 25, 24, o.open, { smile: 6, teeth: 12, h: 11 });
      // чёлка-кудряшка
      K.part(P('M-16 -38 C-14 -50 2 -54 10 -46 C18 -52 26 -42 18 -34 C22 -28 14 -20 8 -26 C6 -18 -4 -18 -4 -26 C-10 -22 -18 -28 -16 -38 Z'), '#6B3E26', { box: [-18, -54, 26, -18] });
      K.blush(-25, 4, 5.5); K.blush(25, 4, 5.5);
    },
    paws(K, o) { hooves(K, '#D08A4C', '#3B2A20', o.wave); },
  },

  // Пёс-весельчак: одно ухо вывернуто, пятно на глазу, брови домиком, язык набок, ошейник с медалькой.
  dog: {
    body(K) {
      shoulders(K, '#E2A86B', () => K.mark(P('M-14 36 C-12 50 -6 62 0 66 C6 62 12 50 14 36 Z'), '#FFF4E6'));
      K.part(P('M-26 36 Q0 48 26 36 L26 43 Q0 55 -26 43 Z'), '#4DABF7', { box: [-26, 36, 26, 55] });
    },
    back(K, o) {
      const ctx = K.ctx;
      ctx.save(); ctx.translate(-26, -30); ctx.rotate(o.ear * 0.15 - o.open * 0.15);
      K.part(P('M0 -4 C-22 -8 -34 20 -28 46 C-24 58 -10 54 -10 38 C-10 24 -4 10 6 -2 Z'), '#8B5A3C', { box: [-32, -8, 6, 56] });
      ctx.restore();
    },
    head(K, o) {
      const ctx = K.ctx;
      const head = P('M-30 -34 C-12 -47 12 -47 30 -34 C42 -22 44 2 36 18 C27 34 -27 34 -36 18 C-44 2 -42 -22 -30 -34 Z');
      K.part(head, '#E2A86B', { box: [-44, -46, 44, 32] });
      K.clip(head, () => {
        K.mark(P('M-6 -46 C-4 -32 -10 -18 -18 -4 L18 -4 C10 -18 4 -32 6 -46 Z'), '#FFF4E6');
        K.mark(P('M6 -24 C12 -32 30 -30 32 -16 C34 -4 24 2 14 -2 C6 -6 2 -16 6 -24 Z'), '#9C6438');
      });
      ctx.save(); ctx.translate(24, -34); ctx.rotate(-o.ear * 0.15 - o.open * 0.2);
      K.part(P('M-2 -2 C10 -22 34 -26 34 -10 C34 2 20 8 8 10 Z'), '#F2B8A8', { box: [-2, -26, 34, 10] });
      K.line(P('M6 2 C16 -8 26 -12 30 -10'), 2, 'rgba(0,0,0,0.2)');
      ctx.restore();
      K.part(E(0, 12, 23, 16), '#FFF4E6', { box: [-23, -4, 23, 28], flat: true, lw: 0 });
      // рот: язык набок (закрыт) / открытая пасть
      const op = Math.max(0.35, o.open);
      const mouth = P(`M-15 12 C-12 ${22 + op * 10} 12 ${22 + op * 10} 15 12 C8 16 -8 16 -15 12 Z`);
      K.part(mouth, '#7A2E2E', { flat: true, lw: 2.6 });
      K.part(P(`M-2 18 C-6 ${30 + op * 6} 12 ${34 + op * 6} 12 22 C8 18 2 17 -2 18 Z`), '#FF8FAB', { box: [-6, 17, 12, 40], lw: 2.4 });
      K.line(P('M5 21 L5 29'), 1.8, 'rgba(160,40,70,0.6)');
      K.part(P('M-10 1 C-10 -6 10 -6 10 1 C10 6 4 10 0 10 C-4 10 -10 6 -10 1 Z'), '#2B1D17', { flat: true, lw: 2.4 });
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-3.5, -1.5, 3.5, 2, -0.3, 0, Math.PI * 2); ctx.fill();
      K.line(P('M0 10 L0 13'), 2.6);
      K.eye(-15, -13, 8.5, { look: -0.25 + o.look * 0.6, brow: 2.5, browTilt: -1.5, blink: o.blink, wide: o.open });
      K.eye(17, -13, 8.5, { look: -0.25 + o.look * 0.6, brow: 4, browTilt: 1.5, blink: o.blink, wide: o.open });
      K.blush(-26, 8); K.blush(27, 8);
    },
    paws(K, o) { pawsRound(K, '#E2A86B', o.wave); },
  },

  // Кот-хитрец: полосатый, зелёные глаза с узким зрачком, довольная улыбка «:3», ухо с выщербинкой.
  cat: {
    body(K) {
      shoulders(K, '#FFA94D', () => {
        K.mark(P('M-12 36 C-10 50 -4 58 0 60 C4 58 10 50 12 36 Z'), '#FFF4E6');
        K.ctx.strokeStyle = '#E8590C'; K.ctx.lineWidth = 4;
        for (const [x, y] of [[-34, 54], [-38, 66], [34, 54], [38, 66]]) { K.ctx.beginPath(); K.ctx.moveTo(x, y); K.ctx.lineTo(x + (x < 0 ? 10 : -10), y - 2); K.ctx.stroke(); }
      });
    },
    back(K, o) {
      const ctx = K.ctx;
      both((s) => {
        ctx.save(); ctx.translate(s * 26, -26); ctx.rotate(s * (o.ear * 0.25 - o.open * 0.15));
        const ear = s < 0 ? P('M-16 8 L-10 -14 L-4 -26 L2 -18 L-2 -15 L4 -12 L14 6 Z') : P('M-14 6 L4 -26 L16 8 Z');
        K.part(ear, '#FFA94D', { box: [-16, -26, 16, 8] });
        K.mark(P(`M${-8} 4 L${s * 2} -16 L8 4 Z`), '#FFC9D4');
        ctx.restore();
      });
    },
    head(K, o) {
      const ctx = K.ctx;
      const head = P('M-34 -22 C-24 -38 24 -38 34 -22 C44 -8 44 12 34 24 C24 36 -24 36 -34 24 C-44 12 -44 -8 -34 -22 Z');
      K.part(head, '#FFA94D', { box: [-44, -38, 44, 36] });
      K.clip(head, () => {
        ctx.strokeStyle = '#E8590C'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
        for (const dx of [-9, 0, 9]) { ctx.beginPath(); ctx.moveTo(dx, -38); ctx.lineTo(dx * 0.8, -26); ctx.stroke(); }
        for (const s of [-1, 1]) for (const dy of [0, 8]) { ctx.beginPath(); ctx.moveTo(s * 44, dy - 2); ctx.lineTo(s * 33, dy); ctx.stroke(); }
        K.mark(E(-9, 15, 12, 10), '#FFF4E6'); K.mark(E(9, 15, 12, 10), '#FFF4E6');
      });
      K.eye(-15, -6, 9, { iris: '#7CB342', slit: true, lid: 0.3, look: o.look * 0.6 + 0.2, blink: o.blink, wide: o.open, skin: '#FFA94D', brow: null });
      K.eye(15, -6, 9, { iris: '#7CB342', slit: true, lid: 0.3, look: o.look * 0.6 + 0.2, blink: o.blink, wide: o.open, skin: '#FFA94D' });
      K.part(P('M-5 8 L5 8 L0 13 Z'), '#FF8FAB', { flat: true, lw: 2.2 });
      K.mouth(0, 16, 16, o.open, { closed: P('M0 13 L0 16 M-8 16 Q-4 21 0 16 Q4 21 8 16'), h: 11 });
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(s * 18, 14 + k * 3); ctx.lineTo(s * 40, 12 + k * 7); ctx.stroke(); }
      K.blush(-25, 6, 5); K.blush(25, 6, 5);
    },
    paws(K, o) { pawsRound(K, '#FFA94D', o.wave, true, '#FFF4E6'); },
  },

  // Лягушонок-принц: корона набекрень, улыбка до ушей.
  frog: {
    body(K) { shoulders(K, '#6CCB5F', () => K.mark(E(0, 64, 26, 26), '#C6EFA6')); },
    back() {},
    head(K, o) {
      const ctx = K.ctx;
      both((s) => K.part(E(s * 24, -26, 17, 16), '#6CCB5F', { box: [s * 24 - 17, -42, s * 24 + 17, -10] }));
      const head = P('M-48 2 C-48 -20 -28 -28 0 -28 C28 -28 48 -20 48 2 C48 24 26 34 0 34 C-26 34 -48 24 -48 2 Z');
      K.part(head, '#6CCB5F', { box: [-48, -28, 48, 34] });
      K.clip(head, () => { for (const [x, y, r] of [[-30, 8, 4], [-36, -4, 2.6], [34, 10, 3.4], [26, -12, 2.4], [-8, -18, 2.2]]) K.mark(C(x, y, r), '#55B04A'); });
      ctx.save(); ctx.translate(2, -40 - o.open * 4); ctx.rotate(0.22 - o.open * 0.15);
      K.part(P('M-12 6 L-14 -10 L-6 -3 L0 -14 L6 -3 L14 -10 L12 6 Z'), '#FFC93C', { box: [-14, -14, 14, 6] });
      K.part(C(0, 0, 2.6), '#FF5C8A', { flat: true, lw: 1.6 });
      ctx.restore();
      K.eye(-24, -27, 10.5, { look: 0.3 + o.look * 0.5, blink: o.blink, wide: o.open, skin: '#6CCB5F' });
      K.eye(24, -27, 10.5, { look: 0.3 + o.look * 0.5, blink: o.blink || o.wink, wide: o.open, skin: '#6CCB5F' });
      K.mark(E(-5, -6, 1.8, 1.4), INK); K.mark(E(5, -6, 1.8, 1.4), INK);
      if (o.open < 0.08) {
        K.line(P('M-34 4 C-22 22 22 22 34 4'), 3.2);
        K.line(P('M-34 4 C-37 2 -38 0 -37 -2 M34 4 C37 2 38 0 37 -2'), 3);
      } else K.mouth(0, 6, 56, o.open, { smile: 14, h: 14 });
      K.blush(-34, 12, 8); K.blush(34, 12, 8);
    },
    paws(K, o) {
      both((s) => {
        const ctx = K.ctx;
        ctx.save(); ctx.translate(s * 26, 46);
        if (s > 0 && o.wave) { ctx.rotate(-o.wave * 1.1); ctx.translate(0, -o.wave * 22); }
        K.part(E(0, -2, 10, 6), '#6CCB5F', { box: [-10, -8, 10, 4] });
        for (const dx of [-7, 0, 7]) K.part(C(dx, 3, 4.6), '#6CCB5F', { flat: true, lw: 2.4 });
        ctx.restore();
      });
    },
  },

  // Сова-умница: круглые очки, кисточки на ушах, пёрышки на груди.
  owl: {
    body(K) {
      shoulders(K, '#A47148', () => {
        K.mark(E(0, 66, 26, 30), '#E8D3B5');
        K.ctx.strokeStyle = 'rgba(140,90,52,0.55)'; K.ctx.lineWidth = 2;
        for (const [x, y] of [[-10, 50], [4, 52], [-4, 62], [10, 64], [-12, 72], [2, 74]]) { K.ctx.beginPath(); K.ctx.moveTo(x - 3, y); K.ctx.lineTo(x, y + 3); K.ctx.lineTo(x + 3, y); K.ctx.stroke(); }
      });
    },
    back(K, o) {
      const ctx = K.ctx;
      both((s) => {
        ctx.save(); ctx.translate(s * 26, -32); ctx.rotate(s * (o.ear * 0.2 - o.open * 0.2));
        K.part(P(`M${-10 * s} 8 C${-4 * s} -4 ${4 * s} -14 ${12 * s} -18 C${12 * s} -8 ${10 * s} 2 ${8 * s} 8 Z`), '#8B5A34', { box: [-12, -18, 12, 8] });
        ctx.restore();
      });
    },
    head(K, o) {
      const ctx = K.ctx;
      const head = P('M-40 -14 C-40 -36 -20 -42 0 -36 C20 -42 40 -36 40 -14 C42 8 30 32 0 34 C-30 32 -42 8 -40 -14 Z');
      K.part(head, '#A47148', { box: [-42, -42, 42, 34] });
      K.clip(head, () => {
        K.mark(P('M0 -26 C-10 -34 -36 -30 -34 -6 C-32 14 -14 22 0 14 C14 22 32 14 34 -6 C36 -30 10 -34 0 -26 Z'), '#F2E3C9');
      });
      K.eye(-16, -6, 11, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#F2E3C9', brow: null });
      K.eye(16, -6, 11, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#F2E3C9' });
      // очки
      both((s) => {
        const g = C(s * 16, -6, 14);
        ctx.fillStyle = 'rgba(200,230,255,0.18)'; ctx.fill(g);
        K.line(g, 3.4, '#3D2614');
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s * 16, -6, 10.5, -2.6, -1.9); ctx.stroke();
      });
      K.line(P('M-4 -8 Q0 -12 4 -8'), 3);
      K.beak(0, 10, 12, 12, o.open, '#FFA94D');
      K.blush(-27, 14, 5); K.blush(27, 14, 5);
    },
    paws(K, o) { wings(K, '#8B5A34', o.wave); },
  },

  // Мышонок-сластёна: огромные уши, зубки, держит кусочек сыра.
  mouse: {
    body(K) { shoulders(K, '#C3C3CF', () => K.mark(E(0, 64, 20, 22), '#E9E9F0')); },
    back(K, o) {
      const ctx = K.ctx;
      both((s) => {
        ctx.save(); ctx.translate(s * 30, -24); ctx.rotate(s * (o.ear * 0.2 - o.open * 0.2));
        K.part(C(0, 0, 21), '#C3C3CF', { box: [-21, -21, 21, 21] });
        K.mark(C(s * 1, 1, 13.5), '#FFC9D4');
        ctx.restore();
      });
    },
    head(K, o) {
      const ctx = K.ctx;
      const head = P('M-28 -10 C-28 -28 28 -28 28 -10 C30 6 18 24 0 30 C-18 24 -30 6 -28 -10 Z');
      K.part(head, '#C3C3CF', { box: [-30, -28, 30, 30] });
      K.eye(-11, -8, 8.5, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#C3C3CF', brow: 1 });
      K.eye(11, -8, 8.5, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#C3C3CF', brow: 1 });
      if (o.open < 0.08) {
        K.part(P('M-4 18 L4 18 L4 25 Q0 27 -4 25 Z'), '#FFFFFF', { flat: true, lw: 2 });
        K.line(P('M0 18 L0 25'), 1.5);
        K.line(P('M-8 17 Q-4 20 0 17 Q4 20 8 17'), 2.6);
      } else K.mouth(0, 17, 14, o.open, { teeth: 8, h: 10 });
      K.part(C(0, 11, 4.8), '#FF8FAB', { flat: true, lw: 2.2 });
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-1.5, 9.5, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(s * 8, 12 + k * 2); ctx.lineTo(s * 30, 8 + k * 6); ctx.stroke(); }
      K.blush(-18, 6, 5); K.blush(18, 6, 5);
    },
    paws(K, o) {
      // кусочек сыра в лапках
      const ctx = K.ctx;
      ctx.save(); ctx.translate(0, 40 - (o.wave || 0) * 4);
      const cheese = P('M-14 8 L14 8 L14 -2 L-14 -10 Z');
      K.part(cheese, '#FFD43B', { box: [-14, -10, 14, 8] });
      K.clip(cheese, () => { for (const [x, y, r] of [[-6, 2, 2.5], [5, 0, 3], [9, 5, 1.8]]) K.mark(C(x, y, r), '#E8B10F'); });
      ctx.restore();
      pawsRound(K, '#FFC9D4', o.wave, false);
    },
  },

  // Заяц: серо-бежевый, белые пухлые щёчки, кончик уха загнут.
  rabbit: {
    body(K) { shoulders(K, '#C9B49C', () => K.mark(E(0, 64, 20, 24), '#FFF8EE')); },
    back(K, o) {
      const ctx = K.ctx;
      ctx.save(); ctx.translate(-13, -28); ctx.rotate(-0.16 + o.ear * 0.12 - o.open * 0.08);
      K.part(E(0, -26, 11.5, 28), '#C9B49C', { box: [-12, -54, 12, 2] });
      K.mark(E(0, -24, 6, 20), '#FFC2CC');
      ctx.restore();
      ctx.save(); ctx.translate(13, -28); ctx.rotate(0.16 - o.ear * 0.12 - o.open * 0.08);
      K.part(P('M-11 0 C-12 -20 -8 -40 0 -46 C6 -46 10 -40 11 -34 C18 -34 24 -28 20 -22 C16 -24 12 -26 10 -24 C10 -14 11 -6 11 0 Z'), '#C9B49C', { box: [-12, -46, 22, 0] });
      K.mark(P('M-5 -4 C-6 -18 -4 -32 0 -38 C4 -36 5 -30 5 -24 C5 -14 5 -8 5 -4 Z'), '#FFC2CC');
      ctx.restore();
    },
    head(K, o) {
      const head = P('M-30 -12 C-30 -34 30 -34 30 -12 C33 8 22 30 0 31 C-22 30 -33 8 -30 -12 Z');
      K.part(head, '#C9B49C', { box: [-33, -34, 33, 31] });
      K.eye(-13, -9, 9, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#C9B49C', brow: 1 });
      K.eye(13, -9, 9, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#C9B49C', brow: 1 });
      K.part(E(-8, 14, 10, 8.5), '#FFF8EE', { box: [-18, 6, 2, 22], lw: 2.4 });
      K.part(E(8, 14, 10, 8.5), '#FFF8EE', { box: [-2, 6, 18, 22], lw: 2.4 });
      if (o.open < 0.08) {
        K.part(P('M-5 19 L5 19 L5 27 Q0 29 -5 27 Z'), '#FFFFFF', { flat: true, lw: 2.2 });
        K.line(P('M0 19 L0 27'), 1.5);
      } else K.mouth(0, 19, 14, o.open, { teeth: 10, h: 10 });
      K.part(P('M-5 6 L5 6 C5 10 2 12 0 12 C-2 12 -5 10 -5 6 Z'), '#FF7F98', { flat: true, lw: 2.2 });
      const ctx = K.ctx; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 14, 13 + k * 2); ctx.lineTo(s * 30, 11 + k * 5); ctx.stroke(); }
      K.blush(-22, 6, 6); K.blush(22, 6, 6);
    },
    paws(K, o) { rabbitPaws(K, o, '#C9B49C'); },
  },

  // Ёжик-запасливый: колючки венчиком, на колючке яблочко.
  hedgehog: {
    body(K) { shoulders(K, '#E9C9A0'); },
    back(K, o) {
      const ctx = K.ctx;
      // колючая «шубка» — много коротких колючек венчиком
      const n = 30, q = new Path2D();
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * (0.8 + (i / n) * 1.4);
        const r = i % 2 ? 37 : 47 + o.open * 3 + Math.sin(i * 1.7) * 2;
        const x = Math.cos(a) * r * 1.08, y = Math.sin(a) * r - 2;
        i ? q.lineTo(x, y) : q.moveTo(x, y);
      }
      q.lineTo(30, 26); q.lineTo(-30, 26); q.closePath();
      K.part(q, '#8E6440', { box: [-50, -50, 50, 26] });
      ctx.strokeStyle = 'rgba(255,230,190,0.35)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        const a = Math.PI * (0.85 + (i / 15) * 1.3);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 28 - 2); ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 38 - 2); ctx.stroke();
      }
      // яблочко на колючках
      ctx.save(); ctx.translate(30, -42);
      K.part(P('M0 -8 C8 -12 14 -4 12 4 C10 12 2 14 0 11 C-2 14 -10 12 -12 4 C-14 -4 -8 -12 0 -8 Z'), '#FF4D4F', { box: [-12, -12, 14, 14] });
      K.line(P('M0 -8 L1 -14'), 2.4, '#6B4226');
      K.part(E(6, -14, 5, 2.6, -0.4), '#69DB7C', { flat: true, lw: 1.8 });
      ctx.restore();
    },
    head(K, o) {
      const ctx = K.ctx;
      const face = P('M-28 -16 C-22 -30 22 -30 28 -16 C34 -2 28 14 16 24 C8 32 -8 32 -16 24 C-28 14 -34 -2 -28 -16 Z');
      K.part(face, '#E9C9A0', { box: [-32, -30, 32, 30] });
      K.eye(-11, -8, 8, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#E9C9A0', brow: 0.5 });
      K.eye(11, -8, 8, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#E9C9A0', brow: 0.5 });
      K.part(C(0, 12, 5.5), '#2B1D17', { flat: true, lw: 2 });
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-1.8, 10.2, 1.7, 0, Math.PI * 2); ctx.fill();
      K.mouth(0, 21, 16, o.open, { smile: 6, h: 9 });
      K.blush(-18, 8, 5); K.blush(18, 8, 5);
    },
    paws(K, o) { pawsRound(K, '#C9A27A', o.wave, true); },
  },
  // Курочка: анфас, пухлая, большой клюв, гребешок-«причёска» набок, пёрышки на щеках.
  hen: {
    body(K) { henBody(K); },
    back(K, o) {
      const ctx = K.ctx;
      ctx.save(); ctx.translate(4, -30); ctx.rotate(0.25 + o.ear * 0.05);
      K.part(P(`M-16 4 C-22 -10 -10 -18 -6 -10 C-6 -24 8 -24 8 -12 C12 -22 26 -16 18 -2 C${8} ${2 - o.open * 3} -6 2 -16 4 Z`), '#FF4D4F', { box: [-22, -24, 26, 4] });
      ctx.restore();
      both((s) => K.part(P(`M${s * 28} -6 L${s * 40} -10 L${s * 32} -2 L${s * 42} 2 L${s * 30} 4 Z`), '#FFFBF2', { box: [-42, -10, 42, 4], lw: 2.4 }));
    },
    head(K, o) {
      const head = P('M-32 -6 C-34 -32 34 -32 32 -6 C34 16 20 34 0 34 C-20 34 -34 16 -32 -6 Z');
      K.part(head, '#FFFBF2', { box: [-34, -32, 34, 34] });
      K.eye(-14, -10, 9, { lash: -1, look: o.look * 0.6, blink: o.blink, wide: o.open });
      K.eye(14, -10, 9, { lash: 1, look: o.look * 0.6, blink: o.blink, wide: o.open });
      both((s) => K.part(E(s * 4.5, 22 + o.open * 6, 5, 7), '#FF4D4F', { flat: true, lw: 2.2 }));
      K.beak(0, 9, 20, 18, o.open, '#FFA41B');
      K.blush(-23, 8, 6.5); K.blush(23, 8, 6.5);
    },
    paws(K, o) { wings(K, '#F3EADB', o.wave); },
  },
  // Петушок: анфас, золотой воротник, гребень-корона, двойная бородка.
  rooster: {
    body(K) { roosterBody(K); },
    back(K, o) {
      const n = 13, q = new Path2D();
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * (-0.1 + (i / n) * 1.2);
        const r = i % 2 ? 32 : 44;
        const x = Math.cos(a) * r * 1.1, y = Math.sin(a) * r * 0.75 + 8;
        i ? q.lineTo(x, y) : q.moveTo(x, y);
      }
      q.closePath();
      K.part(q, '#F7B32B', { box: [-48, -4, 48, 42] });
      K.part(P(`M-22 -24 C-30 -38 -20 -46 -14 -38 C-16 -54 -2 -60 2 -46 C6 -60 20 -56 18 -42 C26 -50 34 -38 24 -26 C${10} -${23 + o.open * 3} -10 -22 -22 -24 Z`), '#F03E3E', { box: [-30, -60, 34, -22] });
    },
    head(K, o) {
      const head = P('M-28 -8 C-28 -32 28 -32 28 -8 C30 14 18 30 0 30 C-18 30 -30 14 -28 -8 Z');
      K.part(head, '#F08C3A', { box: [-30, -32, 30, 30] });
      K.eye(-12, -10, 8.5, { lid: 0.3, look: o.look * 0.6, brow: 3, browTilt: 2, blink: o.blink, wide: o.open, skin: '#F08C3A' });
      K.eye(12, -10, 8.5, { lid: 0.3, look: o.look * 0.6, brow: 3, browTilt: -2, blink: o.blink, wide: o.open, skin: '#F08C3A' });
      both((s) => K.part(E(s * 6, 24 + o.open * 6, 6, 9), '#F03E3E', { flat: true, lw: 2.2 }));
      K.beak(0, 8, 20, 18, o.open, '#FFC078');
      K.blush(-20, 8, 5); K.blush(20, 8, 5);
    },
    paws(K, o) { wings(K, '#B8400D', o.wave); },
  },

  // Утка: жёлтый утёнок-модник с хохолком и галстуком-бабочкой, клюв-улыбка.
  duck: {
    body(K) {
      shoulders(K, '#FFE066');
      const ctx = K.ctx;
      ctx.save(); ctx.translate(0, 40);
      K.part(P('M0 0 L-14 -8 L-14 8 Z'), '#4DABF7', { box: [-14, -8, 0, 8], lw: 2.6 });
      K.part(P('M0 0 L14 -8 L14 8 Z'), '#4DABF7', { box: [0, -8, 14, 8], lw: 2.6 });
      K.part(C(0, 0, 3.5), '#339AF0', { flat: true, lw: 2.2 });
      ctx.restore();
    },
    back() {},
    head(K, o) {
      const ctx = K.ctx;
      const head = P('M-32 -4 C-34 -32 34 -32 32 -4 C34 18 18 32 0 32 C-18 32 -34 18 -32 -4 Z');
      K.part(head, '#FFE066', { box: [-34, -32, 34, 32] });
      K.part(P('M-4 -28 C-10 -42 2 -48 4 -38 C8 -46 18 -42 10 -30 Z'), '#FFE066', { box: [-10, -48, 18, -28], lw: 2.6 });
      K.eye(-13, -10, 9, { look: o.look * 0.6, blink: o.blink, wide: o.open, brow: 1 });
      K.eye(13, -10, 9, { look: o.look * 0.6, blink: o.blink, wide: o.open, brow: 1 });
      const d = o.open * 9;
      if (d > 0.5) { ctx.fillStyle = '#7A2E2E'; ctx.beginPath(); ctx.ellipse(0, 13 + d * 0.5, 11, d * 0.6 + 1, 0, 0, Math.PI * 2); ctx.fill(); }
      K.part(P(`M-13 ${13 + d} C-12 ${20 + d} 12 ${20 + d} 13 ${13 + d} C6 ${15 + d} -6 ${15 + d} -13 ${13 + d} Z`), '#F08C00', { flat: true, lw: 2.4 });
      K.part(P('M-15 9 C-15 2 15 2 15 9 C15 13 8 15 0 15 C-8 15 -15 13 -15 9 Z'), '#FF922B', { box: [-15, 2, 15, 15] });
      K.line(P('M-8 11 Q0 14 8 11'), 1.8, 'rgba(120,50,0,0.45)');
      K.mark(E(-4, 6, 1.6, 1.1), 'rgba(90,40,0,0.6)'); K.mark(E(4, 6, 1.6, 1.1), 'rgba(90,40,0,0.6)');
      K.blush(-22, 8, 6.5); K.blush(22, 8, 6.5);
    },
    paws(K, o) { wings(K, '#F5C518', o.wave); },
  },

  // Гусь: белый, вполоборота, длинная шея, шишка на клюве, шарф.
  goose: {
    body(K) { gooseBody(K); },
    back() {},
    head(K, o) {
      const ctx = K.ctx;
      ctx.save(); ctx.translate(-2, -8);
      birdQ(K, o, { fill: '#FFFFFF', beak: '#FF922B', goose: true, grumpy: true });
      ctx.restore();
    },
    paws(K, o) { wings(K, '#EDEDED', o.wave); },
  },

  // Медвежонок-сладкоежка: круглые уши, светлая мордочка, бочонок мёда в лапах.
  bear: {
    body(K) { shoulders(K, '#9C6B45', () => K.mark(E(0, 66, 20, 24), '#C9A27A')); },
    back(K, o) {
      both((s) => {
        const ctx = K.ctx;
        ctx.save(); ctx.translate(s * 28, -28); ctx.rotate(s * (o.ear * 0.15 - o.open * 0.15));
        K.part(C(0, 0, 13), '#9C6B45', { box: [-13, -13, 13, 13] });
        K.mark(C(s * 1, 1, 7.5), '#E3B88A');
        ctx.restore();
      });
    },
    head(K, o) {
      const head = P('M-36 -8 C-36 -36 36 -36 36 -8 C38 14 24 32 0 33 C-24 32 -38 14 -36 -8 Z');
      K.part(head, '#9C6B45', { box: [-38, -36, 38, 33] });
      K.line(P('M-4 -32 C-6 -40 2 -42 3 -36'), 2.6);
      K.eye(-14, -9, 8.5, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#9C6B45', brow: 1.5 });
      K.eye(14, -9, 8.5, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#9C6B45', brow: 1.5 });
      K.part(E(0, 15, 18, 13), '#E3B88A', { box: [-18, 2, 18, 28] });
      K.part(P('M-7 7 C-7 3 7 3 7 7 C7 11 3 13 0 13 C-3 13 -7 11 -7 7 Z'), '#2B1D17', { flat: true, lw: 2 });
      K.ctx.fillStyle = 'rgba(255,255,255,0.6)'; K.ctx.beginPath(); K.ctx.ellipse(-2.5, 5.5, 2.4, 1.3, -0.3, 0, Math.PI * 2); K.ctx.fill();
      K.mouth(0, 20, 14, o.open, { closed: P('M0 13 L0 17 M-7 18 Q-3.5 22 0 18 Q3.5 22 7 18'), h: 11 });
      K.blush(-25, 8, 6); K.blush(25, 10, 5);
    },
    paws(K, o) {
      const ctx = K.ctx;
      ctx.save(); ctx.translate(0, 38 - (o.wave || 0) * 4);
      const pot = P('M-13 -6 C-15 4 -13 12 -8 14 L8 14 C13 12 15 4 13 -6 Z');
      K.part(pot, '#E9A23B', { box: [-15, -6, 15, 14] });
      K.part(P('M-15 -10 L15 -10 L15 -4 L-15 -4 Z'), '#B7791F', { flat: true, lw: 2.4 });
      K.part(P('M-13 -10 C-13 -16 -6 -18 -2 -14 C2 -18 10 -16 12 -10 Z'), '#FFC93C', { flat: true, lw: 2.2 });
      K.line(P('M-6 2 L6 2'), 2.2, 'rgba(90,50,10,0.5)');
      ctx.restore();
      pawsRound(K, '#9C6B45', o.wave, true);
    },
  },

  // Лиса-хитрюля: хитрый прищур, белые пушистые щёки, чёрные кончики ушей, хвост выглядывает сбоку.
  fox: {
    body(K) {
      shoulders(K, '#F07C2E', () => K.mark(P('M-14 36 C-12 52 -6 62 0 66 C6 62 12 52 14 36 Z'), '#FFF4E6'));
    },
    back(K, o) {
      const ctx = K.ctx;
      // хвост с белым кончиком
      ctx.save(); ctx.translate(30, 40); ctx.rotate(-0.2 + Math.sin(o.ear * 2) * 0.08);
      const tail = P('M0 0 C14 -10 24 -34 18 -54 C14 -64 4 -62 6 -50 C8 -34 -4 -18 -12 -6 Z');
      K.part(tail, '#F07C2E', { box: [-12, -64, 24, 0] });
      K.clip(tail, () => K.mark(E(12, -56, 10, 9), '#FFFFFF'));
      ctx.lineWidth = 3.2; ctx.strokeStyle = INK; ctx.stroke(tail);
      ctx.restore();
      both((s) => {
        ctx.save(); ctx.translate(s * 22, -30); ctx.rotate(s * (0.22 + o.ear * 0.2 - o.open * 0.15));
        const ear = P('M-11 6 L0 -26 L11 6 Z');
        K.part(ear, '#F07C2E', { box: [-11, -26, 11, 6] });
        K.clip(ear, () => K.mark(P('M-6 -12 L0 -27 L6 -12 Z'), '#2B1D17'));
        K.mark(P('M-5 3 L0 -12 L5 3 Z'), '#FFD8C2');
        ctx.lineWidth = 3.2; ctx.strokeStyle = INK; ctx.stroke(ear);
        ctx.restore();
      });
    },
    head(K, o) {
      // узкая острая мордочка: широкий лоб, к носику сужается
      const head = P('M-30 -20 C-24 -36 24 -36 30 -20 C34 -10 26 2 17 10 C10 17 5 26 0 29 C-5 26 -10 17 -17 10 C-26 2 -34 -10 -30 -20 Z');
      K.part(head, '#F07C2E', { box: [-34, -36, 34, 29] });
      K.clip(head, () => {
        // белая «маска» снизу и щёчки
        K.mark(P('M-34 -4 C-22 0 -10 6 0 8 C10 6 22 0 34 -4 L34 40 L-34 40 Z'), '#FFF4E6');
      });
      K.ctx.lineWidth = 3.2; K.ctx.strokeStyle = INK; K.ctx.stroke(head);
      K.eye(-12, -11, 8, { lid: 0.24, look: 0.4 + o.look * 0.4, blink: o.blink, wide: o.open, skin: '#F07C2E', iris: '#C77D18', brow: 1, browTilt: 1 });
      K.eye(12, -11, 8, { lid: 0.24, look: 0.4 + o.look * 0.4, blink: o.blink, wide: o.open, skin: '#F07C2E', iris: '#C77D18', brow: 3, browTilt: 1.5 });
      K.part(P('M-5 19 C-5 15 5 15 5 19 C5 22 2 24 0 24 C-2 24 -5 22 -5 19 Z'), '#2B1D17', { flat: true, lw: 2 });
      K.ctx.fillStyle = 'rgba(255,255,255,0.6)'; K.ctx.beginPath(); K.ctx.ellipse(-1.8, 17.5, 1.8, 1, -0.3, 0, Math.PI * 2); K.ctx.fill();
      K.mouth(1, 27, 10, o.open, { closed: P('M0 24 L0 26 M-4 27 Q0 30 5 26'), h: 8, smile: 3 });
      K.blush(-17, 2, 4.5); K.blush(17, 2, 4.5);
    },
    paws(K, o) { pawsRound(K, '#F07C2E', o.wave, true, '#2B1D17'); },
  },

  // Белочка с орешком: кисточки на ушах, пушистый хвост за спиной, щёчки, зубки.
  squirrel: {
    body(K) { shoulders(K, '#D9813B', () => K.mark(E(0, 66, 18, 24), '#FFE8CC')); },
    back(K, o) {
      const ctx = K.ctx;
      // пушистый хвост-завиток за головой
      ctx.save(); ctx.translate(-22, 40); ctx.rotate(Math.sin(o.ear * 2) * 0.06);
      const tail = P('M0 0 C-26 -10 -34 -46 -18 -70 C-6 -86 20 -84 26 -66 C30 -54 20 -46 12 -52 C6 -58 -8 -50 -6 -36 C-4 -20 4 -8 8 0 Z');
      K.part(tail, '#E08E45', { box: [-34, -86, 30, 0] });
      K.ctx.strokeStyle = 'rgba(140,70,20,0.35)'; K.ctx.lineWidth = 2;
      for (const [x, y] of [[-20, -40], [-16, -60], [4, -74]]) { K.ctx.beginPath(); K.ctx.arc(x, y, 7, 0.4, 2.4); K.ctx.stroke(); }
      ctx.restore();
      both((s) => {
        ctx.save(); ctx.translate(s * 20, -30); ctx.rotate(s * (0.15 + o.ear * 0.2 - o.open * 0.15));
        K.part(P('M-8 6 C-10 -8 -4 -18 0 -20 C4 -18 10 -8 8 6 Z'), '#D9813B', { box: [-10, -20, 10, 6] });
        K.mark(P('M-4 3 C-5 -5 -2 -11 0 -12 C2 -11 5 -5 4 3 Z'), '#FFC9A8');
        K.part(P('M-2 -18 C-6 -28 0 -32 2 -26 C4 -32 10 -28 4 -18 Z'), '#8B4A1C', { flat: true, lw: 2.2 });
        ctx.restore();
      });
    },
    head(K, o) {
      const head = P('M-28 -12 C-28 -34 28 -34 28 -12 C30 8 18 28 0 29 C-18 28 -30 8 -28 -12 Z');
      K.part(head, '#D9813B', { box: [-30, -34, 30, 29] });
      K.part(E(-11, 13, 10, 8.5), '#FFE8CC', { box: [-21, 4, -1, 22], lw: 2.4 });
      K.part(E(11, 13, 10, 8.5), '#FFE8CC', { box: [1, 4, 21, 22], lw: 2.4 });
      K.eye(-11, -9, 9, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#D9813B', lash: -1 });
      K.eye(11, -9, 9, { look: o.look * 0.6, blink: o.blink, wide: o.open, skin: '#D9813B', lash: 1 });
      K.part(P('M-4 6 L4 6 C4 9 2 10 0 10 C-2 10 -4 9 -4 6 Z'), '#5C2E14', { flat: true, lw: 2 });
      if (o.open < 0.08) {
        K.part(P('M-4 16 L4 16 L4 23 Q0 25 -4 23 Z'), '#FFFFFF', { flat: true, lw: 2 });
        K.line(P('M0 16 L0 23'), 1.4);
        K.line(P('M0 10 L0 14 M-6 14 Q-3 17 0 14 Q3 17 6 14'), 2.4);
      } else K.mouth(0, 14, 13, o.open, { teeth: 8, h: 10 });
      K.blush(-20, 4, 5); K.blush(20, 4, 5);
    },
    paws(K, o) {
      const ctx = K.ctx;
      ctx.save(); ctx.translate(0, 40 - (o.wave || 0) * 4);
      K.part(P('M-9 -2 C-9 8 -4 13 0 13 C4 13 9 8 9 -2 Z'), '#C08040', { box: [-9, -2, 9, 13] });
      K.part(P('M-11 -2 C-11 -10 11 -10 11 -2 Z'), '#7A4A24', { flat: true, lw: 2.4 });
      K.line(P('M0 -9 L1 -13'), 2.4, '#5C3A1E');
      ctx.restore();
      pawsRound(K, '#D9813B', o.wave, false);
    },
  },
};

// ---------- Публичное API ----------

/** Лапки, держащиеся за край (вызывается в «координатах мордочки», 100 единиц). */
export function drawPaws(ctx, kind, wave = 0) {
  const ch = CHARS[kind];
  if (!ch) return;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ch.paws(kit(ctx), { wave });
}

/**
 * Рисует зверя. o: { blink, open (голос 0..1), ear (-1..1), look (-1..1), paws, wave, body (плечики, по умолчанию да), wink }
 */
export function drawAnimal(ctx, kind, x, y, size, o = {}) {
  const ch = CHARS[kind];
  if (!ch) return;
  const opts = { blink: false, open: 0, ear: 0, look: 0, wave: 0, wink: false, ...o };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const K = kit(ctx);
  if (o.body !== false) ch.body(K, opts);
  // голос: голова вытягивается вверх от подбородка
  const op = opts.open;
  ctx.save();
  ctx.translate(0, 30);
  ctx.scale(1 - op * 0.035, 1 + op * 0.07);
  ctx.translate(0, -30);
  ch.back(K, opts);
  ch.head(K, opts);
  ctx.restore();
  if (o.paws !== false) ch.paws(K, opts);
  ctx.restore();
}
