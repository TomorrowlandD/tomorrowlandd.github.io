# xkgc__ 个人主页

个人介绍、论文展示、项目展示和技术博客组成的静态网站，已通过 GitHub Pages 发布到 [tomorrowlandd.github.io](https://tomorrowlandd.github.io/)。博客文章以 Markdown 为唯一原稿：构建时自动生成本站的文章页面、分类和文章列表。博客园使用同一份原稿，由作者手动预览和发表。

目前页面和自动发布流程已搭建，`content/posts/` 中有 12 篇 `draft: false` 的 Agent 文章，覆盖工具调用、执行循环、记忆、上下文工程、运行模式、任务管理、沙箱及多 Agent 协作。本地 `main` 已关联并推送到 [GitHub 仓库](https://github.com/TomorrowlandD/tomorrowlandd.github.io)。

## 项目结构

```text
site/                       网站源文件
  index.html                首页
  about.html                关于页
  publications.html         论文独立页面（当前为占位）
  projects.html             项目独立页面（当前为占位）
  collection-pages.css      论文与项目页面的共用样式
  blog.html                 博客列表页
  blog.js                   分类、搜索和列表交互
  publications-data.js      论文展示数据
  projects-data.js          项目展示数据
  figures/                  页面使用的图片
content/
  posts/                    Markdown 文章与草稿模板
  images/                   文章图片，需要时创建
templates/article.html      文章详情页模板
scripts/build.py            生成静态网站的脚本
preview/                    仅供本地测试的虚拟素材与使用说明
requirements.txt            构建脚本的 Python 依赖
.github/workflows/pages.yml GitHub Pages 自动构建与部署
dist/                       构建结果，由脚本生成，不提交 Git
dist-preview/               虚拟素材预览结果，不提交 Git
```

日常更新的入口：

| 想更新什么 | 修改哪里 |
| --- | --- |
| 新增或修改博客文章 | `content/posts/` 中对应的 Markdown |
| 添加文章图片 | `content/images/` |
| 更新首页论文展示 | `site/publications-data.js` |
| 更新首页项目展示 | `site/projects-data.js` |
| 编辑论文、项目独立页面 | `site/publications.html`、`site/projects.html` |
| 修改个人介绍或联系方式 | `site/index.html`、`site/about.html` |
| 调整所有文章的阅读页 | `templates/article.html`、`site/article.css` |

构建脚本从 Markdown 读取标题、日期、分类和标签，生成 `dist/posts/*.html` 及 `dist/blog-data.js`。文章正文中的二级、三级标题会自动形成右侧目录；阅读进度随滚动更新。不要手工修改 `dist/` 中的文件。

## 本地运行

准备 Python 3.10 或更新版本。在项目根目录打开 PowerShell，首次使用时安装依赖：

```powershell
python -m pip install -r requirements.txt
```

构建网站：

```powershell
python scripts/build.py
```

构建后，可以在文件管理器里直接双击 `dist/index.html` 打开首页，点击“博客”阅读文章；也可以直接双击 `dist/blog.html`。当前网站的脚本和链接在这种方式下可以正常工作。不要直接打开 `site/blog.html`，因为它所需的 `blog-data.js` 只在构建时生成。

逐页复测顶部导航时，安装可选的 `websocket-client`，并在构建后运行 `python scripts/test-navigation.py`。该脚本使用本机 Chrome，检查首页、关于页、论文页、项目页、博客页和所有已生成文章页在 1440、760、390、320px 宽度下的导航显示，并实际点击桌面和手机宽度下的所有导航链接。可用 `CHROME_PATH` 指定 Chrome 路径；浏览器临时配置保留在被忽略的 `dist/` 中。

需要用虚拟文章、项目数据或页面替换素材做长期本地测试时，参见 [本地虚拟预览说明](preview/README.md)。预览构建输出到被 Git 忽略的 `dist-preview/`，不会改变正式构建结果。

如果需要用本地 HTTP 地址预览，再运行：

```powershell
python -m http.server 9000 --bind 127.0.0.1 --directory dist
```

浏览器打开 [http://127.0.0.1:9000/](http://127.0.0.1:9000/)。停止预览服务器可按 `Ctrl+C`。修改文章后，重新运行 `python scripts/build.py`，再刷新浏览器；服务器运行期间可在另一个终端执行构建命令。若 9000 在其他电脑上被占用，可换成一个未被占用且未被系统保留的端口，并同步修改浏览器地址。

## 新增文章

1. 复制 [文章模板](content/posts/_article-template.md)，另存为 `content/posts/agent-basics.md` 这类英文文件名。
2. 填写文首的 `title`、`date`、`category` 等信息，并在下方写 Markdown 正文。
3. 将 `draft` 改为 `false`，运行 `python scripts/build.py`，检查博客列表和文章页面。
4. 提交并推送改动；网站上线后，推送到 `main` 会触发 GitHub Pages 重新构建。

`draft: true` 的文章不会进入生成的网站。如果 GitHub 仓库是公开的，已推送的 Markdown 原稿仍可在仓库中看到，草稿标记不提供保密功能。文章字段、图片路径和博客园同步方式详见 [博客维护说明](BLOG-GUIDE.md)。

## 发布到 GitHub Pages

本站的 Pages 发布来源已设置为 **GitHub Actions**。以后将修改提交并推送到 `main`，就会触发[发布工作流](.github/workflows/pages.yml)：安装依赖、运行构建脚本，并发布 `dist/`。公开网址为 [https://tomorrowlandd.github.io/](https://tomorrowlandd.github.io/)；可在仓库的 **Actions** 页面查看每次发布结果。

本站无需数据库或常驻服务器。博客园不由 GitHub 工作流自动发布：把同一份 Markdown 复制到博客园并检查排版即可。若文章使用 `content/images/` 中的相对图片地址，博客园还需要单独上传图片或替换为双方都可访问的绝对地址。

当前搜索范围为文章标题和标签，不包括正文。博客每页显示 10 篇文章，提供页码、上一页和下一页；搜索和分类对全部文章生效，修改筛选条件会回到第一页。网址通过 `page`、`category`、`q` 参数保存状态，支持分享、刷新和浏览器前进后退。新增文章后无需手工维护博客清单或页数；构建脚本会按日期生成列表。部分浏览器限制本地文件的网址更新，此时仍可在页面内分页，完整状态恢复可通过 HTTP 预览验证。
