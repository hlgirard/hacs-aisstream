// Category colours follow the common maritime convention (cargo green,
// tanker red, passenger blue, tug/special cyan, fishing orange,
// pleasure magenta, high-speed yellow) so they read like other AIS maps.
export const CATEGORY_COLORS: Record<string, string> = {
  cargo: "#2e9e44",
  tanker: "#d43a3a",
  passenger: "#2f6fd6",
  high_speed: "#e3b505",
  special: "#13a3b5",
  fishing: "#f07f22",
  sailing: "#8e44ad",
  pleasure: "#d1489f",
  other: "#78909c",
  unknown: "#a0a0a0",
};

export const CATEGORY_LABELS: Record<string, string> = {
  cargo: "Cargo",
  tanker: "Tanker",
  passenger: "Passenger",
  high_speed: "High speed",
  special: "Tug / pilot / SAR",
  fishing: "Fishing",
  sailing: "Sailing",
  pleasure: "Pleasure",
  other: "Other",
  unknown: "Unknown",
};

export const NAV_STATUS_LABELS: Record<number, string> = {
  0: "Under way (engine)",
  1: "At anchor",
  2: "Not under command",
  3: "Restricted manoeuvrability",
  4: "Constrained by draught",
  5: "Moored",
  6: "Aground",
  7: "Fishing",
  8: "Under way (sailing)",
  14: "AIS-SART",
};

export const STATUS_LABELS: Record<string, string> = {
  underway: "Under way",
  sailing: "Under way (sailing)",
  at_anchor: "At anchor",
  moored: "Moored",
  aground: "Aground",
  fishing: "Fishing",
  not_under_command: "Not under command",
  restricted_manoeuvrability: "Restricted manoeuvrability",
  constrained_by_draught: "Constrained by draught",
  emergency: "Emergency (AIS-SART)",
  stopped: "Stopped",
  out_of_range: "Out of range",
};

export const FAVORITE_COLOR = "#ffc107";

export interface TileDef {
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
}

const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const BASE_LAYERS: Record<string, TileDef> = {
  // Served through Home Assistant's map_tiles proxy (URL + token set by the
  // card): OSM blocks direct browser requests from HA pages.
  osm: {
    url: "/api/map_tiles/raster/{z}/{x}/{y}.png",
    attribution: OSM_ATTR,
    maxZoom: 19,
  },
};

export const SEAMARK_LAYER: TileDef = {
  url: "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
  attribution: 'Seamarks &copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',
  maxZoom: 18,
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function relativeTime(seconds: number): string {
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86400)} d ago`;
}
