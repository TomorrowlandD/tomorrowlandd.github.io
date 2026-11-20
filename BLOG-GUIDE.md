# 博客维护说明

本站以 `content/posts/*.md` 为文章原稿。`site/` 存放网页源文件，构建脚本会生成文章 HTML 和博客清单到 `site/`。博客园可使用同一份 Markdown 手动发表。

## 当前功能

- 首页保留博客入口，博客页独立展示文章。
- 当前仅有 `Agent` 分类；“全部文章”是查看所有分类的入口。
- 搜索标题和标签；多个关键词以空格分隔，需同时匹配，英文不区分大小写。
- 搜索与分类可以组合使用，支持清空关键词、恢复全部文章。
- 按发布日期从新到旧排序，每页显示 10 篇，支持页码、上一页和下一页；只有一页或没有结果时隐藏分页控件。
- 分类和搜索先筛选全部文章，再分页；修改筛选条件会回到第一页。
- 页码、分类和搜索词保存在网址的 `page`、`category`、`q` 参数中，例如 `blog.html?page=2&category=Agent&q=工具`，支持分享、刷新恢复和浏览器前进后退。搜索输入更新当前历史记录，不为每个字新增记录。
- 文章详情页从二级、三级标题自动生成目录，并显示阅读进度。
- 目前有 12 篇已发布的 Agent 文章；没有匹配的文章时，页面会显示空状态。

## 添加文章

复制 `content/posts/_article-template.md`，另存为英文文件名，例如 `content/posts/agent-basics.md`。每篇文章只需要编辑这一份 Markdown：

```markdown
---
title: "我的 Agent 学习笔记"
date: "2026-10-19"
category: "Agent"
tags: ["Agent", "学习笔记"]
slug: "agent-basics"
draft: false
---

## 开始

这里写正文。
```

`title`、`date`、`category` 是必填项。`date` 用真实日期，`slug` 决定网址 `/posts/agent-basics.html`，只能使用小写英文、数字和连字符，发布后应保持不变。`tags` 可以留空为 `[]`。如果不填写 `slug`，使用 Markdown 文件名。分类会从已发布文章自动汇总，目前默认保留 `Agent`。

`draft: true` 的文章不生成页面，也不显示在博客列表。若仓库是公开的，上传到 GitHub 的 Markdown 原稿仍可被看到；私密草稿不要提交到公开仓库。

文章图片放在 `content/images/`，Markdown 中写相对地址，例如 `![示意图](../images/diagram.png)`。构建后图片地址仍然有效。把 Markdown 复制到博客园时，博客园不能直接读取这些本地相对地址；需要在博客园上传图片并替换链接，或使用两边都能访问的绝对图片网址。

搜索覆盖标题和标签，不检索正文。

新增文章后，列表、分类计数和总页数由构建结果自动更新，不需要手工维护分页。列表一次加载全部文章的元信息，正文仅在打开文章时加载。

无效页码会回到第一页，超过总页数时显示最后一页，未知分类会回到全部文章。直接打开本地 HTML 时，如果浏览器限制更新网址，仍可在页面内翻页和筛选；完整的网址状态功能建议通过本地 HTTP 预览验证。

## 本地预览

安装 Python 3.10 或更新版本后，在仓库根目录执行：

```powershell
python -m pip install -r requirements.txt
python scripts/build.py
```

双击 `site/index.html` 或 `site/blog.html` 即可预览。

如需通过本地 HTTP 地址预览，再运行：

```powershell
python -m http.server 9000 --bind 127.0.0.1 --directory site
```

浏览器打开 `http://127.0.0.1:9000/`，检查首页、博客列表和文章正文。每次修改 Markdown 后重新运行 `python scripts/build.py` 并刷新页面。构建也会清理已删除、改名或转为草稿的文章页面。

若想用虚拟文章查看分页效果，可以单独生成本地预览站点：

```powershell
python scripts/build.py --preview --preview-posts 75
python -m http.server 9001 --bind 127.0.0.1 --directory preview/output
```

浏览器打开 `http://127.0.0.1:9001/blog.html`。自动生成的虚拟文章统一归入“临时预览”分类，标题带有“临时测试”；75 篇足以查看多页及省略号。也可以双击 `preview/output/blog.html` 查看页面内分页。预览结果只写入被 Git 忽略的 `preview/output/`，正式构建和 GitHub Pages 工作流仍使用 `site/`。结束预览后，按 Ctrl+C 停止本地服务器即可。

长期使用的虚拟文章、项目数据和页面替换素材放在 [`preview/`](preview/README.md)。只需要这些自定义素材时运行 `python scripts/build.py --preview`；添加或修改素材后重新构建。

## 发布到 GitHub Pages

仓库的 `Settings → Pages → Build and deployment → Source` 选择 **GitHub Actions**。推送 `main` 分支后，`.github/workflows/pages.yml` 会自动安装依赖、执行构建，并把 `site/` 发布为网站。本地 `main` 已关联远程仓库 `https://github.com/TomorrowlandD/tomorrowlandd.github.io.git`，推送后可在仓库 Actions 页面查看发布结果。

博客园由你手动复制同一份 Markdown 并发布。本站构建与 GitHub Pages 发布不需要博客园账号或授权令牌。

## 修改分类

修改文章 Markdown 中的 `category` 字段即可。分类数量、文章计数在构建后自动更新。

首页展示最近的笔记，完整列表和分类在博客页。

## 文件用途

- `site/index.html`：个人主页及博客入口。
- `site/blog.html`：博客列表和专题导读的页面结构。
- `site/blog.css`：博客列表页的配色、排版和手机布局。
- `site/about.html`：关于页。
- `site/figures/`：网页使用的图片。
- `site/projects-data.js`：项目清单。
- `content/posts/*.md`：文章原稿，也是文章信息的唯一维护入口。
- `scripts/build.py`：把 Markdown 转为文章 HTML，同时生成 `site/blog-data.js`。
- `templates/article.html`：文章详情页模板。
- `site/article.css`：文章正文样式。
- `site/`：本地编辑、预览及 GitHub Pages 发布的网站目录。
- `site/blog.js`：文章列表、分类、搜索、页码分页和网址状态逻辑。

构建自动更新 `site/blog-data.js` 和 `site/posts/`，修改文章请编辑 Markdown 原稿。
