"""Build documentation with an optional deployment date on each page."""

from __future__ import annotations

import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="zensical-docs-", dir=ROOT) as temp:
        docs_dir = Path(temp)
        shutil.copytree(ROOT / "docs", docs_dir, dirs_exist_ok=True)

        build_date = os.environ.get("DOCS_BUILD_DATE", "").strip()
        if build_date:
            for page in docs_dir.rglob("*.md"):
                markdown = page.read_text(encoding="utf-8")
                if not markdown.lstrip().startswith("> 最終更新日:"):
                    page.write_text(
                        f"> 最終更新日: {build_date}\n\n{markdown}", encoding="utf-8"
                    )

        config = (ROOT / "mkdocs.yml").read_text(encoding="utf-8")
        config, count = re.subn(
            r"(?m)^docs_dir: docs$", f"docs_dir: {docs_dir.name}", config
        )
        if count != 1:
            raise RuntimeError("mkdocs.yml の docs_dir: docs が見つかりません")

        config_file = ROOT / ".zensical-build.yml"
        try:
            config_file.write_text(config, encoding="utf-8")
            subprocess.run(
                [sys.executable, "-m", "zensical", "build", "--strict", "--clean", "-f", str(config_file)],
                cwd=ROOT,
                check=True,
            )
            if not (ROOT / ".mkdocs-build" / "site" / "index.html").is_file():
                raise RuntimeError("Zensical のトップページが生成されませんでした")
        finally:
            config_file.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
