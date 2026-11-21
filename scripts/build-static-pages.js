/**
 * vite build の後に、JS を実行しなくても読める静的ページを dist/ に書き出す。
 *
 *   dist/poems/index.html        … 全100首の一覧
 *   dist/poems/{1..100}/index.html … 1 首ずつ（歌・かな・決まり字・現代語訳・由来・作者・絵札）
 *   dist/sitemap.xml             … トップ + 一覧 + 100 首 = 102 URL
 *
 * なぜ: アプリはハッシュ遷移（#detail/5）なので 100 首が 1 つの URL に見え、配信 HTML には本文が無い。
 * JS を実行しない AI クローラーにも読めるよう、1 首 1 URL の静的 HTML を作る。
 *
 * - 歌の本文の HTML はアプリと同じ src/components/poem-html.js を使う（見た目と中身がずれない）
 * - CSS は vite が出したハッシュ付きファイルを dist/index.html から読んで共有する
 * - 戻りリンクのバーは dist/index.html からそのまま写す（文言・リンク先を変えないため）
 * - アプリの JS は読み込まない（router が #app を消してホームを描いてしまうため）
 * - service worker はこれらの URL を index.html に差し替えない（vite.config.js の navigateFallbackDenylist）
 *
 * 実行: npm run build（vite build && node scripts/build-static-pages.js）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { poemExplanationHtml, poetInfoHtml, escapeHtml as e, efudaPath } from '../src/components/poem-html.js';
import { TABS } from '../src/components/nav.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

// vite.config.js の base と同じ。変えるときは両方そろえる
const BASE = '/hyakuichi/';
const SITE = `https://satory074.github.io${BASE}`;
const OG_IMAGE = `${SITE}og-image.png`;
const PERSON = {
  '@type': 'Person',
  '@id': 'https://satory074.com/#person',
  name: 'satory074',
  url: 'https://satory074.com/',
};

// ---------- データ（main.js と同じく由来を id で合成） ----------

const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const poems = readJson('src/data/poems.json');
const yurai = readJson('src/data/yurai.json');
poems.forEach((p) => {
  p.yurai = yurai[p.id];
});
poems.sort((a, b) => a.id - b.id);
if (poems.length !== 100 || poems.some((p, i) => p.id !== i + 1)) {
  throw new Error(`poems.json が 1〜100 番の 100 首になっていない (${poems.length} 首)`);
}

// ---------- dist/index.html から共有するもの ----------

const indexHtml = readFileSync(join(DIST, 'index.html'), 'utf8');
const cssHrefs = [...indexHtml.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]*\/assets\/[^"]+\.css)"/g)].map((m) => m[1]);
if (cssHrefs.length === 0) throw new Error('dist/index.html にアプリの CSS (assets/*.css) が見つからない。先に vite build を実行する');
const backlinkBar = indexHtml.match(/<nav class="app-backlink-bar"[\s\S]*?<\/nav>/)?.[0];
if (!backlinkBar) throw new Error('dist/index.html に app-backlink-bar が見つからない');

// ---------- 部品 ----------

const poemUrl = (id) => `${SITE}poems/${id}/`;
const poemPath = (id) => `${BASE}poems/${id}/`;
const fullKanji = (p) => `${p.kami.kanji} ${p.shimo.kanji}`;

/** JSON-LD を <script> に安全に埋める（"</script>" で抜けられないよう < をエスケープ） */
const jsonLd = (obj) => JSON.stringify({ '@context': 'https://schema.org', ...obj }).replace(/</g, '\\u003c');

// 静的ページの下部ナビ。アプリの #bottom-nav と同じ見た目で、行き先はアプリのハッシュ遷移（絶対パス）。
// これが無いと、ナビの真上に段積みしている戻りリンクのバーが宙に浮く（docs/app-backlink.md）
const bottomNav = `<nav id="bottom-nav">${TABS.map(
  (tab) => `
    <a href="${BASE}${tab.href}">
      <span class="nav-icon">${tab.icon}</span>
      <span class="nav-label">${tab.label}</span>
    </a>`
).join('')}
  </nav>`;

function layout({ title, description, url, ld, body, ogType = 'article' }) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#1a1a2e" />
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}" />
  <link rel="canonical" href="${e(url)}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:url" content="${e(url)}" />
  <meta property="og:site_name" content="百一" />
  <meta property="og:title" content="${e(title)}" />
  <meta property="og:description" content="${e(description)}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:alt" content="百一 — 小倉百人一首 暗記アプリ" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${e(title)}" />
  <meta name="twitter:description" content="${e(description)}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap" rel="stylesheet" />
  <link rel="icon" href="${BASE}favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="${BASE}icons/icon-192x192.svg" />
${cssHrefs.map((href) => `  <link rel="stylesheet" href="${e(href)}" />`).join('\n')}
  <script type="application/ld+json">${jsonLd(ld)}</script>
</head>
<body>
  <div id="app">
${body}
  </div>
  ${backlinkBar}
  ${bottomNav}
