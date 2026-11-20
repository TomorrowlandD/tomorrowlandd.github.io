(() => {
  'use strict';

  const byId = id => document.getElementById(id);
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
