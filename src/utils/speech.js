/**
 * 読み上げ (Web Speech API / speechSynthesis) wrapper
 *
 * ブラウザの癖への対応:
 *  - Chrome は getVoices() が非同期 → voiceschanged で再取得
 *  - 最初の speak() はユーザージェスチャ内必須 (autoplay制限) → unlock()
 *  - utterance の参照を保持しないと GC されて途中で止まる (Chrome)
 *  - idle 時の cancel() 直後の speak() は無音のまま詰まることがある → speaking 中のみ cancel
 *  - speak() 後に内部が paused へ入り無音になる → resume() で発話を促す + keepalive
 *  - Android は voice 指定不可のため lang='ja-JP' を必ず明示
 *  - iOS Safari はサイレントスイッチ ON だと無音になる (回避不可)
 */
import { getSettings } from './storage.js';

let jaVoice = null;
let currentUtterance = null; // GC対策: speak 中は参照を保持
let keepAliveTimer = null; // Chrome の無音・15秒打ち切り対策
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
  // 空文字・空白のみの utterance は Chrome の speechSynthesis を
  // ブラウザ再起動まで無音のまま壊すことがある (crbug.com/41346274) ため、
  // 実テキストを volume 0 で発話する
  const u = new SpeechSynthesisUtterance('あ');
  u.lang = 'ja-JP';
  u.volume = 0;
  window.speechSynthesis.speak(u);
  unlocked = true;
}

function clearKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

/**
 * かなテキストを読み上げる。設定OFF・非対応時は何もしない。
 * @param {string} text - ひらがな（文節は半角スペース区切り）
 */
export function speak(text) {
  if (!isSpeechOn()) return;
  const synth = window.speechSynthesis;

  // 前の発話が残っていれば止める。ただし idle 時の cancel() は
  // Chrome で次の speak() を無音のまま詰まらせることがあるので呼ばない。
  if (synth.speaking || synth.pending) synth.cancel();
  clearKeepAlive();

  const u = new SpeechSynthesisUtterance(text.replace(/ /g, '、')); // 句切れにポーズを入れる
  u.lang = 'ja-JP';
  if (jaVoice) u.voice = jaVoice;
  u.rate = getSettings().speechRate;
  currentUtterance = u;
  u.onend = () => {
    clearKeepAlive();
    if (currentUtterance === u) currentUtterance = null;
  };
  u.onerror = (e) => {
    // 'canceled'/'interrupted' は次の発話に切り替えた正常系なので無視
    if (e.error && e.error !== 'canceled' && e.error !== 'interrupted') {
      console.warn('[speech] utterance error:', e.error);
    }
    clearKeepAlive();
    if (currentUtterance === u) currentUtterance = null;
  };

  synth.speak(u);
  // Chrome: speak 後に内部が paused 状態へ入り無音になることがある → resume で発話を促す
  synth.resume();
  // 長文（決まり字モードの一首通し等）の 15 秒打ち切り対策の keepalive。
  // 短い上の句では発火前に onend で解除される。
  keepAliveTimer = setInterval(() => {
    if (!synth.speaking) {
      clearKeepAlive();
      return;
    }
    synth.pause();
    synth.resume();
  }, 10000);
}

export function stopSpeech() {
  if (!isSupported()) return;
  clearKeepAlive();
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

/** container 内の .speak-btn[data-speak] に click を一括バインド */
export function attachSpeakHandlers(container) {
  container.querySelectorAll('.speak-btn[data-speak]').forEach((btn) => {
    btn.addEventListener('click', () => speak(btn.dataset.speak));
  });
}
