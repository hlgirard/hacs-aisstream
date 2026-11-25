# AISStream for Home Assistant

Live AIS ship tracking for Home Assistant using [aisstream.io](https://aisstream.io), with a map card that shows ships and their tracks over OpenSeaMap.

- Monitors one or more regions (one config entry each) over a single aisstream.io websocket per region.
- Stores thinned tracks in a local SQLite file, so tracks survive restarts.
- **Favorite vessels** (by MMSI) get a device tracker, a status sensor, speed and last-seen sensors, and their own track retention, up to **unlimited**.
- The bundled **`custom:aisstream-map-card`** card draws ship icons (pentagons pointing along the heading) colored by type, fading tracks, popups with vessel details, a category legend/filter, and full history for favorites.

## Installation

1. In HACS → ⋮ → *Custom repositories*, add this repository as an **Integration**, then install **AISStream**.
2. Restart Home Assistant.
3. *Settings → Devices & services → Add integration → AISStream*. Enter your free aisstream.io API key, a region name and a circle on the map. The bounding box of the circle is monitored.

The first connection can take up to a minute. The aisstream.io handshake currently takes 7–16 s.

No Lovelace resource needs to be added: the integration serves and registers the card itself.

## Map card

Add the card from the dashboard's card picker ("AIS ship map"); all options are available in its visual editor. In YAML:

```yaml
type: custom:aisstream-map-card
title: Boston Harbor
track_minutes: 5     # track length behind each vessel (longer history: favorites, from the popup)
```

| Option | Default | Description |
| --- | --- | --- |
| `entry_id` | first region | Which region to show, when you have several |
| `track_minutes` | `5` | Length of the track drawn behind each vessel, up to 1440 (24 h). The card loads just enough data for this |
| `show_tracks` | `true` | Draw tracks |
| `show_names` | `false` | Vessel names next to the icons. Names that would overlap another name or icon are hidden and reappear as you zoom in; favorites and moving vessels win |
| `hide_stationary` | `false` | Start with stopped vessels hidden. The **Hide stopped** button on the map toggles this (see below) |
| `show_favorites` | `true` | Always show favorites, ignoring filters |
| `base` | `simple` | `simple` (minimal map following the HA dark mode), `simple-light`, `simple-dark`, or `osm` (detailed OpenStreetMap) |
| `map_labels` | `true` | Place names on the simple map |
| `seamarks` | `true` | OpenSeaMap seamark overlay (buoys, lights, channels) |
| `tile_url` / `tile_attribution` | – | Custom base layer |
| `height` / `aspect_ratio` | fill / – | Card size, e.g. `height: 500px` or `aspect_ratio: "16:9"` |
| `fit` | `region` | Initial view: `region` or `vessels` |
| `stale_minutes` | `10` | Vessels not heard for this long are hidden (favorites stay, drawn faded) |
| `moving_stale_minutes` | `20` | Same, for vessels whose last reported speed was over 1 kn (reception gaps are common under way) |

Icons point along the vessel's heading (or course, when moving without a heading). Stopped vessels have a lighter fill, and favorites have a gold outline and a star.

On the map, a vessel counts as **moving** once it reports 1 kn or more. It stays moving until it has sent two reports below 1 kn, or has been slow for 10 minutes without another report. A single slow report or a brief slowdown therefore doesn't hide it, but a vessel that never went above 1 kn counts as stopped. **Hide stopped** and the lighter "stopped" fill use this rule; the favorite status sensor keeps its own (stopped below 0.5 kn, immediately).

Click a category in the legend to hide or show it; double-click it to show only that category (double-click again to show all). Legend counts follow the other filters (not heard recently, **Hide stopped**); the vessel count at the top is what is actually on the map.

Click a vessel for details (the text can be selected and copied). For favorites, the popup offers history ranges (6h · 24h · 7d · 30d · 1y · All, capped by that favorite's retention), loaded from the database. Picking one closes the popup and shows a small panel in the top-left corner instead, so the track stays visible: switch ranges there, ⓘ reopens the details, ✕ removes the track.

The simple map shows only land, water, piers, major roads and place names. It is drawn in the browser with [MapLibre GL](https://maplibre.org) from [OpenFreeMap](https://openfreemap.org) vector tiles (free, no API key; needs WebGL, otherwise the card falls back to `osm`). MapLibre (about 1 MB) is only downloaded when the simple map is used. The `osm` map goes through Home Assistant's map tile proxy. Seamarks are loaded from OpenSeaMap. Their usage policies allow light personal use.

## Entities

Per region:

| Entity | Description |
| --- | --- |
| `sensor.<region>_vessels` | Vessels in the region heard within the stale threshold. Attributes: underway/stationary split and counts per category |
| `sensor.<region>_vessels_underway` | Moving vessels |
| `sensor.<region>_message_rate` | Messages per minute (diagnostic) |
| `sensor.<region>_last_message` | Last message time (diagnostic) |
| `binary_sensor.<region>_connected` | Subscription status (diagnostic). Attribute `last_error` |

The vessel count sensors become unavailable once the connection has been down for 5 minutes (reconnects normally take 10–20 s); the diagnostic sensors stay available, so you can see when the last message arrived. A server that is slow to confirm counts as a connection problem, not a rejected key. Losing and regaining the connection is logged at info level. If aisstream.io rejects the subscription 5 times in a row, which is how it reacts to a bad API key, Home Assistant asks you to re-enter the key (*Settings → Devices & services*). The prompt disappears on its own if the connection comes back.

Per favorite vessel (one device each): `device_tracker.<name>` (works with zones and the stock map), `sensor.<name>_status`, `sensor.<name>_speed`, `sensor.<name>_last_seen`, and `button.<name>_purge_track_history`.

`sensor.<name>_status` is an enum sensor meant for automations. It uses the navigational status the vessel reports over AIS when there is one (`underway`, `sailing`, `at_anchor`, `moored`, `aground`, `fishing`, `not_under_command`, `restricted_manoeuvrability`, `constrained_by_draught`, `emergency`). A reported "under way" (engine or sailing) becomes `stopped` when the vessel is doing less than 0.5 kn, since crews often leave it set while alongside. Without a usable AIS status (Class B transponders, or status "undefined") it is inferred from speed: `underway` at 0.5 kn or more, else `stopped`. It becomes `out_of_range` when the vessel hasn't been heard within the stale threshold, which is what happens when it leaves the region. The `source` attribute says `ais`, or `inferred` when the status comes from speed (including the under-way override). The `ais_nav_status` attribute keeps the raw AIS value (e.g. `0` while the status shows `stopped`).

```yaml
triggers:
  - trigger: state
    entity_id: sensor.freedom_status
    from: moored
    to: underway
```

Bulk ship data is never written to the recorder; it lives in the integration's own database.

## Favorites and retention

Add favorites on the integration page with **+ Add favorite vessel** (MMSI, optional name, retention). Each favorite can be edited or removed on its own.

- **Region retention** (options): how long tracks of *all* vessels are kept on disk. Default 24 h, with no upper limit; disk size is the only constraint, roughly 5–10 MB per day for a busy harbor. The options dialog shows the current database size.
- **Favorite retention**: a number of days, or *Keep history forever*. A favorite's history is never kept for less than the region retention. Points are thinned to about 1 per minute (or per 100 m / 15° turn) under way, and 1 per 10 minutes when stationary, so a year of a busy vessel is roughly 25–40 MB.
- Only the last 24 h is held in memory. Longer history is read from SQLite when the card asks for it.

Favorites are only tracked while they are inside the region's bounding box.

The database lives at `/config/aisstream_<entry_id>.db` and is deleted when the entry is removed.

## Development

```bash
uv venv --python 3.14 .venv && uv pip install --python .venv/bin/python -r requirements_test.txt
.venv/bin/python -m pytest

cd frontend && npm install && npm run typecheck && npm run build   # writes custom_components/aisstream/frontend/
```

`tests/fixtures/boston_sample.jsonl` is a 15-minute raw capture of Boston Harbor, used for parser and registry tests.

## License

MIT. See [LICENSE](LICENSE).
