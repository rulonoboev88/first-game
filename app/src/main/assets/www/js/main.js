// Точка входа: меню и запуск игр.
import { GAMES, SURPRISE_LABEL } from './games/registry.js';
import { ICONS } from './art/icons.js';
import { Stage } from './core/stage.js';
import { Input } from './core/input.js';
import { HoldButton } from './core/holdButton.js';
import { unlockAudio, suspendAudio, chime, pentaFreq } from './core/audio.js';
import { haptic } from './core/haptics.js';
import { prefs, orderedGames, detectLang, MENU_HOLD } from './core/prefs.js';
import { buildSettings, STR } from './settings.js';
import { RestScene } from './rest.js';
import { safe, logError, setErrorContext } from './core/errlog.js';

let LANG = detectLang();
document.documentElement.lang = LANG;
const native = () => window.FGNative || null;

try { window.FG_VERSION = window.FGNative ? window.FGNative.version() : 'dev'; } catch (_) { window.FG_VERSION = '?'; }

const menuEl = document.getElementById('menu');
const tilesEl = document.getElementById('tiles');
const gameEl = document.getElementById('game');
const stageEl = document.getElementById('stage');
const eraseEl = document.getElementById('btn-erase');
const settingsEl = document.getElementById('settings');
const restEl = document.getElementById('rest');

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

function visibleGames() {
  const hidden = new Set(prefs().hidden);
  return orderedGames(GAMES).filter((g) => !hidden.has(g.id));
}

function buildMenu() {
  tilesEl.innerHTML = '';
  const shown = visibleGames();
  const ready = shown.filter((g) => g.ready);
  if (prefs().surprise && ready.length > 1) {
    tilesEl.appendChild(makeTile('surprise', SURPRISE_LABEL[LANG], null, {
      surprise: true,
      onTap: () => openGame(ready[Math.floor(Math.random() * ready.length)]),
    }));
  }
  for (const g of shown) {
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
  icon: 'home', duration: prefs().gameHold * 1000, onDone: closeGame,
});
const eraseBtn = new HoldButton(eraseEl, {
  icon: 'erase', duration: prefs().gameHold * 1000,
  onDone: () => {
    if (current && current.game.erase) {
      current.game.erase();
      haptic(2);
    }
  },
});

async function openGame(g) {
  if (current || resting || !g || !g.load) return;
  haptic(1);
  chime(pentaFreq(7), { gain: 0.12, dur: 0.6 });
  let Game;
  try {
    const mod = await g.load();
    Game = mod.default;
    if (Game.prepare) await Game.prepare(); // например, загрузить физический движок
  } catch (e) { logError(e, 'load ' + g.id); return; }
  setErrorContext(g.id);

  menuEl.classList.add('hidden');
  gameEl.classList.remove('hidden');
  gameEl.style.background = Game.background || '#fff';
  eraseEl.classList.toggle('hidden', !Game.erasable);

  const stage = new Stage(stageEl, { webgl: !!Game.webgl, maxDpr: Game.maxDpr || 3 });
  let game;
  try { game = new Game(stage); } catch (e) {
    // игра не смогла стартовать (например, нет WebGL2) — тихо возвращаемся в меню
    logError(e, 'create');
    stage.destroy(); setErrorContext('menu');
    gameEl.classList.add('hidden'); menuEl.classList.remove('hidden');
    return;
  }
  // любая ошибка внутри игры записывается в журнал, но не останавливает её
  stage.onResize = (prev, next) => game.resize && safe('resize', () => game.resize(prev, next));
  const input = new Input(stage.canvas, {
    onDown: (p) => game.onDown && safe('onDown', () => game.onDown(p)),
    onMove: (p) => game.onMove && safe('onMove', () => game.onMove(p)),
    onUp: (p) => game.onUp && safe('onUp', () => game.onUp(p)),
  });

  current = { game, stage, input, raf: 0, last: performance.now(), frames: 0 };
  window.__game = game; // для отладки
  const frame = (t) => {
    if (!current) return;
    const dt = Math.min(0.05, (t - current.last) / 1000);
    current.last = t;
    current.raf = requestAnimationFrame(frame);
    if (game.update) safe('update', () => game.update(dt, t / 1000));
    try { game.draw(stage.ctx); } catch (e) {
      logError(e, 'draw');
      // сломанный кадр мог оставить незакрытый save()/clip — начинаем следующий с чистого листа
      const c = stage.ctx;
      if (c) { if (c.reset) c.reset(); c.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0); }
    }
    current.frames++;
  };
  current.raf = requestAnimationFrame(frame);
}

