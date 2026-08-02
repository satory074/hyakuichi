/**
 * Home page: progress overview, today's poem, mode navigation
 */
import { renderProgressBar } from '../components/progress.js';
import { getProgressSummary } from '../utils/storage.js';

export function renderHome(container, poems) {
  // Today's poem (deterministic based on date)
  const today = new Date();
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / 86400000
  );
  const todayPoem = poems[dayOfYear % 100];
  const summary = getProgressSummary();

  container.innerHTML = `
    <div class="page home-page">
      <header class="page-header">
        <h1 class="app-title">百一</h1>
        <p class="app-subtitle">百人一首暗記</p>
      </header>

      ${renderProgressBar()}

      <section class="today-poem">
        <h2 class="section-title">今日の一首</h2>
        <a href="#detail/${todayPoem.id}" class="today-card">
          <span class="today-number">第${todayPoem.id}番</span>
          <span class="today-kami">${todayPoem.kami.kanji}</span>
          <span class="today-poet">${todayPoem.poet.kanji}</span>
        </a>
      </section>

      <section class="mode-cards">
        <h2 class="section-title">学習モード</h2>
        <div class="mode-grid">
          <a href="#quiz/kami-to-shimo" class="mode-card">
            <span class="mode-icon">&#x2191;</span>
            <span class="mode-name">上の句→下の句</span>
            <span class="mode-desc">上の句から下の句を当てる</span>
          </a>
          <a href="#quiz/shimo-to-kami" class="mode-card">
            <span class="mode-icon">&#x2193;</span>
            <span class="mode-name">下の句→上の句</span>
            <span class="mode-desc">下の句から上の句を当てる</span>
          </a>
          <a href="#quiz/kimariji" class="mode-card">
            <span class="mode-icon">&#x2606;</span>
            <span class="mode-name">決まり字</span>
            <span class="mode-desc">決まり字から歌を当てる</span>
          </a>
          <a href="#browse" class="mode-card">
            <span class="mode-icon">&#x1F4D6;</span>
            <span class="mode-name">一覧で学習</span>
            <span class="mode-desc">百首を一覧で確認</span>
          </a>
        </div>
      </section>

      <section class="stats-summary">
        <div class="stat">
          <span class="stat-number">${summary.mastered}</span>
          <span class="stat-label">暗記済</span>
        </div>
        <div class="stat">
          <span class="stat-number">${summary.learning}</span>
          <span class="stat-label">学習中</span>
        </div>
        <div class="stat">
          <span class="stat-number">${summary.new}</span>
          <span class="stat-label">未学習</span>
        </div>
      </section>
    </div>
  `;
}
