"""Disk cache for expensive OSM downloads, keyed by request parameters.

Results are pickled under `config.CACHE_DIR` so a re-run of the pipeline
reads from disk instead of re-hitting Overpass / the OSM graph API.
"""

from __future__ import annotations

import hashlib
import logging
import pickle
from pathlib import Path
from typing import Callable, TypeVar

from .config import CACHE_DIR

logger = logging.getLogger(__name__)

T = TypeVar("T")


def make_key(*parts: object) -> str:
    """Build a stable cache key from the repr of arbitrary request parameters."""
    raw = "|".join(repr(part) for part in parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def cached(key: str, compute: Callable[[], T], use_cache: bool = True) -> T:
    """Return `compute()`'s result, persisting/reading it as a pickle on disk.

    Set `use_cache=False` to force a fresh computation; the new result still
    overwrites the cache entry so subsequent calls hit it again.
    """
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path: Path = CACHE_DIR / f"{key}.pkl"

    if use_cache and path.exists():
        logger.info("cache hit: %s", path.name)
        with path.open("rb") as f:
            return pickle.load(f)

    logger.info("cache miss: %s", path.name)
    result = compute()
    with path.open("wb") as f:
        pickle.dump(result, f)
    return result
