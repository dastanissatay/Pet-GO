"""Deploy the API to Modal: one always-warm container in the EU, next to the database.

    uvx modal deploy modal_app.py        # deploy or update the API
    uvx modal run modal_app.py::migrate  # apply pending migrations (explicit step)

Configuration comes from the Modal Secret "petgo-api" (DATABASE_URL, ENV=prod,
optional LLM_API_KEY, CORS_ORIGINS). Values are set in the Modal dashboard and
never committed.
"""

from pathlib import Path

import modal

HERE = Path(__file__).parent
ROOT = "/root"  # Modal's working directory; it is on sys.path, so `import app` works.

# Same pinned versions as the Docker image: export from uv.lock and install those.
image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("uv==0.13.8")
    .add_local_file(HERE / "pyproject.toml", "/build/pyproject.toml", copy=True)
    .add_local_file(HERE / "uv.lock", "/build/uv.lock", copy=True)
    .run_commands(
        "cd /build && uv export --frozen --no-dev --no-hashes --no-emit-project -o req.txt",
        "uv pip install --system -r /build/req.txt",
    )
    .env({"PYTHONUNBUFFERED": "1"})
    .add_local_file(HERE / "alembic.ini", f"{ROOT}/alembic.ini")
    .add_local_dir(HERE / "alembic", f"{ROOT}/alembic")
    .add_local_dir(HERE / "app", f"{ROOT}/app")
)

secrets = [modal.Secret.from_name("petgo-api")]

petgo = modal.App("petgo-api", image=image)


@petgo.function(
    secrets=secrets,
    region=["eu"],  # the Render Postgres database is in Frankfurt
    min_containers=1,  # always warm: no cold start for visitors
    max_containers=2,
    cpu=0.25,
    memory=512,
)
@modal.concurrent(max_inputs=50)
@modal.asgi_app()
def api():  # type: ignore[no-untyped-def]
    from app.main import create_app

    return create_app()


@petgo.function(secrets=secrets, region=["eu"], timeout=300)
def migrate() -> None:
    import subprocess

    # Fixed command, no user input.
    subprocess.run(["alembic", "upgrade", "head"], cwd=ROOT, check=True)  # noqa: S603, S607
