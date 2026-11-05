// Подгрузка обычного (не модульного) скрипта, например физического движка.
const cache = new Map();
export function loadScript(src) {
  if (cache.has(src)) return cache.get(src);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  cache.set(src, p);
  return p;
}
