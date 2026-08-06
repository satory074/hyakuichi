/**
 * Quiz page: settings → questions → feedback → results
 *
 * 回答方式:
 *  - 実践（札取り, PRACTICE): 上の句を1文字ずつ読み上げ、全100首の一覧から札を取る
 *  - 暗記（自己判定, RECALL): 答えを見て自己判定
 */
import {
  QUIZ_MODES,
  ANSWER_MODES,
  createSession,
  getCurrentQuestion,
  submitAnswer,
  submitRecall,
  getResults,
  isSessionComplete,
} from '../utils/quiz-engine.js';
import { getSettings, getStatus } from '../utils/storage.js';
import { renderPoemExplanation, speakButton } from '../components/card.js';
import { speak, stopSpeech, unlock, attachSpeakHandlers } from '../utils/speech.js';

let session = null;
let revealTimer = null;

function clearRevealTimer() {
  if (revealTimer) {
    clearInterval(revealTimer);
    revealTimer = null;
  }
}

export function renderQuiz(container, poems, params) {
  const param = params[0];

  if (session) {
    renderQuestion(container, poems);
    return;
  }

  // No active session → open setup, preselecting from the route param
  if (param && Object.values(QUIZ_MODES).includes(param)) {
    // 上の句→下の句 などの向きパラメータ → 暗記モードで preselect
    renderSetup(container, poems, {
      answerMode: ANSWER_MODES.RECALL,
      mode: param,
    });
  } else {
    // 'practice' または未指定 → 実践（既定）
    renderSetup(container, poems, {
      answerMode: ANSWER_MODES.PRACTICE,
      mode: QUIZ_MODES.KAMI_TO_SHIMO,
    });
  }
}

function renderSetup(container, poems, preset) {
  const settings = getSettings();
  const presetAnswer = preset.answerMode;
  const presetMode = preset.mode;

  container.innerHTML = `
    <div class="page quiz-page">
      <header class="page-header">
        <h1>クイズ設定</h1>
      </header>

      <form class="quiz-setup">
        <div class="form-group">
          <label>回答方式</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="answerMode" value="${ANSWER_MODES.PRACTICE}"
                ${presetAnswer === ANSWER_MODES.PRACTICE ? 'checked' : ''} />
              実践（札取り）
            </label>
            <label class="radio-label">
              <input type="radio" name="answerMode" value="${ANSWER_MODES.RECALL}"
                ${presetAnswer === ANSWER_MODES.RECALL ? 'checked' : ''} />
              暗記（自己判定）
            </label>
          </div>
        </div>

        <div class="form-group" id="modeGroup">
          <label>出題モード</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="mode" value="${QUIZ_MODES.KAMI_TO_SHIMO}"
                ${presetMode === QUIZ_MODES.KAMI_TO_SHIMO ? 'checked' : ''} />
              上の句 → 下の句
            </label>
            <label class="radio-label">
              <input type="radio" name="mode" value="${QUIZ_MODES.SHIMO_TO_KAMI}"
                ${presetMode === QUIZ_MODES.SHIMO_TO_KAMI ? 'checked' : ''} />
              下の句 → 上の句
            </label>
            <label class="radio-label">
              <input type="radio" name="mode" value="${QUIZ_MODES.KIMARIJI}"
                ${presetMode === QUIZ_MODES.KIMARIJI ? 'checked' : ''} />
              決まり字クイズ
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>出題数</label>
          <div class="count-selector">
            ${[5, 10, 20, 50, 100]
              .map(
                (n) =>
                  `<button type="button" class="count-btn ${n === settings.quizCount ? 'active' : ''}" data-count="${n}">${n}</button>`
              )
              .join('')}
          </div>
        </div>

        <div class="form-group">
          <label>出題範囲</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="range" value="all" checked />
              全て（100首）
            </label>
            <label class="radio-label">
              <input type="radio" name="range" value="learning" />
              未暗記のみ
            </label>
            <label class="radio-label">
              <input type="radio" name="range" value="1-25" />
              1〜25番
            </label>
            <label class="radio-label">
              <input type="radio" name="range" value="26-50" />
              26〜50番
            </label>
            <label class="radio-label">
              <input type="radio" name="range" value="51-75" />
              51〜75番
            </label>
            <label class="radio-label">
              <input type="radio" name="range" value="76-100" />
              76〜100番
            </label>
          </div>
        </div>

        <button type="submit" class="btn-primary btn-start">開始</button>
      </form>
    </div>
  `;

  // 出題モードは暗記のときだけ表示（実践は上の句読み上げに固定）
  const modeGroup = container.querySelector('#modeGroup');
  const updateModeVisibility = () => {
    const am = container.querySelector('input[name="answerMode"]:checked').value;
    modeGroup.style.display = am === ANSWER_MODES.RECALL ? '' : 'none';
  };
  container.querySelectorAll('input[name="answerMode"]').forEach((r) => {
    r.addEventListener('change', updateModeVisibility);
  });
  updateModeVisibility();

  // Count buttons
  let selectedCount = settings.quizCount;
  container.querySelectorAll('.count-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCount = parseInt(btn.dataset.count);
      container.querySelectorAll('.count-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Form submit
  container.querySelector('.quiz-setup').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const quizMode = formData.get('mode');
    const answerMode = formData.get('answerMode');
    const rangeValue = formData.get('range');

    let range = null;
    if (rangeValue === 'learning') {
      range = poems.filter((p) => getStatus(p.id) !== 'mastered').map((p) => p.id);
    } else if (rangeValue !== 'all') {
      const [start, end] = rangeValue.split('-').map(Number);
      range = [];
      for (let i = start; i <= end; i++) range.push(i);
    }

    // 開始タップ（ユーザージェスチャ）内で音声をアンロック → 以後の自動読み上げが許可される
    unlock();

    session = createSession(poems, {
      mode: quizMode,
      answerMode,
      count: selectedCount,
      range,
    });

    if (session.questions.length === 0) {
      container.innerHTML = `
        <div class="page quiz-page">
          <div class="quiz-empty">
            <p>該当する歌がありません。</p>
            <p>出題範囲を変更してください。</p>
            <button class="btn-primary" onclick="location.hash='#quiz'">戻る</button>
          </div>
        </div>
      `;
      session = null;
      return;
    }

    renderQuestion(container, poems);
  });
}

