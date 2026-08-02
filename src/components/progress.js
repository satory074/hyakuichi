/**
 * Progress bar component
 * Shows mastered / learning / new distribution
 */
import { getProgressSummary } from '../utils/storage.js';

export function renderProgressBar() {
  const summary = getProgressSummary();
  const total = 100;
  const masteredPct = (summary.mastered / total) * 100;
  const learningPct = (summary.learning / total) * 100;

  return `
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-mastered" style="width:${masteredPct}%"></div>
        <div class="progress-learning" style="width:${learningPct}%"></div>
      </div>
      <div class="progress-labels">
        <span class="label-mastered">${summary.mastered} 暗記済</span>
        <span class="label-learning">${summary.learning} 学習中</span>
        <span class="label-new">${summary.new} 未学習</span>
      </div>
    </div>
  `;
}
