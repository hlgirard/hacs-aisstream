"""Release consistency checks."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).parent.parent


def test_versions_match() -> None:
    """The card version (from package.json) must match the integration's."""
    manifest = json.loads((ROOT / "custom_components/aisstream/manifest.json").read_text())
    package = json.loads((ROOT / "frontend/package.json").read_text())
    assert package["version"] == manifest["version"]
