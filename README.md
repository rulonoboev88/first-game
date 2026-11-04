# First Game

A free toddler game for Android. No ads, no in-app purchases, no tracking, no internet permission.
Big, simple, cause-and-effect play: tap, swipe, hold — something cute happens.

Безкоштовна гра для малят. Без реклами, без покупок, без збору даних, без інтернету.

Бесплатная игра для малышей. Без рекламы, без покупок, без сбора данных, без интернета.

## How it works

- `app/src/main/java/...` — a tiny native Android shell: one full-screen WebView, immersive mode,
  haptics bridge, back gesture disabled (toddler-proof). The app requests **only** the `VIBRATE` permission.
- `app/src/main/assets/www/` — the games themselves: plain HTML5 Canvas / JavaScript modules, no build step.
  All graphics are drawn in code and all sounds are synthesized with Web Audio — there are no third-party assets.
- `SPEC.md` — the full design spec (in Russian). Start here.

## Develop

Open the games in any browser — no build needed:

```
cd app/src/main/assets/www
python3 -m http.server 8000
# open http://localhost:8000
```

Build the APK (needs Android SDK, JDK 17 and Gradle 8.14):

```
gradle assembleRelease
```

CI builds a signed APK (for direct install) and AAB (for Google Play) on every push — see Actions.

## License

Code: MIT. Font: Nunito (SIL Open Font License 1.1, see `app/src/main/assets/www/fonts/`).
