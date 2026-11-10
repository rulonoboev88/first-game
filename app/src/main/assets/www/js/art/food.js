// Угощения для зверят — тот же стиль «контур с объёмом», что у зверей.
// Каждое рисуется в коробке ≈ 80×80 единиц с центром в (0,0); size — ширина в пикселях на 100 единиц.
import { kit, INK, shadeTone as tone } from './animals.js';

export const FOODS = ['carrot', 'apple', 'bone', 'fish', 'cheese', 'honey', 'acorn', 'cabbage', 'hay', 'corn', 'bread', 'milk', 'fly', 'melon',
  'pumpkin', 'potato', 'oats', 'cucumber', 'pear', 'sausage', 'drumstick', 'petfood', 'mosquito', 'dragonfly', 'beetle', 'seeds',
  'mushroom', 'strawberry', 'raspberry', 'egg', 'hazelnut', 'pinecone', 'peas', 'lettuce'];

const P = (d) => new Path2D(d);
const E = (x, y, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); return p; };
const C = (x, y, r) => E(x, y, r, r);

/** Составная фигура (несколько подконтуров): общий контур снаружи, внутри без линий. */
function union(K, p, fill, box) {
  const ctx = K.ctx;
  ctx.lineWidth = 6.4; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(p);
  K.part(p, fill, { box, lw: 0 });
}
function shine(ctx, x, y, rx, ry, rot = -0.5, a = 0.75) {
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
}

