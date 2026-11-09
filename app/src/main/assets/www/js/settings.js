// Экран «Для родителей»: какие игры видны и в каком порядке, «Сюрприз», язык, время игры,
// сколько держать кнопки в игре, защита от выхода (закрепление приложения), «О приложении».
import { prefs, setPref, orderedGames, MENU_HOLD, LANGS } from './core/prefs.js';
import { errors, clearErrors } from './core/errlog.js';

export const STR = {
  uk: {
    title: 'Для батьків', back: 'Готово',
    games: 'Ігри в меню', gamesHint: 'Тягніть за ≡, щоб змінити порядок. Вимкнені ігри не видно в меню і вони не випадають у «Сюрпризі».',
    surprise: '«Сюрприз» — випадкова гра', reset: 'Повернути як було',
    lang: 'Мова написів', auto: 'Як у телефоні',
    timer: 'Час гри', off: 'Без обмеж.', min: 'хв',
    timerHint: 'Коли час мине, звірята позіхають, махають «па-па» і засинають. Щоб грати далі — утримувати місяць 3 секунди.',
    hold: 'Кнопки в грі', sec: 'с',
    holdHint: 'Скільки тримати «будиночок» (вихід у меню) і «стерти». Шестерню і вимкнення в меню тримати 3 секунди.',
    pin: 'Захист від виходу', pinOn: 'Закріплювати гру на екрані',
    pinHint: 'Гра закріплюється на екрані: не працюють свайп на робочий стіл, недавні застосунки, шторка і розділення екрана. Android запитає «Закріпити застосунок?» — натисніть «ОК». Вийти з гри — кнопка вимкнення в меню (тримати 3 секунди).',
    pinTip: 'Порада: у налаштуваннях телефона увімкніть «Запитувати PIN-код для відкріплення» — тоді аварійний жест Android відкриє лише екран блокування.',
    pinNo: 'Працює лише в застосунку на телефоні.',
    about: 'Про застосунок', version: 'Версія', source: 'Відкритий вихідний код',
    privacy: 'Безкоштовно і без реклами. Гра не має доступу до інтернету: нічого не збирає і нікуди не надсилає. Налаштування зберігаються лише на цьому пристрої.',
    credits: 'Голоси звірят — записи в суспільному надбанні (CC0): BigSoundBank (Joseph Sardin), Freesound (digpro120, jahjahjahjah, jarredgibb, qubodup, calebmills99, nivatius, Setzilla, philberts), U.S. Fish & Wildlife Service. Інші звуки синтезовано в коді.',
    errs: 'Звіт про помилки', errNone: 'Помилок не було.', errCount: 'Записано помилок:', errSend: 'Надіслати звіт', errClear: 'Очистити',
    errHint: 'Помилки записуються лише на цьому телефоні. Звіт надсилається, тільки якщо ви самі його відправите (пошта, месенджер).',
    rest: 'Час відпочити', restHint: 'тримайте місяць',
  },
  en: {
    title: 'For parents', back: 'Done',
    games: 'Games in the menu', gamesHint: 'Drag ≡ to change the order. Switched-off games are hidden from the menu and from Surprise.',
    surprise: 'Surprise — a random game', reset: 'Restore default',
    lang: 'Language', auto: 'Phone default',
    timer: 'Play time', off: 'No limit', min: 'min',
    timerHint: 'When time is up, the animals yawn, wave goodbye and fall asleep. To keep playing, hold the moon for 3 seconds.',
    hold: 'In-game buttons', sec: 's',
    holdHint: 'How long to hold “home” (back to menu) and “erase”. The gear and power buttons in the menu need 3 seconds.',
    pin: 'Exit protection', pinOn: 'Pin the game to the screen',
    pinHint: 'The game is pinned to the screen: swipe home, recent apps, the notification shade and split screen are blocked. Android will ask “Pin app?” — tap OK. To leave the game, hold the power button in the menu for 3 seconds.',
    pinTip: 'Tip: in phone settings turn on “Ask for PIN before unpinning” — then the Android emergency gesture only leads to the lock screen.',
    pinNo: 'Works only in the phone app.',
    about: 'About', version: 'Version', source: 'Open source',
    privacy: 'Free, no ads. The game has no internet access: it collects nothing and sends nothing. Settings are stored only on this device.',
    credits: 'Animal voices are public-domain recordings (CC0): BigSoundBank (Joseph Sardin), Freesound (digpro120, jahjahjahjah, jarredgibb, qubodup, calebmills99, nivatius, Setzilla, philberts), U.S. Fish & Wildlife Service. All other sounds are synthesized in code.',
    errs: 'Error report', errNone: 'No errors so far.', errCount: 'Errors recorded:', errSend: 'Send report', errClear: 'Clear',
    errHint: 'Errors are recorded only on this phone. The report is sent only if you send it yourself (email, messenger).',
    rest: 'Time to rest', restHint: 'hold the moon',
  },
};

