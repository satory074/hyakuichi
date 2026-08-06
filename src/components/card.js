/**
 * Flip card component (CSS 3D transform)
 * Shows kami-no-ku on front, shimo-no-ku on back
 */
import { getSettings } from '../utils/storage.js';
import { isSpeechOn } from '../utils/speech.js';

/**
 * 読み上げボタンのHTML（設定OFF・非対応ブラウザでは空文字）。
 * ハンドラは呼び出し側が attachSpeakHandlers(container) でバインドする。
 * @param {string} text - 読み上げるかな（ひらがな＋半角スペースのみ想定）
 * @param {string} label - aria-label 用の対象名（例: 上の句）
 */
export function speakButton(text, label) {
  if (!isSpeechOn()) return '';
  return `<button type="button" class="speak-btn" data-speak="${text}" aria-label="${label}を読み上げ">&#x1F50A;</button>`;
}

/**
 * Render a flip card for a poem
 * @param {Object} poem - The poem data
 * @param {Object} options - { highlightKimariji: boolean }
 * @returns {string} HTML string
 */
export function renderFlipCard(poem, options = {}) {
  const settings = getSettings();
  const useKanji = settings.showKanji;
  const highlight = options.highlightKimariji !== false;

  const kamiFront = useKanji ? poem.kami.kanji : poem.kami.kana;
  const shimoBack = useKanji ? poem.shimo.kanji : poem.shimo.kana;

  let kamiDisplay = kamiFront;
  if (highlight && poem.kimariji) {
    kamiDisplay = highlightKimariji(poem.kami.kana, poem.kimariji, kamiFront, useKanji);
  }

  return `
    <div class="flip-card" onclick="this.classList.toggle('flipped')">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <div class="card-label">上の句</div>
          <div class="card-poem">${kamiDisplay}</div>
          <div class="card-hint">タップして下の句を見る</div>
        </div>
        <div class="flip-card-back">
          <div class="card-label">下の句</div>
          <div class="card-poem">${shimoBack}</div>
          <div class="card-hint">タップして上の句に戻る</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the poem "explanation" body (絵札 + かな + 由来).
 * Shared by the detail page and the quiz's wrong-answer screen.
 * Excludes the header, poet-info, flip card, and prev/next nav —
 * caller wraps this with those as needed.
 * Sections order: 現代語訳 → 作者について → 由来・背景.
 * @param {Object} poem
 * @returns {string} HTML string
 */
export function renderPoemExplanation(poem) {
  // 決まり字は上の句かなの接頭辞（全100首で検証済み）。色分け表示用に分割
  const kimarijiRest = poem.kami.kana.slice(poem.kimariji.length);

  return `
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
        ${speakButton(poem.kami.kana, '上の句')}
      </div>
      <div class="kana-row">
        <span class="kana-label">下の句</span>
        <span class="kana-text">${poem.shimo.kana}</span>
        ${speakButton(poem.shimo.kana, '下の句')}
      </div>
    </div>

    ${poem.yurai ? `
    <div class="detail-yurai">
      ${poem.yurai.meaning ? `
      <div class="yurai-block">
        <span class="yurai-label">現代語訳</span>
        <p class="yurai-text">${poem.yurai.meaning}</p>
      </div>` : ''}
      ${poem.yurai.poetBio ? `
      <div class="yurai-block">
        <span class="yurai-label">作者について</span>
        <p class="yurai-text">${poem.yurai.poetBio}</p>
      </div>` : ''}
      ${poem.yurai.background ? `
      <div class="yurai-block">
        <span class="yurai-label">由来・背景</span>
        <p class="yurai-text">${poem.yurai.background}</p>
      </div>` : ''}
    </div>` : ''}
  `;
}

/**
 * Highlight kimariji in the kami-no-ku display
 */
function highlightKimariji(kana, kimariji, display, useKanji) {
  if (!useKanji) {
    // For kana display, highlight the kimariji prefix
    const kimarijiClean = kimariji.replace(/\s/g, '');
    let count = 0;
    let i = 0;
    let result = '<span class="kimariji">';
    while (count < kimarijiClean.length && i < kana.length) {
      if (kana[i] === ' ') {
        result += kana[i];
      } else {
        result += kana[i];
        count++;
      }
      i++;
    }
    result += '</span>' + kana.slice(i);
    return result;
  }

  // 漢字表示では決まり字の注記を出さない（決まり字は詳細ページの上の句で色分け表示）
  return display;
}
