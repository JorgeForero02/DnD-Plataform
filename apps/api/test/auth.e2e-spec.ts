import request from "supertest";
import { Test } from "@nestjs/testing";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { buildAdapter } from "../src/configure-app";

describe("Auth (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const email = `test${Date.now()}@b.com`;
  // Reused where the test doesn't specifically need a fresh one: /auth/login is rate-limited
  // (hallazgo 3, see rate-limit.e2e-spec.ts — AUTH_RATE_LIMIT is 5/minute, and this file makes
  // only 3 real /auth/login calls total, see the tally at the bottom of this file). A JWT does
  // NOT stay valid across a password change any more (jwt.strategy.ts rejects any token whose
  // `iat` predates the user's passwordChangedAt) — that invalidation is itself asserted below,
  // not just assumed.
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(buildAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("registers, logs in, and reads /auth/me", async () => {
    const server = app.getHttpServer();
    const reg = await request(server)
      .post("/auth/register")
      .send({ email, password: "password123", displayName: "Gandalf" });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeDefined();

    const login = await request(server)
      .post("/auth/login")
      .send({ email, password: "password123" }); // login call 1/3
    expect(login.status).toBe(201);
    token = login.body.token;

    const me = await request(server).get("/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body).toEqual({ id: expect.any(String), email, displayName: "Gandalf" });
  });

  it("rejects /auth/me with no token", async () => {
    const server = app.getHttpServer();
    const res = await request(server).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("changes the display name of the authenticated user, taken from the JWT", async () => {
    const server = app.getHttpServer();
    const patch = await request(server)
      .patch("/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "Gandalf the White" });
    expect(patch.status).toBe(200);
    expect(patch.body).toEqual({ id: expect.any(String), email, displayName: "Gandalf the White" });

    const me = await request(server).get("/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.body.displayName).toBe("Gandalf the White");
  });

  it("rejects PATCH /auth/me with no token", async () => {
    const res = await request(app.getHttpServer())
      .patch("/auth/me")
      .send({ displayName: "Nobody" });
    expect(res.status).toBe(401);
  });

  it("rejects a password change with the wrong current password, and leaves it (and the token) unchanged", async () => {
    const server = app.getHttpServer();
    const change = await request(server)
      .patch("/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "totally-wrong", newPassword: "irrelevant-123" });
    expect(change.status).toBe(401);

    // A failed attempt must not stamp passwordChangedAt: the pre-existing token is still good.
    const me = await request(server).get("/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
  });

  it(
    "changes the password when the current password is correct, invalidates the token that " +
      "was issued before the change, rejects the old password, and accepts a fresh login with " +
      "the new one",
    async () => {
      const server = app.getHttpServer();
      const change = await request(server)
        .patch("/auth/password")
        .set("Authorization", `Bearer ${token}`)
        .send({ currentPassword: "password123", newPassword: "new-password-456" });
      expect(change.status).toBe(200);
      expect(change.body).toEqual({ success: true });
      // Never returns the password or its hash.
      expect(JSON.stringify(change.body)).not.toMatch(/password|hash/i);

      // Important 3 (fix round 1): the token issued before this change must now be rejected —
      // "changing your password logs you out everywhere". This is the acceptance test for
      // that finding; removing the passwordChangedAt check in jwt.strategy.ts turns this into
      // a 200.
      const staleTokenRes = await request(server)
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(staleTokenRes.status).toBe(401);

      const oldLogin = await request(server)
        .post("/auth/login")
        .send({ email, password: "password123" }); // login call 2/3
      expect(oldLogin.status).toBe(401);

      // JWT `iat` has second-granularity, and jwt.strategy.ts treats a token minted in the
      // exact same wall-clock second as the password change as stale too (see that file's
      // comment on why the tie goes to "reject"). This wait guarantees the next login's `iat`
      // lands in a later, distinct second — not asserting on a timing threshold, just avoiding
      // a coin-flip on which second two back-to-back requests happen to land in.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const newLogin = await request(server)
        .post("/auth/login")
        .send({ email, password: "new-password-456" }); // login call 3/3
      expect(newLogin.status).toBe(201);
      const freshToken = newLogin.body.token;

      const me = await request(server).get("/auth/me").set("Authorization", `Bearer ${freshToken}`);
      expect(me.status).toBe(200);
      expect(me.body.displayName).toBe("Gandalf the White");

      // Restore the original password so a re-run of this suite (or a human) isn't left with
      // a surprise. Uses the fresh token — the pre-change `token` variable is spent for good.
      const restore = await request(server)
        .patch("/auth/password")
        .set("Authorization", `Bearer ${freshToken}`)
        .send({ currentPassword: "new-password-456", newPassword: "password123" });
      expect(restore.status).toBe(200);
    },
    10_000, // the 1.1s wait above pushes this past Jest's default 5s test timeout
  );

  it("rejects PATCH /auth/password with no token", async () => {
    const res = await request(app.getHttpServer())
      .patch("/auth/password")
      .send({ currentPassword: "x", newPassword: "irrelevant-123" });
    expect(res.status).toBe(401);
  });

  // Tally of real POST /auth/login calls in this file (AUTH_RATE_LIMIT is 5/minute, see
  // common/rate-limit.constants.ts): 3 total — 1 in the first test, 2 (one rejected, one
  // accepted) in the password-invalidation test above. That leaves room for up to 2 more
  // (a 4th and a 5th call still fit); a 6th would push the total to 6 and get throttled —
  // see that constant's own comment before adding one, rather than restructuring this file.
});
