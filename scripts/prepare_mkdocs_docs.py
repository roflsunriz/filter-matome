from __future__ import annotations

import shutil
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SOURCE_DOCS_DIR = ROOT_DIR / "docs"
STAGING_DIR = ROOT_DIR / ".mkdocs-build" / "docs"
ASSETS_DIR = STAGING_DIR / "assets"

MARKDOWN_EXTENSIONS = {".md", ".markdown"}
PATH_REPLACEMENTS = {
    "../resources/": "assets/resources/",
    "../local/images/": "assets/local-images/",
}


def reset_staging_dir() -> None:
    staging_root = STAGING_DIR.parent
    if staging_root.exists():
        shutil.rmtree(staging_root)
    STAGING_DIR.mkdir(parents=True, exist_ok=True)


def copy_docs() -> None:
    for path in SOURCE_DOCS_DIR.rglob("*"):
        relative_path = path.relative_to(SOURCE_DOCS_DIR)
        destination = STAGING_DIR / relative_path

        if path.is_dir():
            destination.mkdir(parents=True, exist_ok=True)
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)


def copy_assets() -> None:
    shutil.copytree(ROOT_DIR / "resources", ASSETS_DIR / "resources", dirs_exist_ok=True)
    shutil.copytree(ROOT_DIR / "local" / "images", ASSETS_DIR / "local-images", dirs_exist_ok=True)


def rewrite_markdown_links() -> None:
    for markdown_file in STAGING_DIR.rglob("*"):
        if markdown_file.suffix.lower() not in MARKDOWN_EXTENSIONS:
            continue

        content = markdown_file.read_text(encoding="utf-8")
        for before, after in PATH_REPLACEMENTS.items():
            content = content.replace(before, after)
        markdown_file.write_text(content, encoding="utf-8")


def main() -> None:
    reset_staging_dir()
    copy_docs()
    copy_assets()
    rewrite_markdown_links()


if __name__ == "__main__":
    main()
