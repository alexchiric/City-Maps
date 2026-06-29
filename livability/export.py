"""GeoJSON (and optional PostGIS) export for pipeline outputs."""

from __future__ import annotations

import logging
import os
import shutil
from pathlib import Path

import geopandas as gpd

from .config import DATA_DIR, WEB_DATA_DIR

logger = logging.getLogger(__name__)


def to_geojson(gdf: gpd.GeoDataFrame, path: Path) -> None:
    """Write `gdf` to `path` as GeoJSON in EPSG:4326."""
    path.parent.mkdir(parents=True, exist_ok=True)
    gdf.to_crs(4326).to_file(path, driver="GeoJSON")


def write_outputs(pois: gpd.GeoDataFrame, scores: gpd.GeoDataFrame) -> tuple[Path, Path]:
    """Write `data/pois.geojson` and `data/scores.geojson`, then copy both
    into `web/public/data/` so the Next.js frontend can read them at
    runtime with no backend involved.

    Returns the two paths under `config.DATA_DIR`.
    """
    pois_path = DATA_DIR / "pois.geojson"
    scores_path = DATA_DIR / "scores.geojson"

    to_geojson(pois, pois_path)
    to_geojson(scores, scores_path)

    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    for path in (pois_path, scores_path):
        shutil.copy(path, WEB_DATA_DIR / path.name)

    logger.info("wrote %s and %s (+ copies in %s)", pois_path, scores_path, WEB_DATA_DIR)
    return pois_path, scores_path


def to_postgis(gdf: gpd.GeoDataFrame, table: str, database_url: str | None = None) -> None:
    """Upsert `gdf` into a PostGIS table.

    Optional production/Neon path — never required for the local GeoJSON
    pipeline. Only runs if `database_url` is given or `DATABASE_URL` is
    set in the environment; otherwise it's a no-op. Replaces the table's
    contents on each run (a full sync, not an incremental merge).

    Requires the `postgis` extra (`pip install -e ".[postgis]"`).
    """
    database_url = database_url or os.environ.get("DATABASE_URL")
    if not database_url:
        logger.info("DATABASE_URL not set, skipping PostGIS export for %r", table)
        return

    import sqlalchemy  # optional dependency — only needed for this path

    engine = sqlalchemy.create_engine(database_url)
    gdf.to_crs(4326).to_postgis(table, engine, if_exists="replace", index=False)
    logger.info("wrote %d rows to PostGIS table %r", len(gdf), table)
