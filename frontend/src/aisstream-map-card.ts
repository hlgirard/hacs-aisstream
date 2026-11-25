import { LitElement, css, html, nothing, unsafeCSS, type PropertyValues } from "lit";
import * as L from "leaflet";
import leafletCss from "leaflet/dist/leaflet.css";
import { CONFIG_DEFAULTS } from "./editor"; // also defines the editor element

import {
  BASE_LAYERS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  FAVORITE_COLOR,
  NAV_STATUS_LABELS,
  STATUS_LABELS,
  SEAMARK_LAYER,
  escapeHtml,
  relativeTime,
  type TileDef,
} from "./style";
import type {
  CardConfig,
  Delta,
  HomeAssistant,
  Snapshot,
  TrackResult,
  TrackTriple,
  VesselSummary,
} from "./types";
// Single source for the card version; tests/test_release.py checks it matches manifest.json.
import { version as CARD_VERSION } from "../package.json";

const HOUR = 3600;
// Track age buckets, as fractions of the track window: [max age, opacity]
const FADE: [number, number][] = [
  [1 / 3, 0.9],
  [2 / 3, 0.55],
  [Infinity, 0.25],
];
const DEFAULT_TRACK_MINUTES = 5;
const HISTORY_RANGES: [string, number | null][] = [
  ["6h", 6 * HOUR],
  ["24h", 24 * HOUR],
  ["7d", 7 * 24 * HOUR],
  ["30d", 30 * 24 * HOUR],
  ["1y", 365 * 24 * HOUR],
  ["All", null],
];

// Vessel name labels: offset right of the icon, hidden where they collide.
const LABEL_FONT = "600 11px Roboto, 'Noto Sans', sans-serif";
const LABEL_DX = 10;
const LABEL_H = 14;

// Map "moving" rules (the backend counts slow reports; see Vessel.update_motion).
const MOVING_SOG = 1; // kn: last known speed above this gets the longer cutoff
const MOVING_STOP_S = 600; // slow this long (with no further report) = stopped

interface VesselEntry {
  data: VesselSummary;
  track: TrackTriple[];
  marker?: L.Marker;
  label?: L.Marker;
  labelText?: string;
  labelWidth?: number;
  lines: L.Polyline[];
  iconKey?: string;
  trackKey?: string;
}

class AisStreamMapCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _status: { state: true },
    _hidden: { state: true },
    _hideStopped: { state: true },
    _counts: { state: true },
    _shown: { state: true },
    _history: { state: true },
  };

  hass?: HomeAssistant;
  private _config?: CardConfig;
  private _status: "loading" | "live" | "offline" | "error" = "loading";
  private _error = "";
  private _hidden = new Set<string>();
  private _hideStopped = false;
  // Per category: vessels that would be shown if that category is enabled.
  private _counts: Record<string, number> = {};
  private _shown = 0;
  // Favorite history on display: shown in a small docked panel instead of
  // the popup, so the track isn't hidden behind it.
  private _history?: { mmsi: number; range: string; status: string };

  private _map?: L.Map;
  private _renderer?: L.Canvas;
  private _baseLayer?: L.Layer;
  private _basemapModule?: Promise<typeof import("./basemap")>;
  private _simpleFailed = false;
  private _maplibreCssAdded = false;
  private _seamarks?: L.TileLayer;
  private _regionLayer?: L.LayerGroup;
  private _historyLayer?: L.LayerGroup;
  private _vessels = new Map<number, VesselEntry>();
  private _entryId?: string;
  private _favorites = new Map<number, { alias: string | null; retention_days: number | null }>();
  private _skew = 0; // server time - local time (s)
  private _unsub?: () => Promise<void>;
  private _connecting = false;
  // Bumped on disconnect so an in-flight _connect() can tell it is stale.
  private _connGen = 0;
  private _retryTimer?: number;
  private _tickTimer?: number;
  private _redrawQueued = false;
  private _fitted = false;
  private _darkMode?: boolean;
  private _resizeObserver?: ResizeObserver;
  private _selected?: number;
  // Bumped whenever the history line should be dropped (popup opened/closed),
  // so a slow history reply for a closed popup is ignored.
  private _historyGen = 0;
  private _lastBoxes?: Snapshot["boxes"];
  private _baseLayerKey?: string;
  // undefined = not fetched yet, null = map_tiles proxy unavailable
  private _tileToken?: string | null;
  private _tokenTimer?: number;

  static getStubConfig(): Partial<CardConfig> {
    return {};
  }

  static getConfigElement(): HTMLElement {
    return document.createElement("aisstream-map-card-editor");
  }

  setConfig(config: CardConfig): void {
    if (config.track_minutes !== undefined && (config.track_minutes <= 0 || config.track_minutes > 1440)) {
      throw new Error("track_minutes must be between 1 and 1440 (24 h; longer history: favorites, from the popup)");
    }
    const oldWindow = this._config ? this._windowHours() : undefined;
    const changedSource = this._config && this._config.entry_id !== config.entry_id;
    if (!this._config || this._config.hide_stationary !== config.hide_stationary) {
      this._hideStopped = !!config.hide_stationary;
    }
    this._config = {
      ...CONFIG_DEFAULTS,
      track_minutes: DEFAULT_TRACK_MINUTES,
      ...config,
    };
    if (this._map) {
      this._setupLayers();
      this._queueRedraw(true);
    }
    if (!changedSource && oldWindow !== undefined && this._windowHours() > oldWindow && this._entryId) {
      // Longer tracks: reload so the older points are fetched.
      this._disconnect();
      this._connect();
    }
    if (changedSource) {
      this._disconnect();
      this._clearVessels();
      this._connect();
    }
  }

  getCardSize(): number {
    return 7;
  }

  getGridOptions() {
    return { columns: 12, rows: 7, min_rows: 4, min_columns: 6 };
  }

  // -- lifecycle --------------------------------------------------------------

  connectedCallback(): void {
    super.connectedCallback();
    if (this._map) {
      this._connect();
      this._startTick();
      if (this._tileToken !== null) this._refreshTileToken();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._disconnect();
    window.clearInterval(this._tickTimer);
    this._tickTimer = undefined;
    window.clearInterval(this._tokenTimer);
    this._tokenTimer = undefined;
  }

  protected firstUpdated(): void {
    const el = this.renderRoot.querySelector("#map") as HTMLElement;
    // Lovelace may build cards while detached / hidden: wait for a real size
    // before creating the map, otherwise Leaflet computes a bogus view.
    this._resizeObserver = new ResizeObserver(() => {
      if (!el.clientWidth || !el.clientHeight) return;
      if (!this._map) this._initMap(el);
      else {
        this._map.invalidateSize();
        if (!this._fitted && this._lastBoxes) this._fitOnce(this._lastBoxes);
      }
    });
    this._resizeObserver.observe(el);
  }

  private _initMap(el: HTMLElement): void {
    this._renderer = L.canvas({ padding: 0.5 });
    this._map = L.map(el, {
      preferCanvas: true,
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: true,
    }).setView([0, 0], 2);
    this._map.attributionControl.setPrefix(false);
    // Vector base map goes under the raster tile pane (seamarks stay on top).
    this._map.createPane("basemap").style.zIndex = "150";
    // Name labels just below the ship icons.
    const labels = this._map.createPane("aisLabels");
    labels.style.zIndex = "590";
    labels.style.pointerEvents = "none";
    this._map.on("zoomend", () => this._layoutLabels());
    this._regionLayer = L.layerGroup().addTo(this._map);
    this._historyLayer = L.layerGroup().addTo(this._map);
    this._map.on("popupclose", () => {
      // The history panel keeps the vessel selected and its track drawn.
      if (this._history) return;
      this._selected = undefined;
      this._historyGen++;
      this._historyLayer?.clearLayers();
      this._queueRedraw();
    });
    this._setupLayers();
    this._connect();
    this._startTick();
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("hass") && this.hass) {
      const dark = !!this.hass.themes?.darkMode;
      if (dark !== this._darkMode) {
        this._darkMode = dark;
        if (this._map) this._setupLayers();
      }
      if (this._map && !this._unsub && !this._connecting && this._retryTimer === undefined) {
        this._connect();
      }
    }
  }

  private _startTick(): void {
    if (this._tokenTimer === undefined) {
      this._tokenTimer = window.setInterval(() => {
        if (this._tileToken !== null) this._refreshTileToken();
      }, 20 * 60_000);
    }
    if (this._tickTimer !== undefined) return;
    // Prune old points, refresh fading and staleness once a minute.
    const trackSeconds = (this._config?.track_minutes ?? DEFAULT_TRACK_MINUTES) * 60;
    this._tickTimer = window.setInterval(() => {
      this._prune();
      this._queueRedraw(true);
    }, Math.min(60_000, Math.max(5_000, (trackSeconds * 1000) / 20)));
  }

  // -- layers -----------------------------------------------------------------

  /** Resolved base layer: "custom", "osm", "simple-light" or "simple-dark". */
  private _baseKey(): string {
    const cfg = this._config!;
    if (cfg.tile_url) return "custom";
    let key: string = cfg.base ?? "simple";
    if (key !== "osm" && !key.startsWith("simple")) key = "simple";
    if (key === "simple") key = this._darkMode ? "simple-dark" : "simple-light";
    // No WebGL: use OSM (served through HA's map_tiles proxy, since OSM's
    // volunteer servers block direct browser requests from HA pages).
    if (key.startsWith("simple") && this._simpleFailed) key = "osm";
    // No map_tiles token: the simple map is the only option left.
    if (key === "osm" && this._tileToken === null && !this._simpleFailed) key = "simple-light";
    return key;
  }

  private _baseDef(key: string): TileDef {
    const cfg = this._config!;
    if (key === "custom") {
      return { url: cfg.tile_url!, attribution: cfg.tile_attribution ?? "", maxZoom: 19 };
    }
    if (key === "osm") {
      return {
        ...BASE_LAYERS.osm,
        url: `/api/map_tiles/raster/{z}/{x}/{y}.png?token=${encodeURIComponent(this._tileToken ?? "")}`,
      };
    }
    return BASE_LAYERS[key];
  }

  /** Minimal vector map (MapLibre, loaded on first use). */
  private async _setupSimple(dark: boolean, labels: boolean): Promise<void> {
    const layerKey = `simple|${dark}|${labels}`;
    if (this._baseLayerKey === layerKey) return;
    this._baseLayerKey = layerKey;
    try {
      this._basemapModule ??= import("./basemap");
      const mod = await this._basemapModule;
      if (this._baseLayerKey !== layerKey || !this._map) return;
      if (!mod.supported()) throw new Error("WebGL is not available");
      if (!this._maplibreCssAdded) {
        const style = document.createElement("style");
        style.textContent = mod.maplibreCss;
        this.renderRoot.appendChild(style);
        this._maplibreCssAdded = true;
      }
      this._baseLayer?.remove();
      this._baseLayer = mod.createSimpleLayer(dark, labels, "basemap").addTo(this._map);
    } catch (err) {
      console.warn("aisstream-map-card: simple base map unavailable, using OpenStreetMap", err);
      this._simpleFailed = true;
      this._baseLayerKey = undefined;
      this._setupLayers();
    }
  }

  /** Fetch / rotate the map_tiles proxy token (valid 30-60 min). */
  private async _refreshTileToken(): Promise<void> {
    if (!this.hass) return;
    try {
      const res = await this.hass.callWS<{ token: string }>({ type: "map_tiles/access_token" });
      this._tileToken = res.token;
    } catch (_err) {
      this._tileToken = null; // proxy not available: use the CARTO fallback
    }
    this._setupLayers();
  }

  private _setupLayers(): void {
    if (!this._map || !this._config) return;
    const key = this._baseKey();
    // Light text with a dark halo on the dark map, the reverse otherwise.
    this._map.getContainer().classList.toggle("dark-base", key === "simple-dark");
    // Wait for the proxy token before drawing OSM (avoids a burst of 401s).
    if (key === "osm" && this._tileToken === undefined) {
      this._refreshTileToken();
    } else if (key.startsWith("simple")) {
      this._setupSimple(key === "simple-dark", this._config.map_labels !== false);
    } else {
      const def = this._baseDef(key);
      if (!this._baseLayer || this._baseLayerKey !== key) {
        this._baseLayer?.remove();
        this._baseLayerKey = key;
        const layer = L.tileLayer(def.url, {
          attribution: def.attribution,
          maxZoom: def.maxZoom,
          maxNativeZoom: Math.min(def.maxZoom, 19),
          subdomains: def.subdomains ?? "abc",
        }).addTo(this._map);
        layer.bringToBack();
        this._baseLayer = layer;
      } else if ((this._baseLayer as any)._url !== def.url) {
        // Token rotated: new tiles use the new URL, displayed ones stay.
        (this._baseLayer as L.TileLayer).setUrl(def.url, true);
      }
    }
    if (this._config.seamarks && !this._seamarks) {
      this._seamarks = L.tileLayer(SEAMARK_LAYER.url, {
        attribution: SEAMARK_LAYER.attribution,
        maxZoom: 19,
        maxNativeZoom: SEAMARK_LAYER.maxZoom,
        zIndex: 5,
      }).addTo(this._map);
    } else if (!this._config.seamarks && this._seamarks) {
      this._seamarks.remove();
      this._seamarks = undefined;
    }
  }

  // -- data -------------------------------------------------------------------

  /** Hours of data to load and keep: enough for the tracks and for vessels
   * not yet hidden as not heard. */
  private _windowHours(): number {
    const cfg = this._config!;
    const minutes = Math.max(
      cfg.track_minutes ?? DEFAULT_TRACK_MINUTES,
      cfg.stale_minutes ?? 10,
      cfg.moving_stale_minutes ?? 20,
    );
    return Math.min(24, Math.max(0.1, minutes / 60));
  }

  private _now(): number {
    return Date.now() / 1000 + this._skew;
  }

  private async _connect(): Promise<void> {
    if (!this.hass || !this._map || this._connecting || this._unsub) return;
    this._connecting = true;
    const gen = ++this._connGen;
    const stale = () => gen !== this._connGen || !this.isConnected;
    window.clearTimeout(this._retryTimer);
    this._retryTimer = undefined;
    try {
      const snapshot = await this.hass.callWS<Snapshot>({
        type: "aisstream/snapshot",
        hours: this._windowHours(),
        ...(this._config!.entry_id ? { entry_id: this._config!.entry_id } : {}),
      });
      if (stale()) return;
      this._entryId = snapshot.entry_id;
      this._applySnapshot(snapshot);
      const unsub = await this.hass.connection.subscribeMessage<Delta>(
        (delta) => {
          if (gen === this._connGen) this._onDelta(delta);
        },
        { type: "aisstream/subscribe", entry_id: snapshot.entry_id },
      );
      if (stale()) {
        unsub().catch(() => undefined);
        return;
      }
      this._unsub = unsub;
      this._status = snapshot.connected ? "live" : "offline";
      this._error = "";
    } catch (err: any) {
      if (stale()) return;
      this._status = "error";
      this._error = err?.message ?? String(err);
      this._scheduleRetry();
    } finally {
      if (gen === this._connGen) this._connecting = false;
    }
  }

  private _disconnect(): void {
    // Invalidate any in-flight _connect(); it unsubscribes itself.
    this._connGen++;
    this._connecting = false;
    window.clearTimeout(this._retryTimer);
    this._retryTimer = undefined;
    const unsub = this._unsub;
    this._unsub = undefined;
    unsub?.().catch(() => undefined);
  }

  private _scheduleRetry(delay = 10_000): void {
    window.clearTimeout(this._retryTimer);
    this._retryTimer = window.setTimeout(() => {
      this._retryTimer = undefined;
      this._connect();
    }, delay);
  }

  private _applySnapshot(snapshot: Snapshot): void {
    this._skew = snapshot.now - Date.now() / 1000;
    this._favorites = new Map(
      snapshot.favorites.map((f) => [f.mmsi, { alias: f.alias, retention_days: f.retention_days }]),
    );
    this._clearVessels();
    for (const v of snapshot.vessels) {
      const { track, ...data } = v;
      this._vessels.set(v.mmsi, { data, track: track ?? [], lines: [] });
    }
    this._drawRegion(snapshot.boxes);
    this._lastBoxes = snapshot.boxes;
    if (!this._fitted) this._fitOnce(snapshot.boxes);
    this._queueRedraw(true);
  }

  private _onDelta(delta: Delta): void {
    if (delta.type === "closed") {
      // Entry is reloading (options/favorites changed): resubscribe shortly.
      const unsub = this._unsub;
      this._unsub = undefined;
      unsub?.().catch(() => undefined);
      this._status = "offline";
      this._scheduleRetry(5_000);
      return;
    }
    if (delta.now) this._skew = delta.now - Date.now() / 1000;
    if (delta.connected !== undefined) this._status = delta.connected ? "live" : "offline";
    for (const v of delta.vessels ?? []) {
      const entry = this._vessels.get(v.mmsi);
      if (entry) entry.data = v;
      else this._vessels.set(v.mmsi, { data: v, track: [], lines: [] });
    }
    for (const [mmsi, points] of Object.entries(delta.reset ?? {})) {
      // History purged: drop the cached track (keep the latest point).
      const entry = this._vessels.get(Number(mmsi));
      if (entry) entry.track = [...points];
      if (this._selected === Number(mmsi)) this._historyLayer?.clearLayers();
    }
    for (const [mmsi, points] of Object.entries(delta.points ?? {})) {
      const entry = this._vessels.get(Number(mmsi));
      if (!entry) continue;
      const lastTs = entry.track.length ? entry.track[entry.track.length - 1][0] : -1;
      for (const p of points) if (p[0] > lastTs) entry.track.push(p);
    }
    this._queueRedraw();
  }

  private _prune(): void {
    const cutoff = this._now() - this._windowHours() * HOUR;
    for (const [mmsi, entry] of this._vessels) {
      const idx = entry.track.findIndex((p) => p[0] >= cutoff);
      if (idx > 0) entry.track.splice(0, idx);
      else if (idx === -1) entry.track.length = 0;
      if ((entry.data.last_seen ?? 0) < cutoff && !entry.data.favorite) {
        this._removeVessel(mmsi);
      }
    }
  }

  private _clearVessels(): void {
    for (const mmsi of [...this._vessels.keys()]) this._removeVessel(mmsi);
  }

  private _removeVessel(mmsi: number): void {
    const entry = this._vessels.get(mmsi);
    if (!entry) return;
    entry.marker?.remove();
    entry.label?.remove();
    entry.lines.forEach((l) => l.remove());
    this._vessels.delete(mmsi);
  }

  // -- drawing ----------------------------------------------------------------

  private _drawRegion(boxes: Snapshot["boxes"]): void {
    this._regionLayer?.clearLayers();
    for (const [[lat1, lon1], [lat2, lon2]] of boxes) {
      L.rectangle(
        [
          [lat1, lon1],
          [lat2, lon2],
        ],
        {
          color: "#5c9ded",
          weight: 1,
          dashArray: "4 6",
          fill: false,
          interactive: false,
        },
      ).addTo(this._regionLayer!);
    }
  }

  private _fitOnce(boxes: Snapshot["boxes"]): void {
    const size = this._map?.getSize();
    if (!size || !size.x || !size.y) return; // retried from the ResizeObserver
    this._fit(boxes);
    this._fitted = true;
  }

  private _fit(boxes: Snapshot["boxes"]): void {
    if (!this._map) return;
    if (this._config!.fit === "vessels") {
      const pts = [...this._vessels.values()]
        .filter((e) => e.data.lat !== null)
        .map((e) => [e.data.lat!, e.data.lon!] as [number, number]);
      if (pts.length) {
        this._map.fitBounds(L.latLngBounds(pts), { padding: [20, 20], maxZoom: 15 });
        return;
      }
    }
    if (boxes.length) {
      const bounds = L.latLngBounds([]);
      for (const [a, b] of boxes) bounds.extend(a).extend(b);
      this._map.fitBounds(bounds, { padding: [10, 10] });
    }
  }

  private _queueRedraw(full = false): void {
    if (full) for (const e of this._vessels.values()) e.trackKey = undefined;
    if (this._redrawQueued) return;
    this._redrawQueued = true;
    requestAnimationFrame(() => {
      this._redrawQueued = false;
      this._redraw();
    });
  }

  /** Every filter except the category one (so legend counts stay meaningful
   * for categories that are switched off). Favorites stay visible when not
   * heard recently (drawn faded); other vessels are hidden. */
  /** Moving for the map: the backend's state (set at 1 kn, cleared after two
   * slower reports), also cleared once slow for 10 min without further
   * reports. */
  private _isMoving(d: VesselSummary, now: number): boolean {
    return d.moving && !(d.slow_since && now - d.slow_since >= MOVING_STOP_S);
  }

  /** Not heard for too long: a vessel whose last speed was over 1 kn gets the
   * longer moving cutoff (reception gaps are common while under way). */
  private _isStale(d: VesselSummary, now: number): boolean {
    const cfg = this._config!;
    const minutes = (d.sog ?? 0) > MOVING_SOG ? cfg.moving_stale_minutes! : cfg.stale_minutes!;
    return (d.last_seen ?? 0) < now - minutes * 60;
  }

  private _passesFilters(entry: VesselEntry, now: number): boolean {
    const d = entry.data;
    if (d.lat === null || d.lon === null) return false;
    if (d.favorite && this._config!.show_favorites) return true;
    if (this._isStale(d, now)) return false;
    if (this._hideStopped && !this._isMoving(d, now)) return false;
    return true;
  }

  private _isVisible(entry: VesselEntry, now: number): boolean {
    if (!this._passesFilters(entry, now)) return false;
    const d = entry.data;
    return (d.favorite && !!this._config!.show_favorites) || !this._hidden.has(d.category);
  }

  private _redraw(): void {
    if (!this._map) return;
    const now = this._now();
    const counts: Record<string, number> = {};
    let shown = 0;
    for (const [mmsi, entry] of this._vessels) {
      const d = entry.data;
      if (this._passesFilters(entry, now)) {
        counts[d.category] = (counts[d.category] ?? 0) + 1;
      }
      if (!this._isVisible(entry, now)) {
        entry.marker?.remove();
        entry.marker = undefined;
        entry.label?.remove();
        entry.label = undefined;
        entry.iconKey = undefined;
        entry.lines.forEach((l) => l.remove());
        entry.lines = [];
        entry.trackKey = undefined;
        continue;
      }
      shown++;
      this._drawMarker(mmsi, entry, this._isStale(d, now), this._isMoving(d, now));
      this._drawLabel(entry);
      this._drawTrack(mmsi, entry, now);
    }
    this._layoutLabels();
    this._counts = counts;
    this._shown = shown;
  }

  /** Name label (named vessels only; "MMSI …" would just add clutter). */
  private _drawLabel(entry: VesselEntry): void {
    const fav = this._favorites.get(entry.data.mmsi);
    const text = this._config!.show_names ? fav?.alias || entry.data.name : null;
    if (!text || !entry.marker) {
      entry.label?.remove();
      entry.label = undefined;
      return;
    }
    const latlng = entry.marker.getLatLng();
    if (entry.label && entry.labelText === text) {
      entry.label.setLatLng(latlng);
      return;
    }
    entry.label?.remove();
    entry.labelText = text;
    entry.labelWidth = Math.ceil(this._textWidth(text)) + 4;
    entry.label = L.marker(latlng, {
      pane: "aisLabels",
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        className: "ais-label",
        html: escapeHtml(text),
        iconSize: [entry.labelWidth, LABEL_H],
        iconAnchor: [-LABEL_DX, LABEL_H / 2],
      }),
    }).addTo(this._map!);
  }

  private _measureCtx?: CanvasRenderingContext2D | null;

  private _textWidth(text: string): number {
    this._measureCtx ??= document.createElement("canvas").getContext("2d");
    if (!this._measureCtx) return text.length * 7;
    this._measureCtx.font = LABEL_FONT;
    return this._measureCtx.measureText(text).width;
  }

  /** Greedy collision pass: ship icons are obstacles; labels are placed by
   * priority (selected, favorites, moving, larger) and hidden if they would
   * overlap anything already placed. Re-run on zoom, so they come back when
   * zoomed in. */
  private _layoutLabels(): void {
    if (!this._map) return;
    type Rect = [number, number, number, number];
    const placed: Rect[] = [];
    const items: { e: VesselEntry; x: number; y: number; prio: number }[] = [];
    for (const e of this._vessels.values()) {
      if (!e.marker) continue;
      const p = this._map.latLngToLayerPoint(e.marker.getLatLng());
      placed.push([p.x - 7, p.y - 9, p.x + 7, p.y + 9]);
      if (e.label) {
        const d = e.data;
        const prio =
          (this._selected === d.mmsi ? 1e6 : 0) + (d.favorite ? 1e5 : 0) + (this._isMoving(d, this._now()) ? 1e4 : 0) + (d.length ?? 0);
        items.push({ e, x: p.x, y: p.y, prio });
      }
    }
    items.sort((a, b) => b.prio - a.prio);
    for (const { e, x, y } of items) {
      const r: Rect = [x + LABEL_DX, y - LABEL_H / 2, x + LABEL_DX + e.labelWidth!, y + LABEL_H / 2];
      const hit = placed.some((o) => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]);
      const el = e.label!.getElement();
      if (el) el.style.visibility = hit ? "hidden" : "";
      if (!hit) placed.push(r);
    }
  }

  private _drawMarker(mmsi: number, entry: VesselEntry, stale: boolean, moving: boolean): void {
    const d = entry.data;
    // Heading when reported; course only means something while moving.
    const rotation = d.heading ?? (d.underway ? d.cog : null) ?? 0;
    const selected = this._selected === mmsi;
    const big = (d.length ?? 0) >= 100;
    const key = [d.category, Math.round(rotation), moving, d.favorite, stale, selected, big].join("|");
    const latlng: L.LatLngExpression = [d.lat!, d.lon!];
    if (!entry.marker) {
      entry.marker = L.marker(latlng, { keyboard: false, riseOnHover: true });
      entry.marker.bindTooltip(() => escapeHtml(this._displayName(d.mmsi)), {
        direction: "top",
        offset: [0, -8],
      });
      entry.marker.bindPopup(() => this._popupContent(mmsi), { maxWidth: 300, minWidth: 220 });
      entry.marker.on("popupopen", (ev: L.PopupEvent) => this._onPopupOpen(mmsi, ev));
      entry.marker.addTo(this._map!);
    } else {
      entry.marker.setLatLng(latlng);
      if (entry.marker.isPopupOpen()) this._refreshPopup(mmsi, entry.marker);
    }
    if (entry.iconKey !== key) {
      entry.iconKey = key;
      entry.marker.setIcon(this._icon(d.category, rotation, moving, d.favorite, stale, selected, big));
      entry.marker.setZIndexOffset(selected ? 2000 : d.favorite ? 1000 : 0);
    }
  }

  private _icon(
    category: string,
    rotation: number,
    moving: boolean,
    favorite: boolean,
    stale: boolean,
    selected: boolean,
    big: boolean,
  ): L.DivIcon {
    const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.unknown;
    const size = (big ? 30 : 24) + (favorite || selected ? 4 : 0);
    const stroke = favorite ? FAVORITE_COLOR : selected ? "#ffffff" : "rgba(0,0,0,0.8)";
    const strokeWidth = favorite || selected ? 2 : 1;
    // Stopped vessels get a lighter fill; vessels not heard recently fade out.
    const fillOpacity = moving ? 1 : 0.55;
    const opacity = stale ? 0.45 : 1;
    // Elongated pentagon: pointed bow up, square stern, rotated to the heading.
    const hull = `<path d="M0,-11 L4.5,-4 L4.5,10 L-4.5,10 L-4.5,-4 Z" fill="${color}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" transform="rotate(${rotation})"/>`;
    const star = favorite
      ? `<text x="6.5" y="-6" font-size="9" fill="${FAVORITE_COLOR}" stroke="rgba(0,0,0,0.7)" stroke-width="0.5">★</text>`
      : "";
    return L.divIcon({
      className: "ais-marker",
      html: `<svg width="${size}" height="${size}" viewBox="-12 -12 24 24" style="opacity:${opacity};overflow:visible">${hull}${star}</svg>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      tooltipAnchor: [0, 0],
      popupAnchor: [0, -size / 2],
    });
  }

  private _drawTrack(mmsi: number, entry: VesselEntry, now: number): void {
    const cfg = this._config!;
    const trackWindow = cfg.track_minutes! * 60;
    const cutoff = now - trackWindow;
    const track: TrackTriple[] = entry.track.filter((p) => p[0] >= cutoff);
    // The stored track is thinned; end it at the live position so it meets the marker.
    const d = entry.data;
    const lastTs = track.length ? track[track.length - 1][0] : -1;
    if (d.lat !== null && d.lon !== null && d.position_ts !== null && d.position_ts > lastTs && d.position_ts >= cutoff) {
      track.push([d.position_ts, d.lat, d.lon]);
    }
    const selected = this._selected === mmsi;
    const key = `${track.length}|${track.length ? track[0][0] : 0}|${track.length ? track[track.length - 1][0] : 0}|${selected}|${d.favorite}|${d.category}`;
    if (!cfg.show_tracks || track.length < 2) {
      entry.lines.forEach((l) => l.remove());
      entry.lines = [];
      entry.trackKey = undefined;
      return;
    }
    if (entry.trackKey === key) return;
    entry.trackKey = key;
    entry.lines.forEach((l) => l.remove());
    entry.lines = [];
    const color = CATEGORY_COLORS[entry.data.category] ?? CATEGORY_COLORS.unknown;
    const weight = selected ? 4 : entry.data.favorite ? 3 : 2;
    // Split into age buckets, newest last; share boundary points for continuity.
    let start = 0;
    const gap = this._config!.stale_minutes! * 60;
    for (let b = FADE.length - 1; b >= 0; b--) {
      const minAge = b > 0 ? FADE[b - 1][0] * trackWindow : 0;
      const opacity = selected ? 1 : FADE[b][1];
      // Split at reception gaps so we don't draw straight lines across them.
      const segs: [number, number][][] = [[]];
      let i = start;
      for (; i < track.length; i++) {
        const age = now - track[i][0];
        if (age < minAge) break;
        if (i > start && track[i][0] - track[i - 1][0] > gap) segs.push([]);
        segs[segs.length - 1].push([track[i][1], track[i][2]]);
      }
      const last = segs[segs.length - 1];
      if (i < track.length && last.length && track[i][0] - track[i - 1][0] <= gap) {
        last.push([track[i][1], track[i][2]]);
      }
      start = i;
      const lines = segs.filter((seg) => seg.length >= 2);
      if (lines.length) {
        entry.lines.push(
          L.polyline(lines, {
            renderer: this._renderer,
            color: entry.data.favorite && !selected ? FAVORITE_COLOR : color,
            weight,
            opacity,
            interactive: false,
            smoothFactor: 1,
          }).addTo(this._map!),
        );
      }
    }
  }

  // -- popup ------------------------------------------------------------------

  private _displayName(mmsi: number): string {
    const fav = this._favorites.get(mmsi);
    const d = this._vessels.get(mmsi)?.data;
    return fav?.alias || d?.name || `MMSI ${mmsi}`;
  }

  private _popupRows(mmsi: number): string[] {
    const entry = this._vessels.get(mmsi);
    if (!entry) return [];
    const d = entry.data;
    const now = this._now();
    const rows: string[] = [];
    const add = (label: string, value: unknown) => {
      if (value !== null && value !== undefined && value !== "") {
        rows.push(`<tr><th>${label}</th><td>${escapeHtml(value)}</td></tr>`);
      }
    };
    const typeLabel = CATEGORY_LABELS[d.category] ?? d.category;
    add("MMSI", d.mmsi);
    add("Type", `${typeLabel}${d.ship_type ? ` (${d.ship_type})` : ""}${d.ais_class ? ` · Class ${d.ais_class}` : ""}`);
    if (d.callsign) add("Call sign", d.callsign);
    if (d.imo) add("IMO", d.imo);
    const motion = [
      d.sog !== null ? `${d.sog.toFixed(1)} kn` : null,
      d.cog !== null ? `COG ${Math.round(d.cog)}°` : null,
      d.heading !== null ? `HDG ${d.heading}°` : null,
    ].filter(Boolean);
    add("Motion", motion.join(" · "));
    const reported = d.nav_status !== null && d.nav_status !== 15 ? NAV_STATUS_LABELS[d.nav_status] : undefined;
    const status = d.status ? STATUS_LABELS[d.status] ?? d.status : reported;
    if (status) add("Status", reported && reported !== status ? `${status} (reports ${reported.toLowerCase()})` : status);
    if (d.destination) add("Destination", `${d.destination}${d.eta ? ` (ETA ${d.eta})` : ""}`);
    if (d.length) add("Size", `${d.length} × ${d.beam ?? "?"} m${d.draught ? `, draught ${d.draught} m` : ""}`);
    if (d.last_seen) add("Last seen", relativeTime(now - d.last_seen));
    return rows;
  }

  private _popupBody(mmsi: number): string {
    const entry = this._vessels.get(mmsi);
    if (!entry) return "";
    const d = entry.data;
    const fav = this._favorites.get(mmsi);
    const title = escapeHtml(this._displayName(mmsi));
    const subtitle = fav?.alias && d.name ? `<div class="sub">${escapeHtml(d.name)}</div>` : "";
    const star = d.favorite ? '<span class="star" title="Favorite">★</span>' : "";
    return `<div class="title">${title} ${star}</div>${subtitle}
      <table>${this._popupRows(mmsi).join("")}</table>`;
  }

  /** Update the open popup's details in place, leaving the history controls
   * and status alone and without triggering Leaflet's autopan. */
  private _refreshPopup(mmsi: number, marker: L.Marker): void {
    const body = marker.getPopup()?.getElement()?.querySelector(".ais-popup-body");
    if (!body) return;
    const html = this._popupBody(mmsi);
    if (body.getAttribute("data-html") !== html) {
      body.innerHTML = html;
      body.setAttribute("data-html", html);
    }
  }

  private _popupContent(mmsi: number): string {
    const entry = this._vessels.get(mmsi);
    if (!entry) return "";
    const d = entry.data;
    let history = "";
    if (d.favorite) {
      const buttons = this._historyRanges(mmsi)
        .map((label) => `<button data-range="${label}">${label}</button>`)
        .join("");
      history = `<div class="history"><span>History</span>${buttons}</div>`;
    }
    const link = `https://www.marinetraffic.com/en/ais/details/ships/mmsi:${d.mmsi}`;
    return `<div class="ais-popup">
      <div class="ais-popup-body">${this._popupBody(mmsi)}</div>
      ${history}
      <a href="${link}" target="_blank" rel="noopener noreferrer">MarineTraffic ↗</a>
    </div>`;
  }

  private _onPopupOpen(mmsi: number, ev: L.PopupEvent): void {
    // Reopening the vessel whose history is shown keeps it; another one clears it.
    if (this._history?.mmsi !== mmsi) this._clearHistory();
    this._selected = mmsi;
    this._queueRedraw();
    const el = ev.popup.getElement();
    // Leaflet reuses the popup element across opens: bind the handler once.
    if (!el || el.dataset.aisBound) return;
    el.dataset.aisBound = "1";
    el.addEventListener("click", (e) => {
      const button = (e.target as HTMLElement).closest("button[data-range]") as HTMLButtonElement | null;
      if (!button) return;
      e.stopPropagation();
      const range = HISTORY_RANGES.find(([label]) => label === button.dataset.range);
      if (range) this._loadHistory(mmsi, range[0]);
    });
  }

  /** Drop the history line and panel. */
  private _clearHistory(): void {
    this._historyGen++;
    this._historyLayer?.clearLayers();
    if (this._history) {
      this._history = undefined;
      this._selected = undefined;
      this._queueRedraw();
    }
  }

  /** ✕ in the panel: also close the details popup if it was reopened. */
  private _closeHistory(): void {
    this._clearHistory();
    this._map?.closePopup();
  }

  private _showDetails(): void {
    const mmsi = this._history?.mmsi;
    if (mmsi === undefined || !this._map) return;
    const entry = this._vessels.get(mmsi);
    if (entry?.marker) {
      entry.marker.openPopup();
      return;
    }
    // Hidden by a filter (or not drawn): open the details at the last position.
    const d = entry?.data;
    if (d?.lat == null || d.lon == null) return;
    const popup = L.popup({ maxWidth: 300, minWidth: 220 })
      .setLatLng([d.lat, d.lon])
      .setContent(() => this._popupContent(mmsi))
      .openOn(this._map);
    this._onPopupOpen(mmsi, { popup } as L.PopupEvent);
  }

  private async _loadHistory(mmsi: number, label: string): Promise<void> {
    const seconds = HISTORY_RANGES.find(([l]) => l === label)?.[1] ?? null;
    const gen = ++this._historyGen;
    // Swap the popup for the compact panel while the track is on screen.
    this._history = { mmsi, range: label, status: "Loading…" };
    this._selected = mmsi;
    this._map?.closePopup();
    const setStatus = (status: string) => {
      if (gen === this._historyGen && this._history) this._history = { ...this._history, status };
    };
    try {
      const now = this._now();
      const result = await this.hass!.callWS<TrackResult>({
        type: "aisstream/track",
        entry_id: this._entryId,
        mmsi,
        start: seconds === null ? 0 : now - seconds,
      });
      // The panel was closed, or another range was requested, meanwhile.
      if (gen !== this._historyGen) return;
      this._historyLayer?.clearLayers();
      if (result.track.length >= 2) {
        // Split at gaps; long ranges are downsampled server-side (≤5000 points),
        // so allow for the bucket spacing as well.
        const span = result.track[result.track.length - 1][0] - result.track[0][0];
        // Stored tracks of idle vessels have one point per 10 min: don't split those.
        const gap = Math.max(30 * 60, (3 * span) / 5000);
        const latlngs: [number, number][][] = [[]];
        result.track.forEach((p, i) => {
          if (i > 0 && p[0] - result.track[i - 1][0] > gap) latlngs.push([]);
          latlngs[latlngs.length - 1].push([p[1], p[2]]);
        });
        const line = L.polyline(latlngs.filter((seg) => seg.length >= 2), {
          renderer: this._renderer,
          color: FAVORITE_COLOR,
          weight: 3,
          opacity: 0.95,
          dashArray: "6 5",
          interactive: false,
        }).addTo(this._historyLayer!);
        this._map!.fitBounds(line.getBounds(), { padding: [30, 30], maxZoom: 15 });
      }
      const since = result.first_ts ? new Date(result.first_ts * 1000).toLocaleDateString() : null;
      setStatus(`${result.track.length} points${since ? ` · since ${since}` : ""}`);
    } catch (err: any) {
      setStatus(`Error: ${err?.message ?? err}`);
    }
  }

  // -- template ---------------------------------------------------------------

  private _toggleStopped(): void {
    this._hideStopped = !this._hideStopped;
    this._queueRedraw(true);
  }

  /** Double-click: show only this category (again: show all). The two
   * clicks that precede the dblclick toggle twice, i.e. cancel out. */
  private _soloCategory(category: string): void {
    const others = Object.keys(CATEGORY_COLORS).filter((c) => c !== category);
    const alreadySolo = !this._hidden.has(category) && others.every((c) => this._hidden.has(c));
    this._hidden = alreadySolo ? new Set() : new Set(others);
    this._queueRedraw();
  }

  private _toggleCategory(category: string): void {
    const hidden = new Set(this._hidden);
    if (hidden.has(category)) hidden.delete(category);
    else hidden.add(category);
    this._hidden = hidden;
    this._queueRedraw();
  }

  private _historyRanges(mmsi: number): string[] {
    const retention = this._favorites.get(mmsi)?.retention_days ?? null;
    return HISTORY_RANGES.filter(
      ([, secs]) => retention === null || secs === null || secs <= Math.max(retention, 1) * 86400,
    ).map(([label]) => label);
  }

  private _renderHistoryPanel() {
    const h = this._history;
    if (!h) return nothing;
    return html`<div class="overlay history-panel">
      <div class="panel">
        <div class="panel-head">
          <span class="star">★</span>
          <span class="panel-name">${this._displayName(h.mmsi)}</span>
          <button class="icon" title="Vessel details" @click=${this._showDetails}>ⓘ</button>
          <button class="icon" title="Close history" @click=${this._closeHistory}>✕</button>
        </div>
        <div class="panel-ranges">
          ${this._historyRanges(h.mmsi).map(
            (label) => html`<button
              class=${label === h.range ? "active" : ""}
              @click=${() => this._loadHistory(h.mmsi, label)}
            >
              ${label}
            </button>`,
          )}
        </div>
        <div class="panel-status">${h.status}</div>
      </div>
    </div>`;
  }

  protected render() {
    if (!this._config) return nothing;
    const cfg = this._config;
    const style = cfg.aspect_ratio
      ? `aspect-ratio: ${cfg.aspect_ratio.replace(":", " / ")}`
      : `height: ${cfg.height ?? "100%"}; min-height: ${cfg.height ?? "320px"}`;
    const total = this._shown;
    // Keep switched-off categories in the legend so they can be switched back on.
    const present = new Set([...this._vessels.values()].filter((e) => e.data.lat !== null).map((e) => e.data.category));
    const categories = Object.keys(CATEGORY_COLORS).filter((c) => this._counts[c] || (this._hidden.has(c) && present.has(c)));
    const statusLabel =
      this._status === "live" ? "Live" : this._status === "loading" ? "Loading…" : this._status === "offline" ? "Reconnecting" : "Error";
    return html`
      <ha-card .header=${cfg.title}>
        <div class="wrap" style=${style}>
          <div id="map"></div>
          <div class="overlay top-right">
            <span class="status ${this._status}" title=${this._error}>${statusLabel}</span>
            <button
              class="chip toggle ${this._hideStopped ? "active" : ""}"
              @click=${this._toggleStopped}
              title=${this._hideStopped ? "Show stopped vessels" : "Hide stopped vessels"}
            >
              ${this._hideStopped ? "Stopped hidden" : "Hide stopped"}
            </button>
            <span class="count">${total} vessels</span>
          </div>
          ${this._renderHistoryPanel()}
          ${categories.length
            ? html`<div class="overlay legend">
                ${categories.map(
                  (c) => html`<button
                    class="chip ${this._hidden.has(c) ? "off" : ""}"
                    @click=${() => this._toggleCategory(c)}
                    @dblclick=${() => this._soloCategory(c)}
                    title="${CATEGORY_LABELS[c]}: click to show/hide, double-click to show only this"
                  >
                    <span class="dot" style="background:${CATEGORY_COLORS[c]}"></span>${CATEGORY_LABELS[c]}
                    <span class="n">${this._counts[c] ?? 0}</span>
                  </button>`,
                )}
              </div>`
            : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    unsafeCSS(leafletCss),
    css`
      :host {
        display: block;
        height: 100%;
      }
      ha-card {
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .wrap {
        position: relative;
        flex: 1;
        width: 100%;
      }
      /* !important: Leaflet sets an inline position:relative when it
         initialises while the card is detached, collapsing the map. */
      #map {
        position: absolute !important;
        inset: 0;
        background: #aad3df;
      }
      .overlay {
        position: absolute;
        z-index: 1000;
        display: flex;
        gap: 4px;
        pointer-events: none;
      }
      .overlay > * {
        pointer-events: auto;
      }
      .top-right {
        top: 8px;
        right: 8px;
      }
      .legend {
        left: 8px;
        bottom: 22px;
        right: 8px;
        flex-wrap: wrap;
      }
      .status,
      .count,
      .chip {
        font: 500 12px/1 var(--ha-font-family-body, Roboto, sans-serif);
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #222);
        border-radius: 12px;
        padding: 5px 9px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        border: none;
      }
      .status::before {
        content: "";
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        margin-right: 5px;
        background: var(--disabled-color, #999);
      }
      .status.live::before {
        background: var(--success-color, #43a047);
      }
      .status.error::before {
        background: var(--error-color, #db4437);
      }
      .chip {
        cursor: pointer;
        user-select: none;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .chip.toggle.active {
        background: var(--primary-color, #03a9f4);
        color: var(--text-primary-color, #fff);
      }
      .chip.off {
        opacity: 0.45;
        text-decoration: line-through;
      }
      .dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
      }
      .n {
        color: var(--secondary-text-color, #666);
      }
      .ais-label {
        font: ${unsafeCSS(LABEL_FONT)};
        line-height: ${LABEL_H}px;
        color: #1d2730;
        white-space: nowrap;
        text-shadow: 0 0 2px #fff, 0 0 2px #fff, 0 0 3px #fff;
        background: none;
        border: none;
      }
      .dark-base .ais-label {
        color: #e3e9ef;
        text-shadow: 0 0 2px #000, 0 0 2px #000, 0 0 3px #000;
      }
      .ais-marker {
        background: none;
        border: none;
      }
      .leaflet-popup-content-wrapper,
      .leaflet-popup-tip {
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #222);
      }
      .ais-popup {
        font: 13px/1.35 var(--ha-font-family-body, Roboto, sans-serif);
      }
      .ais-popup .title {
        font-weight: 600;
        font-size: 15px;
      }
      .ais-popup .sub {
        color: var(--secondary-text-color, #666);
        margin-bottom: 4px;
      }
      .ais-popup .star {
        color: ${unsafeCSS(FAVORITE_COLOR)};
      }
      .ais-popup table {
        border-collapse: collapse;
        margin: 6px 0;
      }
      .ais-popup th {
        text-align: left;
        font-weight: 500;
        color: var(--secondary-text-color, #666);
        padding: 1px 10px 1px 0;
        vertical-align: top;
        white-space: nowrap;
      }
      .ais-popup .history {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        margin: 6px 0 2px;
      }
      .ais-popup .history button {
        font-size: 12px;
        padding: 2px 7px;
        border-radius: 10px;
        border: 1px solid var(--divider-color, #ccc);
        background: var(--secondary-background-color, #f5f5f5);
        color: var(--primary-text-color, #222);
        cursor: pointer;
      }
      /* Details can be selected and copied (MMSI, call sign…). */
      .leaflet-popup-content {
        user-select: text;
        -webkit-user-select: text;
        cursor: auto;
      }
      .history-panel {
        top: 8px;
        left: 52px;
        max-width: max(170px, calc(100% - 200px));
      }
      .panel {
        font: 12px/1.3 var(--ha-font-family-body, Roboto, sans-serif);
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #222);
        border-radius: 10px;
        padding: 6px 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        min-width: 0;
      }
      .panel-head {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;
      }
      .panel-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .panel .star {
        color: ${unsafeCSS(FAVORITE_COLOR)};
      }
      .panel button {
        font: inherit;
        font-weight: 400;
        border: 1px solid var(--divider-color, #ccc);
        background: var(--secondary-background-color, #f5f5f5);
        color: var(--primary-text-color, #222);
        border-radius: 10px;
        padding: 1px 7px;
        cursor: pointer;
      }
      .panel button.icon {
        border: none;
        background: none;
        padding: 0 3px;
        font-size: 14px;
        color: var(--secondary-text-color, #666);
      }
      .panel button.active {
        background: ${unsafeCSS(FAVORITE_COLOR)};
        border-color: ${unsafeCSS(FAVORITE_COLOR)};
        color: #000;
      }
      .panel-ranges {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        margin-top: 4px;
      }
      .panel-status {
        color: var(--secondary-text-color, #666);
        font-size: 11px;
        margin-top: 3px;
      }
      .ais-popup a {
        color: var(--primary-color, #03a9f4);
        font-size: 12px;
      }
    `,
  ];
}

// The module can be loaded twice (e.g. also added as a dashboard resource).
if (!customElements.get("aisstream-map-card")) {
  customElements.define("aisstream-map-card", AisStreamMapCard);
  (window as any).customCards = (window as any).customCards || [];
  (window as any).customCards.push({
    type: "aisstream-map-card",
    name: "AIS ship map",
    description: "Live ship positions and tracks from the AISStream integration",
    preview: false,
    documentationURL: "https://github.com/hlgirard/hacs-aisstream",
  });
  console.info(`%c AISSTREAM-MAP-CARD %c ${CARD_VERSION} `, "color:#fff;background:#2f6fd6", "");
}
