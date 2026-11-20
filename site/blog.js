(() => {
  'use strict';

  const search = document.getElementById('search-input');
  const searchSubmit = document.getElementById('search-submit');
  const clearSearch = document.getElementById('clear-search');
  const categoryList = document.getElementById('category-list');
  const articleList = document.getElementById('article-list');
  const resultTitle = document.getElementById('results-title');
  const resultCount = document.getElementById('result-count');
  const emptyState = document.getElementById('empty-state');
  const emptyTitle = document.getElementById('empty-title');
  const emptyDescription = document.getElementById('empty-description');
  const resetFilters = document.getElementById('reset-filters');
  const pagination = document.getElementById('pagination');
  const data = window.BLOG_DATA;

  if (!data || !Array.isArray(data.posts) || !Array.isArray(data.categories)) {
    resultCount.textContent = '加载失败';
    emptyTitle.textContent = '暂时无法加载文章';
    emptyDescription.textContent = '请刷新页面后重试。';
    return;
  }

  const cleanText = value => typeof value === 'string' ? value.trim() : '';
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase();
  const pageSize = 10;
  let selectedCategory = null;
  let currentPage = 1;

  function articleUrl(value) {
    if (!cleanText(value)) return null;
    try {
      const url = new URL(value, window.location.href);
      const webLink = url.protocol === 'https:' || url.protocol === 'http:';
      const localFile = location.protocol === 'file:' && url.protocol === 'file:' && !url.host;
      return webLink || localFile ? url.href : null;
    } catch {
      return null;
    }
  }

  const posts = data.posts
    .filter(post => post && post.draft !== true)
    .map(post => ({
      title: cleanText(post.title),
      date: cleanText(post.date),
      category: cleanText(post.category),
      excerpt: cleanText(post.excerpt),
      tags: Array.isArray(post.tags) ? post.tags.map(cleanText).filter(Boolean) : [],
      url: articleUrl(post.url),
    }))
    .filter(post => post.title && post.category && post.url && /^\d{4}-\d{2}-\d{2}$/.test(post.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  const categories = [...new Set([
    ...data.categories.map(cleanText).filter(Boolean),
    ...posts.map(post => post.category),
  ])];

  function readUrlState() {
    const params = new URL(window.location.href).searchParams;
    const category = params.get('category');
    selectedCategory = categories.includes(category) ? category : null;
    search.value = params.get('q') || '';
    const page = params.get('page') || '';
    const number = Number(page);
    currentPage = /^\d+$/.test(page) && Number.isSafeInteger(number) && number > 0 ? number : 1;
  }

  function writeUrlState(mode) {
    const url = new URL(window.location.href);
    const values = { page: currentPage > 1 ? String(currentPage) : '', category: selectedCategory || '', q: search.value.trim() };
    Object.entries(values).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    });
    if (url.href === window.location.href) return;
    try {
      window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url.href);
    } catch {
      // Some browsers restrict history updates on file://. In-page controls still work.
    }
  }

  function update(mode = 'replace') {
    render();
    writeUrlState(mode);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const categoryButtons = [];
  const seriesPosts = posts.filter(post => post.category === 'Agent');
  const readingPath = [
    ['agent-loop', 'Loop'], ['function-calling', 'Function Calling'],
    ['context-engineering', 'Context'], ['agent-memory', 'Memory'], ['agent-sandbox', 'Sandbox'],
  ];
  const pathList = document.getElementById('series-path');
  const steps = [];
  for (const [slug, label] of readingPath) {
    const url = new URL('./posts/' + slug + '.html', location.href).href;
    const post = seriesPosts.find(item => item.url === url);
    if (!post) continue;
    const step = element('a', 'path-step', label);
    step.href = post.url;
    step.title = post.title;
    if (steps.length) pathList.append(element('span', 'path-arrow', '›'));
    pathList.append(step);
    steps.push(step);
  }
  if (steps.length) {
    document.getElementById('series-count').textContent = 'SERIES · ' + seriesPosts.length + ' 篇';
    document.getElementById('series-start').href = steps[0].href;
    document.getElementById('agent-series').hidden = false;
  }

  function addCategory(name, label, count) {
    const button = element('button', 'category-button');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(name === selectedCategory));
    button.append(element('span', '', label), element('span', 'category-count', String(count)));
    button.addEventListener('click', () => {
      selectedCategory = name;
      currentPage = 1;
      update('push');
    });
    categoryButtons.push({ name, button });
    categoryList.append(button);
  }

  addCategory(null, '全部文章', posts.length);
  categories.forEach(category => addCategory(category, category, posts.filter(post => post.category === category).length));

  function renderPagination(totalPages) {
    pagination.replaceChildren();
    pagination.hidden = totalPages <= 1;
    if (totalPages <= 1) return;

    function addPage(label, page, disabled = false, isCurrent = false) {
      const button = element('button', 'page-button', label);
      button.type = 'button';
      button.disabled = disabled;
      if (/^\d+$/.test(label)) button.setAttribute('aria-label', `第 ${page} 页`);
      if (isCurrent) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => {
        if (currentPage === page) return;
        currentPage = page;
        update('push');
        resultTitle.focus({ preventScroll: true });
        resultTitle.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
      pagination.append(button);
    }

    addPage('上一页', currentPage - 1, currentPage === 1);
    const pages = totalPages <= 7
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])]
        .filter(page => page >= 1 && page <= totalPages).sort((a, b) => a - b);
    pages.forEach((page, index) => {
      if (index > 0 && page - pages[index - 1] > 1) {
        const gap = element('span', 'page-ellipsis', '…');
        gap.setAttribute('aria-hidden', 'true');
        pagination.append(gap);
      }
      addPage(String(page), page, false, page === currentPage);
    });
    addPage('下一页', currentPage + 1, currentPage === totalPages);
  }

  function renderArticle(post, position) {
    const item = element('li');
    const article = element('article', 'article-item');
    const meta = element('div', 'article-meta-stack');
    const date = element('time', 'read-time', post.date.replaceAll('-', '.'));
    date.dateTime = post.date;
    for (const tag of new Set([post.category, ...post.tags])) meta.append(element('span', 'sub-tag', tag));
    meta.append(date);
    const heading = element('h3', 'article-title');
    const link = element('a', '', post.title);
    link.href = post.url;
    if (new URL(post.url).origin !== location.origin) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    heading.append(link);
    const body = element('div', 'article-body');
    body.append(heading);
    if (post.excerpt) body.append(element('p', 'article-excerpt', post.excerpt));
    const number = element('span', 'article-num', String(position).padStart(2, '0'));
    number.setAttribute('aria-hidden', 'true');
    article.append(number, body, meta);
    item.append(article);
    return item;
  }

  function render() {
    const query = normalize(search.value.trim());
    const keywords = query.split(/\s+/).filter(Boolean);
    const matches = posts.filter(post => {
      if (selectedCategory !== null && post.category !== selectedCategory) return false;
      const text = normalize([post.title, ...post.tags].join(' '));
      return keywords.every(keyword => text.includes(keyword));
    });
    const totalPages = Math.ceil(matches.length / pageSize);
    currentPage = Math.min(currentPage, Math.max(1, totalPages));
    const start = (currentPage - 1) * pageSize;
    const visible = matches.slice(start, start + pageSize);
    categoryButtons.forEach(({ name, button }) => button.setAttribute('aria-pressed', String(name === selectedCategory)));
    resultTitle.textContent = selectedCategory === null ? '全部文章' : selectedCategory;
    resultCount.textContent = `${keywords.length ? '找到 ' : '共 '}${matches.length} 篇文章`
      + (totalPages ? ` · 第 ${currentPage} / ${totalPages} 页` : '');
    if (totalPages) resultCount.append(element('span', 'result-range', `本页显示第 ${start + 1}–${start + visible.length} 篇文章`));
    clearSearch.hidden = search.value.length === 0;
    articleList.start = start + 1;
    articleList.replaceChildren(...visible.map((post, index) => renderArticle(post, start + index + 1)));
    emptyState.hidden = matches.length !== 0;
    renderPagination(totalPages);
    resetFilters.hidden = !keywords.length && selectedCategory === null;

    if (keywords.length) {
      emptyTitle.textContent = '没有找到相关文章';
      emptyDescription.textContent = '试试其他关键词，或查看全部文章。';
    } else if (selectedCategory !== null) {
      emptyTitle.textContent = '这个分类还没有文章';
      emptyDescription.textContent = '文章发布后，会按分类整理在这里。';
    } else {
      emptyTitle.textContent = '还没有发布文章';
      emptyDescription.textContent = '学习与实践的记录，会陆续更新在这里。';
    }
  }

  search.disabled = false;
  searchSubmit.disabled = false;
  document.getElementById('quick-search-btn').addEventListener('click', () => search.focus());
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.ctrlKey && !event.altKey && !event.metaKey
        && !event.target.closest('input, textarea, [contenteditable="true"]')) {
      event.preventDefault();
      search.focus();
    }
  });
  search.addEventListener('input', () => { currentPage = 1; update(); });
  document.getElementById('search-form').addEventListener('submit', event => {
    event.preventDefault();
    currentPage = 1;
    update();
  });
  clearSearch.addEventListener('click', () => {
    search.value = '';
    currentPage = 1;
    update();
    search.focus();
  });
  resetFilters.addEventListener('click', () => {
    selectedCategory = null;
    search.value = '';
    currentPage = 1;
    update('push');
    categoryButtons[0].button.focus();
  });
  window.addEventListener('popstate', () => {
    readUrlState();
    update();
  });

  readUrlState();
  update();
})();
