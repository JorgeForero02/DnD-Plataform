import * as dotenv from "dotenv";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import helmet from "@fastify/helmet";

/**
 * Loads apps/api/.env into process.env. Idempotent — dotenv never overwrites a key already
 * present in process.env, so calling this more than once (main.ts calls it, then buildAdapter()
 * below calls it again) is harmless and changes nothing about precedence.
 *
 * Exported, and called from INSIDE buildAdapter() (not just from main.ts), on purpose — fix
 * round 3: a call to dotenv.config() sitting only at the top of main.ts is exactly the kind of
 * guarantee that quietly stops being true. It was already proven to regress twice on this
 * branch in different shapes (a boot-path test that couldn't tell auth.module.ts from
 * jwt.strategy.ts; a trust-proxy test that passed under the very bug it was meant to catch),
 * and it was proven a third time here: deleting the dotenv.config() call from main.ts left the
 * full suite at 81/81 green, because the round-2 test called dotenv.config() itself before
 * calling buildAdapter() — proving the MECHANISM works while proving nothing about the WIRING.
 * Moving the call to where TRUST_PROXY is actually read means the correctness of that read no
 * longer depends on a separate call in main.ts surviving future edits to this file or that one.
 *
 * `options` lets a test point this at an isolated temp file instead of the real
 * apps/api/.env; production and `main.ts` call this with no arguments, using dotenv's normal
 * resolution (a `.env` file in the process's current working directory).
 */
export function loadBootEnv(options?: dotenv.DotenvConfigOptions): void {
  dotenv.config({ quiet: true, ...options });
}

/**
 * Builds the Fastify adapter, including the `trustProxy` setting the deployment needs.
 *
 * Extracted out of main.ts alongside `configureApp` below so an e2e test can build the app
 * through the exact same adapter configuration production runs, instead of a hand-rolled one
 * that silently drifts from it (see apps/api/test/security-headers.e2e-spec.ts and
 * trust-proxy.e2e-spec.ts).
 *
 * TRUST_PROXY (env var, documented in .env.example): the number of proxy hops to trust in
 * front of the API, or unset/0 for none. Passed straight through to Fastify's `trustProxy`
 * option as a NUMBER, not a boolean — the two behave completely differently for
 * X-Forwarded-For resolution, and that difference is a real vulnerability, not a style choice:
 *
 * - `trustProxy: true` ("trust every hop") makes Fastify take the LEFTMOST entry of
 *   X-Forwarded-For — whatever the ORIGINAL, outermost client sent. nginx's
 *   `proxy_add_x_forwarded_for` (apps/web/nginx.conf) only APPENDS the real client IP on the
 *   right; it never strips or overwrites a value a client already put on the left. So `true`
 *   (this file's previous setting) handed ThrottlerGuard's per-IP key — it reads `req.ip` —
 *   straight to the attacker: sending a different X-Forwarded-For on every request produced a
 *   different throttler key every time, and the per-IP rate limit added for hallazgo 3 never
 *   actually engaged in production.
 * - `trustProxy: N` (a number) trusts exactly N hops counting IN from the socket connection —
 *   i.e. it reads the value the Nth trusted proxy itself appended, ignoring anything further
 *   left that a client (trusted or not) supplied.
 *
 *   **Production sits behind TWO proxies, not one: Traefik and then nginx**, so the value there
 *   is `TRUST_PROXY=2` (`docker-compose.prod.yml`). This comment said "exactly one trusted proxy
 *   (nginx), so TRUST_PROXY=1" and was wrong — and `docs/03-despliegue.md` cited this very file
 *   as the authority for the arithmetic, so anyone following the citation to check the number
 *   found a comment contradicting it. A documentation audit caught it on 2026-09-02.
 *
 *   And the number is not what makes it safe: **Traefik discards the client's X-Forwarded-For**
 *   and rewrites it from the real connection, so the entry the API ends up reading cannot be
 *   forged from outside. Change the topology and the number has to be recounted, not inherited.
 *
 * Default is 0 (`false`, no proxy trusted at all): a direct `pnpm dev:api` on 0.0.0.0, with no
 * proxy in front, must not trust a client-supplied X-Forwarded-For either.
 */
export function buildAdapter(): FastifyAdapter {
  loadBootEnv(); // see loadBootEnv()'s own comment for why this call lives here, not just in main.ts
  const trustProxyHops = Number(process.env.TRUST_PROXY ?? 0);
  return new FastifyAdapter({
    trustProxy: trustProxyHops > 0 ? trustProxyHops : false,
  });
}

/**
 * Registers helmet's security headers (hallazgo 4) and CORS (hallazgo 5) on an already-created
 * Nest/Fastify app. Moved out of main.ts's `bootstrap()` — previously the only caller, and one
 * the e2e suites never exercise (they build `AppModule` directly via
 * `Test.createTestingModule`, bypassing `main.ts` entirely) — so this configuration can be
 * exercised by a real test instead of staying an untested boot-time side effect.
 */
export async function configureApp(app: NestFastifyApplication): Promise<void> {
  await app.register(helmet, {
    // The API returns JSON only, never HTML — a content-security-policy governs how a
    // *browser renders a page* (script/style/frame sources), which is meaningless for a JSON
    // response and would just be dead weight. Disabled deliberately, not left to helmet's
    // HTML-oriented default.
    contentSecurityPolicy: false,
    // Stricter than helmet's default (SAMEORIGIN): the API is never meant to be framed by
    // anything, including itself, so deny it outright. Ships as X-Frame-Options: DENY.
    frameguard: { action: "deny" },
    // Everything else stays at helmet's secure defaults, which already cover the rest of
    // hallazgo 4: X-Content-Type-Options: nosniff, Referrer-Policy: no-referrer,
    // Strict-Transport-Security, X-DNS-Prefetch-Control: off, X-Download-Options: noopen,
    // Cross-Origin-Opener-Policy / -Resource-Policy: same-origin.
  });

  // No CORS by design (docs/01-arquitectura.md): production serves the web app and proxies
  // /api through the same nginx origin (apps/web/nginx.conf), and local dev proxies /api
  // through Vite (apps/web/vite.config.ts) — both same-origin from the browser's point of
  // view, so no cross-origin request ever needs to succeed. CORS_ORIGIN exists only as an
  // escape hatch for a browser hitting the API directly on a different origin during
  // development (e.g. a tool other than the Vite dev server); unset, CORS stays off entirely.
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    app.enableCors({ origin: corsOrigin.split(",").map((origin) => origin.trim()) });
  }
}
