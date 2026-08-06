/**
 * 読み上げ (Web Speech API / speechSynthesis) wrapper
 *
 * ブラウザの癖への対応:
 *  - Chrome は getVoices() が非同期 → voiceschanged で再取得
 *  - 最初の speak() はユーザージェスチャ内必須 (autoplay制限) → unlock()
 *  - utterance の参照を保持しないと GC されて途中で止まる (Chrome)
 *  - Android は voice 指定不可のため lang='ja-JP' を必ず明示
 *  - iOS Safari はサイレントスイッチ ON だと無音になる (回避不可)
 */
import { getSettings } from './storage.js';

let jaVoice = null;
let currentUtterance = null; // GC対策: speak 中は参照を保持
let unlocked = false;

export function isSupported() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** ボタンを描画すべきか（対応ブラウザ かつ 設定ON） */
export function isSpeechOn() {
  return isSupported() && getSettings().speechEnabled;
}

function loadVoices() {
  const voices = window.speechSynthesis.getVoices();
  // Android は 'ja_JP' 表記のことがある
  const ja = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ja'));
  jaVoice = ja.find((v) => v.default) || ja[0] || null;
}

export function initSpeech() {
  if (!isSupported()) return;
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

/**
 * ユーザージェスチャ内で呼ぶと、以後の自動 speak (setTimeout 経由など) が許可される。
 * クイズ開始ボタンの submit ハンドラから呼ぶ。
 */
export function unlock() {
  if (!isSupported() || unlocked) return;
  const u = new SpeechSynthesisUtterance(' '); // 空文字はエラーになるブラウザがある
  u.volume = 0;
  window.speechSynthesis.speak(u);
  unlocked = true;
}

/**
 * かなテキストを読み上げる。設定OFF・非対応時は何もしない。
 * @param {string} text - ひらがな（文節は半角スペース区切り）
 */
export function speak(text) {
  if (!isSpeechOn()) return;
  window.speechSynthesis.cancel(); // キュー滞留防止
  const u = new SpeechSynthesisUtterance(text.replace(/ /g, '、')); // 句切れにポーズを入れる
  u.lang = 'ja-JP';
  if (jaVoice) u.voice = jaVoice;
  u.rate = getSettings().speechRate;
  currentUtterance = u;
  u.onend = u.onerror = () => {
    if (currentUtterance === u) currentUtterance = null;
  };
  window.speechSynthesis.speak(u);
}

export function stopSpeech() {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

/** container 内の .speak-btn[data-speak] に click を一括バインド */
export function attachSpeakHandlers(container) {
  container.querySelectorAll('.speak-btn[data-speak]').forEach((btn) => {
    btn.addEventListener('click', () => speak(btn.dataset.speak));
  });
}
