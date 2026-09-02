import request from "supertest";
import { Test } from "@nestjs/testing";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { AppModule } from "../src/app.module";
import { AUTH_RATE_LIMIT } from "../src/common/rate-limit.constants";
import { buildAdapter } from "../src/configure-app";
import { PrismaService } from "../src/prisma/prisma.service";
import { UsersService } from "../src/users/users.service";

// Proves hallazgo 3 (rate limiting): remove the @Throttle override on AuthController.login
// (or the global ThrottlerGuard in AppModule) and the final assertion here fails — every
// attempt, including the (AUTH_RATE_LIMIT + 1)th, would come back 401, never 429.
//
// TRUST_PROXY is unset here (buildAdapter() defaults it to false) — every request in this file
// comes from supertest's own direct connection, with no X-Forwarded-For involved, so the
// throttler keys on the real socket address either way. The case where trustProxy matters —
// an attacker forging X-Forwarded-For to dodge this exact limit — is covered separately in
// trust-proxy.e2e-spec.ts.
//
// Shared budget: every test in this file runs against the same app instance, i.e. the same
// ThrottlerStorage, and NestJS's default ThrottlerGuard keys each counter on
// `${ControllerClass}-${handlerMethod}-${ip}` (see @nestjs/throttler's ThrottlerGuard.generateKey)
// — so login, register, password-change and invite-accept each get their OWN independent
// 5-per-minute bucket even though every request in this file comes from the same IP. The one
// place that budget could still collide is where one test's SETUP calls another test's
// throttled route (the password test used to call POST /auth/register to obtain a token) — so
// setup here creates users directly through UsersService + JwtService instead of going through
// the HTTP register endpoint, leaving /auth/register's bucket untouched for the register test
// below to spend on its own.
describe("Rate limiting (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let users: UsersService;
  let jwt: JwtService;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(buildAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    users = app.get(UsersService);
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    }
    await app.close();
  });

  // Creates a user straight through UsersService and mints a matching JWT straight through
  // JwtService — bypassing POST /auth/register entirely, so this setup never spends any of
  // that route's own rate-limit budget (see the file-level comment above).
  async function mintToken(label: string): Promise<string> {
    const email = `rate-limit-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@b.com`;
    createdEmails.push(email);
    const passwordHash = await argon2.hash("password123");
    const user = await users.create(email, passwordHash, "Rate Limit Fixture");
    return jwt.signAsync({ sub: user.id, email: user.email });
  }

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

  it(`throttles POST /auth/register with 429 once ${AUTH_RATE_LIMIT} attempts from the same IP are used up`, async () => {
    const server = app.getHttpServer();

    // Attempts 1..AUTH_RATE_LIMIT: a distinct email per attempt, so each is a genuine 201
    // (new user created) — not throttled while under the configured limit, and not rejected
    // for an unrelated reason (a duplicate email) either.
    for (let attempt = 1; attempt <= AUTH_RATE_LIMIT; attempt++) {
      const email = `rate-limit-register-${Date.now()}-${attempt}-${Math.floor(Math.random() * 1e6)}@b.com`;
      createdEmails.push(email);
      const res = await request(server)
        .post("/auth/register")
        .send({ email, password: "password123", displayName: "Rate Limit Register" });
      expect(res.status).toBe(201);
    }

    // Attempt AUTH_RATE_LIMIT + 1: a still-distinct, still-unused email — if this were rejected
    // it could only be the throttler, never a duplicate-email conflict — same IP, same window,
    // over the limit, so it comes back 429 before AuthService (and the database) ever runs.
    const overLimitEmail = `rate-limit-register-${Date.now()}-over-${Math.floor(Math.random() * 1e6)}@b.com`;
    const throttled = await request(server)
      .post("/auth/register")
      .send({ email: overLimitEmail, password: "password123", displayName: "Rate Limit Register" });
    expect(throttled.status).toBe(429);
  });

  it(
    `throttles PATCH /auth/password with 429 once ${AUTH_RATE_LIMIT} attempts from the same ` +
      "IP are used up (Important 4, fix round 1: argon2.verify + argon2.hash on every call " +
      "must not run under the loose default limit)",
    async () => {
      const server = app.getHttpServer();
      const token = await mintToken("password");

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

  it(
    `throttles POST /invites/:token/accept with 429 once ${AUTH_RATE_LIMIT} attempts from the ` +
      "same IP are used up (hallazgo 3: invite tokens are guessable at scale, so the accept " +
      "route needs the same strict limit as login/register/password)",
    async () => {
      const server = app.getHttpServer();
      const token = await mintToken("invites");
      const bogusInviteToken = "does-not-exist-invite-token";

      // Attempts 1..AUTH_RATE_LIMIT: a token that doesn't exist, so each is a normal 400
      // (InvitesService.accept's "Invalid or already-used invite") — not throttled while
      // under the configured limit.
      for (let attempt = 1; attempt <= AUTH_RATE_LIMIT; attempt++) {
        const res = await request(server)
          .post(`/invites/${bogusInviteToken}/accept`)
          .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(400);
      }

      // Attempt AUTH_RATE_LIMIT + 1: same invite token, same IP, same window, over the limit —
      // throttled before InvitesService ever runs, so it comes back 429 instead of the 400 an
      // unthrottled attempt would still get. That distinction — 429, not another 400 — is the
      // whole point: it proves the limiter fires before the route's own rejection, not that
      // every attempt merely fails for some reason or other.
      const throttled = await request(server)
        .post(`/invites/${bogusInviteToken}/accept`)
        .set("Authorization", `Bearer ${token}`);
      expect(throttled.status).toBe(429);
    },
  );
});
