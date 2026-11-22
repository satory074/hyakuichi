# CLAUDE.md

百一（ひゃくいち）— 小倉百人一首 100 首を暗記する PWA。Vite + 素の JavaScript（フレームワークなし）。

- **本番**: https://satory074.github.io/hyakuichi/ （GitHub Pages。`.github/workflows/deploy.yml` が main への push と手動実行でビルド・デプロイする。ブランチの push では走らない）
- `npm run deploy` / `firebase.json` / `.firebaserc` は Firebase Hosting 向けで、GitHub Pages の本番とは関係しない
- satory074.com/apps に掲載（GitHub topic `featured-app`）。戻りリンクのバーの仕様は `basecamp/docs/app-backlink.md`

## コマンド

```bash
npm ci
npm run dev          # Vite 開発サーバー（/hyakuichi/。静的ページ /poems/ はビルドしないと無い）
npm run build        # vite build → node scripts/build-static-pages.js（/poems/ と sitemap.xml を dist/ に書き出す）
npm run seo-check    # dist/ を検査（node scripts/seo-check.mjs dist https://satory074.github.io/hyakuichi/ --require-backlink）
npm run preview
npm run prepare-data     # src/data/poems.json を外部 Gist から作り直す（通常は不要）
npm run generate-audio   # VOICEVOX で public/audio/*.m4a を生成（localhost:50021 のエンジンが必要）
```

テスト・lint は無い。壊れたら困る不変条件は `scripts/seo-check.mjs`（basecamp の原本のコピー。中身は変えない）で、deploy.yml がビルド直後に走らせ、破ったら deploy しない。

本番と同じパスで確かめるとき: 一時ディレクトリに `hyakuichi/` を作って `dist/` の中身を入れ、`python3 -m http.server <port> -d <一時ディレクトリ>` で配信して `http://localhost:<port>/hyakuichi/poems/5/` を開く。

## 構成

- `index.html` — アプリの入口。`<div id="app">` の中に JS を実行しない読み手向けの短い紹介（`/hyakuichi/poems/` へのリンク付き）がある。アプリ起動時に router が `#app` を空にして描き直すので二重には出ない。canonical・JSON-LD（`WebSite`、`@id` は `https://satory074.github.io/hyakuichi/#website`、author は `https://satory074.com/#person`）もここ
- `src/main.js` — データ読み込み（`poems.json` に `yurai.json` を id で合成）、ルート登録、下部ナビ、router 起動
- `src/utils/router.js` — ハッシュ遷移。`#home` / `#browse` / `#detail/<id>` / `#quiz[/<mode>]` / `#settings`。不明なハッシュはホーム。遷移のたびに `app.innerHTML = ''`
- `src/pages/` — `home` / `browse` / `detail` / `quiz` / `settings`
- `src/components/poem-html.js` — **歌の本文（上の句・下の句・現代語訳・由来・作者・絵札）と作者名の HTML を作る純粋関数**。アプリ（`card.js` → 詳細ページ・クイズの誤答解説、`detail.js`）と静的ページの書き出しスクリプトの両方が使う。`import.meta.env`・読み上げ・localStorage・DOM には触らない（Node から import するため）。絵札の基点パス `base` と読み上げボタン `speakButton` は呼び出し側が渡す。歌の文字はここでエスケープする
- `src/components/card.js` — `renderPoemExplanation()`（`poem-html.js` に `import.meta.env.BASE_URL` と読み上げボタンを渡すだけ）と `speakButton()`
- `src/components/nav.js` — 下部ナビ。`TABS` は静的ページも使う
- `src/utils/storage.js` — localStorage。キーは `hyakuichi_progress`（歌ごとの new / learning / mastered と連続正解数）と `hyakuichi_settings`。**オリジン（satory074.github.io）を変えると利用者の記録が消える**
- `src/utils/speech.js` — 読み上げ。`public/audio/` の事前生成 m4a（VOICEVOX、全 100 首＋序歌）を再生し、失敗時は Web Speech API に落とす
- `src/data/poems.json`（`prepare-data` が生成）と `src/data/yurai.json`（現代語訳・由来・作者の解説、手で保守）
- `public/efuda/` — 歌がるた絵札（江戸期、パブリックドメイン。出典は `public/efuda/SOURCE.md`）

## 静的ページ（検索・AI クローラー向け）

アプリはハッシュ遷移なので 100 首が 1 つの URL に見え、配信 HTML には本文が無い。JS を実行しないクローラー（GPTBot・ClaudeBot など）にも読めるよう、`scripts/build-static-pages.js` が `vite build` の後に書き出す:

- `dist/poems/index.html` — 全 100 首の一覧（上の句・下の句・作者・決まり字、決まり字の字数ごとの首数）。JSON-LD は `CollectionPage`
- `dist/poems/{1..100}/index.html` — 1 首ずつ（作者・決まり字・上の句と下の句の漢字かな・現代語訳・由来・作者について・絵札）。前後の歌と一覧へのリンク、アプリへのリンク。JSON-LD は `WebPage`（`about` に歌の `CreativeWork`、その author に歌人の `Person`）
- `dist/sitemap.xml` — トップ＋一覧＋100 首の 102 URL

書き出しの決まりごと:

- アプリの JS は読み込まない（router が `#app` を消してホームを描いてしまう）。CSS は `dist/index.html` が参照するハッシュ付きの `assets/*.css` を同じく読む。戻りリンクのバーは `dist/index.html` からそのまま写す
- 下部ナビ（`#bottom-nav`）も静的に出す。戻りリンクのバーはこのナビの真上に段積みしているので、ナビが無いとバーが宙に浮く
- 静的ページからアプリへのリンクは絶対パス（`/hyakuichi/#detail/5`、`/hyakuichi/#quiz`）。`#detail/5` だとページ内アンカーになる
- `BASE`（`/hyakuichi/`）は `vite.config.js` の `base` と同じ値をスクリプト内に持っている。変えるときは両方
- タイトルは「上の句（百人一首 第N番・歌人）｜百一」。全ページで固有であること（seo-check が検査）
- 歌のデータに項目を足すときは `poem-html.js` を直せばアプリと静的ページの両方に出る

### service worker の罠（重要）

vite-plugin-pwa（generateSW）の既定では、すべてのページ遷移に `index.html`（アプリの殻）を返す `NavigationRoute` が入る。そのままだと、一度アプリを開いた利用者が `/hyakuichi/poems/5/` を開いてもアプリのホームが出る。`vite.config.js` の `workbox.navigateFallbackDenylist` で `/poems/` と `sitemap.xml` を外している。`globIgnores` で `poems/**` をプリキャッシュからも外している（今は SW 生成の後に書き出すので元々入らないが、順番が変わっても初回インストールに 101 ページを足さないため）。ビルド後に `grep -o 'NavigationRoute([^;]*' dist/sw.js` で `denylist` が入っていることを確かめられる。

## その他のハマりどころ

- 絵札（約 6MB）と朗読音声（約 10MB）はプリキャッシュせず、閲覧時に CacheFirst で 1 年キャッシュする。音声を作り直したら `vite.config.js` の `cacheName` を `poem-audio-v3` のように上げる
- サイトマップは `https://satory074.github.io/hyakuichi/sitemap.xml`。プロジェクトサイトの robots.txt は読まれないので、`satory074.github.io` リポジトリの `robots.txt` に `Sitemap:` 行で載せる
