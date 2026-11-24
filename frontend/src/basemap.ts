// Minimal vector base map ("simple"): land, water, piers, major roads and a
// few place names. Rendered by MapLibre GL from OpenFreeMap's OpenStreetMap
// vector tiles (free, no API key). This module is loaded on demand, so the
// ~1 MB MapLibre bundle is only fetched when the simple base map is used.
import type * as L from "leaflet";
import type maplibregl from "maplibre-gl";
import maplibreCss from "maplibre-gl/dist/maplibre-gl.css";
import * as MaplibreGLLeaflet from "@maplibre/maplibre-gl-leaflet";

export const SIMPLE_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> ' +
  '&copy; <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

export { maplibreCss };

interface Palette {
  land: string;
  water: string;
  road: string;
  casing: string;
  label: string;
  halo: string;
}

const LIGHT: Palette = {
  land: "#f2f1ec",
  water: "#b9d3e1",
  road: "#ffffff",
  casing: "#d3cdc1",
  label: "#6f6f6f",
  halo: "#f2f1ec",
};

const DARK: Palette = {
  land: "#262a2f",
  water: "#1c3a55",
  road: "#3c434b",
  casing: "#262a2f",
  label: "#8d969f",
  halo: "#262a2f",
};

const LINE = ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false];
const POLYGON = ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false];
// Tunnels are hidden: under a harbour they look like causeways.
const NOT_TUNNEL = ["!=", ["get", "brunnel"], "tunnel"];
const NAME = ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]];

function roadWidth(scale: number): unknown {
  return ["interpolate", ["exponential", 1.4], ["zoom"], 8, 0.4 * scale, 12, 1.5 * scale, 16, 6 * scale, 19, 18 * scale];
}

export function simpleStyle(dark: boolean, labels: boolean): maplibregl.StyleSpecification {
  const p = dark ? DARK : LIGHT;
  const major = (classes: string[]) => ["all", LINE, NOT_TUNNEL, ["match", ["get", "class"], classes, true, false]];
  const layers: unknown[] = [
    { id: "land", type: "background", paint: { "background-color": p.land } },
    { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": p.water } },
    {
      id: "river",
      type: "line",
      source: "omt",
      "source-layer": "waterway",
      minzoom: 9,
      filter: ["all", LINE, ["==", ["get", "class"], "river"], NOT_TUNNEL],
      paint: { "line-color": p.water, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.5, 16, 4] },
    },
    // Piers and docks matter in a harbour: draw them as land over the water.
    {
      id: "pier-area",
      type: "fill",
      source: "omt",
      "source-layer": "transportation",
      filter: ["all", POLYGON, ["==", ["get", "class"], "pier"]],
      paint: { "fill-color": p.land },
    },
    {
      id: "pier-line",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      minzoom: 13,
      filter: ["all", LINE, ["==", ["get", "class"], "pier"]],
      paint: { "line-color": p.land, "line-width": ["interpolate", ["linear"], ["zoom"], 13, 1, 18, 8] },
    },
    {
      id: "primary-casing",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      minzoom: 11,
      filter: major(["primary"]),
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": p.casing, "line-width": roadWidth(1.5) },
    },
    {
      id: "primary",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      minzoom: 11,
      filter: major(["primary"]),
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": p.road, "line-width": roadWidth(1) },
    },
    {
      id: "highway-casing",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      minzoom: 7,
      filter: major(["motorway", "trunk"]),
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": p.casing, "line-width": roadWidth(2.1) },
    },
    {
      id: "highway",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      minzoom: 7,
      filter: major(["motorway", "trunk"]),
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": p.road, "line-width": roadWidth(1.5) },
    },
  ];
  if (labels) {
    layers.push({
      id: "places",
      type: "symbol",
      source: "omt",
      "source-layer": "place",
      filter: ["match", ["get", "class"], ["city", "town", "suburb"], true, false],
      minzoom: 8,
      layout: {
        "text-field": NAME,
        "text-font": ["Noto Sans Regular"],
        "text-size": ["match", ["get", "class"], "city", 13, 11],
        "text-max-width": 8,
      },
      paint: { "text-color": p.label, "text-halo-color": p.halo, "text-halo-width": 1.5 },
    });
  }
  return {
    version: 8,
    sources: { omt: { type: "vector", url: "https://tiles.openfreemap.org/planet" } },
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    layers: layers as maplibregl.LayerSpecification[],
  };
}

export function supported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch (_err) {
    return false;
  }
}

/** A Leaflet layer that renders the simple style with MapLibre. */
export function createSimpleLayer(dark: boolean, labels: boolean, pane: string): L.Layer {
  const factory = (MaplibreGLLeaflet as any).maplibreGL ?? (MaplibreGLLeaflet as any).default?.maplibreGL;
  return factory({
    style: simpleStyle(dark, labels),
    pane,
    interactive: false,
    // The bridge reports this to Leaflet's attribution control.
    attributionControl: { customAttribution: SIMPLE_ATTRIBUTION },
  }) as L.Layer;
}

export function setSimpleStyle(layer: L.Layer, dark: boolean, labels: boolean): void {
  (layer as any).getMaplibreMap?.()?.setStyle(simpleStyle(dark, labels));
}

