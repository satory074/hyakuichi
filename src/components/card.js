/**
 * Flip card component (CSS 3D transform)
 * Shows kami-no-ku on front, shimo-no-ku on back
 */
import { getSettings } from '../utils/storage.js';

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
