// Точка входа: меню и запуск игр.
import { GAMES, SURPRISE_LABEL } from './games/registry.js';
import { ICONS } from './art/icons.js';
import { Stage } from './core/stage.js';
import { Input } from './core/input.js';
import { HoldButton } from './core/holdButton.js';
import { unlockAudio, suspendAudio, chime, pentaFreq } from './core/audio.js';
import { haptic } from './core/haptics.js';

const LANG = (() => {
  const l = (navigator.language || 'en').toLowerCase();
  if (l.startsWith('uk')) return 'uk';
  if (l.startsWith('ru')) return 'ru';
  return 'en';
})();
document.documentElement.lang = LANG;

try { window.FG_VERSION = window.FGNative ? window.FGNative.version() : 'dev'; } catch (_) { window.FG_VERSION = '?'; }

const menuEl = document.getElementById('menu');
const tilesEl = document.getElementById('tiles');
const gameEl = document.getElementById('game');
const stageEl = document.getElementById('stage');
const eraseEl = document.getElementById('btn-erase');

// Звук разрешается только после первого касания — «будим» его на любом нажатии.
window.addEventListener('pointerdown', unlockAudio, { capture: true });

// ---------- Меню ----------

function drawIcon(canvas, id) {
  const S = canvas.clientWidth || 100;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(S * dpr);
  canvas.height = Math.round(S * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, S, S);
  (ICONS[id] || ICONS.test)(ctx, S);
}

function makeTile(id, label, bg, { soon = false, surprise = false, onTap }) {
  const b = document.createElement('button');
  b.className = 'tile' + (soon ? ' soon' : '') + (surprise ? ' surprise' : '');
  if (!surprise) b.style.setProperty('--tile-bg', bg);
  const c = document.createElement('canvas');
  c.dataset.icon = id;
  const span = document.createElement('span');
  span.className = 'label';
  span.textContent = label;
  b.append(c, span);
  b.addEventListener('click', () => {
    if (soon) return;
    onTap && onTap();
  });
  return b;
}

function buildMenu() {
  tilesEl.innerHTML = '';
  const ready = GAMES.filter((g) => g.ready);
  tilesEl.appendChild(makeTile('surprise', SURPRISE_LABEL[LANG], null, {
    surprise: true,
    onTap: () => openGame(ready[Math.floor(Math.random() * ready.length)]),
  }));
  for (const g of GAMES) {
    tilesEl.appendChild(makeTile(g.id, g.label[LANG], g.bg, {
      soon: !g.ready,
      onTap: () => openGame(g),
    }));
  }
  layoutMenu();
}

function layoutMenu() {
  const w = menuEl.clientWidth;
  const cols = w < 560 ? 2 : w < 1000 ? 3 : 4;
  tilesEl.style.setProperty('--cols', cols);
  const tileW = (Math.min(w, 1400) - 40) / cols;
  tilesEl.style.setProperty('--label-size', Math.round(tileW * 0.1) + 'px');
  requestAnimationFrame(() => {
    for (const c of tilesEl.querySelectorAll('canvas')) drawIcon(c, c.dataset.icon);
  });
}

new ResizeObserver(() => { if (!menuEl.classList.contains('hidden')) layoutMenu(); }).observe(menuEl);

// ---------- Запуск игры ----------

let current = null; // { game, stage, input, raf }

const homeBtn = new HoldButton(document.getElementById('btn-home'), {
  icon: 'home', duration: 1500, onDone: closeGame,
});
const eraseBtn = new HoldButton(eraseEl, {
  icon: 'erase', duration: 3000,
  onDone: () => {
    if (current && current.game.erase) {
      current.game.erase();
      haptic(2);
    }
  },
});

async function openGame(g) {
  if (current || !g || !g.load) return;
  haptic(1);
  chime(pentaFreq(7), { gain: 0.12, dur: 0.6 });
  const mod = await g.load();
  const Game = mod.default;

  menuEl.classList.add('hidden');
  gameEl.classList.remove('hidden');
  gameEl.style.background = Game.background || '#fff';
  eraseEl.classList.toggle('hidden', !Game.erasable);

  const stage = new Stage(stageEl);
  const game = new Game(stage);
  stage.onResize = (prev, next) => game.resize && game.resize(prev, next);
  const input = new Input(stage.canvas, {
    onDown: (p) => game.onDown && game.onDown(p),
    onMove: (p) => game.onMove && game.onMove(p),
    onUp: (p) => game.onUp && game.onUp(p),
  });

  current = { game, stage, input, raf: 0, last: performance.now() };
  const frame = (t) => {
    if (!current) return;
    const dt = Math.min(0.05, (t - current.last) / 1000);
    current.last = t;
    game.update && game.update(dt, t / 1000);
    game.draw(stage.ctx);
    current.raf = requestAnimationFrame(frame);
  };
  current.raf = requestAnimationFrame(frame);
}

function closeGame() {
  if (!current) return;
  cancelAnimationFrame(current.raf);
  current.input.destroy();
  current.game.destroy && current.game.destroy();
  current.stage.destroy();
  current = null;
  homeBtn.reset();
  eraseBtn.reset();
  gameEl.classList.add('hidden');
  menuEl.classList.remove('hidden');
  layoutMenu();
}

// ---------- Сигналы от Android-оболочки ----------

window.FG_onBack = () => { /* «Назад» намеренно ничего не делает — защита от тодлера */ };
window.FG_onPause = () => suspendAudio();
window.FG_onResume = () => {};
document.addEventListener('visibilitychange', () => { if (document.hidden) suspendAudio(); });

document.fonts && document.fonts.ready.then(buildMenu);
if (!document.fonts) buildMenu();
