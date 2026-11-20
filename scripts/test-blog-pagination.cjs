// Run after build.py: requires Playwright and an installed Chromium browser.
// Optional: CHROME_PATH, BLOG_SCREENSHOT_DIR. Fixtures exist only in browser memory.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../site');
const errors = [];
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  try {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(data);
  } catch { res.writeHead(404).end(); }
});

function fixture(count) {
  return { categories: ['Agent', '学习', '空分类'], posts: Array.from({ length: count }, (_, i) => ({
    title: `测试文章 ${i + 1}`,
    date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10),
    category: i % 2 ? 'Agent' : '学习',
    tags: [i % 3 ? '笔记' : '工具'],
    url: `./posts/test-${i + 1}.html`,
  })) };
}

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/blog.html`;
    browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
    async function open(count, query = '', file = false, blockHistory = false) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      page.on('pageerror', error => errors.push(error.message));
      if (count !== null) await page.addInitScript(data => {
        Object.defineProperty(window, 'BLOG_DATA', { get: () => data, set: () => {} });
      }, fixture(count));
      if (blockHistory) await page.addInitScript(() => {
        history.pushState = history.replaceState = () => { throw new DOMException('Restricted local history', 'SecurityError'); };
      });
      await page.goto((file ? pathToFileURL(path.join(root, 'blog.html')).href : base) + query);
      await page.waitForFunction(() => !document.getElementById('search-input').disabled);
      return page;
    }
    const titles = page => page.locator('#article-list h3').allTextContents();
    const current = page => page.locator('#pagination [aria-current="page"]').textContent();
    const button = (page, name) => page.getByRole('button', { name, exact: true });
    async function category(page, name) {
      await page.locator('.category-button').filter({ has: page.locator('span:first-child', { hasText: new RegExp(`^${name}$`) }) }).click();
    }

    for (const count of [0, 1, 10, 11, 35, 100]) {
      const page = await open(count);
      assert.equal(await page.locator('#article-list > li').count(), Math.min(10, count));
      assert.equal(await page.locator('#pagination').isVisible(), count > 10);
      assert.equal(await page.locator('#empty-state').isVisible(), count === 0);
      assert.ok(!(await page.locator('#result-count').textContent()).includes('/ 0'));
      const seen = [];
      const total = Math.ceil(count / 10);
      if (total > 1) assert.ok(await button(page, '上一页').isDisabled());
      for (let index = 1; index <= Math.max(1, total); index++) {
        const batch = await titles(page);
        assert.equal(batch.length, Math.min(10, count - (index - 1) * 10));
        seen.push(...batch);
        if (index < total) {
          await button(page, '下一页').click();
          assert.equal(await current(page), String(index + 1));
          assert.equal(new URL(page.url()).searchParams.get('page'), String(index + 1));
          assert.equal(await page.evaluate(() => document.activeElement.id), 'results-title');
          assert.ok(await page.locator('#results-title').evaluate(el => el.getBoundingClientRect().top >= 0));
        }
      }
      assert.deepEqual(seen, Array.from({ length: count }, (_, i) => `测试文章 ${count - i}`));
      if (total > 1) assert.ok(await button(page, '下一页').isDisabled());
      if (total <= 7) assert.equal(await page.locator('.page-ellipsis').count(), 0);
      await page.close();
    }
    console.log('PASS: 0/1/10/11/35/100 articles, ranges, order, boundaries, focus, no omissions or duplicates');

    const page = await open(100, '?page=5');
    assert.deepEqual(await page.locator('#pagination button').allTextContents(), ['上一页', '1', '4', '5', '6', '10', '下一页']);
    assert.equal(await page.locator('.page-ellipsis').count(), 2);
    await button(page, '第 6 页').focus();
    await page.keyboard.press('Enter');
    assert.equal(await current(page), '6');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'results-title');
    await page.goBack();
    assert.equal(await current(page), '5');
    await page.goForward();
    assert.equal(await current(page), '6');
    await category(page, 'Agent');
    assert.equal(await current(page), '1');
    await page.goBack();
    assert.equal(await current(page), '6');
    assert.equal(await page.locator('#results-title').textContent(), '全部文章');
    await page.goForward();
    assert.equal(await page.locator('#results-title').textContent(), 'Agent');
    const historyLength = await page.evaluate(() => history.length);
    await page.locator('#search-input').fill('工具');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'search-input');
    assert.equal(await page.evaluate(() => history.length), historyLength);
    assert.equal(new URL(page.url()).searchParams.get('q'), '工具');
    assert.match(await page.locator('#result-count').textContent(), /17 篇文章/);
    await button(page, '下一页').click();
    await page.reload();
    assert.equal(await current(page), '2');
    assert.equal(await page.locator('#search-input').inputValue(), '工具');
    assert.equal(await page.locator('#results-title').textContent(), 'Agent');
    assert.equal(await page.locator('#article-list > li').count(), 7);
    await page.locator('#search-input').fill('测试文章 工具');
    assert.equal(await current(page), '1');
    assert.match(await page.locator('#result-count').textContent(), /17 篇文章/);
    await page.locator('#search-input').fill('no-such-post');
    assert.ok(await page.locator('#empty-state').isVisible());
    assert.ok(!(await page.locator('#pagination').isVisible()));
    await button(page, '清空搜索关键词').click();
    assert.equal(await current(page), '1');
    assert.equal(new URL(page.url()).searchParams.get('q'), null);
    await category(page, '空分类');
    assert.ok(await page.locator('#empty-state').isVisible());
    await button(page, '查看全部文章').click();
    assert.equal(new URL(page.url()).search, '');
    // The category text is not part of the search index.
    await page.locator('#search-input').fill('Agent');
    assert.equal(await page.locator('#article-list > li').count(), 0);
    await page.close();
    console.log('PASS: ellipses, keyboard, search/category combinations, empty/reset, URL reload/back/forward');

    for (const [query, expected] of [['?page=0', '1'], ['?page=-1', '1'], ['?page=abc', '1'], ['?page=2.5', '1'], ['?page=999', '4'], ['?page=2&category=missing', '2']]) {
      const invalid = await open(35, query);
      assert.equal(await current(invalid), expected);
      assert.equal(new URL(invalid.url()).searchParams.get('category'), null);
      assert.equal(new URL(invalid.url()).searchParams.get('page'), expected === '1' ? null : expected);
      await invalid.close();
    }
    for (const blocked of [false, true]) {
      const local = await open(35, '?page=2', true, blocked);
      assert.equal(await current(local), '2');
      await button(local, '下一页').click();
      assert.equal(await current(local), '3');
      await local.locator('#search-input').fill('工具');
      assert.equal(await current(local), '1');
      await local.close();
    }
    console.log('PASS: invalid/out-of-range URLs, file:// preview and restricted-history fallback');

    const layout = await open(100, '?page=5');
    for (const width of [1280, 390, 320]) {
      await layout.setViewportSize({ width, height: 900 });
      assert.ok(await layout.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      for (const control of await layout.locator('#pagination button').all()) {
        const box = await control.boundingBox();
        assert.ok(box.width >= 42 && box.height >= 44);
        assert.ok(box.x >= 0 && box.x + box.width <= width);
      }
      if (process.env.BLOG_SCREENSHOT_DIR) {
        await fs.mkdir(process.env.BLOG_SCREENSHOT_DIR, { recursive: true });
        await layout.screenshot({ path: path.join(process.env.BLOG_SCREENSHOT_DIR, `pagination-${width}.png`), fullPage: true });
      }
    }
    await layout.close();
    const real = await open(null);
    const count = await real.evaluate(() => window.BLOG_DATA.posts.length);
    assert.equal(await real.locator('#article-list > li').count(), Math.min(10, count));
    assert.equal(await real.locator('#pagination').isVisible(), count > 10);
    if (count) {
      await real.locator('#article-list h3 a').first().click();
      assert.ok(await real.locator('#post-content .prose').isVisible());
      assert.equal(await real.locator('.summary').count(), 0);
    }
    await real.close();
    assert.deepEqual(errors, []);
    console.log('PASS: desktop/mobile widths, real article navigation, zero browser script errors');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
