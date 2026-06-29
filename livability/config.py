"""Static configuration: place name, POI category tag dictionaries, CRS, paths."""

from __future__ import annotations

from pathlib import Path

PLACE = "Bucharest, Romania"

CRS = "EPSG:4326"

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
CACHE_DIR = DATA_DIR / ".cache"
WEB_DATA_DIR = ROOT_DIR / "web" / "public" / "data"

# OSM tag filters per livability category, passed to osmnx.features_from_polygon.
CATEGORY_TAGS: dict[str, dict[str, list[str] | bool]] = {
    "education": {"amenity": ["school", "kindergarten", "university", "college", "library"]},
    "health": {
        "amenity": ["hospital", "clinic", "pharmacy", "doctors"],
        "healthcare": True,
    },
    "green": {"leisure": ["park", "playground", "garden", "sports_centre", "fitness_centre"]},
    "groceries": {
        "shop": ["supermarket", "convenience", "bakery", "greengrocer"],
        "amenity": ["marketplace"],
    },
    "transit": {
        "railway": ["station", "subway_entrance", "tram_stop"],
        "highway": ["bus_stop"],
    },
    "culture": {
        "amenity": ["cafe", "restaurant", "bar", "cinema", "theatre"],
        "tourism": ["museum", "gallery"],
    },
    "services": {"amenity": ["bank", "atm", "post_office"]},
}

CATEGORIES = tuple(CATEGORY_TAGS)
