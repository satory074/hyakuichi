/**
 * Poem rendering helpers shared by the detail page and the quiz explanation
 */
import { isSpeechOn } from '../utils/speech.js';
import { poemExplanationHtml } from './poem-html.js';

/**
 * 読み上げボタンのHTML（設定OFFでは空文字）。
 * ハンドラは呼び出し側が attachSpeakHandlers(container) でバインドする。
 * data-audio: 再生するクリップID列（スペース区切り）、data-speak: TTSフォールバック用かな。
 * どちらもひらがな・英数字・ハイフン・スペースのみで引用符を含まないため属性エスケープ不要。
 * @param {Object} poem
 * @param {'kami'|'shimo'|'full'} part - full は一首通し（上の句→下の句の連結再生）
 * @param {string} label - aria-label 用の対象名（例: 上の句）
 */
export function speakButton(poem, part, label) {
  if (!isSpeechOn()) return '';
  const pad = String(poem.id).padStart(3, '0');
  const clips = part === 'full' ? `${pad}-kami ${pad}-shimo` : `${pad}-${part}`;
  const fallback = part === 'full' ? `${poem.kami.kana} ${poem.shimo.kana}` : poem[part].kana;
  return `<button type="button" class="speak-btn" data-audio="${clips}" data-speak="${fallback}" aria-label="${label}を読み上げ">&#x1F50A;</button>`;
}

/**
 * Render the poem body: 上の句 → 下の句 → 由来 → 絵札。
 * Shared by the detail page and the quiz's wrong-answer screen.
 * Excludes the header, poet-info, and prev/next nav — caller wraps this as needed.
 * 本体の HTML は poem-html.js（静的ページ /poems/{id}/ の書き出しと共用）。ここでは
 * アプリだけが持つもの（BASE_URL と読み上げボタン）を渡すだけにして、両者がずれないようにする。
 * @param {Object} poem
 * @param {Object} options - { maskShimo: boolean } 下の句をタップするまで隠す（詳細ページのみ）
 * @returns {string} HTML string
 */
export function renderPoemExplanation(poem, options = {}) {
  return poemExplanationHtml(poem, {
    base: import.meta.env.BASE_URL,
    // 誤答解説では答えを隠さないので既定は false。詳細ページだけ true を渡す
    maskShimo: options.maskShimo === true,
    speakButton,
  });
}
