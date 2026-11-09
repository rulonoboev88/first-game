// «Обезьяний тест»: робот-малыш хаотично тычет во все игры (до 10 пальцев, «ладонь», долгие удержания, рывки),
// меняет размер экрана как Fold и планшет. Ловим ошибки, зависания и рост памяти.
// Запуск: сервер из www на :8765 (или PORT=…), затем  node tools/monkey.js [секунд_на_игру=30] [id,id,...]
// Обычные игры гоняются в обычном браузере; WebGL-игры — отдельно с программной видеокартой: GL=1 node tools/monkey.js
// (она медленная, поэтому для WebGL смотрим только ошибки и «жива ли», а не паузы между кадрами).
const { chromium } = require('playwright');
const SEC = +(process.argv[2] || 30);
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const SIZES = [[390, 860], [900, 810], [1280, 800]];

const CHAOS = `
window.__chaos = (ms, seed) => new Promise((done) => {
  let s = seed >>> 0 || 1;
  const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const el = () => document.querySelector('#stage canvas');
  const fingers = new Map();
  let nextId = 100, maxGap = 0, lastT = performance.now(), palms = 0;
  const fire = (type, f) => {
    const c = el(); if (!c) return;
    const r = c.getBoundingClientRect();
    c.dispatchEvent(new PointerEvent(type, { pointerId: f.id, pointerType: 'touch', isPrimary: f.primary,
      clientX: r.left + f.x, clientY: r.top + f.y, bubbles: true, cancelable: true, pressure: 0.5 }));
  };
  const add = (x, y) => {
    const c = el(); if (!c) return;
    const W = c.clientWidth, H = c.clientHeight;
    const f = { id: nextId++, x: x ?? R() * W, y: y ?? R() * H, vx: (R() - 0.5) * 40, vy: (R() - 0.5) * 40,
      life: R() < 0.5 ? 2 + R() * 6 : 10 + R() * 150, primary: fingers.size === 0, mode: R() < 0.4 ? 'still' : (R() < 0.5 ? 'swipe' : 'wander') };
    if (f.mode === 'swipe') { f.vx *= 3; f.vy *= 3; }
    fingers.set(f.id, f); fire('pointerdown', f);
  };
  const t0 = performance.now();
  const tick = () => {
    const now = performance.now();
    maxGap = Math.max(maxGap, now - lastT); lastT = now;
    const c = el();
    if (!c || now - t0 > ms) {
      for (const f of fingers.values()) fire('pointerup', f);
      fingers.clear();
      return done({ maxGap: Math.round(maxGap), palms });
    }
    const W = c.clientWidth, H = c.clientHeight;
    // новые касания: обычно 1–3 пальца, иногда «ладонь» из 6–10 пальцев рядом
    if (R() < 0.04 && fingers.size === 0) {
      palms++;
      const cx = R() * W, cy = R() * H, n = 6 + Math.floor(R() * 5);
      for (let i = 0; i < n; i++) add(cx + (R() - 0.5) * 160, cy + (R() - 0.5) * 160);
    } else if (fingers.size < 3 && R() < 0.12) add();
    else if (R() < 0.01) add(R() < 0.5 ? 2 : W - 2, R() * H);       // у самого края
    for (const f of [...fingers.values()]) {
      if (f.mode !== 'still' || R() < 0.1) {
        f.x = Math.max(-20, Math.min(W + 20, f.x + f.vx + (R() - 0.5) * 8));
        f.y = Math.max(-20, Math.min(H + 20, f.y + f.vy + (R() - 0.5) * 8));
        if (f.mode === 'wander') { f.vx += (R() - 0.5) * 10; f.vy += (R() - 0.5) * 10; }
        fire('pointermove', f);
      }
      if (--f.life <= 0) { fire(R() < 0.1 ? 'pointercancel' : 'pointerup', f); fingers.delete(f.id); }
    }
    if (R() < 0.002 && window.__game && window.__game.erase) window.__game.erase();
    setTimeout(tick, 16);
  };
  tick();
});`;

