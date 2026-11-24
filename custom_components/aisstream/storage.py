"""SQLite track store. All methods are blocking; call them from an executor."""

from __future__ import annotations

import contextlib
import json
import os
import sqlite3
import threading
from collections.abc import Iterable
from typing import Any

from .models import TrackPoint

SCHEMA = """
CREATE TABLE IF NOT EXISTS vessels (
    mmsi INTEGER PRIMARY KEY,
    static_json TEXT NOT NULL,
    last_seen REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS positions (
    mmsi INTEGER NOT NULL,
    ts REAL NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    sog REAL,
    cog REAL,
    heading INTEGER
);
CREATE INDEX IF NOT EXISTS positions_ts ON positions (ts);
CREATE INDEX IF NOT EXISTS positions_mmsi_ts ON positions (mmsi, ts);
CREATE TABLE IF NOT EXISTS favorites (
    mmsi INTEGER PRIMARY KEY,
    alias TEXT,
    retention_days REAL
);
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
);
"""

# Run VACUUM once this many rows have been deleted since the last one.
VACUUM_THRESHOLD = 500_000


class TrackStore:
    """Persists vessels and thinned positions."""

    def __init__(self, path: str) -> None:
        """Initialise (does not touch the disk)."""
        self.path = path
        self._conn: sqlite3.Connection | None = None
        self._lock = threading.Lock()

    @property
    def conn(self) -> sqlite3.Connection:
        """Open connection."""
        if self._conn is None:
            raise RuntimeError("store not open")
        return self._conn

    def open(self) -> None:
        """Open the database and create the schema."""
        with self._lock:
            self._conn = sqlite3.connect(self.path, check_same_thread=False)
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute("PRAGMA synchronous=NORMAL")
            self._conn.executescript(SCHEMA)
            self._conn.commit()

    def close(self) -> None:
        """Close the database."""
        with self._lock:
            if self._conn is not None:
                self._conn.close()
                self._conn = None

    @staticmethod
    def remove(path: str) -> None:
        """Delete the database files."""
        for suffix in ("", "-wal", "-shm"):
            with contextlib.suppress(FileNotFoundError):
                os.remove(path + suffix)

    # -- writes ----------------------------------------------------------------

    def write(
        self,
        points: list[tuple[int, TrackPoint]],
        statics: dict[int, tuple[dict[str, Any], float]],
    ) -> None:
        """Persist pending points and vessel static data."""
        if not points and not statics:
            return
        with self._lock, self.conn:
            if statics:
                self.conn.executemany(
                    "INSERT INTO vessels (mmsi, static_json, last_seen) VALUES (?, ?, ?) "
                    "ON CONFLICT(mmsi) DO UPDATE SET static_json=excluded.static_json, "
                    "last_seen=MAX(last_seen, excluded.last_seen)",
                    [
                        (mmsi, json.dumps(static, separators=(",", ":")), last_seen)
                        for mmsi, (static, last_seen) in statics.items()
                    ],
                )
            if points:
                self.conn.executemany(
                    "INSERT INTO positions (mmsi, ts, lat, lon, sog, cog, heading) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [(mmsi, *p) for mmsi, p in points],
                )

    def set_favorites(self, favorites: Iterable[tuple[int, str | None, float | None]]) -> None:
        """Replace the favorites table: (mmsi, alias, retention_days or None)."""
        with self._lock, self.conn:
            self.conn.execute("DELETE FROM favorites")
            self.conn.executemany(
                "INSERT INTO favorites (mmsi, alias, retention_days) VALUES (?, ?, ?)",
                list(favorites),
            )

    def purge(self, mmsi: int) -> int:
        """Delete all stored positions for a vessel."""
        with self._lock, self.conn:
            cur = self.conn.execute("DELETE FROM positions WHERE mmsi = ?", (mmsi,))
            return cur.rowcount

    def prune(self, now: float, region_retention_s: float) -> int:
        """Apply retention rules. Returns the number of deleted positions.

        - Non-favorites: older than the region retention.
        - Favorites with a retention: older than max(own retention, region retention).
        - Favorites with unlimited retention (NULL): never.
        """
        cutoff = now - region_retention_s
        with self._lock, self.conn:
            deleted = self.conn.execute(
                "DELETE FROM positions WHERE ts < ? "
                "AND mmsi NOT IN (SELECT mmsi FROM favorites)",
                (cutoff,),
            ).rowcount
            deleted += self.conn.execute(
                "DELETE FROM positions WHERE mmsi IN "
                "(SELECT mmsi FROM favorites WHERE retention_days IS NOT NULL) "
                "AND ts < ? - MAX(?, (SELECT retention_days * 86400 FROM favorites f "
                "WHERE f.mmsi = positions.mmsi))",
                (now, region_retention_s),
            ).rowcount
            self.conn.execute(
                "DELETE FROM vessels WHERE last_seen < ? "
                "AND mmsi NOT IN (SELECT mmsi FROM favorites) "
                "AND mmsi NOT IN (SELECT DISTINCT mmsi FROM positions)",
                (cutoff,),
            )
            total = deleted + int(self._meta("deleted_since_vacuum") or 0)
            self._set_meta("deleted_since_vacuum", str(total))
        if total >= VACUUM_THRESHOLD:
            with self._lock:
                self.conn.execute("VACUUM")
                with self.conn:
                    self._set_meta("deleted_since_vacuum", "0")
        return deleted

    def _meta(self, key: str) -> str | None:
        row = self.conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        return row[0] if row else None

    def _set_meta(self, key: str, value: str) -> None:
        self.conn.execute(
            "INSERT INTO meta (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )

    # -- reads -----------------------------------------------------------------

    def load_recent(
        self, since: float, favorites: Iterable[int] = ()
    ) -> tuple[dict[int, tuple[dict[str, Any], float]], list[tuple[int, TrackPoint]]]:
        """Load vessels seen since `since` (plus favorites) and their points."""
        fav = list(favorites)
        with self._lock:
            placeholders = ",".join("?" * len(fav)) or "NULL"
            rows = self.conn.execute(
                "SELECT mmsi, static_json, last_seen FROM vessels "
                f"WHERE last_seen >= ? OR mmsi IN ({placeholders})",
                (since, *fav),
            ).fetchall()
            points = self.conn.execute(
                "SELECT mmsi, ts, lat, lon, sog, cog, heading FROM positions "
                "WHERE ts >= ? ORDER BY ts",
                (since,),
            ).fetchall()
            # Last known position of favorites not seen recently
            last_fav = []
            for mmsi in fav:
                row = self.conn.execute(
                    "SELECT mmsi, ts, lat, lon, sog, cog, heading FROM positions "
                    "WHERE mmsi = ? AND ts < ? ORDER BY ts DESC LIMIT 1",
                    (mmsi, since),
                ).fetchone()
                if row:
                    last_fav.append(row)
        statics = {mmsi: (json.loads(static), last_seen) for mmsi, static, last_seen in rows}
        all_points = [(r[0], TrackPoint(*r[1:])) for r in sorted(last_fav, key=lambda r: r[1])]
        all_points += [(r[0], TrackPoint(*r[1:])) for r in points]
        return statics, all_points

    def query_track(
        self, mmsi: int, start: float, end: float, max_points: int
    ) -> list[TrackPoint]:
        """Positions for one vessel, downsampled to at most max_points."""
        with self._lock:
            count, lo, hi = self.conn.execute(
                "SELECT COUNT(*), MIN(ts), MAX(ts) FROM positions "
                "WHERE mmsi = ? AND ts BETWEEN ? AND ?",
                (mmsi, start, end),
            ).fetchone()
            if count <= max_points:
                rows = self.conn.execute(
                    "SELECT ts, lat, lon, sog, cog, heading FROM positions "
                    "WHERE mmsi = ? AND ts BETWEEN ? AND ? ORDER BY ts",
                    (mmsi, start, end),
                ).fetchall()
            else:
                # Size buckets from the data actually stored in the window, not
                # the requested range ("all" asks from 1970).
                start = lo
                bucket = max((hi - lo) / max_points, 1.0)
                # SQLite returns the row holding MAX(ts) for bare columns.
                rows = self.conn.execute(
                    "SELECT MAX(ts), lat, lon, sog, cog, heading FROM positions "
                    "WHERE mmsi = ? AND ts BETWEEN ? AND ? "
                    "GROUP BY CAST((ts - ?) / ? AS INTEGER) ORDER BY 1",
                    (mmsi, start, end, start, bucket),
                ).fetchall()
        return [TrackPoint(*row) for row in rows]

    def first_ts(self, mmsi: int) -> float | None:
        """Oldest stored position for a vessel."""
        with self._lock:
            row = self.conn.execute(
                "SELECT MIN(ts) FROM positions WHERE mmsi = ?", (mmsi,)
            ).fetchone()
        return row[0] if row else None

    def stats(self) -> dict[str, Any]:
        """Row counts and file size, for diagnostics."""
        with self._lock:
            (positions,) = self.conn.execute("SELECT COUNT(*) FROM positions").fetchone()
            (vessels,) = self.conn.execute("SELECT COUNT(*) FROM vessels").fetchone()
        try:
            size = os.path.getsize(self.path)
        except OSError:
            size = None
        return {"positions": positions, "vessels": vessels, "size_bytes": size}
