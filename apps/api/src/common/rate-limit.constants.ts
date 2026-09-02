/**
 * Rate-limit policy for @nestjs/throttler (hallazgo 3). One window, two tiers:
 *
 * - `DEFAULT_RATE_LIMIT` applies to every route via the global `ThrottlerGuard`
 *   (see app.module.ts) — loose, just a backstop against runaway loops.
 * - `AUTH_RATE_LIMIT` overrides it on the brute-forceable endpoints (login, register,
 *   invite-accept, password change) via
 *   `@Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: RATE_LIMIT_WINDOW_MS } })`.
 *
 * Both tiers share the same window so a route only ever tracks one counter — the "default"
 * throttler profile, just with a tighter limit on the routes that opt in.
 */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Per IP, per window: generous enough that no legitimate user session should ever hit it. */
export const DEFAULT_RATE_LIMIT = 100;

/**
 * Per IP, per window, on POST /auth/login, POST /auth/register, POST /invites/:token/accept
 * and PATCH /auth/password: tight enough to make password and invite-token brute forcing
 * impractical, loose enough that a user who mistypes their password a few times in a row is
 * never blocked. This is the value production runs with, and the value
 * apps/api/test/rate-limit.e2e-spec.ts asserts a 429 against — it is the real security
 * control, not a placeholder.
 *
 * Do NOT raise this to make room for more test calls: apps/api/test/auth.e2e-spec.ts already
 * runs 3 real POST /auth/login calls inside one Jest file (one throttler-storage instance per
 * file — see that file's own tally comment, and its comment on why it reuses one JWT across
 * tests instead of logging in per test wherever the test doesn't specifically need a fresh
 * one). That leaves room for at most 2 more (a 4th and a 5th call still fit under this limit
 * of 5) — a 6th would push the file's total to 6 and get throttled, and the failure would
 * read like a broken test, not like this constant being the reason. Add capacity by
 * restructuring that file's login calls, not by loosening brute-force protection to fit a
 * test suite.
 */
export const AUTH_RATE_LIMIT_DEFAULT = 5;

/**
 * Reads and validates the AUTH_RATE_LIMIT environment variable. Falls back to
 * `AUTH_RATE_LIMIT_DEFAULT` — never to "no limit" — whenever the raw value is unset, not a
 * finite number, not a whole number, or not strictly positive: a typo or an empty string in
 * this env var must never silently disable brute-force protection.
 *
 * Exported (rather than inlined below) so a unit test can exercise every input without going
 * through `process.env` and module-caching gymnastics — see rate-limit.constants.spec.ts.
 */
export function parseAuthRateLimit(
  raw: string | undefined,
  fallback: number = AUTH_RATE_LIMIT_DEFAULT,
): number {
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

/**
 * The value actually enforced: `AUTH_RATE_LIMIT_DEFAULT` (5/minute) unless the environment
 * overrides it via the `AUTH_RATE_LIMIT` env var (see .env.example for why that override
 * exists — the Playwright browser suite, and ONLY that suite, needs it).
 *
 * Read from `process.env` at module load time — this file is imported by app.module.ts and
 * the auth/invites controllers, whose `@Throttle(...)` decorators evaluate their arguments as
 * soon as the class is defined, i.e. at import time. Whatever loads this module (main.ts,
 * whose `loadBootEnv()` call runs before `AppModule` is imported; a test's env setup; a CI
 * workflow's `env:`) must set AUTH_RATE_LIMIT in process.env BEFORE this module is first
 * imported, or the override never takes effect for that process.
 */
export const AUTH_RATE_LIMIT = parseAuthRateLimit(process.env.AUTH_RATE_LIMIT);
