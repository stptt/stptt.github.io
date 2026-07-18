# stptt.github.io

Публичный user-site для приложения **«Круг»** (закрытый видеомессенджер).

## Что здесь
- **Юридические страницы** (обязательны для сторов): `privacy.html`, `terms.html`,
  `delete-account.html`, хаб `index.html`, общий `style.css`. Источник текстов —
  `docs/store/*.md` в основном репозитории приложения.
- **Инвайт-ссылки** `https://stptt.github.io/join/<token>`:
  - `404.html` — на GitHub Pages нет wildcard-маршрутов, поэтому страница `/join/<token>`
    отдаётся через `404.html`, который по `location.pathname` достаёт токен и показывает
    приглашение + кнопку `krug://join/<token>` (фолбэк, когда приложение не установлено).
    Когда приложение установлено и App Links/Universal Links проверены — ОС открывает
    приложение напрямую, эта страница не грузится.
  - `join/index.html` — для «голого» `/join` без токена.
- **`.well-known/`** — верификация связи сайт↔приложение:
  - `assetlinks.json` (Android App Links, package `ru.krug.app`, SHA-256 отпечатки).
  - `apple-app-site-association` (iOS Universal Links, `<TEAMID>.ru.krug.app`, paths `/join/*`).
- **`.nojekyll`** — чтобы GitHub Pages отдавал папку `.well-known/` (Jekyll игнорирует dot-папки).

## Публикация
GitHub → Settings → Pages → Source = **Deploy from a branch**, branch `main` / root.
User-site публикуется на `https://stptt.github.io/`.
