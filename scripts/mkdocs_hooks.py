from __future__ import annotations

import os


def on_page_markdown(markdown: str, **_: object) -> str:
    build_date = os.getenv("DOCS_BUILD_DATE", "").strip()
    if not build_date:
        return markdown

    stripped_markdown = markdown.lstrip()
    if stripped_markdown.startswith("> 最終更新日:"):
        return markdown

    return f"> 最終更新日: {build_date}\n\n{markdown}"
