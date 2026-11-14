DEV = docker compose -f docker-compose.yml -f docker-compose.dev.yml
PROD = docker compose -f docker-compose.yml -f docker-compose.prod.yml

.PHONY: up down logs migrate migration test lint gen-api prod-up

up:
	$(DEV) up -d --build

down:
	$(DEV) down

logs:
	$(DEV) logs -f

migrate:
	$(DEV) exec backend alembic upgrade head

# make migration m="add projects table"
migration:
	$(DEV) exec backend alembic revision --autogenerate -m "$(m)"

test:
	$(DEV) exec backend pytest -q
	$(DEV) exec frontend pnpm test

lint:
	$(DEV) exec backend ruff check .
	$(DEV) exec backend ruff format --check .
	$(DEV) exec backend mypy
	$(DEV) exec frontend pnpm lint
	$(DEV) exec frontend pnpm format:check
	$(DEV) exec frontend pnpm typecheck

gen-api:
	$(DEV) exec frontend pnpm exec openapi-typescript http://backend:8000/openapi.json -o src/api/generated/schema.d.ts

prod-up:
	$(PROD) up -d --build
