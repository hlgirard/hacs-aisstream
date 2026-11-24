// Visual editor for the card, built on Home Assistant's own <ha-form>.
import { LitElement, css, html, nothing } from "lit";
import type { CardConfig, HomeAssistant } from "./types";

export const CONFIG_DEFAULTS: Partial<CardConfig> = {
  base: "simple",
  map_labels: true,
  seamarks: true,
  show_tracks: true,
  hide_stationary: false,
  show_favorites: true,
  show_names: false,
  track_minutes: 5,
  stale_minutes: 10,
  moving_stale_minutes: 20,
  fit: "region",
};

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "entry_id", selector: { config_entry: { integration: "aisstream" } } },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "base",
        required: true,
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "simple", label: "Simple (follows theme)" },
              { value: "simple-light", label: "Simple, light" },
              { value: "simple-dark", label: "Simple, dark" },
              { value: "osm", label: "OpenStreetMap (detailed)" },
            ],
          },
        },
      },
      {
        name: "fit",
        required: true,
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "region", label: "Whole region" },
              { value: "vessels", label: "Visible vessels" },
            ],
          },
        },
      },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "seamarks", selector: { boolean: {} } },
      { name: "map_labels", selector: { boolean: {} } },
      { name: "show_tracks", selector: { boolean: {} } },
      { name: "show_names", selector: { boolean: {} } },
      { name: "hide_stationary", selector: { boolean: {} } },
      { name: "show_favorites", selector: { boolean: {} } },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "track_minutes", selector: { number: { min: 1, max: 1440, mode: "box", unit_of_measurement: "min" } } },
      { name: "stale_minutes", selector: { number: { min: 1, max: 1440, mode: "box", unit_of_measurement: "min" } } },
      { name: "moving_stale_minutes", selector: { number: { min: 1, max: 1440, mode: "box", unit_of_measurement: "min" } } },
    ],
  },
  {
    type: "expandable",
    name: "",
    flatten: true,
    title: "Layout and custom map",
    schema: [
      {
        type: "grid",
        name: "",
        schema: [
          { name: "height", selector: { text: {} } },
          { name: "aspect_ratio", selector: { text: {} } },
        ],
      },
      { name: "tile_url", selector: { text: {} } },
      { name: "tile_attribution", selector: { text: {} } },
    ],
  },
];

const LABELS: Record<string, string> = {
  title: "Title",
  entry_id: "Region",
  base: "Base map",
  fit: "Initial view",
  seamarks: "Seamarks (OpenSeaMap)",
  map_labels: "Place names",
  show_tracks: "Show tracks",
  hide_stationary: "Hide stopped vessels",
  show_favorites: "Always show favorites",
  track_minutes: "Track length",
  stale_minutes: "Hide after not heard for",
  moving_stale_minutes: "Hide moving vessels after not heard for",
  show_names: "Vessel names",
  height: "Height (e.g. 450px)",
  aspect_ratio: "Aspect ratio (e.g. 16:9)",
  tile_url: "Custom tile URL",
  tile_attribution: "Custom tile attribution",
};

const HELPERS: Record<string, string> = {
  entry_id: "Leave empty if you have a single region",
  map_labels: "Simple base map only",
  hide_stationary: "Initial state of the on-map toggle",
  show_favorites: "Even when filtered out, stopped or not heard recently",
  stale_minutes: "Favorites stay on the map, faded",
  moving_stale_minutes: "Last speed over 1 kn: reception gaps are common under way",
  show_names: "Hidden where they would overlap; zoom in to see more",
  track_minutes: "Up to 1440 min (24 h)",
  tile_url: "Replaces the base map, e.g. https://tile.example.com/{z}/{x}/{y}.png",
};

/** <ha-form> is lazy-loaded by HA; loading a built-in card editor defines it. */
async function ensureHaForm(): Promise<void> {
  if (customElements.get("ha-form")) return;
  try {
    const helpers = await (window as any).loadCardHelpers?.();
    const card = await helpers?.createCardElement({ type: "entities", entities: [] });
    await card?.constructor?.getConfigElement?.();
  } catch (_err) {
    // fall through: whenDefined below still resolves once HA loads it
  }
  await customElements.whenDefined("ha-form");
}

class AisStreamMapCardEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _ready: { state: true },
  };

  hass?: HomeAssistant;
  private _config?: CardConfig;
  private _ready = false;

  setConfig(config: CardConfig): void {
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    ensureHaForm().then(() => (this._ready = true));
  }

  protected render() {
    if (!this._config || !this._ready) return nothing;
    const data = { ...CONFIG_DEFAULTS, ...this._config };
    return html`<ha-form
      .hass=${this.hass}
      .data=${data}
      .schema=${SCHEMA}
      .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
      .computeHelper=${(s: { name: string }) => HELPERS[s.name]}
      @value-changed=${this._changed}
    ></ha-form>
    <p class="hint">Click a category on the map to hide it; double-click to show only that category.</p>`;
  }

  private _changed(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = { ...ev.detail.value } as Record<string, unknown>;
    const original = (this._config ?? {}) as Record<string, unknown>;
    for (const [key, v] of Object.entries(value)) {
      // Keep the YAML short: drop empty fields and untouched defaults.
      const isDefault = (CONFIG_DEFAULTS as Record<string, unknown>)[key] === v && !(key in original);
      if (v === "" || v === undefined || v === null || isDefault) delete value[key];
    }
    this._config = value as unknown as CardConfig;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: value }, bubbles: true, composed: true }));
  }

  static styles = css`
    .hint {
      color: var(--secondary-text-color);
      font-size: 12px;
      margin: 12px 0 0;
    }
  `;
}

if (!customElements.get("aisstream-map-card-editor")) {
  customElements.define("aisstream-map-card-editor", AisStreamMapCardEditor);
}
