"""Livability scoring.

# BASELINE — intended to be improved.

Methodology: the city is tiled into a regular grid. Each cell gets a
per-category accessibility score in [0, 1], where 1 means "closest to a
POI of that category" within the grid and 0 means "furthest". Distance is
computed along the street network when one is supplied and routing
succeeds; otherwise (or if network routing fails, e.g. a disconnected
component) we fall back to straight-line distance. The 7 per-category
scores are combined into a single `weighted_livability` score via a
plain weighted sum (equal weights by default).

A teammate iterating on the actual scoring methodology should keep these
four signatures stable — internals (distance decay, multi-POI scoring,
H3 hex grids, isochrones, etc.) can change freely underneath them:
    build_grid, score_category, score_all, weighted_livability
"""

from __future__ import annotations

import logging

import geopandas as gpd
import networkx as nx
import numpy as np
import osmnx as ox
import pandas as pd
from shapely.geometry import box

from .config import CATEGORIES

logger = logging.getLogger(__name__)


def build_grid(boundary: gpd.GeoDataFrame, resolution: float = 0.005) -> gpd.GeoDataFrame:
    """Tile `boundary`'s bounding box into square cells.

    `resolution` is in degrees (~0.005 deg ≈ 500m at Bucharest's latitude).
    Cells are kept only if their centroid falls inside the boundary
    polygon. Returns a GeoDataFrame (same CRS as `boundary`) with a
    `cell_id` column.

    BASELINE — a regular grid is simple and dependency-free. Swapping in
    H3 hexagons would reduce shape distortion at city scale; the rest of
    `scoring.py` doesn't care about cell shape as long as `build_grid`
    keeps returning a GeoDataFrame of polygons.
    """
    polygon = boundary.geometry.iloc[0]
    minx, miny, maxx, maxy = polygon.bounds

    cells = [
        box(x, y, x + resolution, y + resolution)
        for x in np.arange(minx, maxx, resolution)
        for y in np.arange(miny, maxy, resolution)
    ]

    grid = gpd.GeoDataFrame({"geometry": cells}, crs=boundary.crs)
    # representative_point(), not centroid: exact point-in-polygon, no
    # geographic-CRS distortion warning for a square cell's centroid.
    grid = grid[grid.geometry.representative_point().within(polygon)].reset_index(drop=True)
    grid["cell_id"] = grid.index
    return grid


def _network_distances(
    network: nx.MultiDiGraph,
    grid: gpd.GeoDataFrame,
    category_pois: gpd.GeoDataFrame,
) -> np.ndarray:
    """Shortest-path distance (meters) from each grid cell to the nearest
    `category_pois` point, via the street network.

    Raises if routing isn't feasible (no POIs, no reachable nodes, etc.)
    so the caller can fall back to straight-line distance.
    """
    if category_pois.empty:
        raise ValueError("no POIs for this category")

    projected = ox.project_graph(network)
    proj_crs = projected.graph["crs"]

    grid_proj = grid.to_crs(proj_crs)
    pois_proj = category_pois.to_crs(proj_crs)

    grid_centroids = grid_proj.geometry.centroid
    poi_centroids = pois_proj.geometry.centroid

    grid_nodes = ox.distance.nearest_nodes(projected, grid_centroids.x, grid_centroids.y)
    poi_nodes = ox.distance.nearest_nodes(projected, poi_centroids.x, poi_centroids.y)

    lengths = nx.multi_source_dijkstra_path_length(projected, set(poi_nodes), weight="length")

    distances = np.array([lengths.get(node, np.inf) for node in grid_nodes])
    if not np.isfinite(distances).any():
        raise ValueError("no grid cells reachable via the street network")
    return distances


def _straight_line_distances(grid: gpd.GeoDataFrame, category_pois: gpd.GeoDataFrame) -> np.ndarray:
    """Nearest-POI distance (meters) per grid cell, ignoring the street network."""
    if category_pois.empty:
        return np.full(len(grid), np.inf)

    grid_proj = grid.to_crs(3857)
    pois_proj = category_pois.to_crs(3857)[["geometry"]]

    joined = gpd.sjoin_nearest(grid_proj, pois_proj, distance_col="_distance")
    nearest = joined.groupby(level=0)["_distance"].min()
    return nearest.reindex(grid_proj.index).to_numpy()


def score_category(
    grid: gpd.GeoDataFrame,
    pois: gpd.GeoDataFrame,
    network: nx.MultiDiGraph | None,
    category: str,
) -> pd.Series:
    """Per-cell accessibility score for one category, in [0, 1].

    BASELINE — distance to the single nearest POI of `category`,
    min-max normalized across the grid so 1 = closest and 0 = furthest.
    Uses network shortest-path distance when `network` is given and
    routing succeeds; falls back to straight-line distance otherwise.
    Cells with no reachable/nearby POI at all score 0.0.
    """
    category_pois = pois[pois["poi_category"] == category]

    distances: np.ndarray
    if network is not None:
        try:
            distances = _network_distances(network, grid, category_pois)
        except Exception:
            logger.warning("network distance unavailable for %r, falling back to straight-line", category)
            distances = _straight_line_distances(grid, category_pois)
    else:
        distances = _straight_line_distances(grid, category_pois)

    finite = distances[np.isfinite(distances)]
    if finite.size == 0:
        return pd.Series(0.0, index=grid.index, name=category)

    # Treat unreachable cells as "furthest" rather than dropping them.
    distances = np.where(np.isfinite(distances), distances, finite.max())

    dmin, dmax = distances.min(), distances.max()
    if dmax == dmin:
        normalized = np.ones_like(distances)
    else:
        normalized = 1 - (distances - dmin) / (dmax - dmin)

    return pd.Series(normalized, index=grid.index, name=category)


def score_all(
    grid: gpd.GeoDataFrame,
    pois: gpd.GeoDataFrame,
    network: nx.MultiDiGraph | None = None,
) -> gpd.GeoDataFrame:
    """Per-cell score for each of the 7 livability categories.

    Returns `grid` with one additional float column per category in
    `config.CATEGORIES` (each in [0, 1]).
    """
    scored = grid.copy()
    for category in CATEGORIES:
        scored[category] = score_category(grid, pois, network, category)
    return scored


def weighted_livability(scores: gpd.GeoDataFrame, weights: dict[str, float] | None = None) -> pd.Series:
    """Weighted sum of the 7 per-category scores into one livability score.

    `weights` defaults to equal weighting across `config.CATEGORIES`.
    Whatever is passed in is normalized to sum to 1, so callers can pass
    arbitrary (e.g. slider) values without pre-normalizing.
    """
    if weights is None:
        weights = {category: 1.0 for category in CATEGORIES}

    total_weight = sum(weights.values())
    if total_weight == 0:
        raise ValueError("weights must sum to a non-zero value")

    result = pd.Series(0.0, index=scores.index, name="livability")
    for category, weight in weights.items():
        result += scores[category] * (weight / total_weight)
    return result
