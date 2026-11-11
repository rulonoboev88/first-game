// Наклон телефона: куда «вниз» в координатах экрана (x вправо, y вниз), в долях g (−1..1).
// Источник — devicemotion (accelerationIncludingGravity): в Android работает без разрешений.
// Учитывает поворот экрана (на планшете «низ» всегда там, где реальный низ).
// Встряска — резкий рывок поверх плавного наклона.

const G = 9.81;

export function createTilt({ onShake } = {}) {
  const T = {
    x: 0, y: 0,          // сглаженный вектор «вниз» в координатах экрана, доли g
    has: false,          // датчик прислал хоть одно событие
    last: 0,
    _ax: 0, _ay: 0, _az: 0, _jerk: 0, _shakeAt: -1e9,
  };

  const angle = () => {
    const o = screen.orientation;
    if (o && typeof o.angle === 'number') return o.angle;
    return typeof window.orientation === 'number' ? window.orientation : 0;
  };

  function onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null) return;
    const ax = a.x, ay = a.y, az = a.z || 0;
    if (!isFinite(ax) || !isFinite(ay)) return;
    // по спецификации (Chrome/Android) в покое показания = −гравитация в осях телефона:
    // x вправо, y к верху экрана, z на нас. «Вниз» на экране (y вниз) = (−ax, +ay).
    let vx = -ax / G, vy = ay / G;
    const r = (angle() * Math.PI) / 180;
    if (r) { const c = Math.cos(r), s = Math.sin(r); [vx, vy] = [vx * c - vy * s, vx * s + vy * c]; }
    // встряска: резкая смена показаний
    const j = Math.abs(ax - T._ax) + Math.abs(ay - T._ay) + Math.abs(az - T._az);
    T._ax = ax; T._ay = ay; T._az = az;
    T._jerk = Math.max(T._jerk * 0.85, j);
    const now = performance.now();
    if (T.has && j > 22 && now - T._shakeAt > 700) { T._shakeAt = now; onShake && onShake(Math.min(1, (j - 22) / 25)); }
    // сглаживание: плавно, но без заметной задержки
    const k = T.has ? 0.25 : 1;
    T.x += (Math.max(-1, Math.min(1, vx)) - T.x) * k;
    T.y += (Math.max(-1, Math.min(1, vy)) - T.y) * k;
    T.has = true;
    T.last = now;
  }

  window.addEventListener('devicemotion', onMotion);
  T.destroy = () => window.removeEventListener('devicemotion', onMotion);
  /** Для тестов: подставить наклон вручную. */
  T.set = (x, y) => { T.x = x; T.y = y; T.has = true; T.last = performance.now(); };
  return T;
}
