# GitHub Release Notification API

API service for subscribing users to email notifications about new releases in GitHub repositories.

OpenAPI contract: `/src/docs/openapi.yaml`  
Swagger UI: `http://localhost:{PORT}/docs`

## API Endpoints

- `POST /api/subscribe` - subscribe an email to a repository (`owner/repo`)
- `GET /api/confirm/{token}` - confirm subscription
- `GET /api/unsubscribe/{token}` - unsubscribe by token
- `GET /api/subscriptions?email={email}` - list active subscriptions for an email

## Stack

- Runtime: Node.js
- Language: TypeScript (ESM)
- HTTP framework: Fastify
- Package manager: pnpm
- API docs: `@fastify/swagger`, `@fastify/swagger-ui`
- Database: PostgreSQL
- ORM: Drizzle ORM + Drizzle Kit migrations
- Containerization: Docker + Docker Compose
- Testing: Vitest
- Type generation: `openapi-typescript` **5.4.0** (supports Swagger / OpenAPI **2.0**; the contract is `swagger: "2.0"` in `src/docs/openapi.yaml`)

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
DATABASE_URL=postgresql://postgres:postgres@db:5432/releases
GITHUB_TOKEN=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

`GITHUB_TOKEN` behavior:

- If `GITHUB_TOKEN` is set, the service uses authenticated GitHub API requests (higher rate limit).
- If `GITHUB_TOKEN` is empty, the service uses public GitHub API requests (lower rate limit).
- The service supports both modes without changing the API contract.

## Run Locally

```bash
pnpm install
cp .env.example .env
pnpm dev
```

### Build and Start

```bash
pnpm build
pnpm start
```

## Docker Compose

`docker-compose.yml` runs:

- `api` service (this Fastify app)
- `db` service (PostgreSQL)

Run:

```bash
docker compose up --build
```

## Database and Migrations

Drizzle manages schema and migrations.  
Service startup includes migration execution before serving requests.

Core subscription fields:

- `email`
- `repo`
- `confirmed`
- `confirm_token`
- `unsubscribe_token`
- `last_seen_tag`

## Constraints

- API/scanner/notifier stay in one service (monolith)
- Contract in `openapi.yaml` is fixed and not changed

