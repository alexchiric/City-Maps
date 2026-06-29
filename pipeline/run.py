"""CLI entrypoint: boundary -> POIs -> network -> scoring -> export.

Usage:
    python -m pipeline.run [--place "City, Country"] [--no-cache] [--skip-network]
"""

from __future__ import annotations

import argparse
import logging

from livability.boundary import get_city_boundary
from livability.config import PLACE
from livability.export import write_outputs
from livability.network import get_street_network
from livability.pois import fetch_pois
from livability.scoring import build_grid, score_all, weighted_livability

logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the livability data pipeline end to end.")
    parser.add_argument("--place", default=PLACE, help=f"Place to geocode (default: {PLACE!r})")
    parser.add_argument(
        "--no-cache", action="store_true", help="Force re-download instead of reading the disk cache"
    )
    parser.add_argument(
        "--skip-network",
        action="store_true",
        help="Skip the street network download; scoring falls back to straight-line distance",
    )
    parser.add_argument(
        "--resolution", type=float, default=0.005, help="Grid cell size in degrees (default: 0.005, ~500m)"
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable debug logging")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    use_cache = not args.no_cache

    logger.info("geocoding boundary for %r", args.place)
    boundary = get_city_boundary(args.place, use_cache=use_cache)

    logger.info("fetching POIs")
    pois = fetch_pois(boundary, use_cache=use_cache)

    network = None
    if args.skip_network:
        logger.info("skipping street network (--skip-network); scoring will use straight-line distance")
    else:
        logger.info("downloading street network")
        network = get_street_network(boundary.geometry.iloc[0], use_cache=use_cache)

    logger.info("building grid (resolution=%s deg)", args.resolution)
    grid = build_grid(boundary, resolution=args.resolution)

    logger.info("scoring %d cells", len(grid))
    scores = score_all(grid, pois, network)
    scores["livability"] = weighted_livability(scores)

    logger.info("writing outputs")
    write_outputs(pois, scores)

    logger.info("done")


if __name__ == "__main__":
    main()
