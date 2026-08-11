/**
 * 読み上げ: 事前生成MP3（Google Cloud TTS, public/audio/）の再生を第一経路とし、
 * 取得失敗時（オフライン初回など）は Web Speech API (speechSynthesis) にフォールバックする。
 *
 * 設計の要:
 *  - 単一の共有 Audio 要素を再利用する。ユーザージェスチャ内で一度 play() した要素は
 *    以後 setTimeout 経由（実践モードの自動読み上げ・正解後の次問）でも再生が許可される。
 *  - speechRate 設定は audio.playbackRate に適用（preservesPitch はデフォルト true の
 *    ままにする＝速度を変えても音程が変わらず朗読向き）。
 *
 * Web Speech API フォールバックにおけるブラウザの癖への対応（温存）:
 *  - Chrome は getVoices() が非同期 → voiceschanged で再取得
 *  - 最初の speak() はユーザージェスチャ内必須 (autoplay制限) → unlock()
 *  - utterance の参照を保持しないと GC されて途中で止まる (Chrome)
 *  - idle 時の cancel() 直後の speak() は無音のまま詰まることがある → speaking 中のみ cancel
 *  - speak() 後に内部が paused へ入り無音になる → resume() で発話を促す + keepalive
 *  - Android は voice 指定不可のため lang='ja-JP' を必ず明示
 *  - iOS Safari はサイレントスイッチ ON だと無音になる（音声ファイル再生は影響を受けない）
 */
import { getSettings } from './storage.js';

// --- 音声ファイル再生（第一経路） ---
let audioEl = null; // 単一共有 HTMLAudioElement（自動再生アンロックの要）
let playToken = 0; // 連結再生の世代トークン。stopSpeech で無効化する

// --- Web Speech API（フォールバック） ---
let jaVoice = null;
let currentUtterance = null; // GC対策: speak 中は参照を保持
let keepAliveTimer = null; // Chrome の無音・15秒打ち切り対策
let unlocked = false;

function isSupported() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** ボタンを描画すべきか（Audio再生はユニバーサル対応のため設定のみで判定） */
export function isSpeechOn() {
  return getSettings().speechEnabled;
}

function clipUrl(clipId) {
  return `${import.meta.env.BASE_URL}audio/${clipId}.mp3`;
}

function getAudioEl() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
  }
  return audioEl;
}

function stopAudio() {
  playToken++;
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.onended = null;
    audioEl.onerror = null;
  }
}

/**
 * クリップ列を順に再生（KIMARIJI の一首通し = kami → ended → shimo の連結）。
 * 再生できない場合（未キャッシュのオフライン・404等）は TTS フォールバック。
 * 縮退系: 連結2個目で失敗した場合、フォールバックは一首全体を頭から読む（稀なので許容）。
 */
function playSequence(clipIds, fallbackText) {
  if (!isSpeechOn()) return;
  stopSpeech();
  const token = ++playToken;
  const a = getAudioEl();
  let i = 0;
  const fail = () => {
    if (token === playToken) speakText(fallbackText);
  };
  const playNext = () => {
    if (token !== playToken || i >= clipIds.length) return;
    a.muted = false; // unlock のミュートが残っていても必ず解除
    a.src = clipUrl(clipIds[i++]);
    const rate = getSettings().speechRate;
    a.defaultPlaybackRate = rate; // src 変更で playbackRate が default に戻るブラウザ対策
    a.playbackRate = rate;
    a.play().catch(fail);
  };
  a.onended = playNext;
  a.onerror = fail;
  playNext();
}

/**
 * 歌の読み上げ。part: 'kami' | 'shimo' | 'full'（一首通し）
 */
export function speakPoem(poem, part) {
  const pad = String(poem.id).padStart(3, '0');
  if (part === 'full') {
    playSequence([`${pad}-kami`, `${pad}-shimo`], `${poem.kami.kana} ${poem.shimo.kana}`);
  } else {
    playSequence([`${pad}-${part}`], poem[part].kana);
  }
}

/** 設定ページの試し読み（第1番上の句） */
export function speakSample() {
  playSequence(['001-kami'], 'あきのたの かりほのいほの とまをあらみ');
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
 * ユーザージェスチャ内で呼ぶと、以後の自動再生 (setTimeout 経由など) が許可される。
 * クイズ開始ボタンの submit ハンドラから呼ぶ。
 */
export function unlock() {
  if (unlocked) return;
  unlocked = true;

  // Audio 版: 共有要素をジェスチャ内で一度 play() してアンロック
  const a = getAudioEl();
  const token = playToken; // 直後に本再生が始まっていたら後始末しない（本再生を殺さない）
  a.muted = true;
  a.src = clipUrl('001-kami');
  const p = a.play();
  if (p) {
    p.then(() => {
      if (token === playToken) {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
      }
    }).catch(() => {
      if (token === playToken) a.muted = false; // オフライン初回等は失敗してよい（TTS側アンロックが生きる）
    });
  }

  // TTS 版（フォールバック用）
  if (isSupported()) {
    // 空文字・空白のみの utterance は Chrome の speechSynthesis を
    // ブラウザ再起動まで無音のまま壊すことがある (crbug.com/41346274) ため、
    // 実テキストを volume 0 で発話する
    const u = new SpeechSynthesisUtterance('あ');
    u.lang = 'ja-JP';
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}

function clearKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

/**
 * TTS フォールバック: かなテキストを speechSynthesis で読み上げる。
 * @param {string} text - ひらがな（文節は半角スペース区切り）
 */
function speakText(text) {
  if (!isSupported() || !isSpeechOn()) return;
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
  // 長文の 15 秒打ち切り対策の keepalive。短いクリップでは発火前に onend で解除される。
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
  stopAudio();
  if (isSupported()) {
    clearKeepAlive();
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

/**
 * container 内の .speak-btn に click を一括バインド。
 * data-audio: スペース区切りのクリップID列（例 "001-kami 001-shimo"）
 * data-speak: TTS フォールバック用のかなテキスト
 */
export function attachSpeakHandlers(container) {
  container.querySelectorAll('.speak-btn[data-audio]').forEach((btn) => {
    btn.addEventListener('click', () => playSequence(btn.dataset.audio.split(' '), btn.dataset.speak));
  });
}
