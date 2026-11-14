FROM python:3.12-slim AS base
COPY --from=ghcr.io/astral-sh/uv:0.13.8 /uv /bin/uv
WORKDIR /app
# The venv lives outside /app so the dev bind mount of ./backend does not hide it.
ENV UV_PROJECT_ENVIRONMENT=/opt/venv UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy \
    PATH="/opt/venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY pyproject.toml uv.lock ./

# Dev: includes test and lint tools. Source is bind-mounted by docker-compose.dev.yml.
FROM base AS dev
RUN uv sync --frozen --no-install-project
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS build
RUN uv sync --frozen --no-dev --no-install-project

FROM python:3.12-slim AS runtime
# gunicorn keeps its control socket under the user's home, so the user needs one.
RUN useradd --system --uid 1000 --create-home app
WORKDIR /app
ENV PATH="/opt/venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY --from=build /opt/venv /opt/venv
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
USER app
EXPOSE 8000
# Worker count comes from WEB_CONCURRENCY (gunicorn reads it).
CMD ["gunicorn", "app.main:app", "-k", "uvicorn_worker.UvicornWorker", "-b", "0.0.0.0:8000", "--access-logfile", "-"]