const HANDLE = '<svg viewBox="0 0 24 24"><path d="M5 8h14M5 12h14M5 16h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

function toggle(on, onChange) {
  const b = el('button', 'switch' + (on ? ' on' : ''), '<span></span>');
  b.setAttribute('role', 'switch');
  b.addEventListener('click', () => { const v = !b.classList.contains('on'); b.classList.toggle('on', v); onChange(v); });
  return b;
}

function chips(options, value, onChange) {
  const box = el('div', 'chips');
  for (const [v, label] of options) {
    const c = el('button', 'chip' + (v === value ? ' on' : ''), label);
    c.addEventListener('click', () => {
      for (const x of box.children) x.classList.remove('on');
      c.classList.add('on');
      onChange(v);
    });
    box.appendChild(c);
  }
  return box;
}

function card(title, ...kids) {
  const c = el('section', 'card');
  c.appendChild(el('h2', null, title));
  for (const k of kids) if (k) c.appendChild(k);
  return c;
}

/**
 * Строит экран настроек. ctx: { root, games, lang, drawIcon, onClose, onChange(key) }
 */
export function buildSettings(ctx) {
  const { root, games, drawIcon } = ctx;
  const S = STR[ctx.lang] || STR.en;
  const p = prefs();
  root.innerHTML = '';

  const head = el('header', 'set-head');
  head.appendChild(el('h1', null, S.title));
  const done = el('button', 'set-done', S.back);
  done.addEventListener('click', ctx.onClose);
  head.appendChild(done);
  root.appendChild(head);

  const cols = el('div', 'set-cols');
  root.appendChild(cols);
  const left = el('div', 'set-col'), right = el('div', 'set-col');
  cols.append(left, right);

  // --- Игры: видимость и порядок ---
  const list = el('div', 'game-list');
  const surpriseRow = el('div', 'row');
  const sc = el('canvas', 'row-icon'); sc.dataset.icon = 'surprise';
  surpriseRow.append(el('span', 'handle ghost'), sc, el('span', 'row-name', S.surprise), toggle(p.surprise, (v) => { setPref('surprise', v); ctx.onChange('surprise'); }));
  list.appendChild(surpriseRow);

  const fillGames = () => {
    for (const r of [...list.querySelectorAll('.row.game')]) r.remove();
    for (const g of orderedGames(games)) {
      const r = el('div', 'row game');
      r.dataset.id = g.id;
      const h = el('span', 'handle', HANDLE);
      const c = el('canvas', 'row-icon'); c.dataset.icon = g.id;
      c.style.background = g.bg;
      const vis = !p.hidden.includes(g.id);
      r.classList.toggle('off', !vis);
      r.append(h, c, el('span', 'row-name', g.label[ctx.lang] || g.label.en), toggle(vis, (v) => {
        const hidden = new Set(prefs().hidden);
        if (v) hidden.delete(g.id); else hidden.add(g.id);
        setPref('hidden', [...hidden]);
        r.classList.toggle('off', !v);
        ctx.onChange('hidden');
      }));
      dragRow(r, h, list, () => {
        setPref('order', [...list.querySelectorAll('.row.game')].map((x) => x.dataset.id));
        ctx.onChange('order');
      });
      list.appendChild(r);
    }
    requestAnimationFrame(() => { for (const c of list.querySelectorAll('canvas')) drawIcon(c, c.dataset.icon); });
  };
  fillGames();
  const reset = el('button', 'link', S.reset);
  reset.addEventListener('click', () => { setPref('order', null); setPref('hidden', []); fillGames(); ctx.onChange('order'); });
  left.appendChild(card(S.games, el('p', 'hint', S.gamesHint), list, reset));

  // --- Время игры ---
  right.appendChild(card(S.timer,
    chips([[0, S.off], [10, '10 ' + S.min], [15, '15 ' + S.min], [20, '20 ' + S.min], [30, '30 ' + S.min], [45, '45 ' + S.min]], p.timer, (v) => { setPref('timer', v); ctx.onChange('timer'); }),
    el('p', 'hint', S.timerHint)));

  // --- Защита от выхода ---
  const native = !!(window.FGNative && window.FGNative.setPinned);
  const pinRow = el('div', 'row plain');
  pinRow.append(el('span', 'row-name', S.pinOn), toggle(p.pin, (v) => { setPref('pin', v); ctx.onChange('pin'); }));
  right.appendChild(card(S.pin, pinRow, el('p', 'hint', S.pinHint), el('p', 'hint tip', S.pinTip), native ? null : el('p', 'hint warn', S.pinNo)));

  // --- Кнопки в игре ---
  right.appendChild(card(S.hold,
    chips([[1, '1 ' + S.sec], [1.5, '1,5 ' + S.sec], [2, '2 ' + S.sec], [3, '3 ' + S.sec]], p.gameHold, (v) => { setPref('gameHold', v); ctx.onChange('gameHold'); }),
    el('p', 'hint', S.holdHint)));

  // --- Язык ---
  right.appendChild(card(S.lang,
    chips([['auto', S.auto], ...LANGS.map((l) => [l.code, `<span class="flag">${l.flag}</span>${l.name}`])],
      LANGS.some((l) => l.code === p.lang) ? p.lang : 'auto', (v) => { setPref('lang', v); ctx.onChange('lang'); })));

  // --- Отчёт об ошибках (только по кнопке родителя) ---
  const errBox = el('div', 'errs');
  const fillErr = () => {
    errBox.innerHTML = '';
    const list = errors();
    const total = list.reduce((a, e) => a + e.n, 0);
    errBox.appendChild(el('p', null, list.length ? `${S.errCount} <b>${total}</b>` : S.errNone));
    if (!list.length) return;
    const btns = el('div', 'chips');
    if (window.FGNative && window.FGNative.share) {
      const send = el('button', 'chip on', S.errSend);
      send.addEventListener('click', () => {
        const head = `First Game ${window.FG_VERSION || '?'} · ${navigator.userAgent}\n${new Date().toISOString()}\n`;
        const body = list.map((e) => `[${e.ctx}${e.where ? ' / ' + e.where : ''}] ×${e.n}  ${e.first} … ${e.last}  v${e.v}\n${e.msg}\n${e.stack}`).join('\n\n');
        window.__repin = !!prefs().pin;
        window.FGNative.share('First Game — ' + S.errs, head + '\n' + body);
      });
      btns.appendChild(send);
    }
    const clr = el('button', 'chip', S.errClear);
    clr.addEventListener('click', () => { clearErrors(); fillErr(); });
    btns.appendChild(clr);
    errBox.appendChild(btns);
  };
  fillErr();
  right.appendChild(card(S.errs, errBox, el('p', 'hint', S.errHint)));

  // --- О приложении ---
  const ab = el('div', 'about');
  ab.append(
    el('p', null, `<b>First Game</b> · ${S.version} ${window.FG_VERSION || 'dev'}`),
    el('p', 'hint', S.privacy),
    el('p', 'hint', `${S.source}: <span class="mono">github.com/rulonoboev88/first-game</span>`),
    el('p', 'hint', S.credits),
  );
  right.appendChild(card(S.about, ab));
}

