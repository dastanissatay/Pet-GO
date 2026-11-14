# CLAUDE.md: Agent Rules for This Project

You are working as a senior full-stack engineer on this repository. Follow these rules for every task.
If a rule conflicts with an explicit instruction from the user, follow the user and mention the conflict.

---

## 0. Stack (do not change without asking)

| Layer | Choice |
|---|---|
| Frontend | React 18+ · TypeScript (strict) · Vite · React Router · TanStack Query · Tailwind CSS · shadcn/ui · react-hook-form + zod |
| Backend | Python 3.12 · FastAPI · Pydantic v2 · pydantic-settings · SQLAlchemy 2 (async) · asyncpg · Alembic |
| Database | PostgreSQL 16 (pinned image tag) |
| Tooling | **uv** (Python deps) · **pnpm** (JS deps) · Ruff · mypy · ESLint · Prettier |
| Tests | pytest + pytest-asyncio + httpx · Vitest + Testing Library · Playwright (E2E) |
| Runtime | Docker + docker compose (local now; external server later) |
| Auth | **None for now.** Design so auth can be added later without rewrites (see §6). |

---

## 1. Repository layout

```
.
├── CLAUDE.md
├── README.md
├── .env.example              # every env var, with safe dummy values
├── docker-compose.yml        # base: db, backend, frontend
├── docker-compose.dev.yml    # dev overrides: hot reload, bind mounts, exposed ports
├── docker-compose.prod.yml   # prod overrides: built images, nginx, no source mounts
├── Makefile                  # single entry point for common commands
├── backend/
│   ├── pyproject.toml  uv.lock  Dockerfile  alembic.ini
│   ├── alembic/versions/
│   ├── app/
│   │   ├── main.py           # app factory, middleware, router includes
│   │   ├── core/             # config.py, db.py, logging.py, errors.py
│   │   ├── features/
│   │   │   └── <feature>/    # router.py, schemas.py, models.py, service.py, repository.py
│   │   └── api/deps.py       # shared dependencies (db session, pagination)
│   └── tests/                # mirrors app/ structure; conftest.py with fixtures
└── frontend/
    ├── package.json  pnpm-lock.yaml  Dockerfile  vite.config.ts  tsconfig.json
    ├── nginx.conf            # used by prod image
    └── src/
        ├── main.tsx  App.tsx  router.tsx
        ├── components/ui/    # shadcn components (generated, minimal edits)
        ├── components/       # shared app components
        ├── features/<feature>/  # components, hooks, api.ts, types.ts
        ├── lib/              # api client, utils, query client
        └── api/generated/    # types generated from FastAPI OpenAPI. Never hand-edit
```

Organize code **by feature**. A new feature gets its own folder on both sides.

---

## 2. General workflow (every task)

1. **Read before writing.** Open the relevant files and restate the task in 1–2 sentences. Ask if the requirements are ambiguous and a wrong guess would be costly.
2. **Plan, then work in small steps.** Write a short plan and make one focused change at a time.
3. **Stay in scope.** No unrelated refactors, renames, reformatting or dependency upgrades.
4. **Match existing conventions** before introducing new patterns. If you introduce one, say why.
5. **Never invent APIs.** If you are unsure a function, flag or package exists, check the docs or the source.
6. **Add dependencies sparingly.** Justify each one and use `uv add` / `pnpm add` so lockfiles update. Never edit lockfiles by hand.
7. **Verify after each meaningful change** (see §10 commands). Never claim "done" without running checks.
8. **Report honestly:** what changed, how it was verified, what was not verified and any known issues.

---

## 3. Frontend rules (React + TypeScript)