function closeGame() {
  if (!current) return;
  cancelAnimationFrame(current.raf);
  current.input.destroy();
  if (current.game.destroy) safe('destroy', () => current.game.destroy());
  current.stage.destroy();
  current = null;
  window.__game = null;
  setErrorContext('menu');
  homeBtn.reset();
  eraseBtn.reset();
  gameEl.classList.add('hidden');
  menuEl.classList.remove('hidden');
  layoutMenu();
}

// ---------- Для родителей: шестерёнка и выключение (держать 3 с) ----------

new HoldButton(document.getElementById('btn-gear'), { icon: 'gear', duration: MENU_HOLD * 1000, onDone: openSettings });
new HoldButton(document.getElementById('btn-power'), {
  icon: 'power', duration: MENU_HOLD * 1000,
  onDone: () => { haptic(2); const n = native(); if (n && n.exit) n.exit(); },
});

function openSettings() {
  haptic(1);
  buildSettings({
    root: settingsEl, games: GAMES.filter((g) => g.ready), lang: LANG, drawIcon,
    onClose: closeSettings,
    onChange: (key) => {
      if (key === 'gameHold') { homeBtn.setDuration(prefs().gameHold * 1000); eraseBtn.setDuration(prefs().gameHold * 1000); }
      if (key === 'pin') applyPin();
      if (key === 'volLock') applyVolumeLock();
      if (key === 'timer') playSec = 0;
      if (key === 'lang') { LANG = detectLang(); document.documentElement.lang = LANG; openSettings(); }
    },
  });
  menuEl.classList.add('hidden');
  settingsEl.classList.remove('hidden');
  settingsEl.scrollTop = 0;
}

function closeSettings() {
  settingsEl.classList.add('hidden');
  menuEl.classList.remove('hidden');
  buildMenu();
}

function applyVolumeLock() {
  const n = native();
  if (n && n.setVolumeLock) { try { n.setVolumeLock(!!prefs().volLock); } catch (_) {} }
}

function applyPin() {
  const n = native();
  if (n && n.setPinned) { try { n.setPinned(!!prefs().pin); } catch (_) {} }
}

// ---------- Время игры ----------

let playSec = 0;
let resting = null;
setInterval(() => {
  const lim = prefs().timer;
  if (!lim || resting || document.hidden || !settingsEl.classList.contains('hidden')) return;
  playSec += 1;
  if (playSec >= lim * 60) startRest();
}, 1000);

const moonBtn = new HoldButton(document.getElementById('btn-moon'), { icon: 'moon', duration: MENU_HOLD * 1000, onDone: endRest });

function startRest() {
  closeGame();
  menuEl.classList.add('hidden');
  restEl.classList.remove('hidden');
  const S = STR[LANG] || STR.en;
  document.getElementById('rest-title').textContent = S.rest;
  document.getElementById('rest-hint').textContent = S.restHint;
  const stage = new Stage(document.getElementById('rest-stage'), { maxDpr: 2 });
  const scene = new RestScene(stage);
  resting = { stage, scene, raf: 0, last: performance.now() };
  const frame = (t) => {
    if (!resting) return;
    const dt = Math.min(0.05, (t - resting.last) / 1000);
    resting.last = t;
    scene.update(dt);
    scene.draw(stage.ctx);
    resting.raf = requestAnimationFrame(frame);
  };
  resting.raf = requestAnimationFrame(frame);
}

function endRest() {
  if (!resting) return;
  cancelAnimationFrame(resting.raf);
  resting.stage.destroy();
  resting = null;
  moonBtn.reset();
  playSec = 0;
  restEl.classList.add('hidden');
  menuEl.classList.remove('hidden');
  layoutMenu();
}
window.__rest = startRest; // для отладки
window.__app = { closeGame, frames: () => (current ? current.frames : -1) }; // для автотестов

// ---------- Сигналы от Android-оболочки ----------

window.FG_onBack = () => { /* «Назад» намеренно ничего не делает — защита от тодлера */ };
function onHidden() {
  suspendAudio();
  if (current) current.input.releaseAll();
}
function onShown() {
  unlockAudio();                      // звук возвращается сам, без лишнего касания
  // после «Поделиться» закрепление снималось — возвращаем (только тогда, чтобы не спрашивать Android по кругу)
  if (window.__repin) { window.__repin = false; applyPin(); }
  if (current) current.last = performance.now();
}
window.FG_onPause = onHidden;
window.FG_onResume = onShown;
document.addEventListener('visibilitychange', () => (document.hidden ? onHidden() : onShown()));
window.addEventListener('blur', () => { if (current) current.input.releaseAll(); });

document.fonts && document.fonts.ready.then(buildMenu);
if (!document.fonts) buildMenu();
applyPin();
applyVolumeLock();
