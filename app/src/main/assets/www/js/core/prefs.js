// Настройки для родителей: хранятся на устройстве (localStorage WebView), никуда не уходят.

const KEY = 'fg.prefs.v1';

export const DEFAULTS = {
  order: null,        // порядок id игр (null — как в registry)
  hidden: [],         // id спрятанных игр
  surprise: true,     // плитка «Сюрприз»
  lang: 'auto',       // auto | ru | uk | en
  timer: 0,           // минут игры, 0 — без ограничения
  gameHold: 1.5,      // сколько держать «домик» и «стереть» в игре, с
  pin: false,         // защита от выхода (закрепление приложения)
};

export const MENU_HOLD = 3; // шестерёнка и выключение в меню, с

let cache = null;

export function prefs() {
  if (cache) return cache;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
  cache = { ...DEFAULTS, ...saved };
  return cache;
}

export function setPref(k, v) {
  prefs()[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (_) {}
}

/** Игры в порядке, заданном родителем (новые игры — в конец списка, на свои места из registry). */
export function orderedGames(games) {
  const order = prefs().order;
  if (!order) return [...games];
  const byId = new Map(games.map((g) => [g.id, g]));
  const out = order.filter((id) => byId.has(id)).map((id) => byId.get(id));
  for (const g of games) if (!order.includes(g.id)) out.push(g);
  return out;
}

export function detectLang() {
  const p = prefs().lang;
  if (p && p !== 'auto') return p;
  const l = (navigator.language || 'en').toLowerCase();
  if (l.startsWith('uk')) return 'uk';
  if (l.startsWith('ru')) return 'ru';
  return 'en';
}