/** Перетаскивание строки за ручку внутри списка. */
function dragRow(row, handle, list, onDrop) {
  let pid = null, startY = 0, h = 0;
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pid = e.pointerId;
    try { handle.setPointerCapture(pid); } catch (_) {}
    startY = e.clientY;
    h = row.getBoundingClientRect().height;
    row.classList.add('dragging');
  });
  handle.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    let dy = e.clientY - startY;
    // меняемся местами с соседом, когда перешли его середину
    const prev = row.previousElementSibling, next = row.nextElementSibling;
    if (dy > h * 0.55 && next && next.classList.contains('game')) { list.insertBefore(next, row); startY += h; dy -= h; }
    else if (dy < -h * 0.55 && prev && prev.classList.contains('game')) { list.insertBefore(row, prev); startY -= h; dy += h; }
    row.style.transform = `translateY(${dy}px)`;
    // автопрокрутка у краёв
    const sc = list.closest('.settings');
    if (sc) {
      const r = sc.getBoundingClientRect();
      if (e.clientY < r.top + 60) sc.scrollTop -= 8;
      else if (e.clientY > r.bottom - 60) sc.scrollTop += 8;
    }
  });
  const end = (e) => {
    if (e.pointerId !== pid) return;
    pid = null;
    row.classList.remove('dragging');
    row.style.transform = '';
    onDrop();
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

export { MENU_HOLD };
