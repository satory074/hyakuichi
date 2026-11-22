/**
 * 歌の本文（上の句 → 下の句 → 由来 → 絵札）の HTML を作る純粋関数。
 *
 * アプリ（card.js 経由: 詳細ページ・クイズの誤答解説）と、ビルド後に静的ページを書き出す
 * scripts/build-static-pages.js（Node）の両方が使う。だから次のものに触らない:
 *   import.meta.env（Node に無い）/ 読み上げ / localStorage / DOM。
 * 絵札のパスの基点（base）と読み上げボタン（speakButton）は呼び出し側が渡す。
 */

/** テキストと属性値のエスケープ（歌のデータに記号は無いが、静的ページに出すので必ず通す） */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function efudaPath(poem) {
  return `efuda/${String(poem.id).padStart(3, '0')}.jpg`;
}

/** 作者名（漢字＋かな）。アプリの詳細ページと静的ページで共用 */
export function poetInfoHtml(poem) {
  return `
      <div class="poet-info">
        <span class="poet-name">${escapeHtml(poem.poet.kanji)}</span>
        <span class="poet-kana">${escapeHtml(poem.poet.kana)}</span>
      </div>`;
}

/**
 * @param {Object} poem - poems.json の 1 首（yurai を合成済み）
 * @param {Object} options
 * @param {string} options.base - 公開パスの基点（例: '/hyakuichi/'）。絵札の src に使う
 * @param {boolean} [options.maskShimo=false] - 下の句をタップするまで隠す（アプリの詳細ページのみ）
 * @param {(poem: Object, part: string, label: string) => string} [options.speakButton] - 読み上げボタンの HTML（既定は無し）
 * @param {boolean} [options.efuda=true] - 絵札を出すか
 * @returns {string} HTML string
 */
export function poemExplanationHtml(poem, options) {
  const { base, maskShimo = false, speakButton = () => '', efuda = true } = options;
  const e = escapeHtml;

  // 決まり字は上の句かなの接頭辞（全100首で検証済み）。色分け表示用に分割
  const kimarijiRest = poem.kami.kana.slice(poem.kimariji.length);

  return `
    <div class="detail-kana">
      <div class="kana-row">
        <span class="kana-label">上の句</span>
        <span class="kana-kanji">${e(poem.kami.kanji)}</span>
        <span class="kana-text"><span class="kana-kimariji">${e(poem.kimariji)}</span>${e(kimarijiRest)}</span>
        ${speakButton(poem, 'kami', '上の句')}
      </div>
      <div class="kana-row kana-row-shimo${maskShimo ? ' is-masked' : ''}">
        <span class="kana-label">下の句</span>
        <span class="kana-kanji">${e(poem.shimo.kanji)}</span>
        <span class="kana-text">${e(poem.shimo.kana)}</span>
        ${speakButton(poem, 'shimo', '下の句')}
        ${maskShimo ? '<button type="button" class="kana-mask" aria-label="下の句を表示">タップして下の句を表示</button>' : ''}
      </div>
    </div>

    ${poem.yurai ? `
    <div class="detail-yurai">
      ${poem.yurai.meaning ? `
      <div class="yurai-block">
        <span class="yurai-label">現代語訳</span>
        <p class="yurai-text">${e(poem.yurai.meaning)}</p>
      </div>` : ''}
      ${poem.yurai.background ? `
      <div class="yurai-block">
        <span class="yurai-label">由来・背景</span>
        <p class="yurai-text">${e(poem.yurai.background)}</p>
      </div>` : ''}
      ${poem.yurai.poetBio ? `
      <div class="yurai-block">
        <span class="yurai-label">作者について</span>
        <p class="yurai-text">${e(poem.yurai.poetBio)}</p>
      </div>` : ''}
    </div>` : ''}

    ${efuda ? `
    <figure class="detail-efuda">
      <img
        class="efuda-img"
        src="${e(base)}${efudaPath(poem)}"
        alt="第${poem.id}番 ${e(poem.poet.kanji)} 歌がるた絵札"
        width="328"
        height="458"
        loading="lazy"
      />
      <figcaption class="efuda-credit">歌がるた絵札（江戸期・パブリックドメイン / Wikimedia Commons）</figcaption>
    </figure>` : ''}
  `;
}
