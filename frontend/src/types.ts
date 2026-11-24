export type TrackTriple = [number, number, number]; // [ts, lat, lon]

export interface VesselSummary {
  mmsi: number;
  name: string | null;
  callsign: string | null;
  imo: number | null;
  ship_type: number | null;
  category: string;
  length: number | null;
  beam: number | null;
  destination: string | null;
  eta: string | null;
  draught: number | null;
  ais_class: string | null;
  lat: number | null;
  lon: number | null;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  nav_status: number | null;
  underway: boolean;
  moving: boolean; // map state: >= 1 kn, cleared after two slower reports
  slow_since?: number | null;
  position_ts: number | null;
  last_seen: number | null;
  favorite: boolean;
  status?: string | null;
  track?: TrackTriple[];
}

export interface FavoriteInfo {
  mmsi: number;
  alias: string | null;
  retention_days: number | null;
}

export interface EntryInfo {
  entry_id: string;
  title: string;
  region_name: string;
  boxes: [[number, number], [number, number]][];
  connected: boolean;
  retention_hours: number;
  favorites: FavoriteInfo[];
}

export interface Snapshot extends EntryInfo {
  now: number;
  vessels: VesselSummary[];
}

export interface Delta {
  type: "delta" | "closed";
  now?: number;
  connected?: boolean;
  vessels?: VesselSummary[];
  points?: Record<string, TrackTriple[]>;
  reset?: Record<string, TrackTriple[]>; // history purged: replace cached track
}

export interface TrackResult {
  mmsi: number;
  start: number;
  end: number;
  first_ts: number | null;
  track: TrackTriple[];
}

export interface HomeAssistant {
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  connection: {
    subscribeMessage<T>(
      callback: (msg: T) => void,
      msg: Record<string, unknown>,
    ): Promise<() => Promise<void>>;
  };
  themes?: { darkMode?: boolean };
  language?: string;
}

export interface CardConfig {
  type: string;
  title?: string;
  entry_id?: string;
  track_minutes?: number;
  show_tracks?: boolean;
  show_names?: boolean;
  hide_stationary?: boolean;
  show_favorites?: boolean;
  base?: "simple" | "simple-light" | "simple-dark" | "osm";
  map_labels?: boolean;
  seamarks?: boolean;
  tile_url?: string;
  tile_attribution?: string;
  height?: string;
  aspect_ratio?: string;
  fit?: "region" | "vessels";
  stale_minutes?: number;
  moving_stale_minutes?: number;
}
