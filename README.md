# xkgc__ 个人主页

## 从这里开始

**改首页、看首页，都打开 [site/index.html](site/index.html)。** 修改 HTML、CSS 或 JS 后，保存并刷新浏览器就能看到效果。

| 想做什么 | 从哪里开始 |
| --- | --- |
| 改首页文字或按钮 | [site/index.html](site/index.html) |
| 改首页配色、排版或交互 | [site/home.css](site/home.css)、[site/home.js](site/home.js) |
| 改个人经历 | [site/about.html](site/about.html) |
| 更新项目或论文 | [项目数据](site/projects-data.js)、[论文数据](site/publications-data.js) |
| 写博客 | 在 [content/posts/](content/posts/) 编辑 Markdown，文章图片放在 `content/images/` |
| 改文章阅读页 | [文章模板](templates/article.html)、[阅读样式](site/article.css) |

## 本地预览

首次使用时，在项目根目录安装依赖并生成博客。

```powershell
python -m pip install -r requirements.txt
python scripts/build.py
```

双击 [site/index.html](site/index.html) 即可浏览整个网站。后续修改文章、文章模板或文章图片后，再运行一次 `python scripts/build.py`。构建只更新 `site/posts/`、`site/blog-data.js` 和文章图片目录 `site/images/`。这些文件由脚本维护，Git 会忽略它们。

如果习惯通过本地网址预览，可以运行以下命令，再打开 [本地首页](http://127.0.0.1:9000/)。

```powershell
python -m http.server 9000 --bind 127.0.0.1 --directory site
```

需要测试分页或虚拟文章时，使用[独立的测试预览](preview/README.md)。要检查全站导航，在构建后运行 `python scripts/test-navigation.py`，需本机 Chrome 和 Python 的 `websocket-client` 包，可用 `CHROME_PATH` 指定浏览器路径。

## 新增文章

1. 复制 [文章模板](content/posts/_article-template.md)，另存为 `content/posts/agent-basics.md` 这类英文文件名。
2. 填写文首的 `title`、`date`、`category` 等信息，并在下方写 Markdown 正文。
3. 将 `draft` 改为 `false`，运行 `python scripts/build.py`，检查博客列表和文章页面。
4. 提交并推送改动；网站上线后，推送到 `main` 会触发 GitHub Pages 重新构建。

`draft: true` 的文章不会进入生成的网站。如果 GitHub 仓库是公开的，已推送的 Markdown 原稿仍可在仓库中看到，草稿标记不提供保密功能。文章字段、图片路径和博客园同步方式详见 [博客维护说明](BLOG-GUIDE.md)。

## 发布到 GitHub Pages

本站的 Pages 发布来源已设置为 **GitHub Actions**。以后将修改提交并推送到 `main`，就会触发[发布工作流](.github/workflows/pages.yml)：安装依赖、运行构建脚本，并发布 `site/`。公开网址为 [https://tomorrowlandd.github.io/](https://tomorrowlandd.github.io/)；可在仓库的 **Actions** 页面查看每次发布结果。

本站无需数据库或常驻服务器。博客园不由 GitHub 工作流自动发布：把同一份 Markdown 复制到博客园并检查排版即可。若文章使用 `content/images/` 中的相对图片地址，博客园还需要单独上传图片或替换为双方都可访问的绝对地址。

当前搜索范围为文章标题和标签，不包括正文。博客每页显示 10 篇文章，提供页码、上一页和下一页；搜索和分类对全部文章生效，修改筛选条件会回到第一页。网址通过 `page`、`category`、`q` 参数保存状态，支持分享、刷新和浏览器前进后退。新增文章后无需手工维护博客清单或页数；构建脚本会按日期生成列表。部分浏览器限制本地文件的网址更新，此时仍可在页面内分页，完整状态恢复可通过 HTTP 预览验证。
