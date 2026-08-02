/**
 * Quiz page: settings → questions → feedback → results
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

let session = null;

export function renderQuiz(container, poems, params) {
  const modeParam = params[0];

  if (modeParam && !session) {
    renderSetup(container, poems, modeParam);
  } else if (session) {
    renderQuestion(container, poems);
  } else {
    renderSetup(container, poems, QUIZ_MODES.KAMI_TO_SHIMO);
  }
}

function renderSetup(container, poems, mode) {
  const settings = getSettings();

  container.innerHTML = `
    <div class="page quiz-page">
      <header class="page-header">
        <h1>クイズ設定</h1>
      </header>

      <form class="quiz-setup">
        <div class="form-group">
          <label>出題モード</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="mode" value="${QUIZ_MODES.KAMI_TO_SHIMO}"
                ${mode === QUIZ_MODES.KAMI_TO_SHIMO ? 'checked' : ''} />
              上の句 → 下の句
            </label>
            <label class="radio-label">
              <input type="radio" name="mode" value="${QUIZ_MODES.SHIMO_TO_KAMI}"
                ${mode === QUIZ_MODES.SHIMO_TO_KAMI ? 'checked' : ''} />
              下の句 → 上の句
            </label>
            <label class="radio-label">
              <input type="radio" name="mode" value="${QUIZ_MODES.KIMARIJI}"
                ${mode === QUIZ_MODES.KIMARIJI ? 'checked' : ''} />
              決まり字クイズ
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>回答方式</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="answerMode" value="${ANSWER_MODES.CHOICE}" checked />
              四択
            </label>
            <label class="radio-label">
              <input type="radio" name="answerMode" value="${ANSWER_MODES.RECALL}" />
              暗記（自己判定）
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
  if (isSessionComplete(session)) {
    renderResults(container, poems);
    return;
  }

  const q = getCurrentQuestion(session, poems);
  const settings = getSettings();
  const useKanji = settings.showKanji;

  let questionText = '';
  let questionLabel = '';

  if (session.mode === QUIZ_MODES.KAMI_TO_SHIMO) {
    questionLabel = '上の句';
    questionText = useKanji ? q.poem.kami.kanji : q.poem.kami.kana;
  } else if (session.mode === QUIZ_MODES.SHIMO_TO_KAMI) {
    questionLabel = '下の句';
    questionText = useKanji ? q.poem.shimo.kanji : q.poem.shimo.kana;
  } else {
    questionLabel = '決まり字';
    questionText = q.poem.kimariji;
  }

  container.innerHTML = `
    <div class="page quiz-page">
      <div class="quiz-progress">
        <span>${q.index + 1} / ${q.total}</span>
        <div class="quiz-progress-bar">
          <div class="quiz-progress-fill" style="width:${((q.index) / q.total) * 100}%"></div>
        </div>
      </div>

      <div class="quiz-question">
        <span class="quiz-label">${questionLabel}</span>
        <div class="quiz-text">${questionText}</div>
      </div>

      ${session.answerMode === ANSWER_MODES.CHOICE
        ? renderChoices(q, poems, container)
        : renderRecall(q, poems, container)}
    </div>
  `;

  attachQuizHandlers(container, poems, q);
}

function renderChoices(q, poems) {
  const settings = getSettings();
  const useKanji = settings.showKanji;

  return `
    <div class="quiz-choices">
      ${q.choices
        .map((choice) => {
          let answerText = '';
          if (session.mode === QUIZ_MODES.KAMI_TO_SHIMO) {
            answerText = useKanji ? choice.shimo.kanji : choice.shimo.kana;
          } else if (session.mode === QUIZ_MODES.SHIMO_TO_KAMI) {
            answerText = useKanji ? choice.kami.kanji : choice.kami.kana;
          } else {
            answerText = useKanji
              ? `${choice.kami.kanji} / ${choice.shimo.kanji}`
              : `${choice.kami.kana} / ${choice.shimo.kana}`;
          }
          return `<button class="choice-btn" data-id="${choice.id}">${answerText}</button>`;
        })
        .join('')}
    </div>
  `;
}

function renderRecall(q, poems) {
  const settings = getSettings();
  const useKanji = settings.showKanji;

  let answerText = '';
  if (session.mode === QUIZ_MODES.KAMI_TO_SHIMO) {
    answerText = useKanji ? q.poem.shimo.kanji : q.poem.shimo.kana;
  } else if (session.mode === QUIZ_MODES.SHIMO_TO_KAMI) {
    answerText = useKanji ? q.poem.kami.kanji : q.poem.kami.kana;
  } else {
    answerText = useKanji
      ? `${q.poem.kami.kanji} / ${q.poem.shimo.kanji}`
      : `${q.poem.kami.kana} / ${q.poem.shimo.kana}`;
  }

  return `
    <div class="recall-section">
      <button class="btn-reveal" id="revealBtn">答えを見る</button>
      <div class="recall-answer hidden" id="recallAnswer">
        <div class="recall-text">${answerText}</div>
        <div class="recall-poet">${q.poem.poet.kanji}</div>
        <div class="recall-buttons">
          <button class="btn-knew" data-knew="true">覚えていた</button>
          <button class="btn-forgot" data-knew="false">忘れていた</button>
        </div>
      </div>
    </div>
  `;
}

function attachQuizHandlers(container, poems, q) {
  if (session.answerMode === ANSWER_MODES.CHOICE) {
    container.querySelectorAll('.choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const selectedId = parseInt(btn.dataset.id);
        const result = submitAnswer(session, selectedId);

        // Show feedback
        btn.classList.add(result.correct ? 'correct' : 'incorrect');
        if (!result.correct) {
          container.querySelector(`[data-id="${q.poem.id}"]`)?.classList.add('correct');
        }

        // Disable all buttons
        container.querySelectorAll('.choice-btn').forEach((b) => {
          b.disabled = true;
        });

        // Next question after delay
        setTimeout(() => renderQuestion(container, poems), result.correct ? 600 : 1500);
      });
    });
  } else {
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
        renderQuestion(container, poems);
      });
    });
  }
}

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
  session = null;
}
