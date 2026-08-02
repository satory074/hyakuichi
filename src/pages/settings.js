/**
 * Settings page: quiz count, kanji toggle, data reset
 */
import { getSettings, updateSettings, resetAllProgress, resetSettings } from '../utils/storage.js';

export function renderSettings(container) {
  const settings = getSettings();

  container.innerHTML = `
    <div class="page settings-page">
      <header class="page-header">
        <h1>設定</h1>
      </header>

      <div class="settings-list">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-name">デフォルト出題数</span>
            <span class="setting-desc">クイズの初期出題数</span>
          </div>
          <select class="setting-select" id="quizCount">
            ${[5, 10, 20, 50, 100]
              .map(
                (n) => `<option value="${n}" ${settings.quizCount === n ? 'selected' : ''}>${n}問</option>`
              )
              .join('')}
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-name">漢字表示</span>
            <span class="setting-desc">オフにするとかな表示になります</span>
          </div>
          <label class="toggle">
            <input type="checkbox" id="showKanji" ${settings.showKanji ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item danger">
          <div class="setting-info">
            <span class="setting-name">学習データをリセット</span>
            <span class="setting-desc">すべての進捗データが削除されます</span>
          </div>
          <button class="btn-danger" id="resetProgress">リセット</button>
        </div>

        <div class="setting-item danger">
          <div class="setting-info">
            <span class="setting-name">設定をリセット</span>
            <span class="setting-desc">設定を初期値に戻します</span>
          </div>
          <button class="btn-danger" id="resetSettings">リセット</button>
        </div>
      </div>

      <div class="app-info">
        <p class="app-version">百一 v1.0.0</p>
        <p class="app-credit">小倉百人一首 暗記アプリ</p>
      </div>
    </div>
  `;

  // Event listeners
  container.querySelector('#quizCount').addEventListener('change', (e) => {
    updateSettings({ quizCount: parseInt(e.target.value) });
  });

  container.querySelector('#showKanji').addEventListener('change', (e) => {
    updateSettings({ showKanji: e.target.checked });
  });

  container.querySelector('#resetProgress').addEventListener('click', () => {
    if (confirm('すべての学習データをリセットしますか？')) {
      resetAllProgress();
      renderSettings(container);
    }
  });

  container.querySelector('#resetSettings').addEventListener('click', () => {
    if (confirm('設定を初期値に戻しますか？')) {
      resetSettings();
      renderSettings(container);
    }
  });
}
