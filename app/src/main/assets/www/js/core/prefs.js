// Настройки для родителей: хранятся на устройстве (localStorage WebView), никуда не уходят.

const KEY = 'fg.prefs.v1';

export const DEFAULTS = {
  order: null,        // порядок id игр (null — как в registry)
  hidden: [],         // id спрятанных игр
  surprise: true,     // плитка «Сюрприз»
  lang: 'auto',       // auto или код из LANGS
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

/** Игры в порядке, заданном родителем (новая игра встаёт за своим соседом из registry). */
export function orderedGames(games) {
  const order = prefs().order;
  if (!order) return [...games];
  const byId = new Map(games.map((g) => [g.id, g]));
  const out = order.filter((id) => byId.has(id)).map((id) => byId.get(id));
  // новую игру ставим сразу за той, что стоит перед ней в registry
  games.forEach((g, i) => {
    if (order.includes(g.id)) return;
    const prev = i > 0 ? out.indexOf(games[i - 1]) : -1;
    out.splice(prev + 1, 0, g);
  });
  return out;
}

/** Языки игры. Новый язык = строка здесь + подписи в registry.js и settings.js (STR) и rest. */
export const LANGS = [
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export function detectLang() {
  const has = (c) => LANGS.some((l) => l.code === c);
  const p = prefs().lang;
  if (p && p !== 'auto' && has(p)) return p;
  // язык телефона, если он у нас есть; иначе английский
  for (const l of navigator.languages || [navigator.language || 'en']) {
    const c = String(l).toLowerCase().slice(0, 2);
    if (has(c)) return c;
  }
  return 'en';
}
