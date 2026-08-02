/**
 * Fixed bottom navigation (4 tabs: Home, Browse, Quiz, Settings)
 */

const TABS = [
  { href: '#home', label: 'ホーム', icon: '&#x2302;' },
  { href: '#browse', label: '一覧', icon: '&#x1F4DC;' },
  { href: '#quiz', label: 'クイズ', icon: '&#x270D;' },
  { href: '#settings', label: '設定', icon: '&#x2699;' },
];

export function renderNav(container) {
  container.innerHTML = TABS.map(
    (tab) =>
      `<a href="${tab.href}" class="${window.location.hash === tab.href || (!window.location.hash && tab.href === '#home') ? 'active' : ''}">
        <span class="nav-icon">${tab.icon}</span>
        <span class="nav-label">${tab.label}</span>
      </a>`
  ).join('');
}
