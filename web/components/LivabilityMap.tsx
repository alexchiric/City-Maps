"use client";

import type { DataDrivenPropertyValueSpecification } from "@maplibre/maplibre-gl-style-spec";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";

import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import { DEFAULT_WEIGHTS, recomputeLivability, type Weights } from "@/lib/livability";
import ControlPanel from "./ControlPanel";

const STREETS_LAYER = "streets-base";
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
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(new Set(CATEGORIES));
  const [streetsVisible, setStreetsVisible] = useState(true);
  const [scoresVisible, setScoresVisible] = useState(true);

  // Create the map once and load both GeoJSON sources from the static files
  // the pipeline writes to public/data/ — no backend involved.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: STREETS_LAYER, type: "raster", source: "osm" }],
      },
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      Promise.all([
        fetch("/data/scores.geojson").then((r) => r.json() as Promise<FeatureCollection>),
        fetch("/data/pois.geojson").then((r) => r.json() as Promise<FeatureCollection>),
      ])
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
        .catch((err) => {
          console.error("failed to load /data/*.geojson — run `python -m pipeline.run` first", err);
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
    if (!map || !ready) return;
    map.setLayoutProperty(STREETS_LAYER, "visibility", streetsVisible ? "visible" : "none");
  }, [streetsVisible, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty(SCORES_LAYER, "visibility", scoresVisible ? "visible" : "none");
  }, [scoresVisible, ready]);

  return (
    <div className="relative flex-1">
      {/* Inline style, not a Tailwind class: maplibre-gl.css sets
          `.maplibregl-map { position: relative }` on this element with the
          same specificity as `.absolute` and loads after it, so a class
          alone loses the cascade and the container collapses to 0 height. */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <ControlPanel
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
