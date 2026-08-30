/**
 * Detail page: 上の句 → 下の句（タップで表示）→ 由来 → 絵札、prev/next nav
 */
import { renderPoemExplanation } from '../components/card.js';
import { attachSpeakHandlers, speakReading, stopSpeech } from '../utils/speech.js';

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

      ${renderPoemExplanation(poem, { maskShimo: true })}

      <nav class="detail-nav">
        <a href="#detail/${prevId}" class="nav-prev">&larr; 第${prevId}番</a>
        <a href="#detail/${nextId}" class="nav-next">第${nextId}番 &rarr;</a>
      </nav>
    </div>
  `;

  attachSpeakHandlers(container);

  // 下の句マスク: タップで解除（ページ遷移で再レンダリングされ再びマスクされる）
  container.querySelector('.kana-mask')?.addEventListener('click', (e) => {
    e.currentTarget.closest('.kana-row').classList.remove('is-masked');
  });

  // ページを開いたら上の句を自動再生。
  // URLを直接開いた場合はブロックされる（auto: 最初の操作で再試行）
  speakReading(poem, { auto: true });

  // 前後ナビ・ページ離脱時に読み上げを止める
  return () => stopSpeech();
}
