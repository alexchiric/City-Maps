"""Parallel, cached POI fetch across livability categories."""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Iterable

import geopandas as gpd
import osmnx as ox
import pandas as pd
from shapely.geometry.base import BaseGeometry

from .cache import cached, make_key
from .config import CATEGORIES, CATEGORY_TAGS, CRS

logger = logging.getLogger(__name__)


def _fetch_category(
    polygon: BaseGeometry,
    category: str,
    tags: dict[str, list[str] | bool],
    use_cache: bool,
) -> gpd.GeoDataFrame:
    key = make_key("pois", category, tags, polygon.wkt)

    def compute() -> gpd.GeoDataFrame:
        gdf = ox.features_from_polygon(polygon, tags=tags)
        gdf = gdf.to_crs(CRS)
        gdf["poi_category"] = category
        return gdf

    return cached(key, compute, use_cache=use_cache)


def fetch_pois(
    boundary: gpd.GeoDataFrame,
    categories: Iterable[str] = CATEGORIES,
    max_workers: int = 3,
    use_cache: bool = True,
) -> gpd.GeoDataFrame:
    """Fetch OSM POIs for `categories` within `boundary`'s geometry, in parallel.

    Each category is fetched and cached independently, so a failure in one
    category doesn't invalidate the others (it's skipped with a logged
    warning). Returns a single GeoDataFrame in `config.CRS` with all
    categories concatenated and tagged via a `poi_category` column.
    """
    polygon = boundary.geometry.iloc[0]
    frames: list[gpd.GeoDataFrame] = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(_fetch_category, polygon, category, CATEGORY_TAGS[category], use_cache): category
            for category in categories
        }
        for future in as_completed(futures):
            category = futures[future]
            try:
                frames.append(future.result())
            except Exception:
                logger.exception("POI fetch failed for category %r", category)

    return gpd.GeoDataFrame(pd.concat(frames), crs=CRS)
