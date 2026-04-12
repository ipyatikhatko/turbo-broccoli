# GitHub Release Notification API

API service for subscribing users to email notifications about new releases in GitHub repositories.

OpenAPI contract: `/src/docs/openapi.yaml` (use [Swagger Editor](https://editor.swagger.io/) or any OpenAPI viewer to inspect it)

## API Endpoints

- `POST /api/subscribe` - subscribe an email to a repository (`owner/repo`)
- `GET /api/confirm/{token}` - confirm subscription
- `GET /api/unsubscribe/{token}` - unsubscribe by token
- `GET /api/subscriptions?email={email}` - list active subscriptions for an email

## Public pages (MVC + HTMX)

- `GET /subscribe` - subscription form (HTMX posts to the **API origin** when it differs from the app host; see below)
- `GET /subscription-confirmed` - success view after email confirmation (browser redirect target)
- `GET /unsubscribed` - success view after unsubscribe
- `GET /error?context=&code=` - human-readable error view

Static CSS: `/assets/web.css` (built with Tailwind; run `pnpm build` or `pnpm web:css`).

## Stack

- Runtime: Node.js
- Language: TypeScript (ESM)
- HTTP framework: Fastify
- Build: esbuild (bundle to `dist/index.js`; `packages: external`)
- Package manager: pnpm
- Database: PostgreSQL
- ORM: Drizzle ORM + Drizzle Kit migrations
- Email templates: Maizzle + Tailwind (compiled to `src/mail/compiled`)
- Public UI: HTMX + Tailwind (`pnpm web:css` / `pnpm build` → `dist/public/web.css`)
- Email service: Resend (token is needed for sending emails)
- Containerization: Docker + Docker Compose (local/dev)
- Testing: Vitest
- Type generation: `openapi-typescript` **5.4.0** (supports Swagger / OpenAPI **2.0**; the contract is `swagger: "2.0"` in `src/docs/openapi.yaml`)

## Architecture Decisions

- **GCP (recommended for this repo’s CI/CD):** build a container in GitHub Actions, push to **Artifact Registry** (`<region>-docker.pkg.dev`), run it on **Cloud Run**. Classic **Container Registry (`gcr.io`)** is discontinued. Use **Cloud SQL for PostgreSQL** as the managed database (private IP + VPC connector is the usual production pattern; public IP + authorized networks is simpler for learning).
- The app only needs **`DATABASE_URL`** at runtime to reach Postgres (Cloud SQL or any other host). No DB credentials are baked into the image.
- **Railway Postgres** remains a valid option if you prefer an external DB while keeping compute on GCP.
- **`docker-compose.yml`** is for local development (app + local Postgres) and other container hosts; it is not required for Cloud Run.
- **Migrations** run on startup (`connectAndMigrate()`), so a new Cloud Run revision applies pending SQL from `drizzle/` when the instance boots.
- **Periodic scanner (spec requirement):** use **Cloud Scheduler** to call an HTTPS route on the **same** Cloud Run service (or a **Cloud Run Job** from the same image). That is infrastructure scheduling, not a second application service—logic stays in this monolith.

## TypeScript types from the API contract

Types are generated manually from `src/docs/openapi.yaml`:

```bash
pnpm run generate:types
```

This runs `openapi-typescript` **v5.4.0**, which understands Swagger 2.0 without converting the spec to OpenAPI 3. Output is written to `src/types/openapi.d.ts` (see `generate:types` in `package.json`).

## Environment Variables

Use `.env`:

```env
PORT=3000
BASE_URL=http://api.localhost:3000
WEB_URL=http://app.localhost:3000
DATABASE_URL=postgresql://postgres:postgres@db:5432/releases
GITHUB_TOKEN=
RESEND_API_KEY=
RESEND_FROM=
SCANNER_CRON_ENABLED=false
SCANNER_CRON_EXPRESSION=0 */5 * * * *
SCANNER_SECRET_KEY=
```

- **`BASE_URL`**: Public origin of the **API** host (JSON contract). Required for Resend when `WEB_URL` is not set; used together with `WEB_URL` for split-host setups. Example: `https://api.example.com`.
- **`WEB_URL`**: Public origin of the **web** host (pages + HTML responses for the same routes). If set, confirmation and unsubscribe links in emails point here so users open links on the app host. If omitted, everything uses **`BASE_URL`** (single host).

### API host vs app host (how responses are chosen)

The server inspects the HTTP **`Host`** header (or **`X-Forwarded-Host`** when behind a proxy). No User-Agent lists are used.

| Host | Behavior for `/api/subscribe`, `/api/confirm/:token`, `/api/unsubscribe/:token` |
|------|-------------------------------------------------------------------------------------|
| **`app.*`** subdomain (e.g. `app.localhost`, `app.example.com`) **or** hostname equal to `WEB_URL` | Web UX: **302** redirects to `/subscription-confirmed`, `/unsubscribed`, or `/error?…`; **`POST /api/subscribe`** with **`HX-Request: true`** returns **HTML** fragments. |
| **Everything else** (including **`api.*`**, bare `localhost`, unknown host) | **OpenAPI JSON** contract: empty `200` or `{ code, message }` errors. |

Override on any host: append **`?format=json`** to force JSON (useful when debugging against the app hostname).

**Email links:** When `WEB_URL` is set, confirm/unsubscribe URLs use **`WEB_URL`** so recipients hit the app host and get redirects/HTML. Programmatic clients should call **`BASE_URL`** (the API host).

**Split origins and HTMX:** If `WEB_URL` and `BASE_URL` differ, the subscribe page posts to the API origin and the app registers **CORS** for both origins. For local subdomains, see **Local subdomains** below.

For deployed environments (for example app container + Railway DB), for **database connectivity** you can pass only:

```env
DATABASE_URL=<Railway PostgreSQL connection URL>
```

The application validates `DATABASE_URL` at boot and fails fast if it is missing. `POSTGRES_*` values are only used by local `docker-compose.yml` to bootstrap a local Postgres container.

Email templates are built with:

```bash
pnpm email:build
```

Run this whenever templates under `src/mail/source/templates` change.

`GITHUB_TOKEN` behavior:

- If `GITHUB_TOKEN` is set, the service uses authenticated GitHub API requests (higher rate limit).
- If `GITHUB_TOKEN` is empty, the service uses public GitHub API requests (lower rate limit).
- The service supports both modes without changing the API contract.

Scanner behavior:

- `SCANNER_CRON_ENABLED=true` enables in-process cron scanning.
- `SCANNER_CRON_EXPRESSION` controls schedule (toad-scheduler cron format with seconds).
- `POST /external/scan` triggers one scanner run and requires header `X-Scanner-Key: <SCANNER_SECRET_KEY>` (so Cloud Scheduler can use OIDC on `Authorization` for Cloud Run while sending the app secret separately).

## Run Locally

```bash
pnpm install
cp .env.example .env
```

PostgreSQL must be reachable at `DATABASE_URL` before starting the app (migrations run on boot).

```bash
pnpm dev
```

### Local subdomains (`api.localhost` / `app.localhost`)

To mirror production (API on one host, app on another) with one process:

1. Point **`BASE_URL`** at the API origin and **`WEB_URL`** at the app origin (see `.env.example`).
2. Many systems resolve `*.localhost` to `127.0.0.1` automatically. If `ping app.localhost` fails, add hosts entries:
   ```bash
   pnpm local:subdomains
   ```
   The script prints the exact `sudo tee -a /etc/hosts` line to run.
3. Open **`WEB_URL`** in the browser (e.g. `http://app.localhost:3000/subscribe`). Use **`BASE_URL`** for curl, Postman, and OpenAPI clients (e.g. `http://api.localhost:3000/api/subscriptions?email=…`).

For a **single host** only, set both to the same origin (e.g. `http://localhost:3000`) and leave **`WEB_URL`** empty or equal to **`BASE_URL`**; the host will not match `app.*`, so responses stay JSON unless you use a hostname that matches **`WEB_URL`**.

### Build and Start

Production bundle is built with **esbuild** (`scripts/build.mjs`). Typechecking only (no emit) uses **TypeScript**:

```bash
pnpm typecheck
pnpm build
pnpm start
```

## Docker Compose (Local Dev)

`docker-compose.yml` runs:

- `api` service (this Fastify app)
- `db` service (PostgreSQL)

Run:

```bash
docker compose up --build
```

This is intended primarily for local development. Production on GCP is: image in **Artifact Registry**, runtime on **Cloud Run**, database on **Cloud SQL** (or another managed Postgres).

## GCP: Artifact Registry (one-time)

In your Google Cloud project:

1. Enable **Artifact Registry API**.
2. Create a **Docker** repository in a region of your choice. Default repository id in this repo’s workflow is **`turbo-broccoli`** (override with GitHub variable `GCP_ARTIFACT_REGISTRY_REPOSITORY` if you use another id).
3. Grant your GitHub **CI** service account **`roles/artifactregistry.writer`** on that repository (or the project).

Image reference format:

`REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY_ID/turbo-broccoli:TAG`

## CI/CD: GitHub Actions → Artifact Registry

Workflows:

- `.github/workflows/ci.yml` — install, build email templates, typecheck, test, app build, Docker smoke build. **No GCP credentials** on the runner.
- `.github/workflows/publish-gcp.yml` — OIDC auth to GCP, **push** `:<sha>` and `:latest` to Artifact Registry (`REGION-docker.pkg.dev/...`). Deploying to Cloud Run or elsewhere is up to you (e.g. manual `gcloud run deploy`, another pipeline, or Console).

### GitHub secrets (`publish-gcp.yml`)

| Name | Purpose |
|------|---------|
| `GCP_PROJECT_ID` | Google Cloud project id |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider resource name (OIDC) |
| `GCP_SERVICE_ACCOUNT` | Service account email GitHub Actions impersonates (needs `artifactregistry.writer` for push) |

### GitHub variables (`publish-gcp.yml`)

| Name | Example | Purpose |
|------|---------|---------|
| `GCP_REGION` | `us-central1` | **Required.** Must match the Artifact Registry region (`REGION-docker.pkg.dev`). |
| `GCP_ARTIFACT_REGISTRY_REPOSITORY` | `turbo-broccoli` | Optional. Repository id if not `turbo-broccoli`. |

### Security model

- **OIDC** via `google-github-actions/auth` — no long‑lived JSON keys in GitHub.
- **Build** does not inject app secrets (`DATABASE_URL`, `RESEND_*`, etc.); keep those for your runtime environment when you wire up hosting.

## Database and Migrations

- **ORM**: Drizzle with the `pg` driver (`src/db/client.ts`).
- **Schema**: `src/db/schema.ts`. Data is normalized into **`repos`** (with `full_name`, `last_seen_tag`) and **`subscriptions`** (email/tokens/confirmed + `repo_id`). The API response shape remains OpenAPI-compatible via `src/db/subscription-mapper.ts`.
- **SQL migrations**: generated into `drizzle/` (committed). After changing the schema, run:

```bash
pnpm run db:generate
```

- **On boot**: `src/index.ts` calls `connectAndMigrate()`, which applies any pending migrations from `drizzle/`, then starts Fastify. The DB instance is available as `fastify.db`.
- **API mapping**: `src/db/subscription-mapper.ts` maps rows to `definitions["Subscription"]` for responses.

## Constraints

- API/scanner/notifier stay in one service (monolith)
- Contract in `openapi.yaml` is fixed and not changed
