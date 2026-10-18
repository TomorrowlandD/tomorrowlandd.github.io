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
  const loadMore = document.getElementById('load-more');
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
  let visibleLimit = pageSize;

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
      summary: cleanText(post.summary),
      date: cleanText(post.date),
      category: cleanText(post.category),
      tags: Array.isArray(post.tags) ? post.tags.map(cleanText).filter(Boolean) : [],
      url: articleUrl(post.url),
    }))
    .filter(post => post.title && post.category && post.url && /^\d{4}-\d{2}-\d{2}$/.test(post.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  const categories = [...new Set([
    ...data.categories.map(cleanText).filter(Boolean),
    ...posts.map(post => post.category),
  ])];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const categoryButtons = [];
  function addCategory(name, label, count) {
    const button = element('button', 'category-button');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(name === selectedCategory));
    button.append(element('span', '', label), element('span', 'category-count', String(count)));
    button.addEventListener('click', () => {
      selectedCategory = name;
      visibleLimit = pageSize;
      render();
    });
    categoryButtons.push({ name, button });
    categoryList.append(button);
  }

  addCategory(null, '全部文章', posts.length);
  categories.forEach(category => addCategory(category, category, posts.filter(post => post.category === category).length));

  function renderArticle(post) {
    const item = element('li');
    const article = element('article', 'article-card');
    const meta = element('div', 'article-meta');
    const date = element('time', '', post.date.replaceAll('-', '.'));
    date.dateTime = post.date;
    meta.append(element('span', 'article-category', post.category), date);
    const heading = element('h3');
    const link = element('a', '', post.title);
    link.href = post.url;
    if (new URL(post.url).origin !== location.origin) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    heading.append(link);
    article.append(meta, heading);
    if (post.summary) article.append(element('p', 'article-summary', post.summary));
    if (post.tags.length) {
      const tags = element('div', 'article-tags');
      post.tags.forEach(tag => tags.append(element('span', '', '#' + tag)));
      article.append(tags);
    }
    item.append(article);
    return item;
  }

  function render() {
    const query = normalize(search.value.trim());
    const keywords = query.split(/\s+/).filter(Boolean);
    const matches = posts.filter(post => {
      if (selectedCategory !== null && post.category !== selectedCategory) return false;
      const text = normalize([post.title, post.summary, ...post.tags].join(' '));
      return keywords.every(keyword => text.includes(keyword));
    });
    const visible = matches.slice(0, visibleLimit);
    categoryButtons.forEach(({ name, button }) => button.setAttribute('aria-pressed', String(name === selectedCategory)));
    resultTitle.textContent = selectedCategory === null ? '全部文章' : selectedCategory;
    resultCount.textContent = matches.length > visible.length
      ? `已显示 ${visible.length} / ${matches.length} 篇`
      : `${keywords.length ? '找到 ' : '共 '}${matches.length} 篇文章`;
    clearSearch.hidden = search.value.length === 0;
    articleList.replaceChildren(...visible.map(renderArticle));
    emptyState.hidden = matches.length !== 0;
    loadMore.hidden = matches.length <= visible.length;
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
  search.addEventListener('input', () => { visibleLimit = pageSize; render(); });
  document.getElementById('search-form').addEventListener('submit', event => {
    event.preventDefault();
    visibleLimit = pageSize;
    render();
  });
  clearSearch.addEventListener('click', () => {
    search.value = '';
    visibleLimit = pageSize;
    render();
    search.focus();
  });
  resetFilters.addEventListener('click', () => {
    selectedCategory = null;
    search.value = '';
    visibleLimit = pageSize;
    render();
    categoryButtons[0].button.focus();
  });
  loadMore.addEventListener('click', () => {
    const firstNewIndex = visibleLimit;
    visibleLimit += pageSize;
    render();
    articleList.children[firstNewIndex]?.querySelector('h3 a')?.focus();
  });

  render();
})();
