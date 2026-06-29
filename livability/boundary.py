"""City boundary geocoding."""

from __future__ import annotations

import geopandas as gpd
import osmnx as ox

from .cache import cached, make_key
from .config import CRS


def get_city_boundary(place: str, use_cache: bool = True) -> gpd.GeoDataFrame:
    """Geocode `place` (e.g. "Bucharest, Romania") to its administrative boundary.

    Returns a single-row GeoDataFrame in `config.CRS` (EPSG:4326) whose
    `geometry` column holds the city's boundary polygon, alongside the raw
    OSM attributes (display_name, osm_id, bbox, etc.).
    """
    key = make_key("boundary", place, CRS)

    def compute() -> gpd.GeoDataFrame:
        gdf = ox.geocode_to_gdf(place)
        return gdf.to_crs(CRS)

    return cached(key, compute, use_cache=use_cache)
