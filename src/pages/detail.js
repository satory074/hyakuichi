/**
 * Detail page: flip card, kimariji highlight, status change, prev/next nav
 */
import { renderFlipCard } from '../components/card.js';
import { getStatus, setStatus } from '../utils/storage.js';

export function renderDetail(container, poems, params) {
  const id = parseInt(params[0]);
  const poem = poems.find((p) => p.id === id);

  if (!poem) {
    container.innerHTML = '<div class="page"><p>歌が見つかりません</p></div>';
    return;
  }

  const status = getStatus(poem.id);
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

      <div class="detail-kana">
        <div class="kana-row">
          <span class="kana-label">上の句</span>
          <span class="kana-text">${poem.kami.kana}</span>
        </div>
        <div class="kana-row">
          <span class="kana-label">下の句</span>
          <span class="kana-text">${poem.shimo.kana}</span>
        </div>
      </div>

      <div class="detail-kimariji">
        <span class="kimariji-label">決まり字（${poem.kimarijiCount}字決まり）</span>
        <span class="kimariji-value">${poem.kimariji}</span>
      </div>

      <div class="status-control">
        <span class="status-label">学習状態:</span>
        <div class="status-buttons">
          <button class="status-btn ${status === 'new' ? 'active' : ''}" data-status="new">未学習</button>
          <button class="status-btn ${status === 'learning' ? 'active' : ''}" data-status="learning">学習中</button>
          <button class="status-btn ${status === 'mastered' ? 'active' : ''}" data-status="mastered">暗記済</button>
        </div>
      </div>

      <nav class="detail-nav">
        <a href="#detail/${prevId}" class="nav-prev">&larr; 第${prevId}番</a>
        <a href="#detail/${nextId}" class="nav-next">第${nextId}番 &rarr;</a>
      </nav>
    </div>
  `;

  // Status change handlers
  container.querySelectorAll('.status-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setStatus(poem.id, btn.dataset.status);
      container.querySelectorAll('.status-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}
