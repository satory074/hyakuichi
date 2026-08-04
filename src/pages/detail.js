/**
 * Detail page: flip card, kimariji highlight, prev/next nav
 */
import { renderFlipCard, renderPoemExplanation } from '../components/card.js';

export function renderDetail(container, poems, params) {
  const id = parseInt(params[0]);
  const poem = poems.find((p) => p.id === id);

  if (!poem) {
    container.innerHTML = '<div class="page"><p>歌が見つかりません</p></div>';
    return;
  }

  const prevId = poem.id > 1 ? poem.id - 1 : 100;
  const nextId = poem.id < 100 ? poem.id + 1 : 1;

  container.innerHTML = `
    <div class="page detail-page">
      <header class="page-header detail-header">
        <a href="#browse" class="back-link">&larr; 一覧</a>
        <h1>第${poem.id}番</h1>
      </header>

      <div class="poet-info">
        <span class="poet-name">${poem.poet.kanji}</span>
        <span class="poet-kana">${poem.poet.kana}</span>
      </div>

      ${renderFlipCard(poem)}

      ${renderPoemExplanation(poem)}

      <nav class="detail-nav">
        <a href="#detail/${prevId}" class="nav-prev">&larr; 第${prevId}番</a>
        <a href="#detail/${nextId}" class="nav-next">第${nextId}番 &rarr;</a>
      </nav>
    </div>
  `;
}
