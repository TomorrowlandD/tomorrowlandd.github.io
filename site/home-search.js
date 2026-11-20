(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const dialog = byId('quick-search');
  const input = byId('search-input');
  const results = byId('search-results');
  const pages = [...document.querySelectorAll('[data-search-label]')].map(link => ({
    title: link.dataset.searchLabel + ' · ' + link.textContent,
    url: link.getAttribute('href'),
  }));
  const entries = [...pages, ...(window.BLOG_DATA?.posts || [])];

  function renderResults() {
    const query = input.value.trim().toLowerCase();
    const matches = entries.filter(entry =>
      [entry.title, entry.category, ...(entry.tags || [])].join(' ').toLowerCase().includes(query));
    results.replaceChildren();
    for (const entry of matches) {
      const link = document.createElement('a');
      link.textContent = entry.title;
      link.href = entry.url;
      const item = document.createElement('li');
      item.append(link);
      results.append(item);
    }
    if (!matches.length) {
      const empty = document.createElement('li');
      empty.textContent = '没有找到匹配的页面或笔记。';
      results.append(empty);
    }
    results.scrollTop = 0;
  }

  function openSearch() {
    input.value = '';
    renderResults();
    dialog.showModal();
    input.focus();
  }

  if (/Mac|iPhone|iPad/.test(navigator.platform)) byId('search-shortcut').textContent = '⌘ K';
  byId('open-cmd-btn').addEventListener('click', openSearch);
  byId('close-search').addEventListener('click', () => dialog.close());
  results.addEventListener('click', event => {
    if (event.target.closest('a')) dialog.close();
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) dialog.close();
      else openSearch();
    }
  });
  input.addEventListener('input', renderResults);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') results.querySelector('a')?.click();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      results.querySelector('a')?.focus();
    }
  });
})();