**TypeScript**
- `strict: true`, `noUncheckedIndexedAccess: true`. No `any`, use `unknown` and narrow. No `// @ts-ignore` without a comment explaining why.
- API request/response types come from `src/api/generated/` (generated via `openapi-typescript` from FastAPI's `/openapi.json`). Regenerate after any backend schema change. Never duplicate them by hand.

**Components**
- Function components only. One component per file, named exports, `PascalCase.tsx`.
- Keep components small. Move logic into custom hooks (`useXxx`). Components that only render take props in and emit callbacks out.
- Use shadcn/ui primitives from `components/ui/`. Add new ones with the shadcn CLI. Don't fork them heavily, wrap them instead.

**Styling**
- Tailwind only. No inline `style={}` except for truly dynamic values. No separate CSS files except `index.css` (Tailwind layers and theme tokens).
- Colors, radius and spacing come from the theme / CSS variables. No hardcoded hex values in components.
- Use the `cn()` helper for conditional classes.
- Mobile-first. Check layouts at 375px, 768px and 1280px.

**Data & state**
- **Server state lives in TanStack Query only.** One `api.ts` per feature exports query/mutation hooks. Query keys come from a per-feature key factory.
- Never copy server data into `useState` or a global store. Local UI state uses `useState`. Add a global store (Zustand) only when state is truly shared across distant parts of the tree, and ask first.
- All HTTP calls go through one client in `lib/api.ts` (base URL from `import.meta.env.VITE_API_URL`, JSON handling, error normalization). No `fetch` calls scattered in components.
- Mutations invalidate or update the relevant queries. Use optimistic updates only when rollback is handled.

**Every data-driven view handles 4 states:** loading (skeleton), error (message + retry), empty (helpful empty state), success.

**Forms:** react-hook-form + zod schema + shadcn `Form` components. Show field-level errors. Disable submit while pending. Display server validation errors (422) on the matching fields.

**Accessibility:** semantic HTML, every input has a label, everything works by keyboard, focus stays visible, images have `alt`, dialogs trap focus (shadcn handles this, don't break it).

**Routing:** routes defined in `router.tsx`, pages lazy-loaded. Add a 404 route and an app-level error boundary.

**Never** put secrets in frontend code or `VITE_*` variables. Everything in the bundle is public.

---

## 4. Backend rules (FastAPI)

**Layering (strict):**
`router.py` (HTTP only) → `service.py` (business logic) → `repository.py` (DB queries) → `models.py` (SQLAlchemy)
- Routers: parse input, call a service, return a schema. No SQL and no business rules.
- Services: business logic. They have no knowledge of HTTP (no `HTTPException`), and raise domain exceptions from `core/errors.py` instead.
- Repositories: the only place that builds queries.

**Schemas (Pydantic v2)**
- Separate schemas per purpose: `XxxCreate`, `XxxUpdate` (all fields optional), `XxxRead`. Never return ORM models directly. Always set `response_model`.
- `model_config = ConfigDict(from_attributes=True, extra="forbid")` on input schemas, so unknown fields are rejected.
- Use constrained types (`Field(min_length=..., max_length=...)`, `EmailStr`, `conint`) for validation at the boundary.

**API design**
- All routes live under `/api/v1`. Resource names are plural nouns (`/api/v1/projects/{id}`).
- Correct status codes: 200, 201 (create), 204 (delete), 400, 404, 409 (conflict), 422 (validation).
- One error format, produced by global exception handlers:
  `{"error": {"code": "PROJECT_NOT_FOUND", "message": "...", "details": {...}}}`
- Every list endpoint is paginated (`limit` capped at 100, `offset` or cursor) and returns `{items, total}`.
- Give every route a `summary` and tags. The OpenAPI output is the frontend's contract.

**Async correctness**
- Everything on the request path is `async`. Never call blocking I/O (`requests`, sync DB, `time.sleep`) inside async routes. Use `httpx.AsyncClient`.
- One `AsyncSession` per request via a `Depends(get_db)` dependency. Commit in the service or a unit-of-work, not in routers.

**Config & logging**
- All settings live in `core/config.py` (`pydantic-settings`), read from env vars and validated at startup. Fail fast on missing values.
- Structured JSON logging with a request ID (middleware). Never log secrets or personal data. No `print()`.
- `GET /api/health` returns 200 and checks DB connectivity.

**CORS:** allow only origins listed in `CORS_ORIGINS` env var. Never `*` together with credentials.

**External calls:** always set timeouts. Retry with backoff only for idempotent operations.

---

## 5. Database rules (PostgreSQL + SQLAlchemy 2 + Alembic)

- **Use SQLAlchemy 2.0 style only:** `Mapped[...]`, `mapped_column()`, `select()`. Never use the legacy `session.query()`.
- **Every schema change goes through an Alembic migration.** Workflow: edit models → `alembic revision --autogenerate -m "..."` → **read and fix the generated file** → `alembic upgrade head` → test `alembic downgrade -1` and upgrade again.
- Never edit a migration that has already been applied/merged. Create a new one.
- Set a naming convention on `MetaData` so constraint names are deterministic.
- Every table has `id` (UUID or bigint identity, chosen once project-wide), `created_at` and `updated_at` (timezone-aware, `server_default=func.now()`).
- Enforce integrity in the DB: `NOT NULL`, foreign keys with explicit `ondelete`, unique constraints and check constraints.
- Add indexes for foreign keys and real query filters. Check slow queries with `EXPLAIN ANALYZE`.
- Avoid N+1 queries: use `selectinload` / `joinedload` explicitly. Async sessions forbid lazy loading, so plan relationship loading up front.
- Multi-step writes run in one transaction.
- Never use raw SQL string concatenation. If raw SQL is needed, use `text()` with bound parameters.
- Store money as `Numeric`, never float. Store timestamps in UTC.

---

## 6. Security (even without auth)

- **Auth-ready design:** routes get the current actor via a dependency (`get_current_user`) that currently returns an anonymous / system user. Later, real auth replaces this one function. Don't hardcode "no user" assumptions in services.
- Validate all input server-side. Client validation is for UX only.
- Keep secrets in `.env` only (git-ignored). Keep `.env.example` complete with dummy values. Never commit real credentials, even "temporary" ones.
- Use parameterized queries only (ORM / bound params).
- File uploads (if any): validate type and size, generate server-side filenames and never trust the client filename.
- Production: HTTPS only, security headers set in nginx, `docs_url`/`openapi_url` disabled or protected, `DEBUG=false`.
- Before going public: add rate limiting to write endpoints and run `pip-audit` / `pnpm audit`.

---

## 7. Docker rules

**Compose services:** `db` (postgres:16-alpine), `backend`, `frontend`. In production, nginx is added to serve the built frontend and proxy `/api` → backend.

- Pin image versions. Never use `:latest`.
- `db` has a named volume (`pgdata`), a `healthcheck` (`pg_isready`), and `backend` uses `depends_on: db: condition: service_healthy`.
- **Dev (`docker-compose.dev.yml`):** bind-mount source, `uvicorn --reload`, Vite dev server with `--host 0.0.0.0`, Postgres port exposed for local tools.
- **Prod (`docker-compose.prod.yml`):** no source mounts, no `--reload`, Postgres port **not** exposed, `restart: unless-stopped`, resource-friendly settings (`uvicorn` with multiple workers or `gunicorn -k uvicorn.workers.UvicornWorker`).
- **Backend Dockerfile:** multi-stage, `uv sync --frozen --no-dev` in the build stage, slim runtime image, runs as a non-root user.
- **Frontend Dockerfile:** multi-stage. `pnpm build` runs in a Node stage, and the static `dist/` is served by `nginx:alpine` with an SPA fallback (`try_files $uri /index.html`).
- Migrations run as an explicit step (`make migrate` / a one-off `backend` command or an entrypoint guarded by an env flag), never silently on every container start in prod.
- `.dockerignore` in both apps (exclude `node_modules`, `.venv`, `.git`, `.env`, caches).
- The same images are used for local prod testing and the real server. Configuration differs only through env vars.

---

## 8. Testing rules

- **Backend:** pytest + `httpx.AsyncClient` against the app, using a **separate test database** (Postgres in Docker, not SQLite, so behavior matches). Each test runs in a transaction that is rolled back, or on a fresh schema.
  - Unit-test services. Integration-test routes (status codes, response shape, validation errors, 404s).
- **Frontend:** Vitest + Testing Library for hooks and components that contain logic. Mock the network with MSW, not by mocking internal modules. Playwright E2E for critical flows only.
- **Bug fix = failing test first**, then the fix.
- Tests are deterministic: no real external network, no dependence on test order or wall-clock time.
- Never delete, skip or weaken a test to make it pass. Fix the code or explain why the test was wrong.

---

## 9. Code quality

- **Python:** Ruff (lint + format), mypy in strict mode on `app/`. Type hints on all functions. Names are `snake_case`.
- **TypeScript:** ESLint (typescript-eslint, react-hooks, jsx-a11y) + Prettier. Components are `PascalCase`, hooks are `useCamelCase`.
- Functions are small, with early returns and no deep nesting. Comments explain *why*, not *what*.
- No dead code, commented-out code, `print`, or `console.log` in commits.
- Abstract on the third repetition, not the first.
- Commits use Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`) with one logical change each.

---

## 10. Commands (keep the Makefile as the single source)

```bash
make up            # docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
make down          # stop everything
make logs          # follow logs
make migrate       # alembic upgrade head (inside backend container)
make migration m="add projects table"   # autogenerate a migration
make test          # backend + frontend tests
make lint          # ruff check, ruff format --check, mypy, eslint, prettier --check, tsc --noEmit
make gen-api       # regenerate frontend types from backend OpenAPI
make prod-up       # run the prod compose stack locally to test it
```

**Before finishing any task, run:** `make lint` and `make test`. Also run `make gen-api` if any backend schema changed, and `make migrate` if models changed.

---

## 11. Definition of done

- [ ] The feature works end-to-end in the dev Docker stack (manually checked)
- [ ] Loading, error and empty states are handled in the UI
- [ ] Input is validated server-side and errors use the standard format
- [ ] A migration was created and reviewed if models changed. Downgrade works
- [ ] Frontend API types were regenerated if backend schemas changed
- [ ] Tests were added or updated. `make test` passes
- [ ] `make lint` is clean (including `tsc --noEmit` and mypy)
- [ ] No secrets, debug output or out-of-scope changes
- [ ] `.env.example` and README are updated if config or setup changed
- [ ] Summary written: what changed, how it was verified and any limitations or follow-ups

---

## 12. Later (not now, but don't block it)

- Authentication (replace `get_current_user`, add users table, httpOnly cookie sessions/JWT)
- CI pipeline (GitHub Actions: lint → test → build images)
- Server deploy: VPS + docker compose prod + Caddy/nginx with HTTPS, automated Postgres backups (`pg_dump` cron) with a tested restore
- Error tracking (Sentry) and uptime monitoring
