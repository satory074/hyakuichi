/**
 * Settings page: quiz count, kanji toggle, data reset
 */
import { getSettings, updateSettings, resetAllProgress, resetSettings } from '../utils/storage.js';
import { speakSample, stopSpeech } from '../utils/speech.js';

const SPEECH_RATES = [
  { value: 0.7, label: 'ゆっくり' },
  { value: 0.85, label: 'やや遅い' },
  { value: 1.0, label: 'ふつう' },
  { value: 1.3, label: 'はやめ' },
];

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

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-name">読み上げ</span>
            <span class="setting-desc">クイズと詳細ページで歌を音声で読み上げます</span>
          </div>
          <label class="toggle">
            <input type="checkbox" id="speechEnabled" ${settings.speechEnabled ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-name">読み上げ速度</span>
            <span class="setting-desc">変更すると試し読みします</span>
          </div>
          <select class="setting-select" id="speechRate">
            ${SPEECH_RATES.map(
              (r) =>
                `<option value="${r.value}" ${settings.speechRate === r.value ? 'selected' : ''}>${r.label}</option>`
            ).join('')}
          </select>
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

  container.querySelector('#speechEnabled').addEventListener('change', (e) => {
    updateSettings({ speechEnabled: e.target.checked });
    if (!e.target.checked) stopSpeech();
  });

  container.querySelector('#speechRate').addEventListener('change', (e) => {
    updateSettings({ speechRate: parseFloat(e.target.value) });
    speakSample(); // 試し読み（第1番上の句）
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
