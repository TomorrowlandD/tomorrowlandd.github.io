(() => {
  'use strict';

  const list = document.getElementById('project-list');
  const empty = document.getElementById('project-empty');
  const data = window.PROJECTS_DATA;

  const cleanText = value => typeof value === 'string' ? value.trim() : '';

  if (!list || !empty) return;
  if (!data || !Array.isArray(data.projects)) {
    empty.hidden = false;
    return;
  }

  const projects = data.projects
    .filter(project => project && cleanText(project.title))
    .map(project => ({
      title: cleanText(project.title),
      type: cleanText(project.type),
      status: cleanText(project.status),
      summary: cleanText(project.summary),
      tags: Array.isArray(project.tags) ? project.tags.map(cleanText).filter(Boolean) : [],
      url: cleanText(project.url),
      urlLabel: cleanText(project.urlLabel),
    }));

  if (!projects.length) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function projectUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch {
      return null;
    }
  }

  projects.forEach(project => {
    const item = element('li', 'project-card');

    const top = element('div', 'project-top');
    if (project.type) top.append(element('span', 'project-type', project.type));
    if (project.status) top.append(element('span', 'project-status', project.status));
    const link = projectUrl(project.url);
    if (link) {
      const anchor = element('a', 'project-link', (project.urlLabel || '查看') + ' ↗');
      anchor.href = link;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      top.append(anchor);
    }
    item.append(top);

    item.append(element('h3', 'project-title', project.title));
    if (project.summary) item.append(element('p', 'project-summary', project.summary));
    if (project.tags.length) {
      const tags = element('div', 'project-tags');
      project.tags.forEach(tag => tags.append(element('span', '', '#' + tag)));
      item.append(tags);
    }

    list.append(item);
  });
})();
