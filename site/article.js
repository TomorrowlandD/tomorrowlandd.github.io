(() => {
  'use strict';

  const article = document.getElementById('post-content');
  const label = document.getElementById('progress-label');
  const track = document.querySelector('.progress-track');
  const fill = document.getElementById('progress-fill');
  const headings = [...document.querySelectorAll('.prose h2[id], .prose h3[id]')];
  const tocLinks = [...document.querySelectorAll('.toc-list a')];
  if (!article || !label || !track || !fill) return;

  let scheduled = false;
  function update() {
    scheduled = false;
    const top = article.getBoundingClientRect().top + window.scrollY;
    const bottom = article.getBoundingClientRect().bottom + window.scrollY;
    const start = Math.max(0, top - 120);
    const finish = Math.max(start + 1, bottom - window.innerHeight + 80);
    const percent = Math.round(Math.min(100, Math.max(0, (window.scrollY - start) / (finish - start) * 100)));
    label.textContent = `已读 ${percent}%`;
    track.setAttribute('aria-valuenow', String(percent));
    fill.style.width = `${percent}%`;

    let active = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= 160) active = heading;
    }
    for (const link of tocLinks) {
      if (active && link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
  update();
})();
