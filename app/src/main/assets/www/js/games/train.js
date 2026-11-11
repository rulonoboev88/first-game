// Паровозик. Поезд стоит на месте и едет вправо — движется пейзаж.
// Паровоз с трубой и дымом + 3 вагона, в каждом окне зверь. Каждые ~20 с — станция (ферма / деревня / лесное озеро):
// звери выходят и машут, садятся новые (никогда не те же, что ехали). Тап по поезду — «ту-тууу» (держишь — гудит дольше),
// тап по трубе — клуб дыма, по дыму — «пуф», по зверю — голос и движение, по колоколу — звон, по машинке — «бип-бип»,
// по тучке — дождик. По дороге: смена пейзажей, туннель (темно, глаза светятся, потом зажигается свет), мост,
// переезд со шлагбаумом, смена времени суток, иногда дождь или снег.
import { drawAnimal, drawPaws } from '../art/animals.js';
import * as A from '../art/train.js';
import { panFor } from '../core/audio.js';
import { haptic } from '../core/haptics.js';
import { animalVoice, preloadAnimals } from '../sounds/animals.js';
import { preloadFarm, cluck, crow, quack, honk } from '../sounds/farm.js';
import { mouthFrom } from '../core/lipsync.js';
import * as S from '../sounds/train.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

const BIOMES = ['meadow', 'forest', 'mountains', 'river', 'field'];
const THEMES = ['farm', 'village', 'lake'];
const STATION_ANIMALS = {
  farm: ['cow', 'pig', 'sheep', 'goat', 'horse'],
  village: ['dog', 'cat', 'hen', 'rooster', 'mouse'],
  lake: ['frog', 'owl', 'duck', 'goose', 'rabbit', 'hedgehog', 'bear', 'fox', 'squirrel'],
};
const STATION_ICON = { farm: 'cow', village: 'hen', lake: 'frog' };

const LEG = 21;          // перегон между станциями, в вагонах
const VC = 1.7;          // скорость, вагонов в секунду
const ACC = VC / 2.5;    // разгон
const DEC = VC / 3;      // торможение
const WAGON_X = [0, 1.1, 2.2];
const LOCO_X = 3.32;
const TRAIN_LEN = LOCO_X + A.LOCO.len;
const JOINT = 1.6;       // стыки рельсов
const DAY = 160;         // секунд на круг «день → закат → ночь → утро»
const HEAD = 0.42;       // размер мордочки
const HEAD_Y = A.WAGON.sill - 0.4 * HEAD;
const HORIZON = -0.78;

// Глаза зверей (в координатах мордочки, 100 единиц) — светятся в темноте туннеля.
const EYES = {
  cow: [-15, -8, 15, -8], pig: [-15, -8, 15, -8], sheep: [-11, 2, 11, 2], goat: [-12, -10, 12, -10],
  horse: [-13, -8, 13, -8], dog: [-14, -8, 14, -8], cat: [-15, -4, 15, -4], frog: [-22, -26, 22, -26],
  owl: [-16, -6, 16, -6], mouse: [-11, -8, 11, -8], rabbit: [-13, -9, 13, -9], hedgehog: [-11, -8, 11, -8],
  hen: [-14, -10, 14, -10], rooster: [-12, -10, 12, -10], duck: [-13, -10, 13, -10], goose: [-11, -20, 11, -21],
  bear: [-14, -9, 14, -9], fox: [-12, -11, 12, -11], squirrel: [-11, -9, 11, -9],
};

// Небо по времени суток: [момент круга, верх, низ, оттенок мира (r,g,b,a), ночь 0..1]
const SKY = [
  [0.00, '#7CC8F2', '#DDF3FF', [0, 0, 0, 0], 0],
  [0.40, '#7CC8F2', '#DDF3FF', [0, 0, 0, 0], 0],
  [0.50, '#6475CC', '#FFB27A', [255, 120, 70, 0.16], 0.25],
  [0.58, '#0E1B48', '#2E4A8C', [18, 28, 80, 0.5], 1],
  [0.82, '#0E1B48', '#2E4A8C', [18, 28, 80, 0.5], 1],
  [0.92, '#8DB6EE', '#FFD8B0', [255, 190, 150, 0.1], 0.15],
  [1.00, '#7CC8F2', '#DDF3FF', [0, 0, 0, 0], 0],
];

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixHex(a, b, t) {
  const x = hexRgb(a), y = hexRgb(b);
  return `rgb(${Math.round(lerp(x[0], y[0], t))},${Math.round(lerp(x[1], y[1], t))},${Math.round(lerp(x[2], y[2], t))})`;
}

export default class TrainGame {
  static volume = 1.25;       // выравнивание громкости между играми (tools/audit.js)
  static erasable = false;
  static background = '#BFE6FA';
  static maxDpr = 2.5;
  static alpha = true; // небо подкладывается позади мира (см. draw)

  constructor(stage) {
    this.stage = stage;
    this.time = 0;
    this.tod = 0.03;
    this.legs = new Map();
    this.crossings = new Map();
    this.bells = new Map();
    this.D = -17;
    this.prevD = this.D;
    this.v = VC;
    this.state = 'run';
    this.next = 0;            // номер станции, к которой едем
    this.stT = 0;
    this.script = [];
    this.ang = 0;
    this.chuffAcc = 0;
    this.idlePuff = 0;
    this.puffs = [];
    this.walkers = [];
    this.drops = [];
    this.whistles = new Map();
    this.weather = { rain: 0, snow: 0 };
    this.rainSnd = null;
    this.lights = [];
    const lake = [...STATION_ANIMALS.lake].sort(() => Math.random() - 0.5);
    this.passengers = [0, 1, 2].map((i) => this.makePassenger(lake[i]));
    this.stars = Array.from({ length: 90 }, () => ({ fx: Math.random(), fy: Math.random(), r: rnd(0.6, 1.6), ph: rnd(0, 6) }));
    this.clouds = Array.from({ length: 5 }, (_, i) => ({ fx: i * 0.28 + rnd(0, 0.15), fy: rnd(0, 1), s: rnd(0.8, 1.25), rain: 0, dark: 0 }));
    this.initLayers();
    preloadAnimals();
    preloadFarm();
    S.preloadTrain();
  }

  // ---------- Геометрия ----------

  get w() { return this.stage.w; }
  get h() { return this.stage.h; }
  /** Длина вагона в пикселях: поезд занимает ~80% ширины, но не выше ~0.3 высоты. */
  get c() { return Math.min((this.w * 0.8) / TRAIN_LEN, this.h * 0.3); }
  get left() { return (this.w - TRAIN_LEN * this.c) / 2; }
  get railY() { return this.h * 0.7; }
  get xl() { return -this.left / this.c; }
  get xr() { return (this.w - this.left) / this.c; }
  get bottom() { return (this.h - this.railY) / this.c; }
  sx(x) { return this.left + x * this.c; }
  toLocal(p) { return { x: (p.x - this.left) / this.c, y: (p.y - this.railY) / this.c }; }
  pan(x) { return panFor(this.sx(x), this.w); }

  // ---------- Маршрут ----------

