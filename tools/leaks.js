// Утечки: много раз открываем и закрываем все игры (с парой касаний), следим за памятью JS и ошибками.
// Запуск: сервер из www на :8765 (или PORT=…), затем  node tools/leaks.js [циклов=10]
//   PER=1 node tools/leaks.js 15  — каждую игру отдельно N раз подряд: какая из них «течёт».
// WebGL-игры здесь — на программной видеокарте (медленно, но для утечек годится).
const { chromium } = require('playwright');
const CYCLES = +(process.argv[2] || 10);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const pg = await b.newPage({ viewport: { width: 390, height: 860 }, deviceScaleFactor: 1 });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error' || /WebGL|context/i.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await pg.goto(`http://localhost:${process.env.PORT || 8765}/index.html`);
  await pg.waitForTimeout(800);
  const ids = await pg.evaluate(() => [...document.querySelectorAll('#tiles canvas[data-icon]')].map((c) => c.dataset.icon).filter((i) => i !== 'surprise'));
  const heap = () => pg.evaluate(() => { window.gc(); window.gc(); return +(performance.memory.usedJSHeapSize / 1048576).toFixed(2); });
  const nodes = () => pg.evaluate(() => document.getElementsByTagName('*').length);
  const rows = [];
  const once = async (id) => {
    await pg.evaluate((id) => document.querySelector(`#tiles canvas[data-icon="${id}"]`).closest('.tile').click(), id);
    await pg.waitForFunction(() => window.__game, null, { timeout: 20000 });
    await pg.evaluate(() => {
      const g = window.__game, W = g.stage.w, H = g.stage.h;
      for (let i = 0; i < 3; i++) {
        const p = { id: 50 + i, x: W * (0.3 + i * 0.2), y: H * 0.5, startX: 0, startY: 0, lastX: 0, lastY: 0, vx: 300, vy: 0, speed: 300, t0: performance.now(), t: performance.now(), dist: 0, moved: false, data: {} };
        g.onDown && g.onDown(p); p.x += 40; p.moved = true; g.onMove && g.onMove(p); g.onUp && g.onUp(p);
      }
    });
    await pg.waitForTimeout(250);
    await pg.evaluate(() => window.__app.closeGame());
    await pg.waitForTimeout(50);
  };
  if (process.env.PER) {
    for (const id of ids) {
      await once(id); await once(id);
      const h0 = await heap();
      for (let c = 0; c < CYCLES; c++) await once(id);
      const h1 = await heap();
      console.log(JSON.stringify({ id, kbPerOpen: Math.round(((h1 - h0) * 1024) / CYCLES) }));
    }
    console.log('errors:', [...new Set(errs)].slice(0, 10));
    await b.close();
    return;
  }
  for (let c = 0; c < CYCLES; c++) {
    const t0 = Date.now();
    for (const id of ids) {
      await pg.evaluate((id) => document.querySelector(`#tiles canvas[data-icon="${id}"]`).closest('.tile').click(), id);
      await pg.waitForFunction(() => window.__game, null, { timeout: 20000 });
      await pg.evaluate(() => {
        const g = window.__game, W = g.stage.w, H = g.stage.h;
        for (let i = 0; i < 3; i++) {
          const p = { id: 50 + i, x: W * (0.3 + i * 0.2), y: H * 0.5, startX: 0, startY: 0, lastX: 0, lastY: 0, vx: 300, vy: 0, speed: 300, t0: performance.now(), t: performance.now(), dist: 0, moved: false, data: {} };
          g.onDown && g.onDown(p);
          p.x += 40; p.moved = true; g.onMove && g.onMove(p);
          g.onUp && g.onUp(p);
        }
      });
      await pg.waitForTimeout(250);
      await pg.evaluate(() => window.__app.closeGame());
      await pg.waitForTimeout(50);
    }
    rows.push({ cycle: c + 1, heapMB: await heap(), domNodes: await nodes(), sec: Math.round((Date.now() - t0) / 1000) });
    console.log(JSON.stringify(rows[rows.length - 1]));
  }
  console.log('errors:', [...new Set(errs)].slice(0, 10));
  await b.close();
})();