function renderQuestion(container, poems) {
  clearRevealTimer();
  stopSpeech();

  if (isSessionComplete(session)) {
    renderResults(container, poems);
    return;
  }

  const q = getCurrentQuestion(session);

  if (session.answerMode === ANSWER_MODES.PRACTICE) {
    renderPractice(container, poems, q);
  } else {
    renderRecallQuestion(container, poems, q);
  }
}

/* ---------- 実践（札取り） ---------- */

function renderPractice(container, poems, q) {
  const settings = getSettings();
  const useKanji = settings.showKanji;

  container.innerHTML = `
    <div class="page quiz-page quiz-practice">
      <div class="quiz-reading-fixed">
        <div class="quiz-progress">
          <span>${q.index + 1} / ${q.total}</span>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width:${(q.index / q.total) * 100}%"></div>
          </div>
        </div>
        <div class="quiz-reading">
          <span class="quiz-reading-label">読み上げ（上の句）</span>
          <div class="quiz-reading-text" id="readingText"></div>
        </div>
      </div>

      <p class="quiz-board-hint">正しい札を取ってください</p>
      <ul class="poem-list quiz-board">
        ${poems
          .map((p) => {
            const status = getStatus(p.id);
            const kami = useKanji ? p.kami.kanji : p.kami.kana;
            return `
              <li>
                <button type="button" class="poem-item status-${status}" data-id="${p.id}">
                  <span class="poem-number">${p.id}</span>
                  <div class="poem-text">
                    <span class="poem-kami">${kami}</span>
                    <span class="poem-poet">${p.poet.kanji}</span>
                  </div>
                  <span class="poem-status-dot"></span>
                </button>
              </li>
            `;
          })
          .join('')}
      </ul>
    </div>
  `;

  // 新しい読み上げのたびに場（一覧）を先頭に戻す
  window.scrollTo(0, 0);

  // 読み手: 上の句を音声で読み上げ（文字送りとは独立に再生）
  speak(q.poem.kami.kana);

  startReading(container, q.poem);
  attachPracticeHandlers(container, poems, q);
}

/**
 * 上の句のかなを1文字ずつ表示。決まり字部分は朱色で色付け。
 */
