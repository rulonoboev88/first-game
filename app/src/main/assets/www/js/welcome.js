// Первый запуск: один спокойный экран для родителя — как выйти из игры, где настройки,
// как закрепить игру на экране. Показывается один раз (prefs.welcomed), потом — сразу меню.
import { prefs, setPref, detectLang, LANGS, MENU_HOLD } from './core/prefs.js';
import { ICONS } from './core/holdButton.js';

const STR = {
  uk: {
    hi: 'Вітаємо!',
    sub: 'Кілька слів для батьків. Цей екран з’явиться лише один раз.',
    home: (s) => `<b>Вийти з гри в меню</b> — утримувати будиночок у кутку ${s} с. Випадковий дотик малюка не спрацює.`,
    gear: (s) => `<b>Для батьків</b> — утримувати шестерню в меню ${s} с: які ігри показувати, час гри, мова.`,
    power: (s) => `<b>Закрити гру</b> — утримувати кнопку вимкнення в меню ${s} с.`,
    pin: 'Закріпити гру на екрані',
    pinHint: 'Малюк не вийде свайпом на робочий стіл чи в інші застосунки. Android запитає «Закріпити застосунок?» — натисніть «ОК». Можна змінити потім у налаштуваннях.',
    privacy: 'Без реклами і без інтернету: гра нічого не збирає.',
    go: 'Грати',
  },
  en: {
    hi: 'Welcome!',
    sub: 'A few words for parents. You will see this screen only once.',
    home: (s) => `<b>Back to the menu</b> — hold the little house in the corner for ${s} s. A toddler’s random tap won’t do it.`,
    gear: (s) => `<b>For parents</b> — hold the gear in the menu for ${s} s: which games to show, play time, language.`,
    power: (s) => `<b>Close the game</b> — hold the power button in the menu for ${s} s.`,
    pin: 'Pin the game to the screen',
    pinHint: 'Your child can’t swipe away to the home screen or other apps. Android will ask “Pin app?” — tap OK. You can change this later in settings.',
    privacy: 'No ads and no internet: the game collects nothing.',
    go: 'Play',
  },
};

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const icon = (id) => `<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" fill="#fff" stroke="rgba(74,44,23,0.25)" stroke-width="2"/>${ICONS[id]}<path d="M26 4 A22 22 0 0 1 47.5 30" fill="none" stroke="#FF9F1C" stroke-width="4" stroke-linecap="round"/></svg>`;
const num = (v, lang) => (lang === 'en' ? String(v) : String(v).replace('.', ','));

export const needWelcome = () => !prefs().welcomed;

/** Показать экран. onLang(lang) — сменили язык; onPin() — включили/выключили закрепление; onDone() — «Грати». */
export function showWelcome(root, { onLang, onPin, onDone }) {
  const render = () => {
    const lang = detectLang();
    const S = STR[lang] || STR.en;
    const p = prefs();
    root.innerHTML = '';
    const box = el('div', 'welcome-box');

    // язык: телефон может быть на языке, которого в игре нет, — поправить сразу
    const langs = el('div', 'chips welcome-langs');
    for (const l of LANGS) {
      const c = el('button', 'chip' + (l.code === lang ? ' on' : ''), `<span class="flag">${l.flag}</span>${l.name}`);
      c.addEventListener('click', () => { setPref('lang', l.code); onLang && onLang(l.code); render(); });
      langs.appendChild(c);
    }

    box.append(langs, el('h1', null, S.hi), el('p', 'hint', S.sub));

    const list = el('div', 'welcome-list');
    for (const [id, text] of [['home', S.home(num(p.gameHold, lang))], ['gear', S.gear(MENU_HOLD)], ['power', S.power(MENU_HOLD)]]) {
      const r = el('div', 'welcome-row');
      r.append(el('span', 'welcome-icon', icon(id)), el('p', null, text));
      list.appendChild(r);
    }
    box.appendChild(list);

    if (window.FGNative && window.FGNative.setPinned) {
      const pin = el('div', 'welcome-pin');
      const row = el('div', 'row plain');
      const sw = el('button', 'switch' + (p.pin ? ' on' : ''), '<span></span>');
      sw.setAttribute('role', 'switch');
      sw.addEventListener('click', () => { const v = !sw.classList.contains('on'); sw.classList.toggle('on', v); setPref('pin', v); onPin && onPin(); });
      row.append(el('span', 'row-name', S.pin), sw);
      pin.append(row, el('p', 'hint', S.pinHint));
      box.appendChild(pin);
    }

    box.appendChild(el('p', 'hint welcome-privacy', S.privacy));
    const go = el('button', 'set-done welcome-go', S.go);
    go.addEventListener('click', () => { setPref('welcomed', true); onDone && onDone(); });
    box.appendChild(go);
    root.appendChild(box);
  };
  render();
  root.classList.remove('hidden');
  root.scrollTop = 0;
}
