.PHONY: install run notebook web

install:
	pip install -e ".[dev]"

run:
	python -m pipeline.run

notebook:
	jupyter lab notebooks/

web:
	cd web && npm install && npm run dev