function readingHTML(kana, n, kimarijiLen) {
  const shown = kana.slice(0, n);
  if (kimarijiLen <= 0) return shown;
  const colored = Math.min(n, kimarijiLen);
  const head = shown.slice(0, colored);
  const tail = shown.slice(colored);
  return `<span class="kana-kimariji">${head}</span>${tail}`;
}

function startReading(container, poem) {
  clearRevealTimer();
  const el = container.querySelector('#readingText');
  if (!el) return;

  const kana = poem.kami.kana;
  const kimarijiLen = poem.kimariji.length;
  let n = 0;

  const reveal = () => {
    n++;
    // 空白は次の1字とまとめて表示（空白だけの1コマを作らない）
    if (kana[n - 1] === ' ' && n < kana.length) n++;
    el.innerHTML = readingHTML(kana, n, kimarijiLen);
    if (n >= kana.length) clearRevealTimer();
  };

  reveal(); // 最初の1字はすぐ表示
  if (n < kana.length) {
    revealTimer = setInterval(reveal, 400);
  }
}

function attachPracticeHandlers(container, poems, q) {
  container.querySelectorAll('.poem-item[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      clearRevealTimer();
      stopSpeech();

      // 回答時に読み上げを全部表示
      const el = container.querySelector('#readingText');
      if (el) {
        el.innerHTML = readingHTML(
          q.poem.kami.kana,
          q.poem.kami.kana.length,
          q.poem.kimariji.length
        );
      }

      const selectedId = parseInt(btn.dataset.id);
      const result = submitAnswer(session, selectedId);

      // 全札を無効化
      container.querySelectorAll('.poem-item[data-id]').forEach((b) => {
        b.disabled = true;
      });

      if (result.correct) {
        // 正解: 緑にフラッシュして自動で次へ
        btn.classList.add('correct');
        setTimeout(() => renderQuestion(container, poems), 700);
      } else {
        // お手つき: 解説を表示（「次へ」で進む）
        renderExplanation(container, poems, q.poem);
      }
    });
  });
}

/* ---------- 暗記（自己判定） ---------- */

function renderRecallQuestion(container, poems, q) {
  const settings = getSettings();
  const useKanji = settings.showKanji;

  let questionText = '';
  let questionLabel = '';
  let questionSpeech = ''; // 決まり字モードは短すぎて読み上げが不自然なのでボタンなし
  if (session.mode === QUIZ_MODES.KAMI_TO_SHIMO) {
    questionLabel = '上の句';
    questionText = useKanji ? q.poem.kami.kanji : q.poem.kami.kana;
    questionSpeech = q.poem.kami.kana;
  } else if (session.mode === QUIZ_MODES.SHIMO_TO_KAMI) {
    questionLabel = '下の句';
    questionText = useKanji ? q.poem.shimo.kanji : q.poem.shimo.kana;
    questionSpeech = q.poem.shimo.kana;
  } else {
    questionLabel = '決まり字';
    questionText = q.poem.kimariji;
  }

  container.innerHTML = `
    <div class="page quiz-page">
      <div class="quiz-progress">
        <span>${q.index + 1} / ${q.total}</span>
        <div class="quiz-progress-bar">
          <div class="quiz-progress-fill" style="width:${(q.index / q.total) * 100}%"></div>
        </div>
      </div>

      <div class="quiz-question">
        <span class="quiz-label">${questionLabel}</span>
        <div class="quiz-text">${questionText}</div>
        ${questionSpeech ? speakButton(questionSpeech, questionLabel) : ''}
      </div>

      ${renderRecall(q)}
    </div>
  `;

  attachRecallHandlers(container, poems, q.poem);
  attachSpeakHandlers(container);
}