  leg(i) {
    let L = this.legs.get(i);
    if (L) return L;
    const s = LEG * (i - 1), e = LEG * i;
    const biome = BIOMES[((i % 5) + 5) % 5];
    L = { i, s, e, biome, theme: THEMES[((i % 3) + 3) % 3], tunnel: null, bridge: null, crossing: null, weather: null };
    if (biome === 'mountains') L.tunnel = [s + 6.5, s + 14.5];
    if (biome === 'river') L.bridge = [s + 7, s + 14];
    if (biome === 'meadow' || biome === 'field') L.crossing = s + rnd(8.5, 11.5);
    if (i > 1) { const r = Math.random(); L.weather = r < 0.2 ? 'rain' : r < 0.32 ? 'snow' : null; }
    this.legs.set(i, L);
    if (this.legs.size > 12) for (const k of [...this.legs.keys()]) if (k < i - 4) this.legs.delete(k);
    return L;
  }
  legAt(X) { return this.leg(Math.floor(X / LEG) + 1); }
  /** Перегоны, видимые на экране сейчас. */
  visibleLegs() {
    const a = Math.floor((this.D + this.xl - 3) / LEG) + 1, b = Math.floor((this.D + this.xr + 3) / LEG) + 1;
    const out = [];
    for (let i = a; i <= b; i++) out.push(this.leg(i));
    return out;
  }
  /** Занято ли место у путей (туннель, мост, переезд, станция) — там не растут цветы и столбы. */
  busy(X, pad = 0.4, station = true) {
    const L = this.legAt(X);
    for (const M of [L, this.leg(L.i + 1), this.leg(L.i - 1)]) {
      if (M.tunnel && X > M.tunnel[0] - 1.8 - pad && X < M.tunnel[1] + 1.8 + pad) return true;
      if (M.bridge && X > M.bridge[0] - pad && X < M.bridge[1] + pad) return true;
      if (M.crossing != null && Math.abs(X - M.crossing) < 1.0 + pad) return true;
      if (station && X > M.e - 1.2 - pad && X < M.e + 6 + pad) return true; // станция
    }
    return false;
  }

  // ---------- Слои пейзажа ----------

  initLayers() {
    this.layers = {
      far: { f: 0.12, items: [], next: 0 },
      mid: { f: 0.45, items: [], next: 0 },
      ground: { f: 1, items: [], next: 0 },
      poles: { f: 1, items: [], next: 0 },
    };
    for (const L of Object.values(this.layers)) L.next = this.D * L.f + this.xl - 3;
    this.spawnLayers();
  }

  spawnLayers() {
    const { far, mid, ground, poles } = this.layers;
    const right = this.xr + 3;
    while (far.next - this.D * far.f < right) {
      const X = this.D + (far.next - this.D * far.f);
      const b = this.legAt(X).biome;
      if (b === 'mountains') far.items.push({ x: far.next, t: 'mtn', w: rnd(2.4, 4.2), h: rnd(1.6, 2.6), col: pick(['#A9BAD4', '#9DB0CC', '#B3C2DA']) });
      else far.items.push({ x: far.next, t: 'hill', w: rnd(2.2, 4.0), h: rnd(0.6, 1.3), col: pick(['#B9DCA3', '#AED597', '#C3E1AE']) });
      far.next += rnd(1.1, 2.2);
    }
    while (mid.next - this.D * mid.f < right) {
      const X = this.D + (mid.next - this.D * mid.f);
      const b = this.legAt(X).biome;
      const fy = Math.random();
      const it = { x: mid.next, fy, b, ph: rnd(0, 6) };
      let gap = 1;
      if (b === 'forest') { it.t = Math.random() < 0.6 ? 'pine' : 'tree'; gap = rnd(0.3, 0.65); }
      else if (b === 'meadow') { const r = Math.random(); it.t = r < 0.45 ? 'tree' : r < 0.7 ? 'bush' : r < 0.88 ? 'house' : 'mill'; gap = rnd(0.8, 1.9); }
      else if (b === 'mountains') { it.t = Math.random() < 0.55 ? 'pine' : 'rock'; gap = rnd(0.6, 1.5); }
      else if (b === 'river') { const r = Math.random(); it.t = r < 0.4 ? 'willow' : r < 0.75 ? 'reeds' : 'tree'; gap = rnd(0.6, 1.3); }
      else { const r = Math.random(); it.t = r < 0.8 ? 'sunflower' : r < 0.93 ? 'hay' : 'tree'; gap = it.t === 'sunflower' ? rnd(0.2, 0.36) : rnd(0.6, 1.2); }
      it.col = pick(['#6DBE5A', '#79C463', '#62B356']);
      it.wall = pick(['#FFF3DD', '#FCE8D5', '#EEF4FA']);
      it.roof = pick(['#E07A5F', '#C9665C', '#7A93C8']);
      mid.items.push(it);
      mid.next += gap;
    }
    while (ground.next - this.D < right) {
      const X = ground.next;
      if (!this.busy(X, 0.2, false)) {
        const b = this.legAt(X).biome;
        const r = Math.random();
        const flowery = b === 'meadow' || b === 'field';
        const t = r < (flowery ? 0.55 : 0.22) ? 'flower' : r < 0.8 ? 'tuft' : r < 0.9 ? 'stone' : 'bush';
        ground.items.push({ x: X, t, fy: Math.random(), col: pick(['#FF8FAB', '#FFD43B', '#FFFFFF', '#B197FC', '#FF8787']) });
      }
      ground.next += rnd(0.3, 0.8);
    }
    while (poles.next - this.D < right) {
      if (!this.busy(poles.next, 0.6)) poles.items.push({ x: poles.next });
      poles.next += 3.2;
    }
    const cull = (L, pad) => { L.items = L.items.filter((it) => it.x - this.D * L.f > this.xl - pad); };
    cull(far, 4); cull(mid, 2); cull(ground, 1); cull(poles, 4);
  }

  // ---------- Пассажиры ----------

  makePassenger(kind) {
    return {
      kind, blink: 0, blinkAt: rnd(0.8, 3), voice: null, vt: 0, open: 0, trick: null, trickT: 0,
      ear: 0, lean: 0, look: 0, tunT: 0, inT: false, lamp: 0, eyes: 0, pop: 0, ph: rnd(0, 6),
    };
  }

  voice(kind, x, excited = false) {
    const p = this.pan(x);
    if (kind === 'hen') return cluck(p);
    if (kind === 'rooster') return crow(p);
    if (kind === 'duck') return quack(p, false);
    if (kind === 'goose') return honk(p, false);
    return animalVoice(kind, p, { excited });
  }

  winX(i) { return WAGON_X[i] + 0.5; }
  bob(i) { return Math.sin(this.time * 13 + i * 1.7) * 0.007 * (this.v / VC); }

  /** Где мордочка зверя в окне (центр головы), с учётом прыжка и наклона. */
  headPos(i) {
    const a = this.passengers[i];
    let y = HEAD_Y + this.bob(i) + a.lean * 0.05;
    if (a.trick === 'hop') y -= Math.sin(clamp(a.trickT / 0.55, 0, 1) * Math.PI) * 0.09;
    if (a.pop > 0) y -= Math.sin(a.pop * Math.PI) * 0.04;
    return { x: this.winX(i), y };
  }

  tapPassenger(i) {
    const a = this.passengers[i];
    a.trick = pick(['hop', 'wiggle', 'wave']);
    a.trickT = 0;
    a.voice = this.voice(a.kind, this.winX(i), true);
    a.vt = 0;
    haptic(1);
  }

  // ---------- Касания ----------

