// Лёгкая вибрация. 0 — тик, 1 — клик, 2 — сильный клик.
// Ограничиваем частоту, чтобы при мультитаче телефон не «жужжал».

let last = 0;

export function haptic(level = 0) {
  const now = performance.now();
  if (now - last < 45) return;
  last = now;
  try {
    if (window.FGNative && window.FGNative.haptic) {
      window.FGNative.haptic(level);
    } else if (navigator.vibrate) {
      navigator.vibrate(level >= 2 ? 30 : level === 1 ? 18 : 10);
    }
  } catch (_) {}
}