</body>
</html>
`;
}

function write(rel, html) {
  const file = join(DIST, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// ---------- 1 首のページ ----------

function poemPage(poem) {
  const prevId = poem.id > 1 ? poem.id - 1 : 100;
  const nextId = poem.id < 100 ? poem.id + 1 : 1;
  const url = poemUrl(poem.id);
  const title = `${poem.kami.kanji}（百人一首 第${poem.id}番・${poem.poet.kanji}）｜百一`;
  const description =
    `百人一首 第${poem.id}番、${poem.poet.kanji}の「${fullKanji(poem)}」。` +
    `読み（かな）、決まり字「${poem.kimariji}」、現代語訳、由来・背景、作者についての解説。`;
  const hasEfuda = existsSync(join(ROOT, 'public', efudaPath(poem)));

  const body = `    <main class="page detail-page">
      <header class="page-header detail-header">
        <a href="${BASE}poems/" class="back-link">&larr; 百首の一覧</a>
        <h1>百人一首 第${poem.id}番</h1>
      </header>
${poetInfoHtml(poem)}

      <p class="static-kimariji">決まり字 <span class="kana-kimariji">${e(poem.kimariji)}</span>（${poem.kimarijiCount}字決まり）</p>

${poemExplanationHtml(poem, { base: BASE, efuda: hasEfuda })}

      <div class="static-app-links">
        <a href="${BASE}#detail/${poem.id}" class="btn-primary">アプリでこの歌を開く（読み上げ）</a>
        <a href="${BASE}#quiz" class="btn-secondary">札取りクイズで覚える</a>
      </div>

      <nav class="detail-nav" aria-label="前後の歌">
        <a href="${poemPath(prevId)}" class="nav-prev">&larr; 第${prevId}番</a>
        <a href="${poemPath(nextId)}" class="nav-next">第${nextId}番 &rarr;</a>
      </nav>
    </main>`;

  return layout({
    title,
    description,
    url,
    body,
    ld: {
      '@type': 'WebPage',
      '@id': url,
      url,
      name: title,
      description,
      inLanguage: 'ja',
      isPartOf: { '@id': `${SITE}#website` },
      author: PERSON,
      about: {
        '@type': 'CreativeWork',
        name: fullKanji(poem),
        author: { '@type': 'Person', name: poem.poet.kanji },
      },
    },
  });
}

// ---------- 一覧ページ ----------

function listPage() {
  const url = `${SITE}poems/`;
  const title = '小倉百人一首 全100首の一覧（歌・作者・決まり字）｜百一';
  const description =
    '小倉百人一首の全100首を番号順に並べた一覧。上の句・下の句・作者・決まり字と、決まり字の字数ごとの首数。' +
    '各歌のページで読み・現代語訳・由来・作者の解説を読めます。';

  const byCount = new Map();
  for (const p of poems) byCount.set(p.kimarijiCount, [...(byCount.get(p.kimarijiCount) ?? []), p]);
  const counts = [...byCount.keys()].sort((a, b) => a - b);

  const items = poems
    .map(
      (p) => `
        <li>
          <a href="${poemPath(p.id)}" class="poem-item">
            <span class="poem-number">${p.id}</span>
            <div class="poem-text">
              <span class="poem-kami">${e(p.kami.kanji)}</span>
              <span class="poem-shimo">${e(p.shimo.kanji)}</span>
              <span class="poem-poet">${e(p.poet.kanji)}　決まり字 <span class="kana-kimariji">${e(p.kimariji)}</span></span>
            </div>
          </a>
        </li>`
    )
    .join('');

  const body = `    <main class="page browse-page static-list">
      <header class="page-header">
        <h1>小倉百人一首 全100首</h1>
      </header>

      <p class="static-lead">百人一首の 100 首を番号順に並べました。歌を選ぶと、かな、決まり字、現代語訳、由来・背景、作者についての解説を読めます。決まり字は、上の句をそこまで聞けばどの札か決まる最初の文字です。</p>

      <section class="static-section">
        <h2 class="section-title">決まり字の字数と首数</h2>
        <ul class="static-counts">
${counts.map((n) => `          <li>${n}字決まり <strong>${byCount.get(n).length}首</strong>${n === 1 ? `（${byCount.get(n).map((p) => e(p.kimariji)).join('・')}）` : ''}</li>`).join('\n')}
        </ul>
      </section>

      <div class="static-app-links">
        <a href="${BASE}#quiz" class="btn-primary">アプリの札取りクイズで覚える</a>
      </div>

      <ul class="poem-list">${items}
      </ul>
    </main>`;

  return layout({
    title,
    description,
    url,
    body,
    ogType: 'website',
    ld: {
      '@type': 'CollectionPage',
      '@id': url,
      url,
      name: title,
      description,
      inLanguage: 'ja',
      isPartOf: { '@id': `${SITE}#website` },
      author: PERSON,
    },
  });
}

// ---------- サイトマップ ----------

function sitemap() {
  const urls = [SITE, `${SITE}poems/`, ...poems.map((p) => poemUrl(p.id))];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${e(u)}</loc></url>`).join('\n')}
</urlset>
`;
}

write('poems/index.html', listPage());
for (const p of poems) write(`poems/${p.id}/index.html`, poemPage(p));
write('sitemap.xml', sitemap());
console.log(`build-static-pages: poems/ + ${poems.length} 首のページ + sitemap.xml (${poems.length + 2} URL) を dist/ に書き出しました`);
