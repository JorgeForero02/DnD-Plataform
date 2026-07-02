import * as Sentry from "@sentry/node";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

// No-op if SENTRY_DSN is unset (local/dev) — safe to always call.
Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.enableCors();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
}
bootstrap();
