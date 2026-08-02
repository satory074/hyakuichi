/**
 * Browse page: 100 poems list with filters and search
 */
import { getStatus } from '../utils/storage.js';
import { getSettings } from '../utils/storage.js';

export function renderBrowse(container, poems) {
  let filterKimariji = 0; // 0 = all
  let filterStatus = 'all';
  let searchQuery = '';

  function render() {
    const settings = getSettings();
    const filtered = poems.filter((p) => {
      if (filterKimariji > 0 && p.kimarijiCount !== filterKimariji) return false;
      if (filterStatus !== 'all' && getStatus(p.id) !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.kami.kanji.includes(q) ||
          p.kami.kana.includes(q) ||
          p.shimo.kanji.includes(q) ||
          p.shimo.kana.includes(q) ||
          p.poet.kanji.includes(q) ||
          p.poet.kana.includes(q) ||
          String(p.id) === q
        );
      }
      return true;
    });

    container.innerHTML = `
      <div class="page browse-page">
        <header class="page-header">
          <h1>一覧</h1>
        </header>

        <div class="browse-filters">
          <input type="search" class="search-input" placeholder="歌・歌人を検索..."
            value="${searchQuery}" />

          <div class="filter-row">
            <label class="filter-label">決まり字:</label>
            <div class="filter-chips">
              <button class="chip ${filterKimariji === 0 ? 'active' : ''}" data-k="0">全て</button>
              ${[1, 2, 3, 4, 5, 6]
                .map(
                  (n) =>
                    `<button class="chip ${filterKimariji === n ? 'active' : ''}" data-k="${n}">${n}字</button>`
                )
                .join('')}
            </div>
          </div>

          <div class="filter-row">
            <label class="filter-label">状態:</label>
            <div class="filter-chips">
              <button class="chip ${filterStatus === 'all' ? 'active' : ''}" data-s="all">全て</button>
              <button class="chip ${filterStatus === 'mastered' ? 'active' : ''}" data-s="mastered">暗記済</button>
              <button class="chip ${filterStatus === 'learning' ? 'active' : ''}" data-s="learning">学習中</button>
              <button class="chip ${filterStatus === 'new' ? 'active' : ''}" data-s="new">未学習</button>
            </div>
          </div>
        </div>

        <div class="browse-count">${filtered.length}首</div>

        <ul class="poem-list">
          ${filtered
            .map((p) => {
              const status = getStatus(p.id);
              const statusClass = `status-${status}`;
              const kami = settings.showKanji ? p.kami.kanji : p.kami.kana;
              return `
                <li>
                  <a href="#detail/${p.id}" class="poem-item ${statusClass}">
                    <span class="poem-number">${p.id}</span>
                    <div class="poem-text">
                      <span class="poem-kami">${kami}</span>
                      <span class="poem-poet">${p.poet.kanji}</span>
                    </div>
                    <span class="poem-status-dot"></span>
                  </a>
                </li>
              `;
            })
            .join('')}
        </ul>
      </div>
    `;

    // Event listeners
    container.querySelector('.search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
    });

    container.querySelectorAll('[data-k]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterKimariji = parseInt(btn.dataset.k);
        render();
      });
    });

    container.querySelectorAll('[data-s]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterStatus = btn.dataset.s;
        render();
      });
    });
  }

  render();
}
