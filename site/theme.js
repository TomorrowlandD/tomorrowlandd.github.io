(() => {
  'use strict';

  const root = document.documentElement;
  const themeButton = document.getElementById('theme-toggle-btn');
  const themeColor = document.querySelector('meta[name="theme-color"]');

  function setTheme(theme) {
    root.dataset.theme = theme;
    themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
    themeColor.content = getComputedStyle(root).getPropertyValue('--bg-page').trim();
  }

  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  try { theme = localStorage.getItem('homepage-theme') || theme; } catch {}
  setTheme(theme);
  themeButton.addEventListener('click', () => {
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    try { localStorage.setItem('homepage-theme', root.dataset.theme); } catch {}
  });
})();
