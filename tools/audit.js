// Аудит качества всех игр (пункт «В» плана): для каждой игры —
//  · отклик: 9 касаний по сетке 3×3 — сколько из них дали звук (за 150 мс) и заметно изменили картинку;
//  · громкость: средний уровень (RMS, дБ) и пик на выходе во время касаний и проведений;
//  · покой: 10 с без касаний — сколько звуков сыграла сама игра (зазывает?) и шевелится ли картинка.
// Запуск: сервер из www на :8765 (или PORT=…), затем  node tools/audit.js [id,id,...]
const { chromium } = require('playwright');
const ONLY = process.argv[2] ? process.argv[2].split(',') : null;

const PAGE = `
// Снимок картинки сразу после очередной отрисовки игры (и для 2D, и для WebGL); 96×192 точки.
window.__last = null;
window.__hook = () => {
  const cur = window.__app.current(); if (!cur || cur.__hooked) return;
  cur.__hooked = true;
  const g = cur.game, orig = g.draw.bind(g);
  g.draw = (ctx) => {
    orig(ctx);
    if (!window.__want) return;
    window.__want = false;
    const c = cur.stage.canvas, W = c.width, H = c.height, out = new Uint8ClampedArray(96 * 192 * 4);
    let px;
    if (cur.stage.ctx) px = cur.stage.ctx.getImageData(0, 0, W, H).data;
    else { const gl = g.g.gl; px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); }
    for (let y = 0; y < 192; y++) for (let x = 0; x < 96; x++) {
      const i = ((Math.floor((y + 0.5) * H / 192) * W) + Math.floor((x + 0.5) * W / 96)) * 4, o = (y * 96 + x) * 4;
      out[o] = px[i]; out[o + 1] = px[i + 1]; out[o + 2] = px[i + 2];
    }
    window.__last = out;
  };
};
window.__snap = () => new Promise((res) => {
  window.__hook(); window.__want = true;
  const t0 = performance.now();
  const chk = () => (!window.__want || performance.now() - t0 > 120) ? res(window.__last || new Uint8ClampedArray(96 * 192 * 4)) : setTimeout(chk, 5);
  chk();
});
window.__diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 40) n++; return (n * 100) / (a.length / 4); }; // % изменившихся точек
window.__lvl = { on: false, sum: 0, n: 0, peak: 0 };
setInterval(() => {
  const L = window.__lvl; if (!L.on) return;
  const m = window.__audioMeter && window.__audioMeter(); if (!m) return;
  const d = new Float32Array(m.fftSize); m.getFloatTimeDomainData(d);
  let s = 0, p = 0; for (const v of d) { s += v * v; p = Math.max(p, Math.abs(v)); }
  const rms = Math.sqrt(s / d.length);
  if (rms > 0.001) { L.sum += rms * rms; L.n++; }
  L.peak = Math.max(L.peak, p);
}, 25);
window.__fire = (type, id, x, y) => {
  const c = document.querySelector('#stage canvas'); const r = c.getBoundingClientRect();
  c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: true, clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true }));
};`;

const db = (v) => (v > 0 ? +(20 * Math.log10(v)).toFixed(1) : -99);

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await b.newPage({ viewport: { width: 390, height: 860 }, deviceScaleFactor: 1, locale: 'uk-UA' });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(`http://localhost:${process.env.PORT || 8765}/index.html`);
  await pg.waitForTimeout(800);
  await pg.addScriptTag({ content: PAGE });
  // звук в браузере включается касанием — «касаемся» один раз
  await pg.mouse.click(5, 5);
  const ids = await pg.evaluate(() => [...document.querySelectorAll('#tiles canvas[data-icon]')].map((c) => c.dataset.icon).filter((i) => i !== 'surprise'));
  const rows = [];
  for (const id of ids) {
    if (ONLY && !ONLY.includes(id)) continue;
    await pg.evaluate((id) => document.querySelector(`#tiles canvas[data-icon="${id}"]`).closest('.tile').click(), id);
    await pg.waitForFunction(() => window.__game, null, { timeout: 20000 });
    await pg.waitForTimeout(1500);
    // покой
    const idle = await pg.evaluate(async () => {
      const s0 = window.__audioStats.starts, a = await window.__snap();
      await new Promise((r) => setTimeout(r, 10000));
      return { sounds: window.__audioStats.starts - s0, moves: +window.__diff(a, await window.__snap()).toFixed(2) };
    });
    // отклик и громкость
    const resp = await pg.evaluate(async () => {
      const g = window.__game, W = g.stage.w, H = g.stage.h;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const L = window.__lvl; L.on = true; L.sum = 0; L.n = 0; L.peak = 0;
      let snd = 0, vis = 0, id = 300;
      for (const fy of [0.3, 0.55, 0.8]) for (const fx of [0.2, 0.5, 0.8]) {
        // фон: насколько меняется картинка сама за то же время
        let a = await window.__snap(); await wait(160); const amb = window.__diff(a, await window.__snap());
        a = await window.__snap(); const s0 = window.__audioStats.starts;
        window.__fire('pointerdown', ++id, W * fx, H * fy); await wait(80); window.__fire('pointerup', id, W * fx, H * fy); await wait(300);
        if (window.__audioStats.starts > s0) snd++;
        if (window.__diff(a, await window.__snap()) > amb * 1.5 + 0.012) vis++;
        await wait(350);
      }
      for (let k = 0; k < 3; k++) {
        const y = H * (0.35 + k * 0.2);
        window.__fire('pointerdown', ++id, W * 0.15, y);
        for (let i = 1; i <= 20; i++) { await wait(16); window.__fire('pointermove', id, W * (0.15 + i * 0.035), y + Math.sin(i / 3) * 30); }
        window.__fire('pointerup', id, W * 0.85, y); await wait(300);
      }
      await wait(800);
      L.on = false;
      return { snd, vis, rms: L.n ? Math.sqrt(L.sum / L.n) : 0, peak: L.peak };
    });
    await pg.evaluate(() => window.__app.closeGame());
    await pg.waitForTimeout(300);
    const row = { id, 'звук 9 касаний': resp.snd, 'картинка 9 касаний': resp.vis, 'RMS дБ': db(resp.rms), 'пик дБ': db(resp.peak), 'покой: звуков за 10 с': idle.sounds, 'покой: картинка движется': idle.moves };
    rows.push(row);
    console.log(JSON.stringify(row));
  }
  console.table(rows);
  console.log('errors', errs);
  await b.close();
})();
