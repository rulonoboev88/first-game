# Публикация в Google Play — пошагово (для владельца)

Сверено с правилами Google на 2026-11-09:
- [Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335) — правила для детских приложений;
- [тестирование для новых личных аккаунтов](https://support.google.com/googleplay/android-developer/answer/14151465) — 12 тестировщиков, 14 дней;
- [Target audience and content](https://support.google.com/googleplay/android-developer/answer/9285070).

## 0. Что уже готово в приложении
- targetSdk 36 (Android 16) — требование Google выполнено.
- Разрешения: только VIBRATE. Нет INTERNET, нет AD_ID, нет геолокации, нет сторонних SDK, нет рекламы и покупок.
- Подписанный AAB собирается в GitHub Actions на каждый пуш в main (релиз на GitHub, файл `.aab`).
- Политика конфиденциальности: `docs/privacy.html` (en + uk).

## 1. Шаги владельца (то, что могу сделать только ты)
1. **Включить GitHub Pages**: репозиторий → Settings → Pages → Source: «Deploy from a branch», Branch: `main`, папка `/docs` → Save.
   Через минуту политика будет по адресу `https://rulonoboev88.github.io/first-game/privacy.html` — эта ссылка нужна в Play Console.
2. **Аккаунт разработчика**: play.google.com/console → личный аккаунт (Personal), взнос 25 $, подтверждение личности (документ) и телефона.
   Понадобится публичный e-mail для связи — он виден в карточке приложения.
3. **Создать приложение**: название (см. «Название»), язык по умолчанию — українська, «Игра», «Бесплатно».
4. **Подпись**: Play App Signing — включён по умолчанию. Загружаем наш AAB: наш ключ становится «ключом загрузки».
5. **Закрытый тест**: Testing → Closed testing → создать трек, добавить ≥12 тестировщиков (e-mail Google-аккаунтов, удобно — Google-группа),
   загрузить AAB, отправить на проверку. Тестировщики открывают ссылку-приглашение, нажимают «стать тестировщиком» и ставят игру.
   **Все 12 должны оставаться в тесте 14 дней подряд** (кто вышел и вернулся — его отсчёт начинается заново).
6. Через 14 дней: Dashboard → **Apply for production** — три раздела анкеты (ответы-черновики ниже). Google проверяет обычно до 7 дней.

## 2. Ответы для анкет Play Console (черновик)
- **App access**: всё доступно без входа. Родительские настройки — удерживать ⚙ 3 секунды (написать это в инструкции для проверяющих).
- **Ads**: No.
- **Content rating (IARC)**: категория «Игра»; насилия, страха, азарта, покупок, общения между пользователями, обмена местоположением — нет. Ожидаем «3+ / PEGI 3».
- **Target audience**: только **«5 лет и младше»** (Google требует для приложений для малышей выбирать только эту группу).
- **News app**: No. **COVID**: No. **Government**: No. **Financial features**: No. **Health**: No.
- **Data safety**: «Приложение не собирает и не передаёт данные» — Yes, no data collected. Шифрование при передаче — неприменимо (нет сети).
  Удаление данных — неприменимо. Отчёт об ошибках родитель отправляет сам через системное «Поделиться» — это не сбор данных приложением.
- **Advertising ID**: не используется.
- **Privacy policy URL**: `https://rulonoboev88.github.io/first-game/privacy.html`.

Риск, о котором стоит знать: в Families Policy есть пункт «не делать просто обёртку сайта в WebView». У нас не сайт: вся игра лежит
внутри приложения и работает без интернета — это обычный способ сделать игру, но в ответе на вопросы Google можно об этом сказать.

## 3. Анкета «Apply for production» (черновик, заполним после теста)
- О тесте: тестировщики — родители малышей из окружения; что они сказали; что поправили.
- О приложении: аудитория — дети до 5 лет и их родители; ценность — спокойные игры без рекламы, без интернета, защита от выхода; ожидаемые установки за год.
- Готовность: обезьяний тест всех игр, проверка утечек памяти, журнал ошибок, исправления после закрытого теста.

## 4. Витрина
**Название (решение владельца 2026-11-09): Toddler First Game — baby touch games.**
Google ограничивает заголовок 30 знаками, поэтому: заголовок «Toddler First Game» (18), а «baby touch games» — в коротком описании и тексте.
Подпись под иконкой на телефоне остаётся короткой — «First Game» (длинное Android обрежет).

### Заголовок (оба языка)
Toddler First Game

### Короткое описание (до 80)
- en (71): Gentle touch games for babies & toddlers. No ads, no internet, no data.
- uk (75): Ніжні ігри на дотик для малят. Без реклами, без інтернету, без збору даних.

### Полное описание — en
Toddler First Game is a set of calm baby touch games made by a dad for his little daughter — and now for yours.

Every touch answers with a sound, a little animation and a gentle vibration, so even the youngest players understand: “I did that!”

19 games inside:
• Chicks — tap to hatch eggs, scatter grain, meet the fox
• Train — a steam train with real chuff-chuff and whistle, animal passengers, stations and tunnels
• Animals — farm and forest friends that wave, talk and react
• Peekaboo — who is hiding behind the bush?
• Feed the animals — give everyone their favourite food (and watch the funny “yuck!” faces)
• Flashlight — find animals in the night with your fingers
• Aquarium, Duckies, Bubbles, Blocks
• Painting: Paint, Finger paint, Dripping paint, Ink in water, Marbling, Drawing
• Night sky and Fireworks

Made for parents, too:
• No ads, no in-app purchases, no accounts
• No internet access at all — the app cannot send anything anywhere
• Exit protection: the game can be pinned to the screen, so swipes and split screen don’t throw the child out
• Parent settings behind a 3-second hold: choose and reorder games, play-time limit with a sleepy “time to rest” screen, language
• Works great on phones, tablets and foldables

Open source: github.com/rulonoboev88/first-game

### Полное описание — uk
Toddler First Game — це спокійні ігри на дотик для малят. Їх зробив тато для своєї маленької доньки, а тепер — і для вашої.

Кожен дотик відповідає звуком, маленькою анімацією та легкою вібрацією, тож навіть найменші розуміють: «Це я зробив!»

19 ігор усередині:
• Курчата — тапни, і з яйця вилупиться курча; сип зернятка, стережись лисички
• Потяг — паровозик зі справжнім «чух-чух» і гудком, звірята-пасажири, станції та тунелі
• Звірята — друзі з ферми та лісу махають, говорять і відповідають
• Хованки — хто сховався за кущиком?
• Нагодуй звірят — дай кожному улюблену їжу (і подивись на кумедне «бе-е!»)
• Ліхтарик — шукай звірят уночі пальчиками
• Акваріум, Качечки, Бульбашки, Кубики
• Малювання: Фарби, Пальчикові фарби, Стікаюча фарба, Чорнило у воді, Ебру, Малювалка
• Нічне небо та Салют

І для батьків:
• Без реклами, без покупок, без облікових записів
• Взагалі без доступу до інтернету — застосунок фізично не може нічого надіслати
• Захист від виходу: гру можна закріпити на екрані — свайпи й розділення екрана не викидають дитину
• Налаштування для батьків — за утриманням 3 секунди: вибір і порядок ігор, обмеження часу гри з сонним екраном «Час відпочити», мова
• Чудово працює на телефонах, планшетах і розкладачках

Відкритий код: github.com/rulonoboev88/first-game

### Графика (на утверждение владельцу)
- Иконка 512×512 PNG: владелец оставил ТЕКУЩУЮ иконку приложения (цыплёнок на голубом) → `docs/store/icon_512.png` (tools/store/play_icon.py).
- Баннер 1024×500: `docs/store/feature_1024x500.png` (черновик, tools/store/feature.html) — ждёт ок владельца.
- Баннер 1024×500, скриншоты телефона (6–8), планшета 7" и 10", видео (по желанию).
