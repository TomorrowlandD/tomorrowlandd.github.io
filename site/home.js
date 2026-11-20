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
})();
