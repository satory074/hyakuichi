/**
 * Main entry point: data load, route registration, nav, router start
 */
import './style.css';
import poems from './data/poems.json';
import yurai from './data/yurai.json';
import { registerRoute, startRouter } from './utils/router.js';

// Merge 由来（現代語訳・背景）into poems by id (yurai.json is hand/AI-maintained,
// kept separate from the auto-generated poems.json). Unlisted poems get undefined.
poems.forEach((p) => {
  p.yurai = yurai[p.id];
});
import { renderNav } from './components/nav.js';
import { renderHome } from './pages/home.js';
import { renderBrowse } from './pages/browse.js';
import { renderDetail } from './pages/detail.js';
import { renderQuiz, cleanupQuiz } from './pages/quiz.js';
import { renderSettings } from './pages/settings.js';

// Register routes
registerRoute('home', (container) => {
  renderHome(container, poems);
});

registerRoute('browse', (container) => {
  renderBrowse(container, poems);
});

registerRoute('detail', (container, params) => {
  renderDetail(container, poems, params);
});

registerRoute('quiz', (container, params) => {
  renderQuiz(container, poems, params);
  return () => cleanupQuiz();
});

registerRoute('settings', (container) => {
  renderSettings(container);
});

// Render navigation
const navEl = document.getElementById('bottom-nav');
renderNav(navEl);
window.addEventListener('hashchange', () => renderNav(navEl));

// Start router
startRouter();
