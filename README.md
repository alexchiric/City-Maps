# City-Maps — Livability

Scores neighborhoods on access to schools, healthcare, green space, groceries,
transit, culture, and services, using OpenStreetMap data.

## Architecture

A batch pipeline (`pipeline/run.py`, built on the `livability` Python package)
geocodes a city, pulls POIs and the street network from OpenStreetMap, scores
a grid of cells per category, and writes the result as static GeoJSON into
`data/` and `web/public/data/`. The Next.js frontend in `web/` reads those
GeoJSON files directly — it has no Python dependency and no backend call at
runtime, so it deploys to Vercel on its own. PostGIS (`livability.export.to_postgis`)
is an optional later path for serving from a database instead of static files;
it's never required to run the pipeline or the frontend.

## Workflows

**Run the pipeline** (regenerates `data/*.geojson` and `web/public/data/*.geojson`):

```bash
pip install -e ".[dev]"
python -m pipeline.run
```

Add `-v` for debug logging, `--no-cache` to force re-downloading from OSM, or
`--skip-network` to skip the street-network download (scoring falls back to
straight-line distance). OSM downloads are cached to `data/.cache/`, so repeat
runs are fast.

**Iterate on scoring in a notebook**:

```bash
pip install -e ".[dev]"
jupyter lab notebooks/
```

Open `notebooks/exploration.ipynb` — it imports the same `livability` package
the pipeline uses, so changes to `livability/scoring.py` show up immediately
on next cell run (no reinstall needed, it's an editable install).

**Deploy the frontend**:

```bash
cd web
npm install
npm run dev   # local dev server
```

For Vercel, set the project's root directory to `web/` and deploy — see
`web/README.md` for details.

## Layout

```
livability/      importable package: config, caching, OSM fetch, scoring, export
pipeline/        CLI entrypoint that runs the package end to end
notebooks/       exploration.ipynb — teammate workspace on top of livability
data/            generated GeoJSON + disk cache (gitignored)
web/             Next.js frontend, deployable on its own
archive/         original exploratory notebook and outputs, untouched
```

## Optional: PostGIS / Neon

Set `DATABASE_URL` (see `.env.example`) and call `livability.export.to_postgis`
to sync POIs/scores into a Postgres+PostGIS table instead of (or alongside)
the GeoJSON files. Requires the `postgis` extra: `pip install -e ".[postgis]"`.
