import request from "supertest";
import { Test } from "@nestjs/testing";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "../src/app.module";
import { AUTH_RATE_LIMIT } from "../src/common/rate-limit.constants";
import { buildAdapter } from "../src/configure-app";

// Proves hallazgo 3 (rate limiting): remove the @Throttle override on AuthController.login
// (or the global ThrottlerGuard in AppModule) and the final assertion here fails — every
// attempt, including the (AUTH_RATE_LIMIT + 1)th, would come back 401, never 429.
//
// TRUST_PROXY is unset here (buildAdapter() defaults it to false) — every request in this file
// comes from supertest's own direct connection, with no X-Forwarded-For involved, so the
// throttler keys on the real socket address either way. The case where trustProxy matters —
// an attacker forging X-Forwarded-For to dodge this exact limit — is covered separately in
// trust-proxy.e2e-spec.ts.
describe("Rate limiting (e2e)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(buildAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it(`throttles POST /auth/login with 429 once ${AUTH_RATE_LIMIT} attempts from the same IP are used up`, async () => {
    const server = app.getHttpServer();
    const credentials = { email: "nobody@nowhere.invalid", password: "wrong-password" };

    // Attempts 1..AUTH_RATE_LIMIT: wrong credentials against a user that doesn't exist, so
    // each is a normal 401 — not throttled while under the configured limit.
    for (let attempt = 1; attempt <= AUTH_RATE_LIMIT; attempt++) {
      const res = await request(server).post("/auth/login").send(credentials);
      expect(res.status).toBe(401);
    }

    // Attempt AUTH_RATE_LIMIT + 1: same IP, same window, over the limit — throttled before
    // AuthService ever runs, so it stays 429 even though the credentials are unchanged.
    const throttled = await request(server).post("/auth/login").send(credentials);
    expect(throttled.status).toBe(429);
  });

  it(
    `throttles PATCH /auth/password with 429 once ${AUTH_RATE_LIMIT} attempts from the same ` +
      "IP are used up (Important 4, fix round 1: argon2.verify + argon2.hash on every call " +
      "must not run under the loose default limit)",
    async () => {
      const server = app.getHttpServer();
      const email = `rate-limit-password-${Date.now()}@b.com`;
      const reg = await request(server)
        .post("/auth/register")
        .send({ email, password: "password123", displayName: "Throttled" });
      const token = reg.body.token;

      // ThrottlerGuard is a global guard (APP_GUARD, app.module.ts) and runs before the
      // controller-local JwtAuthGuard, but the token is still valid and correct here — this
      // proves the *route* is throttled independent of whether individual attempts succeed or
      // fail, same shape as the login test above, using a wrong current password so nothing
      // actually changes.
      for (let attempt = 1; attempt <= AUTH_RATE_LIMIT; attempt++) {
        const res = await request(server)
          .patch("/auth/password")
          .set("Authorization", `Bearer ${token}`)
          .send({ currentPassword: "wrong-password", newPassword: "irrelevant-123" });
        expect(res.status).toBe(401);
      }

      const throttled = await request(server)
        .patch("/auth/password")
        .set("Authorization", `Bearer ${token}`)
        .send({ currentPassword: "wrong-password", newPassword: "irrelevant-123" });
      expect(throttled.status).toBe(429);
    },
  );
});
