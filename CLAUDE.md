# First Game — notes for Claude sessions

**Current work: `docs/RELEASE_PLAN.md` — the approved release plan with checkboxes and a log. Read it, continue from the first unchecked item, update it as you go.**

Read `SPEC.md` first: it is the source of truth for every product decision (in Russian, the owner speaks Russian).
Answer the owner in Russian. Commit messages in English.

## Layout
- `app/src/main/java/.../MainActivity.java` — native shell: full-screen WebView, immersive, haptics bridge (`window.FGNative.haptic(level)`), back gesture swallowed. Only permission: VIBRATE (no INTERNET on purpose).
- `app/src/main/assets/www/` — the whole game, plain ES modules, no build step.
  - `js/main.js` — menu, game runner, hold-buttons (home 1 s, erase 2 s).
  - `js/games/registry.js` — menu tiles; each game module exports a default class with
    `static erasable/background/webgl/maxDpr/prepare()`, `onDown/onMove/onUp(p)`, `update(dt)`, `draw(ctx)`, `resize(prev,next)`, `erase()`, `destroy()`.
  - `js/core/` — stage (DPR canvas, Fold resize), input (multitouch), audio (Web Audio synth + OGG samples), haptics.
  - `js/art/` — all characters drawn in code (chick/birds, animals, sea).
  - `sounds/` — CC0 recordings (see `sounds/CREDITS.txt`), each folder has `manifest.json`.
  - `vendor/matter.min.js` — physics for blocks (MIT).
- Sizes are relative to `stage.unit` (min screen side). The owner prefers SMALL characters (birds ≈ 0.058·unit).

## Test locally
```
cd app/src/main/assets/www && python3 -m http.server 8765
```
Use Playwright (preinstalled) to open `index.html`, click tiles, simulate taps, screenshot at Fold sizes
(folded ~390×860, unfolded ~900×810) and tablet (1280×800). `window.__game` exposes the running game.
WebGL (paint) needs `--use-angle=swiftshader --enable-unsafe-swiftshader`.

## Build & deliver
- No Android SDK here (Google/Maven blocked). Push to `main` → GitHub Actions builds signed APK + AAB.
- Each build is published as a GitHub release and the APK is force-pushed to branch `builds`
  (`git fetch origin builds && git show origin/builds:first-game.apk > out.apk`) — send it to the owner with SendUserFile.
- Signing key lives only in repo secrets (FG_KEYSTORE_B64, FG_KEYSTORE_PASSWORD, FG_KEY_ALIAS, FG_KEY_PASSWORD); the owner has the backup.

## Sounds workflow
The sandbox cannot download from sound sites; the owner downloads CC0 files (BigSoundBank, Freesound with CC0 filter)
and attaches them. Cut/clean/normalize with numpy+ffmpeg → OGG Vorbis q5 mono, update `manifest.json` and `CREDITS.txt`.
