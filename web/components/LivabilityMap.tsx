"use client";

import type { DataDrivenPropertyValueSpecification } from "@maplibre/maplibre-gl-style-spec";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";

import { CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, type Category } from "@/lib/categories";
import { DEFAULT_WEIGHTS, formatScore, recomputeLivability, type Weights } from "@/lib/livability";
import { applyTheme, getInitialTheme, type Theme } from "@/lib/theme";
import ControlPanel from "./ControlPanel";
import Legend from "./Legend";

const STREETS_LIGHT_LAYER = "streets-light";
const STREETS_DARK_LAYER = "streets-dark";
const SCORES_SOURCE = "scores";
const SCORES_LAYER = "scores-fill";
const POIS_SOURCE = "pois";
const POIS_LAYER = "pois-circle";

// Bucharest, matching livability.config.PLACE — recenter if you change the
// pipeline's target city.
const INITIAL_CENTER: [number, number] = [26.1, 44.43];
const INITIAL_ZOOM = 11;

export default function LivabilityMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const scoresRef = useRef<FeatureCollection | null>(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(new Set(CATEGORIES));
  const [streetsVisible, setStreetsVisible] = useState(true);
  const [scoresVisible, setScoresVisible] = useState(true);

  // Create the map once and load both GeoJSON sources from the static files
  // the pipeline writes to public/data/ — no backend involved.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Read here (client-only — this effect never runs during SSR) so the
    // correct basemap layer is visible from the very first frame, instead of
    // both defaulting on and waiting for a later effect to sort them out.
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "osm-light": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
          "osm-dark": {
            type: "raster",
            tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© CARTO © OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: STREETS_LIGHT_LAYER,
            type: "raster",
            source: "osm-light",
            layout: { visibility: initialTheme === "light" ? "visible" : "none" },
          },
          {
            id: STREETS_DARK_LAYER,
            type: "raster",
            source: "osm-dark",
            layout: { visibility: initialTheme === "dark" ? "visible" : "none" },
          },
        ],
      },
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    async function fetchGeoJSON(path: string): Promise<FeatureCollection> {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`${path} returned ${res.status}`);
      return res.json() as Promise<FeatureCollection>;
    }

    map.on("load", () => {
      Promise.all([fetchGeoJSON("/data/scores.geojson"), fetchGeoJSON("/data/pois.geojson")])
        .then(([scores, pois]) => {
          scoresRef.current = scores;

          map.addSource(SCORES_SOURCE, { type: "geojson", data: scores });
          map.addLayer({
            id: SCORES_LAYER,
            type: "fill",
            source: SCORES_SOURCE,
            paint: {
              "fill-color": [
                "interpolate",
                ["linear"],
                ["coalesce", ["get", "livability"], 0],
                0, "#fee5d9",
                0.5, "#fb6a4a",
                1, "#a50f15",
              ],
              "fill-opacity": 0.55,
            },
          });

          map.addSource(POIS_SOURCE, { type: "geojson", data: pois });
          map.addLayer({
            id: POIS_LAYER,
            type: "circle",
            source: POIS_SOURCE,
            paint: {
              "circle-radius": 3,
              "circle-color": [
                "match",
                ["get", "poi_category"],
                ...CATEGORIES.flatMap((category) => [category, CATEGORY_COLORS[category]]),
                "#999999",
              ] as unknown as DataDrivenPropertyValueSpecification<string>,
              "circle-stroke-width": 0.5,
              "circle-stroke-color": "#ffffff",
            },
          });

          setReady(true);
        })
        .catch((err: unknown) => {
          console.error("failed to load map data", err);
          setLoadError(err instanceof Error ? err.message : String(err));
        });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Recompute the weighted blend client-side and push it into the source —
  // pure arithmetic over the precomputed per-category scores, no backend call.
  useEffect(() => {
    const map = mapRef.current;
    const scores = scoresRef.current;
    if (!map || !scores || !ready) return;
    const source = map.getSource(SCORES_SOURCE) as GeoJSONSource | undefined;
    source?.setData(recomputeLivability(scores, weights));
  }, [weights, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setFilter(POIS_LAYER, ["in", ["get", "poi_category"], ["literal", Array.from(activeCategories)]]);
  }, [activeCategories, ready]);

  useEffect(() => {
    const map = mapRef.current;
    // Like the other layout-property effects below: setLayoutProperty throws
    // "Style is not done loading" if called before the style is ready, even
    // though these two layers exist from the constructor.
    if (!map || !ready) return;
    map.setLayoutProperty(STREETS_LIGHT_LAYER, "visibility", streetsVisible && theme === "light" ? "visible" : "none");
    map.setLayoutProperty(STREETS_DARK_LAYER, "visibility", streetsVisible && theme === "dark" ? "visible" : "none");
  }, [streetsVisible, theme, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty(SCORES_LAYER, "visibility", scoresVisible ? "visible" : "none");
  }, [scoresVisible, ready]);

  // Click a POI for its name/category, or a grid cell for its per-category
  // breakdown — the choropleth alone only shows the blended score, and the
  // POI dots alone don't say what they are. POIs take priority since they
  // render on top of the choropleth.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Popups are raw HTML strings, not React, so they can't use dark: utility
    // classes — pick colors directly from the current theme. The popup box's
    // own background is themed via the .dark override in globals.css.
    const textColor = theme === "dark" ? "#f4f4f5" : "#18181b";
    const mutedColor = theme === "dark" ? "#a1a1aa" : "#71717a";

    function showPoiPopup(e: maplibregl.MapMouseEvent, feature: maplibregl.MapGeoJSONFeature) {
      const props = feature.properties;
      const category = props.poi_category as Category;
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-size:13px;color:${textColor}">
            <div style="font-weight:600">${props.name ?? CATEGORY_LABELS[category]}</div>
            <div style="color:${mutedColor}">${CATEGORY_LABELS[category]}</div>
          </div>`,
        )
        .addTo(map!);
    }

    function showCellPopup(e: maplibregl.MapMouseEvent, feature: maplibregl.MapGeoJSONFeature) {
      const props = feature.properties;
      const rows = CATEGORIES.map(
        (category) =>
          `<tr><td style="padding-right:8px">${CATEGORY_LABELS[category]}</td><td style="text-align:right">${formatScore(props[category])}</td></tr>`,
      ).join("");

      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-size:13px;color:${textColor}">
            <div style="font-weight:600;margin-bottom:4px">Livability: ${formatScore(props.livability)}</div>
            <table>${rows}</table>
          </div>`,
        )
        .addTo(map!);
    }

    function handleClick(e: maplibregl.MapMouseEvent) {
      const poiFeatures = map!.queryRenderedFeatures(e.point, { layers: [POIS_LAYER] });
      if (poiFeatures.length) {
        showPoiPopup(e, poiFeatures[0]);
        return;
      }
      const cellFeatures = map!.queryRenderedFeatures(e.point, { layers: [SCORES_LAYER] });
      if (cellFeatures.length) showCellPopup(e, cellFeatures[0]);
    }

    function setPointer() {
      map!.getCanvas().style.cursor = "pointer";
    }
    function unsetPointer() {
      map!.getCanvas().style.cursor = "";
    }

    map.on("click", handleClick);
    map.on("mouseenter", POIS_LAYER, setPointer);
    map.on("mouseleave", POIS_LAYER, unsetPointer);
    map.on("mouseenter", SCORES_LAYER, setPointer);
    map.on("mouseleave", SCORES_LAYER, unsetPointer);

    return () => {
      map.off("click", handleClick);
      map.off("mouseenter", POIS_LAYER, setPointer);
      map.off("mouseleave", POIS_LAYER, unsetPointer);
      map.off("mouseenter", SCORES_LAYER, setPointer);
      map.off("mouseleave", SCORES_LAYER, unsetPointer);
    };
  }, [ready, theme]);

  // Only this handler writes to localStorage (via applyTheme) — the
  // system-preference-derived initial value above is never persisted on its
  // own, so the app keeps following the OS setting until the user picks one.
  function handleThemeChange(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="relative flex-1">
      {/* Inline style, not a Tailwind class: maplibre-gl.css sets
          `.maplibregl-map { position: relative }` on this element with the
          same specificity as `.absolute` and loads after it, so a class
          alone loses the cascade and the container collapses to 0 height. */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {!ready && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center bg-white/70 dark:bg-zinc-950/70">
          {loadError ? (
            <div className="max-w-sm rounded-lg bg-white p-4 text-sm text-red-700 shadow-lg dark:bg-zinc-900 dark:text-red-400">
              <div className="font-medium">Couldn&apos;t load map data</div>
              <div className="mt-1 text-zinc-600 dark:text-zinc-400">{loadError}</div>
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                Run <code>python -m pipeline.run</code> from the repo root first.
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-white p-4 text-sm text-zinc-700 shadow-lg dark:bg-zinc-900 dark:text-zinc-300">
              Loading map data…
            </div>
          )}
        </div>
      )}
      {ready && scoresVisible && <Legend />}
      <ControlPanel
        theme={theme}
        onThemeChange={handleThemeChange}
        weights={weights}
        onWeightsChange={setWeights}
        activeCategories={activeCategories}
        onActiveCategoriesChange={setActiveCategories}
        streetsVisible={streetsVisible}
        onStreetsVisibleChange={setStreetsVisible}
        scoresVisible={scoresVisible}
        onScoresVisibleChange={setScoresVisible}
      />
    </div>
  );
}
