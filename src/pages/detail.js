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
  // 決まり字は上の句かなの接頭辞（全100首で検証済み）。色分け表示用に分割
  const kimarijiRest = poem.kami.kana.slice(poem.kimariji.length);

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

      <figure class="detail-efuda">
        <img
          class="efuda-img"
          src="${import.meta.env.BASE_URL}efuda/${String(poem.id).padStart(3, '0')}.jpg"
          alt="第${poem.id}番 ${poem.poet.kanji} 歌がるた絵札"
          width="328"
          height="458"
          loading="lazy"
        />
        <figcaption class="efuda-credit">歌がるた絵札（江戸期・パブリックドメイン / Wikimedia Commons）</figcaption>
      </figure>

      <div class="detail-kana">
        <div class="kana-row">
          <span class="kana-label">上の句</span>
          <span class="kana-text"><span class="kana-kimariji">${poem.kimariji}</span>${kimarijiRest}</span>
        </div>
        <div class="kana-row">
          <span class="kana-label">下の句</span>
          <span class="kana-text">${poem.shimo.kana}</span>
        </div>
      </div>

      ${poem.yurai ? `
      <div class="detail-yurai">
        ${poem.yurai.poetBio ? `
        <div class="yurai-block">
          <span class="yurai-label">作者について</span>
          <p class="yurai-text">${poem.yurai.poetBio}</p>
        </div>` : ''}
        ${poem.yurai.meaning ? `
        <div class="yurai-block">
          <span class="yurai-label">現代語訳</span>
          <p class="yurai-text">${poem.yurai.meaning}</p>
        </div>` : ''}
        ${poem.yurai.background ? `
        <div class="yurai-block">
          <span class="yurai-label">由来・背景</span>
          <p class="yurai-text">${poem.yurai.background}</p>
        </div>` : ''}
      </div>` : ''}

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
