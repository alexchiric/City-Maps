"""Street-network graph download, cached to disk."""

from __future__ import annotations

import networkx as nx
import osmnx as ox
from shapely.geometry.base import BaseGeometry

from .cache import cached, make_key


def get_street_network(
    polygon: BaseGeometry,
    network_type: str = "all",
    use_cache: bool = True,
) -> nx.MultiDiGraph:
    """Download the OSM street network within `polygon`.

    Returns an osmnx-flavored `networkx.MultiDiGraph`: nodes carry `x`/`y`
    coordinates in EPSG:4326, edges carry `length` in meters. Call
    `osmnx.project_graph` downstream if you need a projected CRS for
    distance calculations.
    """
    key = make_key("network", network_type, polygon.wkt)

    def compute() -> nx.MultiDiGraph:
        return ox.graph_from_polygon(polygon, network_type=network_type)

    return cached(key, compute, use_cache=use_cache)
