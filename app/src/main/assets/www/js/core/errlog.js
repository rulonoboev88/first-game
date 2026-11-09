// Журнал ошибок — только на устройстве (интернета у приложения нет).
// Родитель сможет отправить его сам через «Поделиться» в настройках. Одинаковые ошибки склеиваются (счётчик).

const KEY = 'fg.errors.v1';
const MAX = 30;
let list = null;
let context = 'menu';
let lastSave = -1e9;

function load() {
  if (list) return list;
  try { list = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (_) { list = []; }
  return list;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) {}
}

/** Где мы сейчас (id игры или 'menu') — попадает в запись. */
export function setErrorContext(c) { context = c; }

export function logError(err, where = '') {
  const l = load();
  const msg = String((err && err.message) || err).slice(0, 300);
  const stack = String((err && err.stack) || '').split('\n').slice(0, 6).join('\n').slice(0, 900);
  const key = `${context}|${where}|${msg}`;
  const now = new Date().toISOString();
  const same = l.find((e) => e.key === key);
  if (same) {
    same.n++; same.last = now;
    // повторяющаяся каждый кадр ошибка не должна писать в хранилище 60 раз в секунду
    if (performance.now() - lastSave < 3000) return;
  } else {
    l.push({ key, ctx: context, where, msg, stack, n: 1, first: now, last: now, v: window.FG_VERSION || '?' });
    while (l.length > MAX) l.shift();
    if (window.__errors) window.__errors.push({ ctx: context, where, msg, stack });
    console.error('[FG]', context, where, err);
  }
  lastSave = performance.now();
  save();
}

export function errors() { return load(); }
export function clearErrors() { list = []; save(); }

/** Выполнить f, поймав ошибку: одна сломанная функция не должна останавливать игру. */
export function safe(where, f, ...args) {
  try { return f(...args); } catch (e) { logError(e, where); return undefined; }
}

window.addEventListener('error', (e) => logError(e.error || e.message, 'window'));
window.addEventListener('unhandledrejection', (e) => logError(e.reason, 'promise'));
