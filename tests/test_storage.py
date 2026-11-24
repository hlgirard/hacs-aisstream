"""Tests for the SQLite track store."""

from __future__ import annotations

from pathlib import Path

import pytest

from custom_components.aisstream.models import TrackPoint
from custom_components.aisstream.storage import TrackStore

DAY = 86400.0
NOW = 1_800_000_000.0


@pytest.fixture
def store(tmp_path: Path):
    s = TrackStore(str(tmp_path / "t.db"))
    s.open()
    yield s
    s.close()


def _points(mmsi: int, ages_days: list[float]) -> list[tuple[int, TrackPoint]]:
    return [(mmsi, TrackPoint(NOW - a * DAY, 42.0, -71.0, 1.0, 10.0, 10)) for a in ages_days]


def test_roundtrip(store: TrackStore) -> None:
    store.write(_points(1, [0.5, 0.1]), {1: ({"name": "A", "ship_type": 70}, NOW - 0.1 * DAY)})
    statics, points = store.load_recent(NOW - DAY)
    assert statics[1][0]["name"] == "A"
    assert [p.ts for _, p in points] == sorted(p.ts for _, p in points)
    assert len(points) == 2


def test_prune_rules(store: TrackStore) -> None:
    store.write(_points(1, [0.5, 2, 400]), {})  # normal vessel
    store.write(_points(2, [0.5, 2, 400]), {})  # favorite, 7 days
    store.write(_points(3, [0.5, 2, 4000]), {})  # favorite, unlimited
    store.write(_points(4, [0.5, 2, 400]), {})  # favorite, 0.1 day < region retention
    store.set_favorites([(2, None, 7.0), (3, "Mine", None), (4, None, 0.1)])
    deleted = store.prune(NOW, region_retention_s=DAY)
    remaining = {
        m: store.conn.execute("SELECT COUNT(*) FROM positions WHERE mmsi=?", (m,)).fetchone()[0]
        for m in (1, 2, 3, 4)
    }
    # normal: only < 1 day kept; fav 7 d: 2 kept; unlimited: all; short fav: region retention
    assert remaining == {1: 1, 2: 2, 3: 3, 4: 1}
    assert deleted == 2 + 1 + 2


def test_unfavorite_falls_back_to_region_retention(store: TrackStore) -> None:
    store.write(_points(3, [0.5, 30]), {})
    store.set_favorites([(3, None, None)])
    assert store.prune(NOW, DAY) == 0
    store.set_favorites([])
    assert store.prune(NOW, DAY) == 1


def test_load_recent_includes_old_favorite_position(store: TrackStore) -> None:
    store.write(_points(5, [10, 9]), {5: ({"name": "FAR"}, NOW - 9 * DAY)})
    statics, points = store.load_recent(NOW - DAY, favorites=[5])
    assert 5 in statics
    assert len(points) == 1 and points[0][1].ts == NOW - 9 * DAY


def test_query_track_downsamples(store: TrackStore) -> None:
    pts = [(7, TrackPoint(NOW - i * 60, 42.0 + i * 1e-4, -71.0, 5.0, 1.0, 1)) for i in range(10_000)]
    store.write(pts, {})
    full = store.query_track(7, NOW - 3600, NOW, 5000)
    assert len(full) == 61
    sampled = store.query_track(7, NOW - 10_000 * 60, NOW, 500)
    assert 0 < len(sampled) <= 501
    assert [p.ts for p in sampled] == sorted(p.ts for p in sampled)
    assert store.first_ts(7) == NOW - 9_999 * 60


def test_purge(store: TrackStore) -> None:
    store.write(_points(8, [0.1, 0.2]), {})
    assert store.purge(8) == 2
    assert store.query_track(8, 0, NOW, 10) == []


def test_query_track_all_buckets_by_stored_span(store: TrackStore) -> None:
    """'All' asks from 1970; buckets must follow the data, not the request."""
    pts = [(9, TrackPoint(NOW - i * 60, 42.0 + i * 1e-5, -71.0, 5.0, 1.0, 1)) for i in range(20_000)]
    store.write(pts, {})
    sampled = store.query_track(9, 0, NOW, 5000)
    assert 4000 < len(sampled) <= 5001
