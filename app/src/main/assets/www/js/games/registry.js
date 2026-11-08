// Список игр в меню. ready:false — плитка видна, но пока неактивна («скоро»).
// load() подгружает модуль игры только когда в неё заходят.

export const GAMES = [
  { id: 'test',      ready: true,  bg: '#FFF4E0', label: { uk: 'Перевірка', ru: 'Проверка', en: 'Test' },
    load: () => import('./test.js') },
  { id: 'chicks',    ready: true,  bg: '#FFF7D1', label: { uk: 'Курчата', ru: 'Цыплята', en: 'Chicks' },
    load: () => import('./chicks.js') },
  { id: 'bubbles',   ready: true,  bg: '#E3F3FF', label: { uk: 'Бульбашки', ru: 'Пузыри', en: 'Bubbles' },
    load: () => import('./bubbles.js') },
  { id: 'paint',     ready: true,  bg: '#FFE9EC', label: { uk: 'Фарби', ru: 'Краски', en: 'Paint' },
    load: () => import('./paint.js') },
  { id: 'ink', ready: true, bg: '#E7F5FF', label: { uk: 'Чорнило у воді', ru: 'Чернила в воде', en: 'Ink in water' },
    load: () => import('./ink.js') },
  { id: 'drip', ready: true, bg: '#FFF0F0', label: { uk: 'Стікаюча фарба', ru: 'Стекающая краска', en: 'Dripping paint' },
    load: () => import('./drip.js') },
  { id: 'finger', ready: true, bg: '#FFF3E0', label: { uk: 'Пальчикові фарби', ru: 'Пальчиковые краски', en: 'Finger paint' },
    load: () => import('./finger.js') },
  { id: 'blocks',    ready: true,  bg: '#E6F8E8', label: { uk: 'Кубики', ru: 'Кубики', en: 'Blocks' },
    load: () => import('./blocks.js') },
  { id: 'draw',      ready: true,  bg: '#F1EAFF', label: { uk: 'Малювалка', ru: 'Рисовалка', en: 'Drawing' },
    load: () => import('./draw.js') },
  { id: 'animals',   ready: true,  bg: '#FFEEDD', label: { uk: 'Звірята', ru: 'Зверята', en: 'Animals' },
    load: () => import('./animals.js') },
  { id: 'hide',      ready: true,  bg: '#E4F7E6', label: { uk: 'Хованки', ru: 'Прятки', en: 'Peekaboo' },
    load: () => import('./hide.js') },
  { id: 'fish',      ready: true,  bg: '#DFF1FF', label: { uk: 'Акваріум', ru: 'Аквариум', en: 'Aquarium' },
    load: () => import('./fish.js') },
  { id: 'sky', ready: true, bg: '#E3E6FF', label: { uk: 'Нічне небо', ru: 'Ночное небо', en: 'Night sky' },
    load: () => import('./sky.js') },
  { id: 'fireworks', ready: true, bg: '#FFE6F2', label: { uk: 'Салют', ru: 'Салют', en: 'Fireworks' },
    load: () => import('./fireworks.js') },
  { id: 'ducks', ready: true, bg: '#E0F6FF', label: { uk: 'Качечки', ru: 'Уточки', en: 'Duckies' },
    load: () => import('./ducks.js') },
  { id: 'train',     ready: true,  bg: '#FFE8E3', label: { uk: 'Потяг', ru: 'Паровозик', en: 'Train' },
    load: () => import('./train.js') },
];

export const SURPRISE_LABEL = { uk: 'Сюрприз', ru: 'Сюрприз', en: 'Surprise' };
