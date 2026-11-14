# Pet&GO frontend

React 18 + TypeScript (strict) + Vite + React Router + TanStack Query + Tailwind + shadcn/ui
+ react-hook-form + zod. Product spec: `docs/SPEC.md`. Engineering rules: `CLAUDE.md`.

## First run

```bash
cd frontend
pnpm install          # creates pnpm-lock.yaml; commit it (the Docker build needs it)
```

## Develop

```bash
# Against the backend (Vite proxies /api to http://localhost:8000):
pnpm dev

# Without a backend, using the in-page mock API (src/mocks). Mock data resets on reload:
VITE_USE_MOCKS=true pnpm dev
```

`VITE_PROXY_TARGET` changes the proxy target (e.g. `http://backend:8000` inside compose).
`VITE_API_URL` defaults to `/api`; production always uses `/api` behind nginx.

## Checks

```bash
pnpm lint      # eslint + prettier --check + tsc
pnpm test      # vitest + Testing Library, network mocked with MSW
pnpm gen-api   # regenerate src/api/generated from the backend's /openapi.json
```

After the first `pnpm gen-api`, switch `src/api/contract.ts` to aliases of the generated types.

## Where things live

| Path | What |
|---|---|
| `src/index.css`, `tailwind.config.ts` | Pet&GO tokens (butter, ink, coral, sun, mint, lilac, sky) as CSS variables |
| `src/components/ui/` | shadcn primitives restyled for Pet&GO |
| `src/components/` | Shared app components: `AppShell`, `Sidebar`, `PetAvatar`, `VerdictStamp`, `Chip`, `Card`, `XpBar`, `RangeBar`, `EmptyState`, `ErrorState` |
| `src/lib/api.ts` | The only HTTP client. Adds `X-Device-Id`, normalizes errors into `ApiError` |
| `src/lib/format.ts` | `formatUsd` (`$1,240`), `formatDate` (`MM/DD/YYYY`), local dates |
| `src/features/<feature>/api.ts` | TanStack Query hooks and key factories |
| `src/features/decode/` | Owned by Person 3. Replace the placeholder import in `router.tsx` when it lands |
| `src/mocks/` | MSW handlers implementing the spec's API, for dev and tests only |