  onDown(p) {
    const q = this.toLocal(p);
    // звери в окнах
    for (let i = 0; i < 3; i++) {
      const a = this.passengers[i];
      if (!a) continue;
      const hp = this.headPos(i);
      if (Math.hypot(q.x - hp.x, q.y - hp.y) < 0.3) { this.tapPassenger(i); return; }
    }
    // звери на перроне
    for (const w of this.walkers) {
      const hp = this.walkerHead(w);
      if (Math.hypot(q.x - hp.x, q.y - hp.y) < 0.3) {
        w.voice = this.voice(w.kind, hp.x, true); w.vt = 0; w.jump = 0; haptic(1); return;
      }
    }
    // колокол на станции
    for (const L of this.visibleLegs()) {
      const bx = L.e - this.D + 0.95, by = -1.25;
      if (Math.hypot(q.x - bx, q.y - by) < 0.24) { this.ringBell(L.i, bx); return; }
    }
    // машинка на переезде
    for (const L of this.visibleLegs()) {
      const cr = this.crossings.get(L.i);
      if (!cr || cr.gone) continue;
      const cx = L.crossing - this.D;
      if (Math.abs(q.x - cx) < 0.4 && q.y > cr.y - 0.5 && q.y < cr.y + 0.1) {
        cr.squash = 1; cr.beep = 0.5; S.carBeep(this.pan(cx)); haptic(1); return;
      }
    }
    // паровоз — всегда гудок «ту-тууу», второе «тууу» звучит, пока палец на месте (по трубе — ещё и большой клуб дыма)
    if (q.x > LOCO_X - 0.08 && q.x < TRAIN_LEN + 0.06 && q.y > -1.25 && q.y < 0.05) {
      const ch = A.LOCO.chimney;
      const chimney = Math.hypot(q.x - (LOCO_X + ch.x), q.y - (ch.y + 0.1)) < 0.2;
      this.startWhistle(p, chimney);
      return;
    }
    // клубы дыма
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const f = this.puffs[i];
      if (!f.steam && f.a > 0.25 && Math.hypot(q.x - f.x, q.y - f.y) < f.r * 1.2 + 0.05) { this.popPuff(f); return; }
    }
    // вагоны — тоже гудок
    if (q.x > -0.05 && q.x < TRAIN_LEN + 0.05 && q.y > -1.15 && q.y < 0.05) {
      this.startWhistle(p, false);
      return;
    }
    // тучка — дождик
    for (const cl of this.clouds) {
      const c = this.cloudPos(cl);
      if (Math.abs(p.x - c.x) < c.rx * 1.1 && Math.abs(p.y - c.y) < c.ry * 1.4) {
        cl.rain = 4.5; S.rainStart(this.pan((c.x - this.left) / this.c)); haptic(0); return;
      }
    }
    // мимо всего — паровозик тихо отзывается «ту!» и пускает маленький клубок пара
    S.peep(this.pan(LOCO_X + 1));
    this.emitPuff(0.7);
    haptic(0);
  }
  startWhistle(p, big) {
    const old = this.whistles.get(p.id);
    if (old) old.release();
    this.whistles.set(p.id, S.whistle({ pan: this.pan(LOCO_X + 1), echo: this.locoInTunnel() }));
    this.emitPuff(big ? 1.9 : 1.3, true);
    if (big) S.chuff(this.pan(LOCO_X + 1), 1.8, this.locoInTunnel());
    this.steamT = 0;
    haptic(1);
  }

  onMove() {}
  onUp(p) {
    const wh = this.whistles.get(p.id);
    if (wh) { wh.release(); this.whistles.delete(p.id); }
  }

  ringBell(i, x) {
    const b = this.bells.get(i) || { t: 9 };
    b.t = 0;
    this.bells.set(i, b);
    S.stationBell(this.pan(x));
    haptic(1);
  }

  // ---------- Дым ----------

  emitPuff(size = 1, big = false) {
    const ch = A.LOCO.chimney;
    this.puffs.push({
      x: LOCO_X + ch.x + rnd(-0.02, 0.02), y: ch.y - 0.04, r: 0.06 * size, r1: (big ? 0.34 : 0.22) * size,
      vx: -this.v * 0.7 - rnd(0.03, 0.1), vy: -rnd(0.35, 0.5) * (big ? 1.2 : 1), a: 0.9, t: 0, life: rnd(2.2, 3) * (big ? 1.3 : 1),
    });
    if (this.puffs.length > 70) this.puffs.shift();
  }

  popPuff(f) {
    f.dead = true;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      this.puffs.push({ x: f.x + Math.cos(a) * f.r * 0.5, y: f.y + Math.sin(a) * f.r * 0.5, r: f.r * 0.32, r1: f.r * 0.45, vx: Math.cos(a) * 0.5 + f.vx * 0.3, vy: Math.sin(a) * 0.5, a: 0.8, t: 0, life: 0.6 });
    }
    S.puffPop(this.pan(f.x));
    haptic(0);
  }

  // ---------- Туннели, мосты, переезды ----------

  tunnelAt(X) {
    const L = this.legAt(X);
    return L.tunnel && X > L.tunnel[0] && X < L.tunnel[1] ? L.tunnel : null;
  }
  bridgeAt(X) {
    const L = this.legAt(X);
    return L.bridge && X > L.bridge[0] && X < L.bridge[1] ? L.bridge : null;
  }
  locoInTunnel() { return !!this.tunnelAt(this.D + LOCO_X + 0.7); }

  // ---------- Станция ----------

  arrive() {
    this.state = 'station';
    this.stT = 0;
    this.v = 0;
    S.hiss(this.pan(LOCO_X + 1), 1.4);
    const L = this.leg(this.next);
    const bx = 0.95;
    const theme = L.theme;
    const kinds = [...STATION_ANIMALS[theme]].sort(() => Math.random() - 0.5).slice(0, 3);
    this.script = [
      { t: 0.35, f: () => this.ringBell(L.i, bx) },
      { t: 0.8, f: () => this.ringBell(L.i, bx) },
      ...[0, 1, 2].map((i) => ({ t: 0.9 + i * 0.35, f: () => this.exitPassenger(i) })),
      ...[0, 1, 2].map((j) => ({ t: 2.3 + j * 0.5, f: () => this.spawnBoarder(kinds[j], 2 - j) })),
    ];
  }

  exitPassenger(i) {
    const a = this.passengers[i];
    if (!a) return;
    const hp = this.headPos(i);
    this.passengers[i] = null;
    this.walkers.push({
      kind: a.kind, mode: 'out', t: 0, X: this.D + hp.x, y: hp.y,
      fromX: this.D + hp.x, fromY: hp.y, toX: this.D + hp.x - rnd(0.2, 0.4), voice: null, vt: 0, open: 0, jump: 1, ph: rnd(0, 6), wave: 0,
    });
    S.hop(this.pan(hp.x));
  }

  spawnBoarder(kind, wagon) {
    this.walkers.push({
      kind, mode: 'board', t: 0, X: this.D + this.xr + 0.5 + rnd(0, 0.3), y: this.groundY(kind),
      wagon, voice: null, vt: 0, open: 0, jump: 1, ph: rnd(0, 6), wave: 0,
    });
  }

  groundY() { return 0.04 - 0.57 * HEAD; }

  walkerHead(w) {
    const x = w.X - this.D;
    return { x, y: w.y };
  }

  depart() {
    this.state = 'run';
    this.next += 1;
    S.whistle({ pan: this.pan(LOCO_X + 1), gain: 0.85 }).release();
    S.hiss(this.pan(LOCO_X + 0.9), 0.5);
  }

  // ---------- Время ----------

  update(dt) {
    this.time += dt;
    this.tod = (this.tod + dt / DAY) % 1;
    this.prevD = this.D;

    // движение поезда
    const S0 = LEG * this.next;
    if (this.state === 'run') {
      const rem = S0 - this.D;
      if (rem <= (this.v * this.v) / (2 * DEC) + 1e-3) this.state = 'brake';
      else { this.v = Math.min(VC, this.v + ACC * dt); this.D += this.v * dt; }
    }
    if (this.state === 'brake') {
      const rem = Math.max(0, S0 - this.D);
      this.v = Math.sqrt(2 * DEC * rem);
      this.D += Math.max(this.v, 0.06) * dt;
      if (this.D >= S0 - 0.01) { this.D = S0; this.arrive(); }
    }
    if (this.state === 'station') {
      this.stT += dt;
      for (const s of this.script) if (!s.done && this.stT >= s.t) { s.done = true; s.f(); }
      const boarding = this.walkers.some((w) => w.mode === 'board' || w.mode === 'in');
      if (this.script.every((s) => s.done) && !boarding && this.passengers.every(Boolean) && this.stT > 4.6) this.depart();
    }

    // колёса, «чух», стук на стыках
    const dd = this.D - this.prevD;
    this.ang += dd / A.LOCO.driveR;
    const tunnel = this.locoInTunnel();
    if (tunnel && !this.wasTunnel) S.tunnelWhoosh(this.pan(LOCO_X));
    this.wasTunnel = tunnel;
    if (dd > 0) {
      this.chuffAcc += dd / A.LOCO.driveR;
      // 4 «чух» на оборот ведущего колеса, как у настоящего паровоза (дым — на сильных долях)
      if (this.chuffAcc > Math.PI / 2) {
        this.chuffAcc -= Math.PI / 2;
        const k = 1 - this.v / VC;
        const beat = (this.chuffBeat = ((this.chuffBeat || 0) + 1) & 3);
        S.chuff(this.pan(LOCO_X + 1), 0.6 + k * 0.9, tunnel, beat, 0.85 + 0.15 * (this.v / VC));
        if (beat % 2 === 0) this.emitPuff(1 + k * 0.8);
      }
      for (const r of [1.05, 3.3]) {
        if (Math.floor((this.prevD + r) / JOINT) !== Math.floor((this.D + r) / JOINT)) {
          const X = this.D + r;
          S.clackPair(this.pan(r), 0.55 + 0.45 * (this.v / VC), clamp(0.56 / Math.max(0.2, this.v), 0.07, 0.3), !!this.bridgeAt(X), !!this.tunnelAt(X));
        }
      }
    } else {
      this.idlePuff -= dt;
      if (this.idlePuff <= 0) { this.idlePuff = rnd(0.9, 1.4); this.emitPuff(0.8); }
    }

    // пар из свистка, пока гудим
    if (this.whistles.size) {
      this.steamT -= dt;
      if (this.steamT <= 0) {
        this.steamT = 0.05;
        this.puffs.push({
          x: LOCO_X + 0.55 + rnd(-0.01, 0.01), y: -0.94, r: 0.035, r1: rnd(0.14, 0.2), steam: true,
          vx: -this.v * 0.6 + rnd(-0.08, 0.08), vy: -rnd(0.9, 1.2), a: 0.85, t: 0, life: rnd(0.5, 0.7),
        });
      }
    }
    // дым
    for (const f of this.puffs) {
      f.t += dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.vy *= 1 - dt * 0.8; f.vx += (-this.v * 0.75 - 0.05 - f.vx) * dt * 0.6;
      f.r = lerp(f.r, f.r1, 1 - Math.exp(-dt * 1.6));
      f.a = 0.9 * (1 - smooth(0.35, 1, f.t / f.life));
    }
    this.puffs = this.puffs.filter((f) => !f.dead && f.t < f.life && f.x > this.xl - 1);

    this.updatePassengers(dt);
    this.updateWalkers(dt);
    this.updateCrossings(dt);
    for (const b of this.bells.values()) b.t += dt;
    this.updateWeather(dt);
    this.spawnLayers();
  }

  updatePassengers(dt) {
    const cross = this.visibleLegs().map((L) => L.crossing).find((x) => x != null && x - this.D > this.xl && x - this.D < this.xr);
    let ohs = 0;
    for (let i = 0; i < 3; i++) {
      const a = this.passengers[i];
      if (!a) continue;
      a.blinkAt -= dt;
      if (a.blinkAt <= 0) { a.blink = 0.13; a.blinkAt = rnd(1.5, 3.5); }
      if (a.blink > 0) a.blink -= dt;
      if (a.voice) { a.vt += dt; if (a.vt > a.voice.dur + 0.2) a.voice = null; }
      a.open = mouthFrom(a.voice, a.open, dt);
      if (a.trick) { a.trickT += dt; if (a.trickT > 0.9) a.trick = null; }
      if (a.pop > 0) a.pop = Math.max(0, a.pop - dt * 2.5);
      a.ear = Math.sin(this.time * 2.5 + a.ph) * 0.4;
      const X = this.D + this.winX(i);
      // мост — выглядывают вниз; переезд — смотрят на машинку
      const onBridge = !!this.bridgeAt(X);
      a.lean += ((onBridge ? 1 : 0) - a.lean) * Math.min(1, dt * 4);
      const lookT = cross != null ? clamp((cross - X) * 1.2, -1, 1) : Math.sin(this.time * 0.4 + a.ph) * 0.3;
      a.look += (lookT - a.look) * Math.min(1, dt * 5);
      // туннель: «ой!», глазки в темноте, потом щёлк — свет
      const inT = !!this.tunnelAt(X);
      if (inT && !a.inT) {
        a.tunT = 0; a.lamp = 0; a.pop = 1;
        S.oh(this.pan(this.winX(i)), rnd(0.9, 1.25), ohs * 0.12);
        ohs++;
      }
      a.inT = inT;
      if (inT) {
        a.tunT += dt;
        if (a.tunT > 0.9 && a.lamp === 0) { a.lamp = 0.001; S.lampClick(this.pan(this.winX(i))); }
      }
      if (a.lamp > 0) a.lamp = Math.min(1, a.lamp + dt * 6);
      if (!inT) a.lamp = 0;
      a.eyes = inT ? clamp(a.tunT / 0.25, 0, 1) * (1 - a.lamp) : 0;
    }
  }

  updateWalkers(dt) {
    for (const w of this.walkers) {
      w.t += dt;
      w.ph += dt;
      if (w.voice) { w.vt += dt; if (w.vt > w.voice.dur + 0.2) w.voice = null; }
      w.open = mouthFrom(w.voice, w.open, dt);
      if (w.jump < 1) w.jump = Math.min(1, w.jump + dt * 2.2);
      if (w.mode === 'out') {
        // прыжок из окна на перрон
        const k = clamp(w.t / 0.5, 0, 1);
        const gy = this.groundY(w.kind);
        w.X = lerp(w.fromX, w.toX, k);
        w.y = lerp(w.fromY, gy, k) - Math.sin(k * Math.PI) * 0.35;
        if (k >= 1) { w.mode = 'wave'; w.t = 0; w.voice = this.voice(w.kind, w.X - this.D); w.vt = 0; }
      } else if (w.mode === 'wave') {
        w.wave = Math.abs(Math.sin(w.t * 9));
        if (w.t > 0.9) { w.mode = 'leave'; w.t = 0; w.wave = 0; }
      } else if (w.mode === 'leave' || w.mode === 'board') {
        const dir = -1;
        const sp = w.mode === 'leave' ? 1.3 : 1.9;
        w.X += dir * sp * dt;
        w.y = this.groundY(w.kind) - Math.abs(Math.sin(w.ph * 8)) * 0.07;
        if (w.mode === 'board') {
          const tx = this.D + this.winX(w.wagon);
          if (w.X <= tx + 0.25) { w.mode = 'in'; w.t = 0; w.fromX = w.X; w.fromY = w.y; S.hop(this.pan(w.X - this.D)); }
        }
      } else if (w.mode === 'in') {
        // прыжок в окно
        const k = clamp(w.t / 0.5, 0, 1);
        const tx = this.D + this.winX(w.wagon);
        w.X = lerp(w.fromX, tx, k);
        const ty = HEAD_Y;
        w.y = lerp(w.fromY, ty, k) - Math.sin(k * Math.PI) * 0.4;
        if (k >= 1) {
          w.dead = true;
          const a = this.makePassenger(w.kind);
          a.pop = 1;
          this.passengers[w.wagon] = a;
          a.voice = this.voice(w.kind, this.winX(w.wagon), true);
        }
      }
    }
    this.walkers = this.walkers.filter((w) => !w.dead && w.X - this.D > this.xl - 0.8);
  }

  updateCrossings(dt) {
    for (const L of this.visibleLegs()) {
      if (L.crossing == null) continue;
      let cr = this.crossings.get(L.i);
      if (!cr) { cr = { up: 0, y: 0, carT: 0, gone: false, squash: 0, beep: 0, blinkT: 0, ring: 0, col: pick(['#FF6B6B', '#4DABF7', '#FFD43B', '#69DB7C', '#B197FC']) }; this.crossings.set(L.i, cr); }
      const x = L.crossing - this.D;
      const passed = x < -0.5;
      if (passed) cr.up = Math.min(1, cr.up + dt * 1.2);
      if (cr.up >= 1 && !cr.gone) {
        cr.carT += dt;
        if (cr.carT > 1.6) cr.gone = true;
      }
      cr.squash = Math.max(0, cr.squash - dt * 4);
      cr.beep = Math.max(0, cr.beep - dt);
      const onScreen = x > this.xl - 0.5 && x < this.xr + 0.5;
      if (!passed && onScreen) {
        cr.blinkT += dt;
        cr.ring -= dt;
        if (cr.ring <= 0) { cr.ring = 0.5; S.crossingBell(this.pan(x)); }
      }
    }
    for (const k of [...this.crossings.keys()]) if (!this.legs.has(k)) this.crossings.delete(k);
    for (const k of [...this.bells.keys()]) if (!this.legs.has(k)) this.bells.delete(k);
  }

  // ---------- Погода ----------

  cloudPos(cl) {
    const top = this.h * 0.05;
    const bot = Math.max(top + this.h * 0.05, this.railY + (HORIZON - 1.2) * this.c);
    const rx = Math.max(this.c * 0.55, this.stage.unit * 0.1) * cl.s;
    return { x: cl.fx * (this.w + rx * 4) - rx * 2, y: lerp(top, bot, cl.fy), rx, ry: rx * 0.42 };
  }

  updateWeather(dt) {
    const L = this.legAt(this.D + TRAIN_LEN / 2);
    const inside = this.D > L.s + 2 && this.D < L.e - 4;
    const tr = L.weather === 'rain' && inside ? 1 : 0;
    const ts = L.weather === 'snow' && inside ? 1 : 0;
    this.weather.rain += (tr - this.weather.rain) * Math.min(1, dt * 0.5);
    this.weather.snow += (ts - this.weather.snow) * Math.min(1, dt * 0.5);
    const { w, h } = this;
    // тучи плывут
    for (const cl of this.clouds) {
      const c = this.cloudPos(cl);
      cl.fx -= ((this.v * this.c * 0.04 + 6) * dt) / (w + c.rx * 4);
      if (cl.fx < 0) { cl.fx += 1; cl.fy = Math.random(); cl.s = rnd(0.8, 1.25); }
      if (cl.rain > 0) cl.rain -= dt;
      const dark = Math.max(cl.rain > 0 ? 1 : 0, this.weather.rain);
      cl.dark += (dark - cl.dark) * Math.min(1, dt * 2);
      if (cl.rain > 0 && this.drops.length < 500) {
        for (let k = 0; k < 160 * dt; k++) this.drops.push(this.makeDrop(c.x + rnd(-c.rx, c.rx), c.y + c.ry * 0.5, 'rain'));
      }
    }
    // общий дождь / снег
    const nr = this.weather.rain * (w * h) / 2600 * dt;
    for (let k = 0; k < nr && this.drops.length < 600; k++) this.drops.push(this.makeDrop(rnd(-0.1 * w, 1.3 * w), -20, 'rain'));
    const ns = this.weather.snow * (w * h) / 9000 * dt;
    for (let k = 0; k < ns && this.drops.length < 600; k++) this.drops.push(this.makeDrop(rnd(-0.1 * w, 1.4 * w), -10, 'snow'));
    const wind = -this.v * this.c;
    for (const d of this.drops) {
      if (d.t === 'rain') { d.x += (d.vx + wind * 0.35) * dt; d.y += d.vy * dt; }
      else { d.x += (wind * 0.3 + Math.sin(this.time * 1.5 + d.ph) * 20) * dt; d.y += d.vy * dt; }
    }
    this.drops = this.drops.filter((d) => d.y < d.floor && d.x > -40);
    // звук дождя
    const cloudRain = this.clouds.some((cl) => cl.rain > 0) ? 0.6 : 0;
    const amt = Math.max(this.weather.rain, cloudRain);
    if (amt > 0.02 && !this.rainSnd) this.rainSnd = S.rainLoop();
    if (this.rainSnd) this.rainSnd.set(amt);
  }

  makeDrop(x, y, t) {
    const floor = this.railY + rnd(0.05, 1) * (this.h - this.railY);
    if (t === 'rain') return { t, x, y, vx: -20, vy: rnd(700, 950) * (this.h / 800), floor };
    return { t, x, y, vy: rnd(40, 80) * (this.h / 800), r: rnd(1.5, 3.2), ph: rnd(0, 6), floor };
  }

  // ---------- Рисование ----------

  skyState() {
    const t = this.tod;
    let i = 0;
    while (i < SKY.length - 2 && SKY[i + 1][0] <= t) i++;
    const a = SKY[i], b = SKY[i + 1];
    const k = smooth(0, 1, (t - a[0]) / (b[0] - a[0]));
    const tint = a[3].map((v, j) => lerp(v, b[3][j], k));
    return { top: mixHex(a[1], b[1], k), bot: mixHex(a[2], b[2], k), tint, night: lerp(a[4], b[4], k) };
  }

  resize() {
    this.drops = [];
    this.initLayers();
  }

  draw(ctx) {
    const { w, h } = this;
    const c = this.c;
    const sky = this.skyState();
    this.sky = sky;
    const hz = this.railY + HORIZON * c;

    // Порядок без промежуточного холста (раньше ночью мир рисовался на отдельный холст во весь экран
    // и копировался — 3–4 лишних полноэкранных прохода, ФПС падал всю ночь):
    // 1) мир прямо на прозрачный холст; 2) оттенок времени суток только по миру (source-atop);
    // 3) небо, солнце, луна, звёзды, тучки подкладываются позади (destination-over).
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();

    this.lights = [];
    ctx.save();
    ctx.translate(this.left, this.railY);
    ctx.scale(c, c);
    this.drawWorld(ctx);
    ctx.restore();

    if (sky.tint[3] > 0.01 || this.weather.rain > 0.05) {
      const [r, gg, b, a] = sky.tint;
      const rain = this.weather.rain * 0.18;
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      if (a > 0.01) { ctx.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${a})`; ctx.fillRect(0, 0, w, h); }
      if (rain > 0.01) { ctx.fillStyle = `rgba(70,80,100,${rain})`; ctx.fillRect(0, 0, w, h); }
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    this.drawSkyBodies(ctx, sky, hz, true);
    const g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, sky.top);
    g.addColorStop(1, sky.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // --- свет: окна, фонари, фара, глазки в темноте ---
    ctx.save();
    ctx.translate(this.left, this.railY);
    ctx.scale(c, c);
    this.drawLights(ctx, sky.night);
    ctx.restore();

    this.drawDrops(ctx, sky.night);
  }

  /** Небесные тела. behind=true — рисуем позади уже нарисованного (destination-over), поэтому в обратном порядке. */
  drawSkyBodies(ctx, sky, hz, behind = false) {
    const { w } = this;
    const ops = [];
    const n = sky.night;
    // звёзды
    if (n > 0.05) {
      for (const s of this.stars) {
        const a = n * (0.55 + 0.45 * Math.sin(this.time * 2 + s.ph));
        ops.push(() => {
          ctx.fillStyle = `rgba(255,250,230,${a})`;
          ctx.beginPath(); ctx.arc(s.fx * w, s.fy * hz * 0.95, s.r, 0, Math.PI * 2); ctx.fill();
        });
      }
    }
    const R = Math.max(18, this.c * 0.22);
    // солнце: днём высоко, на закате садится и краснеет
    const set = smooth(0.38, 0.54, this.tod), rise = smooth(0.84, 0.97, this.tod);
    const sunK = this.tod < 0.7 ? set : 1 - rise;
    const sunA = 1 - smooth(0.5, 0.56, this.tod) + smooth(0.86, 0.9, this.tod);
    if (sunA > 0.01) {
      const sx = w * 0.8, sy = lerp(hz * 0.22, hz + R * 0.3, sunK);
      const al = clamp(sunA, 0, 1) * (1 - this.weather.rain * 0.65);
      ops.push(() => {
        ctx.globalAlpha = al;
        const gl = ctx.createRadialGradient(sx, sy, R * 0.5, sx, sy, R * 2.6);
        gl.addColorStop(0, sunK > 0.4 ? 'rgba(255,170,90,0.45)' : 'rgba(255,240,170,0.45)');
        gl.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(sx, sy, R * 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
      ops.push(() => {
        ctx.globalAlpha = al;
        ctx.fillStyle = mixHex('#FFE066', '#FF8C42', sunK);
        ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
    // луна
    if (n > 0.05) {
      const mx = w * 0.22, my = hz * 0.25;
      ops.push(() => {
        ctx.globalAlpha = n;
        const gl = ctx.createRadialGradient(mx, my, R * 0.6, mx, my, R * 2.4);
        gl.addColorStop(0, 'rgba(220,230,255,0.35)'); gl.addColorStop(1, 'rgba(220,230,255,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(mx, my, R * 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
      ops.push(() => {
        ctx.globalAlpha = n;
        ctx.fillStyle = '#F4F1DE';
        ctx.beginPath(); ctx.arc(mx, my, R * 0.85, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
      ops.push(() => {
        ctx.globalAlpha = n;
        ctx.fillStyle = 'rgba(200,195,170,0.5)';
        ctx.beginPath(); ctx.arc(mx - R * 0.25, my - R * 0.15, R * 0.18, 0, Math.PI * 2); ctx.arc(mx + R * 0.3, my + R * 0.25, R * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
    // тучки
    for (const cl of this.clouds) {
      const p = this.cloudPos(cl);
      const base = mixHex('#FFFFFF', '#5C6C9A', n * 0.8);
      const col = cl.dark > 0.02 ? mixHex(n > 0.5 ? '#5C6C9A' : '#FFFFFF', '#98A3B3', cl.dark) : base;
      ops.push(() => {
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.ellipse(p.x - p.rx * 0.45, p.y - p.ry * 0.5, p.rx * 0.45, p.ry * 0.95, 0, 0, Math.PI * 2);
        ctx.ellipse(p.x + p.rx * 0.25, p.y - p.ry * 0.75, p.rx * 0.5, p.ry * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
    if (behind) ops.reverse();
    for (const f of ops) f();
  }

  drawWorld(ctx) {
    const D = this.D, xl = this.xl - 0.2, xr = this.xr + 0.2, bottom = this.bottom + 0.2;
    const legs = this.visibleLegs();

    // дальний план
    const far = this.layers.far;
    ctx.save();
    ctx.translate(0, HORIZON);
    for (const it of far.items) {
      const x = it.x - D * far.f;
      if (x < xl - it.w || x > xr + it.w) continue;
      if (it.t === 'mtn') A.mountain(ctx, x, it.w, it.h, it.col);
      else A.hill(ctx, x, it.w, it.h, it.col);
    }
    ctx.restore();
    // земля за путями
    ctx.fillStyle = '#A8D67A';
    ctx.fillRect(xl, HORIZON - 0.02, xr - xl, 0.2 - HORIZON);
    // средний план (дальние — выше и мельче)
    const mid = this.layers.mid;
    const ms = [...mid.items].sort((a, b) => b.fy - a.fy);
    for (const it of ms) {
      const x = it.x - D * mid.f;
      if (x < xl - 1 || x > xr + 1) continue;
      const y = HORIZON + 0.18 + (1 - it.fy) * 0.32, k = 0.85 + (1 - it.fy) * 0.4;
      const sway = Math.sin(this.time * 1.4 + it.ph);
      switch (it.t) {
        case 'tree': A.roundTree(ctx, x, y, k, it.col); break;
        case 'pine': A.pineTree(ctx, x, y, k * 1.1, '#4F9E5B'); break;
        case 'bush': A.bush(ctx, x, y, k, it.col); break;
        case 'house': A.house(ctx, x, y, k, it.wall, it.roof, this.lights); break;
        case 'mill': A.windmill(ctx, x, y, k * 1.1, this.time * 0.7 + it.ph); break;
        case 'rock': A.rock(ctx, x, y, k); break;
        case 'willow': A.willow(ctx, x, y, k); break;
        case 'reeds': A.reeds(ctx, x, y, k, sway); break;
        case 'sunflower': A.sunflower(ctx, x, y, k * 0.9, sway); break;
        case 'hay': A.haystack(ctx, x, y, k); break;
      }
    }
    // тень у насыпи
    ctx.fillStyle = 'rgba(70,110,50,0.12)';
    ctx.fillRect(xl, -0.12, xr - xl, 0.12);

    // туннель: гора и тёмное нутро (позади поезда)
    for (const L of legs) if (L.tunnel) this.drawMountain(ctx, L.tunnel[0] - D, L.tunnel[1] - D);
    // мост: ферма позади поезда
    for (const L of legs) if (L.bridge) this.drawTruss(ctx, L.bridge[0] - D, L.bridge[1] - D);
    // телеграфные столбы и провода
    const poles = this.layers.poles.items.map((p) => p.x - D).filter((x) => x > xl - 3.5 && x < xr + 3.5);
    ctx.strokeStyle = 'rgba(60,50,45,0.45)'; ctx.lineWidth = 0.012;
    ctx.beginPath();
    for (let i = 0; i + 1 < poles.length; i++) {
      if (poles[i + 1] - poles[i] > 3.3) continue;
      for (const dx of [-0.13, 0.13]) {
        ctx.moveTo(poles[i] + dx, -1.55);
        ctx.quadraticCurveTo((poles[i] + poles[i + 1]) / 2, -1.38, poles[i + 1] + dx, -1.55);
      }
    }
    ctx.stroke();
    for (const x of poles) A.pole(ctx, x);
    // станции (здание позади поезда)
    for (const L of legs) {
      const x = L.e - D;
      if (x > xr + 0.5 || x + 4.5 < xl) continue;
      A.stationBuilding(ctx, x, L.theme, this.lights, (_c, cx2, cy, s) => this.drawIcon(ctx, L.theme, cx2, cy, s));
      const b = this.bells.get(L.i);
      const sw = b ? Math.sin(b.t * 13) * 0.45 * Math.exp(-b.t * 2.2) : 0;
      A.bell(ctx, x + 0.95, -1.36, sw);
    }

    // земля перед путями, река, насыпь, шпалы, рельсы
    ctx.fillStyle = '#8FCB62';
    ctx.fillRect(xl, 0.08, xr - xl, bottom);
    for (const L of legs) if (L.bridge) this.drawRiver(ctx, L.bridge[0] - D, L.bridge[1] - D, bottom);
    for (const L of legs) if (L.crossing != null) A.road(ctx, L.crossing - D, bottom);
    ctx.fillStyle = '#B8A992';
    ctx.fillRect(xl, -0.02, xr - xl, 0.12);
    ctx.fillStyle = 'rgba(90,70,50,0.18)';
    ctx.fillRect(xl, 0.07, xr - xl, 0.03);
    for (const L of legs) if (L.bridge) this.drawDeck(ctx, L.bridge[0] - D, L.bridge[1] - D);
    ctx.fillStyle = '#7A5236';
    const t0 = Math.floor((D + xl) / 0.32) * 0.32;
    for (let X = t0; X - D < xr; X += 0.32) ctx.fillRect(X - D - 0.065, -0.02, 0.13, 0.05);
    ctx.fillStyle = '#8E95A6';
    ctx.fillRect(xl, -0.05, xr - xl, 0.035);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(xl, -0.05, xr - xl, 0.01);
    ctx.fillStyle = 'rgba(40,40,50,0.5)';
    const j0 = Math.floor((D + xl) / JOINT) * JOINT;
    for (let X = j0; X - D < xr; X += JOINT) ctx.fillRect(X - D - 0.004, -0.05, 0.008, 0.035);

    // мелочи у дороги
    const gr = this.layers.ground;
    for (const it of gr.items) {
      const x = it.x - D;
      if (x < xl - 0.5 || x > xr + 0.5) continue;
      const y = 0.25 + it.fy * Math.max(0.2, this.bottom - 0.4), k = 0.9 + it.fy * 0.8;
      if (it.t === 'flower') A.flower(ctx, x, y, k, it.col);
      else if (it.t === 'tuft') A.tuft(ctx, x, y, k);
      else if (it.t === 'stone') A.stone(ctx, x, y, k);
      else A.bush(ctx, x, y, k * 0.5, '#79C463');
    }
    // переезды: шлагбаум и машинка
    for (const L of legs) {
      if (L.crossing == null) continue;
      const cr = this.crossings.get(L.i);
      if (!cr) continue;
      const x = L.crossing - D;
      const by = Math.min(0.55, this.bottom * 0.35);
      if (!cr.gone) {
        const k = smooth(0, 1.6, cr.carT);
        const base = Math.min(1.05, this.bottom * 0.72);
        cr.y = lerp(base, 0.1, k);
        ctx.globalAlpha = 1 - smooth(0.7, 1, k);
        A.car(ctx, x, cr.y, 0.85 * (1 - k * 0.45), cr.col, cr.squash * Math.abs(Math.sin(cr.squash * 12)), cr.beep);
        ctx.globalAlpha = 1;
      }
      const passed = x < -0.5;
      A.barrier(ctx, x - 0.5, by, cr.up, passed ? -1 : Math.floor(cr.blinkT / 0.4) % 2, this.lights);
    }

    // поезд
    this.drawTrain(ctx);

    // перрон (впереди путей) и звери на нём
    for (const L of legs) {
      const x = L.e - D;
      if (x > xr + 0.5 || x + 6 < xl) continue;
      A.platform(ctx, x - 1.2, x + TRAIN_LEN + 1.2);
    }
    for (const w of this.walkers) this.drawWalker(ctx, w);

    // дым (в туннеле не выходит сквозь гору)
    const tl = legs.filter((L) => L.tunnel);
    ctx.save();
    if (tl.length) {
      ctx.beginPath();
      ctx.rect(xl - 5, -20, xr - xl + 10, 40);
      for (const L of tl) ctx.rect(L.tunnel[0] - D, -20, L.tunnel[1] - L.tunnel[0], 20 - 1.45);
      ctx.clip('evenodd');
    }
    for (const f of this.puffs) A.drawPuff(ctx, f.x, f.y, f.r, f.a);
    ctx.restore();

    // туннель: темнота поверх поезда и порталы
    for (const L of legs) if (L.tunnel) this.drawTunnelFront(ctx, L.tunnel[0] - D, L.tunnel[1] - D);
  }

  drawIcon(ctx, theme, x, y, s) {
    const kind = STATION_ICON[theme];
    drawAnimal(ctx, kind, x, y + s * 0.08, s * 0.82, { paws: false, body: false });
  }

  drawMountain(ctx, a, b) {
    if (b + 2 < this.xl || a - 2 > this.xr) return;
    const m = (a + b) / 2, half = (b - a) / 2 + 1.8;
    ctx.fillStyle = '#93B87A';
    ctx.beginPath();
    ctx.moveTo(m - half - 0.6, 0.1);
    ctx.bezierCurveTo(m - half * 0.7, -1.4, m - half * 0.55, -3.1, m - half * 0.18, -3.3);
    ctx.quadraticCurveTo(m, -3.6, m + half * 0.2, -3.2);
    ctx.bezierCurveTo(m + half * 0.55, -3.0, m + half * 0.75, -1.3, m + half + 0.6, 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(m - half * 0.3, -2.4, half * 0.25, 0.5, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(120,110,95,0.35)';
    for (const [dx, dy, r] of [[-0.5, -2.0, 0.22], [0.8, -2.6, 0.18], [1.6, -1.8, 0.26], [-1.8, -1.6, 0.2]]) {
      ctx.beginPath(); ctx.ellipse(m + dx * half * 0.3, dy, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    // нутро туннеля
    ctx.fillStyle = '#2C221D';
    ctx.fillRect(a, -1.45, b - a, 1.55);
  }

  drawTunnelFront(ctx, a, b) {
    if (b + 1 < this.xl || a - 1 > this.xr) return;
    ctx.fillStyle = 'rgba(14,10,8,0.86)';
    ctx.fillRect(a, -1.45, b - a, 1.6);
    // каменные порталы
    for (const x of [a, b]) {
      ctx.beginPath(); ctx.roundRect(x - 0.13, -1.62, 0.26, 1.74, 0.03);
      ctx.fillStyle = '#A39C91'; ctx.fill();
      ctx.lineWidth = A.LW; ctx.strokeStyle = '#4A2C17'; ctx.stroke();
      ctx.strokeStyle = 'rgba(60,50,40,0.35)'; ctx.lineWidth = 0.012;
      ctx.beginPath();
      for (let y = -1.4; y < 0.1; y += 0.22) { ctx.moveTo(x - 0.13, y); ctx.lineTo(x + 0.13, y); }
      ctx.stroke();
    }
    ctx.beginPath(); ctx.rect(a, -1.6, b - a, 0.15);
    ctx.fillStyle = '#8E877C'; ctx.fill();
    ctx.lineWidth = A.LW; ctx.strokeStyle = '#4A2C17'; ctx.stroke();
  }

  drawTruss(ctx, a, b) {
    if (b + 1 < this.xl || a - 1 > this.xr) return;
    ctx.strokeStyle = '#C0634A'; ctx.lineWidth = 0.05; ctx.lineJoin = 'round';
    const top = -1.12, n = Math.max(2, Math.round((b - a - 0.7) / 0.7));
    const x0 = a + 0.35, x1 = b - 0.35, st = (x1 - x0) / n;
    ctx.beginPath();
    ctx.moveTo(a, -0.02); ctx.lineTo(x0, top); ctx.lineTo(x1, top); ctx.lineTo(b, -0.02);
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * st;
      ctx.moveTo(x, top); ctx.lineTo(x, -0.02);
      if (i < n) { ctx.moveTo(x, top); ctx.lineTo(x + st, -0.02); }
    }
    ctx.stroke();
  }

  drawRiver(ctx, a, b, bottom) {
    if (b + 1 < this.xl || a - 1 > this.xr) return;
    ctx.fillStyle = '#C9A57A';
    ctx.beginPath();
    ctx.moveTo(a - 0.05, 0.08); ctx.lineTo(b + 0.05, 0.08); ctx.lineTo(b + 0.5, bottom); ctx.lineTo(a - 0.5, bottom);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6EC6E8';
    ctx.beginPath();
    ctx.moveTo(a + 0.12, 0.26); ctx.lineTo(b - 0.12, 0.26); ctx.lineTo(b + 0.3, bottom); ctx.lineTo(a - 0.3, bottom);
    ctx.closePath(); ctx.fill();
    // блики на воде
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.02; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const y = 0.35 + i * 0.22;
      if (y > bottom - 0.05) break;
      const off = Math.sin(this.time * 1.3 + i * 1.7) * 0.15;
      const xm = (a + b) / 2 + off + ((i * 37) % 7 - 3) * 0.35;
      ctx.moveTo(xm - 0.12, y); ctx.lineTo(xm + 0.12, y);
    }
    ctx.stroke();
    // опоры моста
    const n = Math.max(1, Math.round((b - a) / 1.8));
    for (let i = 1; i < n; i++) {
      const x = a + ((b - a) * i) / n;
      ctx.beginPath(); ctx.roundRect(x - 0.08, 0.1, 0.16, 0.55, 0.02);
      ctx.fillStyle = '#A39C91'; ctx.fill();
      ctx.lineWidth = A.LW; ctx.strokeStyle = '#4A2C17'; ctx.stroke();
    }
  }

  drawDeck(ctx, a, b) {
    if (b + 1 < this.xl || a - 1 > this.xr) return;
    ctx.beginPath(); ctx.roundRect(a - 0.1, -0.02, b - a + 0.2, 0.17, 0.02);
    ctx.fillStyle = '#B5523B'; ctx.fill();
    ctx.lineWidth = A.LW; ctx.strokeStyle = '#4A2C17'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,180,0.55)';
    for (let x = a; x < b; x += 0.18) { ctx.beginPath(); ctx.arc(x, 0.1, 0.012, 0, Math.PI * 2); ctx.fill(); }
  }

  drawTrain(ctx) {
    const vk = this.v / VC;
    // сцепки
    A.coupler(ctx, WAGON_X[0] + 0.95, WAGON_X[1] + 0.05);
    A.coupler(ctx, WAGON_X[1] + 0.95, WAGON_X[2] + 0.05);
    A.coupler(ctx, WAGON_X[2] + 0.95, LOCO_X + 0.02);
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(WAGON_X[i], 0);
      A.drawWagon(ctx, { color: A.WAGON_COLORS[i], ang: this.ang, bob: this.bob(i) });
      ctx.restore();
      this.drawPassenger(ctx, i, false);
    }
    ctx.save();
    ctx.translate(LOCO_X, 0);
    A.drawLoco(ctx, { ang: this.ang, bob: Math.sin(this.time * 11) * 0.006 * vk });
    ctx.restore();
  }

  /** Зверь в окне вагона i. lit — перерисовка поверх при включённом свете (ночь/туннель). */
  drawPassenger(ctx, i, lit) {
    const a = this.passengers[i];
    const bob = this.bob(i);
    const wn = A.WAGON.win;
    const x0 = WAGON_X[i];
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x0 + wn.x, wn.y + bob, wn.w, wn.h, 0.07);
    if (lit) {
      const g = ctx.createLinearGradient(0, wn.y + bob, 0, wn.y + wn.h + bob);
      g.addColorStop(0, '#FFE7A1'); g.addColorStop(1, '#FFC86B');
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.beginPath(); ctx.roundRect(x0 + wn.x + 0.06, wn.y + wn.h - 0.17 + bob, wn.w - 0.12, 0.17, 0.04);
      ctx.fillStyle = 'rgba(160,90,60,0.25)'; ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.roundRect(x0 + wn.x, wn.y + bob, wn.w, wn.h, 0.07);
    }
    ctx.clip();
    if (a) {
      const hp = this.headPos(i);
      {
        let rot = a.lean * 0.12;
        if (a.trick === 'wiggle') rot += Math.sin(a.trickT * 22) * 0.2 * (1 - a.trickT / 0.9);
        ctx.save();
        ctx.translate(hp.x, hp.y);
        ctx.rotate(rot);
        drawAnimal(ctx, a.kind, 0, 0, HEAD, { blink: a.blink > 0, open: a.open, ear: a.ear, look: a.look, paws: false });
        ctx.restore();
      }
    }
    ctx.restore();
    if (lit) {
      ctx.beginPath(); ctx.roundRect(x0 + wn.x, wn.y + bob, wn.w, wn.h, 0.07);
      ctx.lineWidth = A.LW; ctx.strokeStyle = '#4A2C17'; ctx.stroke();
    }
    ctx.save();
    ctx.translate(x0, 0);
    A.drawSill(ctx, bob);
    ctx.restore();
    if (a) {
      // лапки держатся за подоконник (не подпрыгивают вместе с головой)
      ctx.save();
      ctx.translate(this.winX(i), HEAD_Y + bob + a.lean * 0.05);
      ctx.scale(HEAD / 100, HEAD / 100);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      drawPaws(ctx, a.kind, a.trick === 'wave' ? Math.abs(Math.sin(a.trickT * 9)) : 0);
      ctx.restore();
    }
  }

  drawWalker(ctx, w) {
    const x = w.X - this.D;
    if (x < this.xl - 0.6 || x > this.xr + 0.6) return;
    const extra = w.jump < 1 ? Math.sin(w.jump * Math.PI) * 0.18 : 0;
    {
      drawAnimal(ctx, w.kind, x, w.y - extra, HEAD, { body: false, open: w.open, ear: Math.sin(w.ph * 6) * 0.5, wave: w.wave, blink: false });
    }
  }

  drawLights(ctx, night) {
    const nl = smooth(0.25, 0.75, night);
    // фонари, окна домов, лампы переезда
    ctx.save();
    for (const L of this.lights) {
      const k = L.always ? 1 : nl;
      if (k < 0.02) continue;
      if (L.kind === 'rect') {
        ctx.globalAlpha = k * 0.95;
        ctx.fillStyle = L.col;
        ctx.fillRect(L.x, L.y, L.w, L.h);
      } else {
        ctx.globalCompositeOperation = 'lighter';
        const r = L.r * (L.always ? 0.6 + 0.4 * nl : 1);
        const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, r);
        g.addColorStop(0, `rgba(${L.col},${0.55 * k})`);
        g.addColorStop(1, `rgba(${L.col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(L.x, L.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();

    // окна вагонов: ночью свет горит; в туннеле — сначала только глазки, потом «щёлк» и свет
    for (let i = 0; i < 3; i++) {
      const a = this.passengers[i];
      const lamp = a ? Math.max(nl, a.lamp) : nl;
      if (lamp > 0.02) {
        ctx.save();
        ctx.globalAlpha = lamp;
        this.drawPassenger(ctx, i, true);
        ctx.restore();
        // тёплый ореол вокруг окна
        const wn = A.WAGON.win;
        const cx = WAGON_X[i] + 0.5, cy = wn.y + wn.h / 2;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(cx, cy, 0.15, cx, cy, 0.7);
        g.addColorStop(0, `rgba(255,200,110,${0.22 * lamp})`); g.addColorStop(1, 'rgba(255,200,110,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      if (a && a.eyes > 0.02) this.drawEyes(ctx, i, a);
    }
    // будка машиниста и фара
    const tun = this.tunnelAt(this.D + LOCO_X + 0.7);
    const lk = Math.max(nl, tun ? 1 : 0);
    if (lk > 0.02) {
      const cw = A.LOCO.cabWin;
      ctx.save();
      if (tun) { ctx.beginPath(); ctx.rect(tun[0] - this.D, -1.45, tun[1] - tun[0], 1.6); ctx.clip(); }
      ctx.globalAlpha = lk * 0.9;
      ctx.fillStyle = '#FFD98A';
      ctx.beginPath(); ctx.roundRect(LOCO_X + cw.x, cw.y, cw.w, cw.h, 0.04); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      const hl = A.LOCO.headlight;
      const hx = LOCO_X + hl.x, hy = hl.y;
      const g = ctx.createLinearGradient(hx, 0, hx + 2.4, 0);
      g.addColorStop(0, `rgba(255,240,180,${0.32 * lk})`); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(hx, hy - 0.04); ctx.lineTo(hx + 2.4, hy - 0.45); ctx.lineTo(hx + 2.4, hy + 0.6); ctx.lineTo(hx, hy + 0.04); ctx.closePath(); ctx.fill();
      const r = ctx.createRadialGradient(hx, hy, 0, hx, hy, 0.25);
      r.addColorStop(0, `rgba(255,245,200,${0.9 * lk})`); r.addColorStop(1, 'rgba(255,245,200,0)');
      ctx.fillStyle = r; ctx.beginPath(); ctx.arc(hx, hy, 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  drawEyes(ctx, i, a) {
    const pts = [];
    {
      const e = EYES[a.kind], hp = this.headPos(i), k = HEAD / 100;
      pts.push([hp.x + e[0] * k, hp.y + e[1] * k], [hp.x + e[2] * k, hp.y + e[3] * k]);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y] of pts) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 0.07);
      g.addColorStop(0, `rgba(240,255,170,${a.eyes})`);
      g.addColorStop(0.35, `rgba(210,255,120,${0.6 * a.eyes})`);
      g.addColorStop(1, 'rgba(200,255,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 0.07, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  drawDrops(ctx, night) {
    if (!this.drops.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = night > 0.5 ? 'rgba(200,215,255,0.45)' : 'rgba(235,245,255,0.75)';
    ctx.lineWidth = Math.max(1, this.c * 0.008);
    ctx.beginPath();
    const wind = -this.v * this.c * 0.35;
    for (const d of this.drops) {
      if (d.t !== 'rain') continue;
      const len = 0.022;
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - (d.vx + wind) * len, d.y - d.vy * len);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    for (const d of this.drops) {
      if (d.t !== 'snow') continue;
      ctx.moveTo(d.x + d.r, d.y);
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }

  destroy() {
    for (const wh of this.whistles.values()) wh.release();
    this.whistles.clear();
    if (this.rainSnd) this.rainSnd.stop();
  }
}
