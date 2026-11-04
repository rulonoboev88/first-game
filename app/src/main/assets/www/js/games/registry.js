// Список игр в меню. ready:false — плитка видна, но пока неактивна («скоро»).
// load() подгружает модуль игры только когда в неё заходят.

export const GAMES = [
  { id: 'test',      ready: true,  bg: '#FFF4E0', label: { uk: 'Перевірка', ru: 'Проверка', en: 'Test' },
    load: () => import('./test.js') },
  { id: 'chicks',    ready: false, bg: '#FFF7D1', label: { uk: 'Курчата', ru: 'Цыплята', en: 'Chicks' } },
  { id: 'bubbles',   ready: false, bg: '#E3F3FF', label: { uk: 'Бульбашки', ru: 'Пузыри', en: 'Bubbles' } },
  { id: 'paint',     ready: false, bg: '#FFE9EC', label: { uk: 'Фарби', ru: 'Краски', en: 'Paint' } },
  { id: 'blocks',    ready: false, bg: '#E6F8E8', label: { uk: 'Кубики', ru: 'Кубики', en: 'Blocks' } },
  { id: 'draw',      ready: false, bg: '#F1EAFF', label: { uk: 'Малювалка', ru: 'Рисовалка', en: 'Drawing' } },
  { id: 'animals',   ready: false, bg: '#FFEEDD', label: { uk: 'Звірята', ru: 'Зверята', en: 'Animals' } },
  { id: 'hide',      ready: false, bg: '#E4F7E6', label: { uk: 'Хованки', ru: 'Прятки', en: 'Peekaboo' } },
  { id: 'fish',      ready: false, bg: '#DFF1FF', label: { uk: 'Акваріум', ru: 'Аквариум', en: 'Aquarium' } },
  { id: 'sky',       ready: false, bg: '#E3E6FF', label: { uk: 'Нічне небо', ru: 'Ночное небо', en: 'Night sky' } },
  { id: 'fireworks', ready: false, bg: '#FFE6F2', label: { uk: 'Салют', ru: 'Салют', en: 'Fireworks' } },
  { id: 'ducks',     ready: false, bg: '#E0F6FF', label: { uk: 'Качечки', ru: 'Уточки', en: 'Duckies' } },
  { id: 'train',     ready: false, bg: '#FFE8E3', label: { uk: 'Потяг', ru: 'Паровозик', en: 'Train' } },
];

export const SURPRISE_LABEL = { uk: 'Сюрприз', ru: 'Сюрприз', en: 'Surprise' };