const ART = {
  carrot(K) {
    const ctx = K.ctx;
    ctx.rotate(0.45);
    for (const [a, l] of [[-0.5, 26], [0, 30], [0.5, 25]]) {
      ctx.save(); ctx.translate(0, -24); ctx.rotate(a);
      K.part(P(`M0 0 C-9 -${l * 0.4} -6 -${l * 0.9} 0 -${l} C6 -${l * 0.9} 9 -${l * 0.4} 0 0 Z`), '#5DBB4C', { box: [-8, -l, 8, 0], lw: 2.6 });
      ctx.restore();
    }
    const b = P('M-15 -24 Q-17 8 0 40 Q17 8 15 -24 Q0 -30 -15 -24 Z');
    K.part(b, '#FF8A2A', { box: [-15, -28, 15, 40] });
    K.clip(b, () => K.line(P('M-14 -8 L-5 -6 M14 4 L5 6 M-10 16 L-3 18 M8 -16 L13 -17'), 2.2, 'rgba(150,60,0,0.45)'));
    shine(ctx, -7, -12, 3, 9, 0.05, 0.55);
  },
  apple(K) {
    const ctx = K.ctx;
    K.line(P('M0 -22 Q1 -32 6 -38'), 4.2);
    K.line(P('M0 -22 Q1 -32 6 -38'), 2, '#8A5A32');
    K.part(P('M8 -30 C14 -42 30 -42 34 -36 C28 -28 16 -26 8 -30 Z'), '#5DBB4C', { box: [8, -42, 34, -26], lw: 2.6 });
    K.part(P('M0 -22 C-10 -32 -38 -28 -38 -2 C-38 24 -18 38 0 32 C18 38 38 24 38 -2 C38 -28 10 -32 0 -22 Z'), '#EF4B3F', { box: [-38, -30, 38, 36] });
    shine(ctx, -20, -10, 5, 10, 0.4);
    shine(ctx, -14, -22, 2.5, 2.5, 0, 0.8);
  },
  bone(K) {
    const ctx = K.ctx;
    ctx.rotate(-0.35);
    const p = new Path2D();
    p.roundRect(-26, -8, 52, 16, 4);
    for (const [x, y] of [[-28, -9], [-28, 9], [28, -9], [28, 9]]) { p.moveTo(x + 11, y); p.arc(x, y, 11, 0, Math.PI * 2); }
    union(K, p, '#FFF3DC', [-39, -20, 39, 20]);
    shine(ctx, -10, -3, 10, 2, 0, 0.7);
  },
  fish(K) {
    const ctx = K.ctx;
    const p = new Path2D();
    p.ellipse(-4, 0, 30, 19, 0, 0, Math.PI * 2);
    p.moveTo(22, 0); p.lineTo(40, -16); p.quadraticCurveTo(34, 0, 40, 16); p.closePath();
    union(K, p, '#5CB8F0', [-34, -19, 40, 19]);
    K.part(P('M-8 -17 Q2 -28 12 -14 Z'), '#3E95D6', { flat: true, lw: 2.4 });
    K.clip(E(-4, 0, 30, 19), () => {
      K.mark(E(-4, 14, 30, 9), '#BFE6FF');
      K.line(P('M4 -6 Q8 0 4 6 M11 -6 Q15 0 11 6'), 2, 'rgba(30,90,150,0.45)');
    });
    K.line(P('M-12 -12 Q-6 0 -12 12'), 2.4);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-22, -4, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#1C120D'; ctx.beginPath(); ctx.arc(-23, -3.5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-24, -5, 1.2, 0, Math.PI * 2); ctx.fill();
    K.line(P('M-31 5 Q-28 8 -25 6'), 2.2);
    shine(ctx, -10, -9, 8, 2.5, -0.15, 0.6);
  },
  cheese(K) {
    const ctx = K.ctx;
    const front = P('M-38 -2 L36 -12 L36 22 Q36 26 32 26 L-34 26 Q-38 26 -38 22 Z');
    const top = P('M-38 -2 L24 -30 Q30 -32 33 -26 L36 -12 Z');
    K.part(top, '#FFE27A', { box: [-38, -32, 36, -2] });
    K.part(front, '#FFC93C', { box: [-38, -12, 36, 26] });
    K.clip(front, () => {
      for (const [x, y, r] of [[-22, 10, 6], [4, 4, 4.5], [20, 14, 7], [-6, 20, 3.5], [30, -2, 3]]) {
        K.mark(C(x, y, r), '#E8A417'); K.mark(C(x - 1, y - 1.2, r * 0.82), '#D99514');
      }
    });
    K.clip(top, () => { K.mark(E(4, -16, 4, 2.2, -0.4), '#F2C43E'); K.mark(E(-14, -8, 3, 1.6, -0.4), '#F2C43E'); });
    shine(ctx, -18, 0, 8, 1.6, -0.14, 0.6);
  },
  honey(K) {
    const ctx = K.ctx;
    const pot = P('M-26 -12 C-42 -2 -40 34 0 36 C40 34 42 -2 26 -12 Z');
    K.part(pot, '#C9772E', { box: [-40, -12, 40, 36] });
    K.clip(pot, () => {
      K.mark(P('M-40 2 Q0 10 40 2 L40 8 Q0 16 -40 8 Z'), '#A85E22');
      K.mark(E(0, 20, 13, 10), '#F7E2B5');
    });
    K.line(E(0, 20, 13, 10), 2.4);
    // соты-сердечко на ярлыке
    K.part(P('M0 26 C-10 18 -8 12 -3.5 12 C-1.5 12 0 14 0 15 C0 14 1.5 12 3.5 12 C8 12 10 18 0 26 Z'), '#FFB627', { flat: true, lw: 1.8 });
    K.part(P('M-30 -24 Q-30 -28 -26 -28 L26 -28 Q30 -28 30 -24 L30 -14 Q30 -10 26 -10 L-26 -10 Q-30 -10 -30 -14 Z'), '#D98838', { box: [-30, -28, 30, -10] });
    // мёд стекает через край
    K.part(P('M-24 -30 Q-24 -40 0 -40 Q24 -40 24 -30 Q24 -26 20 -24 Q18 -10 15 -10 Q12 -10 12 -22 Q8 -24 4 -22 Q3 -4 -1 -4 Q-5 -4 -5 -22 Q-12 -24 -16 -22 Q-17 -14 -20 -14 Q-23 -14 -23 -24 Z'), '#FFB627', { box: [-24, -40, 24, -4], lw: 2.6 });
    shine(ctx, -10, -34, 7, 2, -0.1, 0.8);
    shine(ctx, -30, 8, 3, 9, 0.3, 0.35);
    // ложка-палочка
    ctx.save(); ctx.translate(14, -38); ctx.rotate(0.5);
    K.part(P('M-2.5 -26 L2.5 -26 L2.5 0 L-2.5 0 Z'), '#B7834F', { flat: true, lw: 2.2 });
    ctx.restore();
  },
  acorn(K) {
    const ctx = K.ctx;
    ctx.rotate(0.2);
    const nut = P('M-21 -6 C-23 18 -6 36 0 38 C6 36 23 18 21 -6 Z');
    K.part(nut, '#E0A458', { box: [-22, -6, 22, 38] });
    shine(ctx, -10, 6, 3.5, 10, 0.15, 0.55);
    K.line(P('M0 -26 Q2 -34 7 -36'), 4.6);
    K.line(P('M0 -26 Q2 -34 7 -36'), 2.4, '#7A4E2A');
    const cap = P('M-27 -4 Q-28 -26 0 -28 Q28 -26 27 -4 Q0 2 -27 -4 Z');
    K.part(cap, '#8A5A32', { box: [-28, -28, 28, 0] });
    K.clip(cap, () => {
      const g = new Path2D();
      for (let i = -4; i <= 4; i++) { g.moveTo(i * 8 - 12, -30); g.lineTo(i * 8 + 12, 2); g.moveTo(i * 8 + 12, -30); g.lineTo(i * 8 - 12, 2); }
      K.line(g, 1.6, 'rgba(60,30,10,0.4)');
    });
  },
  cabbage(K) {
    const ctx = K.ctx;
    K.part(C(0, 2, 36), '#7CC35A', { box: [-36, -34, 36, 38] });
    for (const s of [-1, 1]) K.part(P(`M${s * 34} 8 C${s * 40} -18 ${s * 22} -36 ${s * 4} -34 C${s * 16} -20 ${s * 18} 4 ${s * 12} 32 C${s * 22} 30 ${s * 32} 22 ${s * 34} 8 Z`), '#93D46E', { box: [-36, -36, 36, 32], lw: 2.8 });
    K.part(P('M-14 -6 C-16 -26 16 -26 14 -6 C12 10 -12 10 -14 -6 Z'), '#C6EBA0', { box: [-16, -24, 16, 8], lw: 2.6 });
    K.line(P('M0 34 L0 8 M0 22 L-10 14 M0 22 L10 14 M-24 -4 L-14 4 M24 -4 L14 4'), 2, 'rgba(40,110,30,0.5)');
    shine(ctx, -24, -14, 3, 7, 0.5, 0.55);
  },
  hay(K) {
    const ctx = K.ctx;
    // пучок травки с клевером
    const blades = [[-26, -30, -0.5], [-16, -38, -0.3], [-6, -42, -0.1], [4, -42, 0.1], [14, -38, 0.3], [24, -32, 0.5], [-20, -24, -0.4], [20, -26, 0.4]];
    for (const [x, y, a] of blades) {
      const p = P(`M${x * 0.15 - 3} 20 Q${x * 0.6 - 5} ${y * 0.4} ${x} ${y} Q${x * 0.6 + 5} ${y * 0.4} ${x * 0.15 + 3} 20 Z`);
      K.part(p, a < 0 ? '#6CC04A' : '#82CF5A', { flat: true, lw: 2.4 });
    }
    for (const [x, y] of [[-16, -30], [14, -34]]) {
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        K.part(C(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4.2), '#F48FB1', { flat: true, lw: 1.8 });
      }
      K.mark(C(x, y, 4.5), '#F06292');
    }
    const band = P('M-12 6 L12 6 L13 20 Q0 24 -13 20 Z');
    K.part(P('M-9 14 L-14 36 L-2 34 L0 18 Z M9 14 L14 36 L2 34 L0 18 Z'), '#6CC04A', { flat: true, lw: 2.4 });
    K.part(band, '#E8553D', { box: [-13, 6, 13, 22], lw: 2.6 });
    K.part(P('M0 10 C-14 0 -18 14 -6 14 Z M0 10 C14 0 18 14 6 14 Z'), '#F06A50', { flat: true, lw: 2.2 });
  },
  corn(K) {
    const ctx = K.ctx;
    ctx.rotate(-0.4);
    const cob = E(0, -2, 16, 34);
    K.part(cob, '#FFD43B', { box: [-16, -36, 16, 32] });
    K.clip(cob, () => {
      for (let r = -40; r < 36; r += 7) for (let c = -18; c < 18; c += 7.5) {
        const ox = (Math.round(r / 7) % 2) * 3.7;
        K.mark(E(c + ox, r, 3.2, 2.9), '#F2B807');
        K.mark(E(c + ox - 0.8, r - 0.8, 2.2, 1.9), '#FFE680');
      }
    });
    K.line(cob, 3.2);
    for (const s of [-1, 1]) K.part(P(`M0 34 C${s * 6} 20 ${s * 22} 6 ${s * 22} -20 C${s * 28} 2 ${s * 20} 26 ${s * 4} 40 Z`), '#7CC35A', { box: [-24, -20, 24, 40], lw: 2.6 });
    K.line(P('M-2 -36 Q-6 -44 -2 -48 M2 -36 Q4 -44 8 -46'), 2.2, '#B7834F');
  },
  bread(K) {
    const ctx = K.ctx;
    ctx.rotate(-0.15);
    const loaf = P('M-40 8 C-42 -14 -20 -24 0 -24 C20 -24 42 -14 40 8 C40 20 30 22 0 22 C-30 22 -40 20 -40 8 Z');
    K.part(loaf, '#E3A456', { box: [-40, -24, 40, 22] });
    K.clip(loaf, () => { K.mark(P('M-44 10 Q0 18 44 10 L44 30 L-44 30 Z'), '#C9873C'); });
    K.line(loaf, 3.2);
    for (const x of [-20, -2, 16]) {
      K.part(P(`M${x - 6} -2 Q${x + 2} -16 ${x + 10} -14 Q${x + 4} -4 ${x - 6} -2 Z`), '#FFE0A8', { flat: true, lw: 2.2 });
    }
    shine(ctx, -24, -12, 7, 2.2, -0.4, 0.55);
  },
  milk(K) {
    const ctx = K.ctx;
    const b = P('M-12 -22 L-12 -28 L12 -28 L12 -22 Q24 -14 24 0 L24 30 Q24 38 16 38 L-16 38 Q-24 38 -24 30 L-24 0 Q-24 -14 -12 -22 Z');
    K.part(b, '#F4FAFF', { box: [-24, -28, 24, 38] });
    K.clip(b, () => K.mark(P('M-30 4 Q0 10 30 4 L30 40 L-30 40 Z'), '#FFFFFF'));
    K.line(b, 3.2);
    K.part(P('M-14 -40 Q-14 -44 -10 -44 L10 -44 Q14 -44 14 -40 L14 -30 Q14 -27 10 -27 L-10 -27 Q-14 -27 -14 -30 Z'), '#4DA3FF', { box: [-14, -44, 14, -27] });
    K.part(P('M-18 8 L18 8 L18 28 L-18 28 Z'), '#8CCBFF', { flat: true, lw: 2.4 });
    K.part(P('M0 12 C-6 18 -6 24 0 24 C6 24 6 18 0 12 Z'), '#FFFFFF', { flat: true, lw: 1.8 });
    shine(ctx, -16, -4, 3, 10, 0.25, 0.8);
  },
  fly(K) {
    const ctx = K.ctx;
    ctx.globalAlpha = 0.8;
    for (const s of [-1, 1]) K.part(E(s * 16, -14, 15, 9, s * -0.6), '#D4F0FF', { flat: true, lw: 2.4 });
    ctx.globalAlpha = 1;
    K.line(P('M-6 -10 Q-14 -12 -20 -14 M6 -10 Q14 -12 20 -14'), 1.5, 'rgba(60,110,160,0.5)');
    K.line(P('M-8 14 L-14 22 M0 16 L0 24 M8 14 L14 22'), 2.4);
    K.part(E(0, 4, 16, 14), '#58688A', { box: [-16, -10, 16, 18] });
    K.clip(E(0, 4, 16, 14), () => K.line(P('M-16 6 Q0 10 16 6 M-14 12 Q0 16 14 12'), 2, 'rgba(255,255,255,0.35)'));
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 7, -7, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#1C120D'; ctx.beginPath(); ctx.arc(s * 7 + 1, -6, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 7, -7.5, 1.3, 0, Math.PI * 2); ctx.fill();
    }
    K.line(P('M-4 6 Q0 9 4 6'), 2.2);
    ctx.fillStyle = 'rgba(255,128,128,0.45)';
    ctx.beginPath(); ctx.ellipse(-10, 4, 3.5, 2.2, 0, 0, Math.PI * 2); ctx.ellipse(10, 4, 3.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  },
  melon(K) {
    const ctx = K.ctx;
    const rind = P('M-40 -14 Q0 50 40 -14 Z');
    K.part(rind, '#4CAF50', { box: [-40, -14, 40, 34] });
    const flesh = P('M-34 -14 Q0 40 34 -14 Z');
    K.part(P('M-36 -14 Q0 44 36 -14 Z'), '#E9F7D8', { flat: true, lw: 0 });
    K.part(flesh, '#FF5B6E', { box: [-34, -14, 34, 26], lw: 2.6 });
    K.line(P('M-40 -14 L40 -14'), 3.2);
    for (const [x, y] of [[-16, -4], [0, 2], [16, -4], [-6, 12], [8, 12], [-24, -10], [24, -10]]) {
      ctx.fillStyle = '#3B2618'; ctx.beginPath(); ctx.ellipse(x, y, 2.2, 3.4, x * 0.02, 0, Math.PI * 2); ctx.fill();
    }
    shine(ctx, -18, -10, 8, 2, 0.1, 0.5);
  },

  pumpkin(K) {
    const ctx = K.ctx;
    K.line(P('M2 -26 Q4 -38 12 -40'), 6);
    K.line(P('M2 -26 Q4 -38 12 -40'), 3, '#6E8B2E');
    const p = new Path2D();
    for (const [x, rx] of [[-20, 18], [20, 18], [-8, 17], [8, 17], [0, 15]]) { p.moveTo(x + rx, 4); p.ellipse(x, 4, rx, 30, 0, 0, Math.PI * 2); }
    union(K, p, '#FF9A2E', [-38, -26, 38, 34]);
    K.line(P('M-8 -24 Q-14 4 -8 32 M8 -24 Q14 4 8 32 M-22 -22 Q-34 4 -22 30 M22 -22 Q34 4 22 30'), 2.4, 'rgba(160,70,0,0.55)');
    K.part(P('M8 -32 C20 -44 34 -38 32 -30 C24 -26 14 -26 8 -32 Z'), '#5DBB4C', { flat: true, lw: 2.4 });
    shine(ctx, -24, -6, 3, 9, 0.2, 0.55);
  },
  potato(K) {
    const ctx = K.ctx;
    const p = P('M-36 2 C-38 -18 -18 -26 2 -24 C24 -22 38 -12 37 4 C36 20 20 28 -2 27 C-24 26 -35 18 -36 2 Z');
    K.part(p, '#D9A866', { box: [-38, -26, 38, 28] });
    for (const [x, y] of [[-18, -8], [10, -12], [20, 10], [-6, 12], [-26, 10]]) {
      K.mark(E(x, y, 2.6, 1.8, 0.4), '#A9783E');
    }
    shine(ctx, -16, -14, 9, 3, -0.3, 0.55);
  },
  oats(K) {
    const ctx = K.ctx;
    // два золотых колоска крест-накрест — как значок 🌾: чистые парные зёрна ёлочкой и усики
    for (const a of [-0.38, 0.38]) {
      // поворот вокруг узелка — колоски расходятся веером
      ctx.save(); ctx.translate(0, 22); ctx.rotate(a); ctx.translate(0, -22);
      K.line(P('M0 40 L0 -6'), 5);
      K.line(P('M0 40 L0 -6'), 2.6, '#D8B45A');
      // усики
      K.line(P('M0 -34 L-3 -46 M0 -34 L3 -46 M-6 -26 L-14 -38 M6 -26 L14 -38'), 1.8, '#B8933F');
      // верхнее зерно и пары ниже
      const grain = (x, y, rot) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        K.part(P('M0 -9 C6 -6 6 6 0 9 C-6 6 -6 -6 0 -9 Z'), '#F2C94C', { box: [-6, -9, 6, 9], lw: 2.2 });
        ctx.restore();
      };
      grain(0, -30, 0);
      for (let i = 0; i < 4; i++) {
        const y = -22 + i * 8;
        grain(-6, y, -0.5);
        grain(6, y, 0.5);
      }
      ctx.restore();
    }
    // ленточка
    K.part(P('M-10 18 L10 18 L11 27 Q0 30 -11 27 Z'), '#E8553D', { box: [-11, 18, 11, 29], lw: 2.4 });
    K.part(P('M0 22 C-12 12 -18 26 -6 26 Z M0 22 C12 12 18 26 6 26 Z'), '#F06A50', { flat: true, lw: 2.2 });
  },
  cucumber(K) {
    const ctx = K.ctx;
    ctx.rotate(-0.5);
    const c = P('M-38 -6 C-38 -16 -26 -16 0 -15 C26 -14 38 -14 38 -2 C38 10 26 13 0 13 C-26 13 -38 6 -38 -6 Z');
    K.part(c, '#4FAF45', { box: [-38, -16, 38, 13] });
    K.clip(c, () => {
      for (const [x, y] of [[-24, -6], [-10, 2], [4, -6], [18, 2], [28, -6], [-30, 4], [10, -10]]) {
        K.mark(C(x, y, 1.8), '#C8EFA4');
      }
    });
    K.part(P('M36 -4 Q44 -6 46 -2 Q44 2 36 2 Z'), '#7A5A2E', { flat: true, lw: 2 });
    shine(ctx, -10, -9, 14, 2, 0, 0.5);
  },
  pear(K) {
    const ctx = K.ctx;
    K.line(P('M0 -30 Q2 -40 8 -42'), 4.2);
    K.line(P('M0 -30 Q2 -40 8 -42'), 2, '#8A5A32');
    K.part(P('M6 -34 C12 -44 26 -44 28 -38 C22 -32 12 -30 6 -34 Z'), '#5DBB4C', { box: [6, -44, 28, -30], lw: 2.4 });
    const p = P('M0 -30 C-10 -30 -12 -16 -14 -8 C-30 0 -32 34 0 36 C32 34 30 0 14 -8 C12 -16 10 -30 0 -30 Z');
    K.part(p, '#C9DA4E', { box: [-30, -30, 30, 36] });
    K.clip(p, () => { K.mark(E(14, 14, 10, 12), 'rgba(240,140,60,0.3)'); });
    shine(ctx, -14, 6, 4, 10, 0.3, 0.6);
  },
  sausage(K) {
    const ctx = K.ctx;
    ctx.rotate(-0.25);
    const p = P('M-34 -2 C-38 -14 -26 -18 -14 -14 Q0 -10 14 -14 C26 -18 38 -14 34 -2 C30 10 18 12 0 10 C-18 12 -30 10 -34 -2 Z');
    K.part(p, '#E0735A', { box: [-38, -18, 38, 12] });
    for (const x of [-38, 38]) K.line(P(`M${x * 0.92} -6 L${x * 1.08} -9 M${x * 0.92} -6 L${x * 1.08} -2`), 2.6);
    K.line(P('M-18 -6 Q-14 -2 -18 2 M0 -4 Q4 0 0 4 M18 -6 Q22 -2 18 2'), 2, 'rgba(120,30,20,0.45)');
    shine(ctx, -14, -10, 12, 2, 0, 0.6);
  },
  drumstick(K) {
    const ctx = K.ctx;
    ctx.rotate(0.6);
    const bone = new Path2D();
    bone.roundRect(-5, 8, 10, 26, 3);
    bone.moveTo(4, 36); bone.arc(-4, 36, 6, 0, Math.PI * 2); bone.moveTo(12, 36); bone.arc(5, 36, 6, 0, Math.PI * 2);
    union(K, bone, '#FFF3DC', [-10, 8, 10, 42]);
    const meat = P('M0 -36 C22 -36 28 -12 18 2 C12 10 8 12 4 14 L-4 14 C-8 12 -12 10 -18 2 C-28 -12 -22 -36 0 -36 Z');
    K.part(meat, '#C9772E', { box: [-26, -36, 26, 14] });
    K.clip(meat, () => K.mark(E(-6, -22, 10, 6, -0.4), '#E39A4E'));
    shine(ctx, -10, -24, 6, 2.5, -0.5, 0.6);
  },
  petfood(K) {
    const ctx = K.ctx;
    // открытая банка корма: откинутая крышка, внутри кусочки корма, на этикетке — лапка
    K.part(E(18, -30, 20, 7, -0.55), '#DCE3EA', { box: [0, -38, 38, -22], lw: 2.8 });   // крышка, откинута назад
    K.line(E(18, -30, 13, 4, -0.55), 1.8, 'rgba(60,70,90,0.45)');
    const body = P('M-32 -14 L32 -14 L32 26 Q32 34 24 34 L-24 34 Q-32 34 -32 26 Z');
    K.part(body, '#C9D2DC', { box: [-32, -14, 32, 34] });
    const label = P('M-32 -4 L32 -4 L32 26 L-32 26 Z');
    K.part(label, '#4DA3FF', { flat: true, lw: 2.4 });
    K.clip(label, () => K.mark(P('M-32 20 L32 20 L32 26 L-32 26 Z'), '#2F86E0'));
    // большая белая лапка
    K.part(E(0, 13, 8.5, 7), '#FFFFFF', { flat: true, lw: 2 });
    for (const [x, y] of [[-10, 2], [-3.5, -1], [3.5, -1], [10, 2]]) K.part(E(x, y, 3.2, 3.8), '#FFFFFF', { flat: true, lw: 1.8 });
    // открытый верх с кормом
    K.part(E(0, -14, 32, 8), '#9AA6B4', { box: [-32, -22, 32, -6], lw: 3.2 });
    K.clip(E(0, -14, 28, 6.5), () => {
      K.mark(E(0, -14, 28, 6.5), '#8A4E2A');
      for (const [x, y, r] of [[-16, -15, 4.5], [-5, -17, 5], [7, -15, 4.5], [18, -16, 4], [0, -11, 4], [-12, -10, 3.5], [13, -11, 3.5]]) {
        K.mark(C(x, y, r), '#B5683A'); K.mark(C(x - 1, y - 1.2, r * 0.45), '#D08A55');
      }
    });
    K.line(E(0, -14, 28, 6.5), 2);
    shine(ctx, -24, 8, 3, 10, 0, 0.45);
  },
  mosquito(K) {
    const ctx = K.ctx;
    ctx.globalAlpha = 0.8;
    for (const s of [-1, 1]) K.part(E(s * 14, -14, 13, 6, s * -0.5), '#E3F4FF', { flat: true, lw: 2.2 });
    ctx.globalAlpha = 1;
    K.line(P('M-6 6 L-20 22 L-24 30 M0 8 L0 30 M6 6 L20 22 L24 30 M-4 0 L-18 6 M4 0 L18 6'), 2.2);
    K.part(E(0, 4, 6, 12), '#8A7A6A', { box: [-6, -8, 6, 16], lw: 2.4 });
    K.part(C(0, -12, 7), '#8A7A6A', { box: [-7, -19, 7, -5], lw: 2.4 });
    K.line(P('M0 -18 L0 -30'), 2.2);
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 3, -13, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#1C120D'; ctx.beginPath(); ctx.arc(s * 3, -12.5, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  },
  dragonfly(K) {
    const ctx = K.ctx;
    ctx.rotate(-0.3);
    ctx.globalAlpha = 0.85;
    for (const [y, s] of [[-12, -1], [-12, 1], [-2, -1], [-2, 1]]) K.part(E(s * 20, y, 19, 5.5, s * (y < -5 ? -0.15 : 0.15)), '#CFEFFF', { flat: true, lw: 2 });
    ctx.globalAlpha = 1;
    K.part(P('M-3 -6 L3 -6 L2.5 38 Q0 41 -2.5 38 Z'), '#3FB6A8', { box: [-3, -6, 3, 40], lw: 2.4 });
    K.clip(P('M-3 -6 L3 -6 L2.5 38 Q0 41 -2.5 38 Z'), () => K.line(P('M-4 6 L4 6 M-4 14 L4 14 M-4 22 L4 22 M-4 30 L4 30'), 1.4, 'rgba(0,60,60,0.5)'));
    K.part(E(0, -12, 6, 8), '#3FB6A8', { box: [-6, -20, 6, -4], lw: 2.4 });
    for (const s of [-1, 1]) {
      K.part(C(s * 6, -22, 5.5), '#57C9E8', { flat: true, lw: 2.2 });
      ctx.fillStyle = '#1C120D'; ctx.beginPath(); ctx.arc(s * 6.5, -21.5, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 6, -23, 1, 0, Math.PI * 2); ctx.fill();
    }
  },
  beetle(K) {
    const ctx = K.ctx;
    // божья коровка-жучок
    K.line(P('M-20 -8 L-32 -14 M-22 6 L-34 6 M-20 18 L-30 26 M20 -8 L32 -14 M22 6 L34 6 M20 18 L30 26'), 3);
    K.line(P('M-6 -28 Q-10 -36 -16 -38 M6 -28 Q10 -36 16 -38'), 2.4);
    K.part(E(0, -22, 13, 9), '#3B3B48', { box: [-13, -31, 13, -13], lw: 2.8 });
    const shell = E(0, 6, 26, 26);
    K.part(shell, '#EF4B3F', { box: [-26, -20, 26, 32] });
    K.clip(shell, () => { for (const [x, y, r] of [[-12, -4, 5], [12, -4, 5], [-14, 14, 4.5], [14, 14, 4.5], [0, 24, 4]]) K.mark(C(x, y, r), '#2B2B35'); });
    K.line(P('M0 -20 L0 32'), 2.6);
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 5, -24, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1C120D'; ctx.beginPath(); ctx.arc(s * 5, -23.5, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    shine(ctx, -12, -8, 4, 7, 0.6, 0.55);
  },
  seeds(K) {
    const ctx = K.ctx;
    // подсолнух: жёлтые лепестки, в серединке — семечки
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.save(); ctx.rotate(a);
      K.part(P('M0 -22 C7 -28 7 -38 0 -42 C-7 -38 -7 -28 0 -22 Z'), i % 2 ? '#FFC93C' : '#FFD95A', { flat: true, lw: 2.2 });
      ctx.restore();
    }
    const mid = C(0, 0, 24);
    K.part(mid, '#6B4226', { box: [-24, -24, 24, 24] });
    K.clip(mid, () => {
      for (let r = 4; r < 24; r += 6) {
        const n = Math.round((r * Math.PI * 2) / 7);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + r;
          ctx.save(); ctx.translate(Math.cos(a) * r, Math.sin(a) * r); ctx.rotate(a);
          K.mark(E(0, 0, 3.2, 2), '#2E2A33');
          K.mark(E(-0.6, -0.5, 1.4, 0.7), 'rgba(255,255,255,0.45)');
          ctx.restore();
        }
      }
    });
    K.line(mid, 3);
    shine(ctx, -10, -12, 5, 2.5, -0.6, 0.35);
  },
  mushroom(K) {
    const ctx = K.ctx;
    const stem = P('M-11 -2 C-13 14 -15 28 -10 32 Q0 36 10 32 C15 28 13 14 11 -2 Z');
    K.part(stem, '#FFF3DC', { box: [-15, -2, 15, 34] });
    const cap = P('M-36 2 C-38 -24 -16 -36 0 -36 C16 -36 38 -24 36 2 Q0 10 -36 2 Z');
    K.part(cap, '#B5652E', { box: [-38, -36, 38, 6] });
    K.clip(cap, () => K.mark(P('M-40 -4 Q0 6 40 -4 L40 10 L-40 10 Z'), '#8F4E22'));
    K.line(cap, 3.2);
    shine(ctx, -16, -22, 8, 3.5, -0.5, 0.55);
    K.part(P('M18 30 C22 22 30 22 32 30 C28 32 22 32 18 30 Z'), '#7CC35A', { flat: true, lw: 2 });
  },
  strawberry(K) {
    const ctx = K.ctx;
    const b = P('M0 36 C-20 28 -34 6 -32 -10 C-30 -22 -18 -26 0 -22 C18 -26 30 -22 32 -10 C34 6 20 28 0 36 Z');
    K.part(b, '#F0453B', { box: [-34, -26, 34, 36] });
    for (const [x, y] of [[-16, -8], [0, -10], [16, -8], [-20, 6], [-6, 4], [8, 4], [20, 6], [-12, 18], [2, 18], [12, 18], [-4, 28]]) {
      ctx.fillStyle = '#FFE680'; ctx.beginPath(); ctx.ellipse(x, y, 1.8, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    K.part(P('M0 -22 L-18 -30 L-8 -24 L-14 -36 L0 -26 L14 -36 L8 -24 L18 -30 Z'), '#5DBB4C', { flat: true, lw: 2.4 });
    K.line(P('M0 -26 Q1 -34 4 -38'), 3, '#5DBB4C');
    shine(ctx, -18, -10, 3, 8, 0.4, 0.55);
  },
  raspberry(K) {
    const ctx = K.ctx;
    const p = new Path2D();
    const dr = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5 - Math.abs(r - 1.5) * 0.9; c++) {
      const w = 5 - Math.abs(r - 1.5) * 0.9;
      dr.push([(c - (w - 1) / 2) * 12, -16 + r * 12]);
    }
    for (const [x, y] of dr) { p.moveTo(x + 7, y); p.arc(x, y, 7, 0, Math.PI * 2); }
    union(K, p, '#E8336D', [-32, -24, 32, 34]);
    for (const [x, y] of dr) { K.line(new Path2D(`M${x + 5} ${y + 3} A6 6 0 0 1 ${x - 3} ${y + 5}`), 1.6, 'rgba(120,0,40,0.35)'); shine(ctx, x - 2.5, y - 2.5, 1.6, 1.6, 0, 0.7); }
    K.part(P('M0 -22 L-16 -30 L-6 -24 L-10 -36 L0 -26 L10 -36 L6 -24 L16 -30 Z'), '#5DBB4C', { flat: true, lw: 2.2 });
  },
  egg(K) {
    const ctx = K.ctx;
    const e = P('M0 -36 C18 -36 30 -6 30 10 C30 28 16 36 0 36 C-16 36 -30 28 -30 10 C-30 -6 -18 -36 0 -36 Z');
    K.part(e, '#FFF7EC', { box: [-30, -36, 30, 36] });
    K.clip(e, () => K.mark(E(10, 22, 22, 16), 'rgba(230,200,160,0.35)'));
    shine(ctx, -12, -12, 5, 11, 0.35, 0.8);
  },
  hazelnut(K) {
    const ctx = K.ctx;
    const nut = P('M0 -26 C20 -26 32 -6 30 12 C28 30 14 36 0 36 C-14 36 -28 30 -30 12 C-32 -6 -20 -26 0 -26 Z');
    K.part(nut, '#B87A3E', { box: [-32, -26, 32, 36] });
    K.clip(nut, () => K.line(P('M-6 -20 Q-14 8 -8 34 M8 -20 Q14 8 10 34'), 1.8, 'rgba(80,40,10,0.35)'));
    const cap = P('M-24 -12 C-26 -30 -8 -34 0 -34 C8 -34 26 -30 24 -12 Q0 -6 -24 -12 Z');
    K.part(cap, '#E8D29A', { box: [-26, -34, 26, -8] });
    K.line(P('M0 -34 Q2 -40 6 -42'), 3);
    shine(ctx, -14, 4, 4, 10, 0.25, 0.5);
  },
  pinecone(K) {
    const ctx = K.ctx;
    // шишка остриём вниз: ряды отдельных чешуек, к низу мельче
    K.line(P('M0 -34 L0 -44'), 5);
    K.line(P('M0 -34 L0 -44'), 2.6, '#7A4E2A');
    const rows = [[-30, 3, 9.5], [-20, 4, 10], [-9, 4, 10], [2, 4, 9], [13, 3, 8.5], [23, 3, 7], [32, 2, 5.5], [39, 1, 4.5]];
    // рисуем снизу вверх, чтобы верхние чешуйки лежали поверх нижних
    for (let k = rows.length - 1; k >= 0; k--) {
      const [y, n, r] = rows[k];
      const w = n === 1 ? 0 : (n - 1) * r * 1.55;
      for (let i = 0; i < n; i++) {
        const x = n === 1 ? 0 : -w / 2 + (w / (n - 1)) * i;
        const sc = P(`M${x - r} ${y - r * 0.6} Q${x - r * 1.05} ${y + r * 0.9} ${x} ${y + r * 1.1} Q${x + r * 1.05} ${y + r * 0.9} ${x + r} ${y - r * 0.6} Z`);
        K.part(sc, k % 2 ? '#A86A38' : '#B87A44', { box: [x - r, y - r, x + r, y + r], lw: 2.4 });
        K.mark(E(x, y + r * 0.55, r * 0.45, r * 0.25), 'rgba(255,230,190,0.35)');
      }
    }
  },
  peas(K) {
    const ctx = K.ctx;
    ctx.rotate(-0.3);
    const pod = P('M-40 4 C-30 -16 30 -16 40 -4 C30 14 -30 18 -40 4 Z');
    K.part(pod, '#6CC04A', { box: [-40, -16, 40, 16] });
    K.part(P('M-34 2 C-24 -8 24 -8 34 -3 C24 6 -24 10 -34 2 Z'), '#B9E88E', { flat: true, lw: 2 });
    for (const x of [-20, -7, 6, 19]) { K.part(C(x, -1, 6.5), '#7DD45A', { box: [x - 6, -7, x + 6, 6], lw: 2.2 }); shine(ctx, x - 2, -3, 1.8, 1.8, 0, 0.75); }
    K.line(P('M40 -4 Q46 -10 44 -16'), 2.6, '#4C9A36');
  },
  lettuce(K) {
    const ctx = K.ctx;
    for (const [x, y, a, c] of [[-14, 2, -0.5, '#7CC35A'], [14, 2, 0.5, '#7CC35A'], [0, -4, 0, '#9ADB6E']]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      const leaf = P('M0 34 C-26 24 -30 -2 -22 -18 C-18 -30 -8 -36 0 -36 C8 -36 18 -30 22 -18 C30 -2 26 24 0 34 Z');
      K.part(leaf, c, { box: [-28, -36, 28, 34], lw: 2.8 });
      K.line(P('M0 32 L0 -28 M0 6 L-14 -6 M0 6 L14 -6 M0 -10 L-10 -20 M0 -10 L10 -20'), 1.8, 'rgba(40,110,30,0.5)');
      ctx.restore();
    }
    shine(ctx, -6, -18, 3, 8, 0.2, 0.55);
  },
};

/** Рисует угощение. o.bite (0..3) — сколько раз откусили (отъеденный край), o.rot — поворот. */
export function drawFood(ctx, kind, x, y, size, o = {}) {
  const fn = ART[kind];
  if (!fn) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  if (o.rot) ctx.rotate(o.rot);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  fn(kit(ctx));
  ctx.restore();
}

export { tone };
