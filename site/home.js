(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const question = byId('research-question');
  const keywords = byId('research-keywords');
  const topics = {
    agent: [question.textContent, [...keywords.children].map(chip => chip.textContent)],
    cl: ['模型学会新知识后，怎样保留原有的技能，又能在需要时调用新的经验？',
      ['Catastrophic Forgetting', 'Memory Replay', 'Parameter Isolation']],
    post: ['预训练之后，哪些反馈能帮助模型学会推理，并给出更符合人类意图的回答？',
      ['Preference Alignment', 'Verifiable Rewards', 'Reinforcement Learning']],
  };

  function textElement(tag, value, className) {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  }

  const tabs = document.querySelectorAll('.research-tab');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    for (const button of tabs) {
      button.classList.toggle('active', button === tab);
      button.setAttribute('aria-pressed', String(button === tab));
    }
    const [prompt, tags] = topics[tab.dataset.topic];
    question.textContent = prompt;
    keywords.replaceChildren(...tags.map(tag => textElement('span', tag, 'keyword-chip')));
  }));

  const clock = byId('beijing-clock');
  const clockFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  function tick() { clock.textContent = clockFormat.format(new Date()); }
  tick();
  setInterval(tick, 1000);

  const principle = document.querySelector('.principle-text');
  byId('principle-toggle').addEventListener('click', () => {
    principle.textContent = principle.textContent === '大水理论' ? '大睡理论' : '大水理论';
  });

  const posts = window.BLOG_DATA?.posts || [];
  const notes = byId('notes-list');
  for (const post of posts.slice(0, 4)) {
    const row = document.createElement('a');
    row.className = 'note-row';
    row.href = post.url;
    const date = textElement('time', post.date, 'note-date');
    date.dateTime = post.date;
    row.append(date, textElement('strong', post.title, 'note-title'), textElement('span', post.category, 'note-cat'));
    notes.append(row);
  }

  const dialog = byId('quick-search');
  const input = byId('search-input');
  const results = byId('search-results');
  const pageLabels = ['关于我', '论文与研究成果', '项目实践', '博客笔记', '保持联系'];
  const pages = [...document.querySelectorAll('.nav-link')].map((link, index) => ({
    title: pageLabels[index] + ' · ' + link.textContent,
    url: link.getAttribute('href'),
  }));
  const entries = [...pages, ...posts];

  function renderResults() {
    const query = input.value.trim().toLowerCase();
    const matches = entries.filter(entry =>
      [entry.title, entry.category, ...(entry.tags || [])].join(' ').toLowerCase().includes(query));
    results.replaceChildren();
    for (const entry of matches) {
      const link = textElement('a', entry.title);
      link.href = entry.url;
      const item = document.createElement('li');
      item.append(link);
      results.append(item);
    }
    if (!matches.length) results.append(textElement('li', '没有找到匹配的页面或笔记。'));
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

  const email = document.querySelector('a[href^="mailto:"]').textContent;
  const status = byId('copy-status');
  let messageTimer;
  async function copyEmail(event) {
    const button = event.currentTarget;
    let copied = false;
    try {
      await navigator.clipboard.writeText(email);
      copied = true;
    } catch {
      const field = document.createElement('textarea');
      field.value = email;
      field.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.append(field);
      field.select();
      try { copied = document.execCommand('copy'); } catch {}
      field.remove();
      button.focus({ preventScroll: true });
    }
    status.textContent = copied ? '邮箱已复制' : '请在联系方式中选中邮箱地址手动复制';
    status.classList.add('visible');
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => status.classList.remove('visible'), 4000);
  }
  byId('hero-copy-email').addEventListener('click', copyEmail);
  byId('contact-copy-email').addEventListener('click', copyEmail);
})();
