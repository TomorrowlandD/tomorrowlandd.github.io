(() => {
  'use strict';

  const list = document.getElementById('publication-list');
  const data = window.PUBLICATIONS_DATA;
  const cleanText = value => typeof value === 'string' ? value.trim() : '';

  if (!list) return;
  const publications = Array.isArray(data?.publications)
    ? data.publications.filter(item => item && cleanText(item.title))
    : [];

  if (!publications.length) return;

  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  }

  function externalUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch {
      return null;
    }
  }

  publications.forEach(item => {
    const card = element('li', 'publication-card', '');
    const meta = [cleanText(item.year), cleanText(item.status)].filter(Boolean).join(' · ');
    if (meta) card.append(element('p', 'publication-meta', meta));
    card.append(element('h3', 'publication-title', cleanText(item.title)));
    if (cleanText(item.authors)) card.append(element('p', 'publication-authors', cleanText(item.authors)));
    if (cleanText(item.venue)) card.append(element('p', 'publication-venue', cleanText(item.venue)));

    const links = element('div', 'publication-links', '');
    for (const link of Array.isArray(item.links) ? item.links : []) {
      const url = externalUrl(link?.url);
      const label = cleanText(link?.label);
      if (!url || !label) continue;
      const anchor = element('a', '', `${label} ↗`);
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      links.append(anchor);
    }
    if (links.childElementCount) card.append(links);
    list.append(card);
  });
})();
