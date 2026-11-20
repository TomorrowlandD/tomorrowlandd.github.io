# 本地虚拟预览

`preview/` 存放可长期保留的测试素材，`preview/output/` 存放生成的网站。后者已被 Git 忽略；请修改这里的测试素材，不要直接修改生成结果。

## 使用

在项目根目录运行：

```powershell
python scripts/build.py --preview --preview-posts 75
```

然后在文件管理器中双击 `preview/output/blog.html`，或运行 `python -m http.server 9001 --bind 127.0.0.1 --directory preview/output`，通过 `http://127.0.0.1:9001/blog.html` 检查网址状态。修改测试素材后，重新构建并刷新页面。

`--preview-posts 75` 生成“临时预览”分类的分页测试文章；可以换成其他非负数量。只想测试自己准备的素材时，运行 `python scripts/build.py --preview`。

## 添加测试素材

- **虚拟文章：**在 `preview/posts/` 中添加 Markdown，格式与 `content/posts/` 相同。文件设为 `draft: false` 才会进入预览列表；`slug` 不要与正式文章或自动生成的分页文章重复。这里的文章不会进入正式构建。
- **页面、样式或数据替换：**按网站输出路径在 `preview/overrides/` 中放文件。例如，`preview/overrides/projects-data.js` 可以替换预览版的项目数据；`preview/overrides/blog.html` 可以试验博客布局。替换只作用于 `preview/output/`。

正式构建仍使用 `python scripts/build.py`，更新 `site/` 中的博客。GitHub Pages 工作流只运行正式构建，不会读取 `preview/`。预览目录中的素材若提交到公开 GitHub 仓库，也会作为仓库文件公开；不要放私人信息。

删除或改名测试文章后，重新运行预览构建，文章索引和生成的文章页会同步更新。
