/**
 * Quiz engine: question selection, distractor generation, session management
 */
import { getStatus, getStreak, recordAnswer } from './storage.js';

/**
 * Quiz modes
 */
export const QUIZ_MODES = {
  KAMI_TO_SHIMO: 'kami-to-shimo',     // 上の句→下の句
  SHIMO_TO_KAMI: 'shimo-to-kami',     // 下の句→上の句
  KIMARIJI: 'kimariji',               // 決まり字クイズ
};

export const ANSWER_MODES = {
  CHOICE: 'choice',       // 四択
  RECALL: 'recall',       // 暗記（自己判定）
};

/**
 * Select poems for a quiz session
 * Priority: learning > new > mastered
 */
export function selectQuestions(poems, count, range = null) {
  let pool = range ? poems.filter((p) => range.includes(p.id)) : [...poems];

  // Sort by priority: learning first, then new, then mastered
  pool.sort((a, b) => {
    const priority = { learning: 0, new: 1, mastered: 2 };
    const sa = priority[getStatus(a.id)] ?? 1;
    const sb = priority[getStatus(b.id)] ?? 1;
    if (sa !== sb) return sa - sb;
    // Within same status, prefer lower streak
    return getStreak(a.id) - getStreak(b.id);
  });

  // Take up to count, then shuffle
  const selected = pool.slice(0, Math.min(count, pool.length));
  return shuffle(selected);
}

/**
 * Generate 3 distractors for a given poem
 * Prefers poems with the same kimarijiCount
 */
export function generateDistractors(poem, allPoems, mode) {
  const others = allPoems.filter((p) => p.id !== poem.id);

  // Prefer same kimarijiCount
  const sameKimariji = others.filter(
    (p) => p.kimarijiCount === poem.kimarijiCount
  );
  const rest = others.filter(
    (p) => p.kimarijiCount !== poem.kimarijiCount
  );

  const pool = shuffle([...sameKimariji, ...rest]);
  return pool.slice(0, 3);
}

/**
 * Create a quiz session
 */
export function createSession(poems, options) {
  const { mode, answerMode, count, range } = options;
  const questions = selectQuestions(poems, count, range);

  return {
    mode,
    answerMode,
    questions,
    current: 0,
    answers: [],
    startTime: Date.now(),
  };
}

/**
 * Get the current question with choices
 */
export function getCurrentQuestion(session, allPoems) {
  const poem = session.questions[session.current];
  if (!poem) return null;

  let choices = null;
  if (session.answerMode === ANSWER_MODES.CHOICE) {
    const distractors = generateDistractors(poem, allPoems, session.mode);
    choices = shuffle([poem, ...distractors]);
  }

  return { poem, choices, index: session.current, total: session.questions.length };
}

/**
 * Submit an answer
 */
export function submitAnswer(session, selectedId) {
  const poem = session.questions[session.current];
  const correct = selectedId === poem.id;

  session.answers.push({
    poemId: poem.id,
    selectedId,
    correct,
  });

  recordAnswer(poem.id, correct);

  session.current++;
  return { correct, poemId: poem.id };
}

/**
 * Submit self-assessment (recall mode)
 */
export function submitRecall(session, knew) {
  const poem = session.questions[session.current];

  session.answers.push({
    poemId: poem.id,
    correct: knew,
  });

  recordAnswer(poem.id, knew);

  session.current++;
  return { correct: knew, poemId: poem.id };
}

/**
 * Get session results
 */
export function getResults(session) {
  const correct = session.answers.filter((a) => a.correct).length;
  const total = session.answers.length;
  const elapsed = Date.now() - session.startTime;

  return {
    correct,
    total,
    percentage: Math.round((correct / total) * 100),
    elapsed,
    answers: session.answers,
  };
}

/**
 * Check if session is complete
 */
export function isSessionComplete(session) {
  return session.current >= session.questions.length;
}

// --- Helpers ---

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