function renderRecall(q) {
  const settings = getSettings();
  const useKanji = settings.showKanji;

  let answerText = '';
  let answerSpeech = '';
  if (session.mode === QUIZ_MODES.KAMI_TO_SHIMO) {
    answerText = useKanji ? q.poem.shimo.kanji : q.poem.shimo.kana;
    answerSpeech = q.poem.shimo.kana;
  } else if (session.mode === QUIZ_MODES.SHIMO_TO_KAMI) {
    answerText = useKanji ? q.poem.kami.kanji : q.poem.kami.kana;
    answerSpeech = q.poem.kami.kana;
  } else {
    answerText = useKanji
      ? `${q.poem.kami.kanji} / ${q.poem.shimo.kanji}`
      : `${q.poem.kami.kana} / ${q.poem.shimo.kana}`;
    // 決まり字モードの答えは一首通しで読む
    answerSpeech = `${q.poem.kami.kana} ${q.poem.shimo.kana}`;
  }

  return `
    <div class="recall-section">
      <button class="btn-reveal" id="revealBtn">答えを見る</button>
      <div class="recall-answer hidden" id="recallAnswer">
        <div class="recall-text">${answerText}</div>
        ${speakButton(answerSpeech, '答え')}
        <div class="recall-poet">${q.poem.poet.kanji}</div>
        <div class="recall-buttons">
          <button class="btn-knew" data-knew="true">覚えていた</button>
          <button class="btn-forgot" data-knew="false">忘れていた</button>
        </div>
      </div>
    </div>
  `;
}

function attachRecallHandlers(container, poems, poem) {
  const revealBtn = container.querySelector('#revealBtn');
  const answer = container.querySelector('#recallAnswer');

  if (revealBtn) {
    revealBtn.addEventListener('click', () => {
      revealBtn.classList.add('hidden');
      answer.classList.remove('hidden');
    });
  }

  container.querySelectorAll('[data-knew]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const knew = btn.dataset.knew === 'true';
      submitRecall(session, knew);
      if (knew) {
        renderQuestion(container, poems);
      } else {
        // 忘れていた: 解説を表示（「次へ」で進む）
        renderExplanation(container, poems, poem);
      }
    });
  });
}

/* ---------- 解説（誤答時） ---------- */

function renderExplanation(container, poems, poem) {
  clearRevealTimer();
  stopSpeech();
  window.scrollTo(0, 0);

  container.innerHTML = `
    <div class="page quiz-page quiz-explanation">
      <header class="page-header">
        <h1>解説</h1>
      </header>

      <div class="explanation-result">正解は 第${poem.id}番</div>

      <div class="poet-info">
        <span class="poet-name">${poem.poet.kanji}</span>
        <span class="poet-kana">${poem.poet.kana}</span>
      </div>

      ${renderPoemExplanation(poem)}

      <button class="btn-primary btn-start" id="nextBtn">次へ</button>
    </div>
  `;

  container.querySelector('#nextBtn')?.addEventListener('click', () => {
    renderQuestion(container, poems);
  });
  attachSpeakHandlers(container);
}

/* ---------- 結果 ---------- */

function renderResults(container, poems) {
  const results = getResults(session);
  const elapsed = Math.floor(results.elapsed / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  container.innerHTML = `
    <div class="page quiz-page">
      <header class="page-header">
        <h1>結果</h1>
      </header>

      <div class="results-summary">
        <div class="results-score">
          <span class="score-number">${results.correct}</span>
          <span class="score-divider">/</span>
          <span class="score-total">${results.total}</span>
        </div>
        <div class="results-percentage">${results.percentage}%</div>
        <div class="results-time">${minutes}分${seconds}秒</div>
      </div>

      <ul class="results-list">
        ${results.answers
          .map((a) => {
            const poem = poems.find((p) => p.id === a.poemId);
            return `
              <li class="result-item ${a.correct ? 'result-correct' : 'result-incorrect'}">
                <span class="result-mark">${a.correct ? '&#x25CB;' : '&#x2717;'}</span>
                <a href="#detail/${poem.id}" class="result-poem">
                  <span class="result-number">${poem.id}</span>
                  <span class="result-text">${poem.kami.kanji}</span>
                </a>
              </li>
            `;
          })
          .join('')}
      </ul>

      <div class="results-actions">
        <button class="btn-primary" id="retryBtn">もう一度</button>
        <a href="#home" class="btn-secondary">ホームへ</a>
      </div>
    </div>
  `;

  container.querySelector('#retryBtn')?.addEventListener('click', () => {
    const prevSession = session;
    session = createSession(poems, {
      mode: prevSession.mode,
      answerMode: prevSession.answerMode,
      count: prevSession.questions.length,
    });
    renderQuestion(container, poems);
  });

  session = null;
}

export function cleanupQuiz() {
  clearRevealTimer();
  stopSpeech();
  session = null;
}
