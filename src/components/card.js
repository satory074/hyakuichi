/**
 * Poem rendering helpers shared by the detail page and the quiz explanation
 */
import { isSpeechOn } from '../utils/speech.js';

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
 * 上下句はどちらも漢字かな交じり（主）＋かな（従、上の句は決まり字を色分け）の2段表示。
 * @param {Object} poem
 * @param {Object} options - { maskShimo: boolean } 下の句をタップするまで隠す（詳細ページのみ）
 * @returns {string} HTML string
 */
export function renderPoemExplanation(poem, options = {}) {
  // 誤答解説では答えを隠さないので既定は false。詳細ページだけ true を渡す
  const maskShimo = options.maskShimo === true;

  // 決まり字は上の句かなの接頭辞（全100首で検証済み）。色分け表示用に分割
  const kimarijiRest = poem.kami.kana.slice(poem.kimariji.length);

  return `
    <div class="detail-kana">
      <div class="kana-row">
        <span class="kana-label">上の句</span>
        <span class="kana-kanji">${poem.kami.kanji}</span>
        <span class="kana-text"><span class="kana-kimariji">${poem.kimariji}</span>${kimarijiRest}</span>
        ${speakButton(poem, 'kami', '上の句')}
      </div>
      <div class="kana-row kana-row-shimo${maskShimo ? ' is-masked' : ''}">
        <span class="kana-label">下の句</span>
        <span class="kana-kanji">${poem.shimo.kanji}</span>
        <span class="kana-text">${poem.shimo.kana}</span>
        ${speakButton(poem, 'shimo', '下の句')}
        ${maskShimo ? '<button type="button" class="kana-mask" aria-label="下の句を表示">タップして下の句を表示</button>' : ''}
      </div>
    </div>

    ${poem.yurai ? `
    <div class="detail-yurai">
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
      ${poem.yurai.poetBio ? `
      <div class="yurai-block">
        <span class="yurai-label">作者について</span>
        <p class="yurai-text">${poem.yurai.poetBio}</p>
      </div>` : ''}
    </div>` : ''}

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
  `;
}
