import { loadBootEnv, buildAdapter, configureApp } from "./configure-app";

// Loads apps/api/.env into process.env BEFORE anything else runs — including buildAdapter()
// below, which is evaluated as an argument to NestFactory.create() and therefore executes
// before ConfigModule.forRoot() (app.module.ts) ever gets a chance to load the file. That is
// the same hazard auth.module.ts already documents for JWT_SECRET (registerAsync, not
// register), applied here to TRUST_PROXY: without this call, setting TRUST_PROXY in .env was
// silently ignored, buildAdapter() fell back to its "trust nothing" default, and behind nginx
// that means every request keys the rate limiter on nginx's own socket IP — the whole internet
// sharing one bucket, turning the limit added for hallazgo 3 into a denial-of-service lever
// against every user, not a per-attacker throttle.
//
// loadBootEnv() never overwrites a key already present in process.env (e.g. one exported by
// the shell, or by CI), and ConfigModule.forRoot() likewise skips keys already set — so calling
// this first changes nothing about precedence, only when a boot-time read (buildAdapter()'s
// TRUST_PROXY today, anything similar tomorrow) sees the same environment a DI-time read does.
// buildAdapter() (configure-app.ts) also calls loadBootEnv() itself, as its own first
// statement — so this setting cannot silently regress even if this call here is ever removed
// or reordered; this call stays so anything else added to bootstrap() later, before
// buildAdapter() runs, gets the same environment too.
loadBootEnv();

import * as Sentry from "@sentry/node";
import { NestFactory } from "@nestjs/core";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

// No-op if SENTRY_DSN is unset (local/dev) — safe to always call.
Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, buildAdapter());
  await configureApp(app);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
}
bootstrap().catch((error: Error) => {
  // No logger is available before the app boots — print the actionable message
  // (e.g. requireJwtSecret's) instead of a raw unhandled-rejection stack trace.
  console.error(error.message);
  process.exit(1);
});
