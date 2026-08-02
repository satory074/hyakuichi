/**
 * Hash-based SPA router
 */
const routes = {};
let currentCleanup = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(hash) {
  window.location.hash = hash;
}

function parseHash() {
  const hash = window.location.hash.slice(1) || 'home';
  const parts = hash.split('/');
  const path = parts[0];
  const params = parts.slice(1);
  return { path, params };
}

function handleRoute() {
  const { path, params } = parseHash();
  const app = document.getElementById('app');

  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const handler = routes[path] || routes['home'];
  if (handler) {
    app.innerHTML = '';
    currentCleanup = handler(app, params) || null;
  }

  updateActiveNav(path);
}

function updateActiveNav(path) {
  document.querySelectorAll('#bottom-nav a').forEach((a) => {
    const href = a.getAttribute('href').slice(1);
    a.classList.toggle('active', href === path);
  });
}

export function startRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

export function getCurrentPath() {
  return parseHash().path;
}
