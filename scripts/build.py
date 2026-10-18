"""Build the static site and blog from content/posts/*.md."""

from __future__ import annotations

import html
import json
import re
import shutil
from string import Template
from datetime import date, datetime
from pathlib import Path

import yaml
from markdown_it import MarkdownIt


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
CONTENT = ROOT / "content" / "posts"
OUTPUT = ROOT / "dist"
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SOURCE_FILES = ("index.html", "about.html", "blog.html", "blog.js", "projects.js", "projects-data.js", "article.js")


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
    for field in ("title", "summary", "category"):
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
        "summary": metadata["summary"].strip(),
        "date": published,
        "category": metadata["category"].strip(),
        "tags": [tag.strip() for tag in tags],
        "slug": slug,
        "body": match.group(2),
    }


def render_post(post: dict) -> str:
    escaped = {key: html.escape(str(post[key]), quote=True) for key in ("title", "summary", "date", "category")}
    parser = MarkdownIt("commonmark", {"html": False}).enable("table").enable("strikethrough")
    tokens = parser.parse(post["body"])
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
    return Template((ROOT / "templates" / "article.html").read_text(encoding="utf-8")).substitute(
        **escaped, tags=tags, body=body, toc="\n".join(toc_items), section_count=section_count
    )


def build() -> None:
    posts: list[dict] = []
    slugs: set[str] = set()
    for path in sorted(CONTENT.glob("*.md")) if CONTENT.exists() else []:
        post = parse_post(path)
        if post is None:
            continue
        if post["slug"] in slugs:
            raise fail(path, f"slug 重复：{post['slug']}")
        slugs.add(post["slug"])
        posts.append(post)

    OUTPUT.mkdir(exist_ok=True)
    for name in SOURCE_FILES + ("article.css",):
        shutil.copy2(SITE / name, OUTPUT / name)
    if (SITE / "figures").exists():
        shutil.copytree(SITE / "figures", OUTPUT / "figures", dirs_exist_ok=True)
    if (ROOT / "content" / "images").exists():
        shutil.copytree(ROOT / "content" / "images", OUTPUT / "images", dirs_exist_ok=True)
    (OUTPUT / "posts").mkdir(exist_ok=True)

    index = []
    for post in posts:
        (OUTPUT / "posts" / f"{post['slug']}.html").write_text(render_post(post), encoding="utf-8")
        index.append({key: post[key] for key in ("title", "summary", "date", "category", "tags")}
                     | {"url": f"./posts/{post['slug']}.html"})
    index.sort(key=lambda item: item["date"], reverse=True)
    categories = ["Agent", *(post["category"] for post in index if post["category"] != "Agent")]
    data = json.dumps({"categories": list(dict.fromkeys(categories)), "posts": index}, ensure_ascii=False, indent=2)
    safe_data = data.replace("<", "\\u003c")
    (OUTPUT / "blog-data.js").write_text(f"window.BLOG_DATA = {safe_data};\n", encoding="utf-8")
    print(f"已生成 {len(posts)} 篇文章：{OUTPUT}")


if __name__ == "__main__":
    build()