(async () => {
  const GLMODE = !!process.env.GL;
  const args = ['--enable-precise-memory-info', '--js-flags=--expose-gc', '--autoplay-policy=no-user-gesture-required'];
  if (GLMODE) args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist');
  const b = await chromium.launch({ args });
  const pg = await b.newPage({ viewport: { width: 390, height: 860 }, deviceScaleFactor: 1, locale: 'ru-RU' });
  const errs = [];
  pg.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await pg.addInitScript(() => { window.__errors = []; try { localStorage.clear(); } catch (_) {} });
  await pg.goto(`http://localhost:${process.env.PORT || 8765}/index.html`);
  await pg.waitForTimeout(800);
  await pg.addScriptTag({ content: CHAOS });
  const ids = await pg.evaluate(() => [...document.querySelectorAll('#tiles canvas[data-icon]')].map((c) => c.dataset.icon).filter((i) => i !== 'surprise'));
  const heap = async () => pg.evaluate(() => { if (window.gc) window.gc(); return Math.round(performance.memory.usedJSHeapSize / 1e5) / 10; });
  console.log('start heap MB', await heap());
  const rows = [];
  let seed = 1;
  for (const id of ids) {
    if (ONLY && !ONLY.includes(id)) continue;
    const isGL = await pg.evaluate(async (id) => {
      const { GAMES } = await import('./js/games/registry.js');
      const m = await GAMES.find((g) => g.id === id).load();
      return !!m.default.webgl;
    }, id);
    if (isGL !== GLMODE) continue;
    const e0 = errs.length;
    await pg.evaluate(() => { window.__errors.length = 0; });
    await pg.evaluate((id) => document.querySelector(`#tiles canvas[data-icon="${id}"]`).closest('.tile').click(), id);
    try { await pg.waitForFunction(() => window.__game, null, { timeout: 15000 }); }
    catch (_) { rows.push({ id, status: 'НЕ ОТКРЫЛАСЬ' }); continue; }
    const f0 = await pg.evaluate(() => window.__app.frames());
    let gap = 0, palms = 0;
    for (let k = 0; k < SIZES.length; k++) {
      const [w, h] = SIZES[(k + seed) % SIZES.length];
      await pg.setViewportSize({ width: w, height: h });
      const r = await pg.evaluate(([ms, s]) => window.__chaos(ms, s), [Math.round((SEC * 1000) / SIZES.length), seed++ * 7919]);
      gap = Math.max(gap, r.maxGap); palms += r.palms;
      if (process.env.DBG) console.log("  round", k, w, h, await pg.evaluate(() => [window.__app.frames(), !!window.__game, document.querySelector("#game").className, document.querySelector("#rest")?.className]));
    }
    // жива ли игра после хаоса: кадры идут?
    const f1 = await pg.evaluate(() => window.__app.frames());
    let f2 = f1;
    for (let i = 0; i < (GLMODE ? 100 : 10) && f2 <= f1; i++) { await pg.waitForTimeout(300); f2 = await pg.evaluate(() => window.__app.frames()); }
    if (process.env.DBG) for (let i = 0; i < 4; i++) { await pg.waitForTimeout(400); console.log('  after', await pg.evaluate(() => [window.__app.frames(), performance.now() | 0, document.hasFocus()])); }
    const gerr = await pg.evaluate(() => window.__errors.map((e) => `${e.where}: ${e.msg}`));
    await pg.evaluate(() => window.__app.closeGame());
    await pg.setViewportSize({ width: 390, height: 860 });
    await pg.waitForTimeout(300);
    rows.push({ id, frames: f1 - f0, alive: f2 > f1 ? 'да' : 'НЕТ', maxGapMs: gap, palms, errors: [...new Set(gerr.concat(errs.slice(e0)))].slice(0, 4), heapMB: await heap() });
    console.log(JSON.stringify(rows[rows.length - 1]));
  }
  console.log('stored log:', await pg.evaluate(() => localStorage.getItem('fg.errors.v1')));
  await b.close();
})();
