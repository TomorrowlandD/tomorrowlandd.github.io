"""Build the static site and blog from content/posts/*.md."""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
from string import Template
from datetime import date, datetime, timedelta
from pathlib import Path

import yaml
from markdown_it import MarkdownIt


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
CONTENT = ROOT / "content" / "posts"
PREVIEW = ROOT / "preview"
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def fail(path: Path, message: str) -> ValueError:
    return ValueError(f"{path.relative_to(ROOT)}: {message}")


def parse_post(path: Path) -> dict | None:
    source = path.read_text(encoding="utf-8-sig")
    match = re.match(r"\A---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n([\s\S]*)\Z", source)
    if not match:
        raise fail(path, "文章须以 YAML 元信息（--- ... ---）开头")
    metadata = yaml.safe_load(match.group(1))
    if not isinstance(metadata, dict):
        raise fail(path, "元信息必须是字段列表")
    draft = metadata.get("draft", False)
    if not isinstance(draft, bool):
        raise fail(path, "draft 必须是 true 或 false")
    if draft:
        return None
    for field in ("title", "category"):
        if not isinstance(metadata.get(field), str) or not metadata[field].strip():
            raise fail(path, f"{field} 必须填写非空文本")
    slug = metadata.get("slug", path.stem)
    if not isinstance(slug, str) or not SLUG.fullmatch(slug):
        raise fail(path, "slug 只能使用小写英文字母、数字和中间连字符")
    published = metadata.get("date")
    if isinstance(published, (date, datetime)):
        published = published.isoformat()[:10]
    if not isinstance(published, str):
        raise fail(path, "date 必须是 YYYY-MM-DD")
    try:
        if date.fromisoformat(published).isoformat() != published:
            raise ValueError
    except ValueError:
        raise fail(path, "date 必须是有效的 YYYY-MM-DD 日期") from None
    tags = metadata.get("tags", [])
    if not isinstance(tags, list) or any(not isinstance(tag, str) or not tag.strip() for tag in tags):
        raise fail(path, "tags 必须是文本列表")
    if not match.group(2).strip():
        raise fail(path, "文章正文不能为空")
    return {
        "title": metadata["title"].strip(),
        "date": published,
        "category": metadata["category"].strip(),
        "tags": [tag.strip() for tag in tags],
        "slug": slug,
        "body": match.group(2),
    }


def render_post(post: dict) -> tuple[str, str]:
    escaped = {key: html.escape(str(post[key]), quote=True) for key in ("title", "date", "category")}
    parser = MarkdownIt("commonmark", {"html": False}).enable("table").enable("strikethrough")
    tokens = parser.parse(post["body"])
    excerpt = ""
    for index, token in enumerate(tokens):
        if token.type == "paragraph_open":
            words = (child.content if child.type != "softbreak" else " "
                     for child in tokens[index + 1].children or []
                     if child.type in ("text", "code_inline", "softbreak"))
            excerpt = "".join(words).strip()
            if excerpt:
                break
    toc_items = []
    section_count = 0
    for index, token in enumerate(tokens):
        if token.type != "heading_open" or token.tag not in ("h2", "h3"):
            continue
        if token.tag == "h2":
            section_count += 1
        heading = tokens[index + 1]
        label = "".join(child.content for child in heading.children or [] if child.type in ("text", "code_inline", "image"))
        section_id = f"section-{len(toc_items) + 1}"
        token.attrSet("id", section_id)
        toc_items.append(
            f'<li class="toc-{token.tag}"><a href="#{section_id}">{html.escape(label or heading.content)}</a></li>'
        )
    body = parser.renderer.render(tokens, parser.options, {})
    tags = "".join(f"<span>{html.escape(tag)}</span>" for tag in post["tags"])
    page = Template((ROOT / "templates" / "article.html").read_text(encoding="utf-8")).substitute(
        **escaped, tags=tags, body=body, toc="\n".join(toc_items), section_count=section_count
    )
    return page, excerpt if len(excerpt) <= 100 else excerpt[:99] + "…"


def build(preview_posts: int = 0, preview: bool = False) -> None:
    preview = preview or preview_posts > 0
    output = PREVIEW / "output" if preview else SITE
    posts: list[dict] = []
    slugs: set[str] = set()
    sources = [CONTENT, *([PREVIEW / "posts"] if preview else [])]
    for source in sources:
        for path in sorted(source.glob("*.md")) if source.exists() else []:
            post = parse_post(path)
            if post is None:
                continue
            if post["slug"] in slugs:
                raise fail(path, f"slug 重复：{post['slug']}")
            slugs.add(post["slug"])
            posts.append(post)

    for number in range(1, preview_posts + 1):
        slug = f"preview-pagination-{number:03d}"
        if slug in slugs:
            raise ValueError(f"临时预览文章的 slug 与正式文章重复：{slug}")
        slugs.add(slug)
        posts.append({
            "title": f"【临时测试】文章 {number:03d}：分页预览",
            "date": (date(2026, 1, 1) + timedelta(days=number - 1)).isoformat(),
            "category": "临时预览",
            "tags": ["临时测试", "分页"],
            "slug": slug,
            "body": "## 临时预览文章\n\n此文章只用于本地检查博客分页、分类和搜索。\n",
        })

    if preview:
        generated = {"posts", "blog-data.js", "images"}
        shutil.copytree(SITE, output, dirs_exist_ok=True,
                        ignore=lambda folder, names: generated.intersection(names) if Path(folder) == SITE else set())
    if (ROOT / "content" / "images").exists():
        shutil.copytree(ROOT / "content" / "images", output / "images", dirs_exist_ok=True)
    (output / "posts").mkdir(exist_ok=True)

    index = []
    for post in posts:
        page, excerpt = render_post(post)
        (output / "posts" / f"{post['slug']}.html").write_text(page, encoding="utf-8")
        index.append({key: post[key] for key in ("title", "date", "category", "tags")}
                     | {"url": f"./posts/{post['slug']}.html", "excerpt": excerpt})
    index.sort(key=lambda item: item["date"], reverse=True)
    categories = ["Agent", *(post["category"] for post in index if post["category"] != "Agent")]
    data = json.dumps({"categories": list(dict.fromkeys(categories)), "posts": index}, ensure_ascii=False, indent=2)
    safe_data = data.replace("<", "\\u003c")
    (output / "blog-data.js").write_text(f"window.BLOG_DATA = {safe_data};\n", encoding="utf-8")
    # This directory contains only pages generated from Markdown.
    for page in (output / "posts").glob("*.html"):
        if page.stem not in slugs:
            page.unlink()
    if preview and (PREVIEW / "overrides").exists():
        for source in (PREVIEW / "overrides").rglob("*"):
            if source.is_file():
                target = output / source.relative_to(PREVIEW / "overrides")
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
    print(f"已生成 {len(posts)} 篇文章：{output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="构建个人主页和 Markdown 博客")
    parser.add_argument("--preview", action="store_true", help="使用 preview/ 中的测试素材，输出到 preview/output/")
    parser.add_argument("--preview-posts", type=int, default=0, metavar="数量",
                        help="另外生成指定数量的临时分页文章，并启用预览模式")
    args = parser.parse_args()
    if args.preview_posts < 0:
        parser.error("--preview-posts 不能为负数")
    build(args.preview_posts, args.preview)
