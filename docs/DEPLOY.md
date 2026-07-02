# Deploy (Coolify on self-hosted VPS)

Prereqs: a VPS with Coolify installed, a domain with DNS A-records pointing at the VPS, and this repo connected as a Coolify source (GitHub App or deploy key).

## 1. Project + Postgres
1. Create a Coolify Project (e.g. `dnd`) with a `production` environment.
2. Add a PostgreSQL database resource. Copy its INTERNAL connection URL (hostname = the DB service's internal name). The API uses the internal URL.

## 2. API service
1. + New Resource -> Application -> from Git repo, this repo, branch `main`.
2. Build Pack: Dockerfile. Dockerfile location: `apps/api/Dockerfile`. Build context: repo root.
3. Port: 3000. Domain e.g. `https://api.tudominio.com` (auto Let's Encrypt SSL via Traefik).
4. Env: `DATABASE_URL` (internal), `JWT_SECRET` (`openssl rand -hex 32`), `JWT_EXPIRES_IN=7d`, `PORT=3000`, `SENTRY_DSN` (or empty).
5. Deploy. The API CMD runs `prisma migrate deploy` on start (schema applied automatically).

## 3. Web service
1. + New Resource -> Application -> from Git repo, same repo/branch.
2. Build Pack: Dockerfile. Dockerfile location: `apps/web/Dockerfile`. Build context: repo root. Port: 80.
3. Domain e.g. `https://app.tudominio.com` (auto SSL).
4. Env: `API_URL` = API service INTERNAL address, e.g. `http://api:3000`. The web nginx proxies `/api` -> API, so no CORS and no VITE_API_URL needed.

## 4. Auto-deploy + verify
1. Enable auto-deploy on push for both services. Ensure GitHub Actions CI is green first.
2. Verify: open the web domain, register, log in over HTTPS.
3. If SENTRY_DSN set, trigger a test error and confirm Sentry receives it.
