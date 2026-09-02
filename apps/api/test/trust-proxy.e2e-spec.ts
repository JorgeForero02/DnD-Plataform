import request from "supertest";
import { Test } from "@nestjs/testing";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "../src/app.module";
import { AUTH_RATE_LIMIT } from "../src/common/rate-limit.constants";
import { buildAdapter } from "../src/configure-app";

// Proves Critical 1 from fix round 1: with TRUST_PROXY=1 (production's setting, one hop of
// trust for nginx), ThrottlerGuard must key on the RIGHTMOST X-Forwarded-For entry — the one
// nginx itself appended via proxy_add_x_forwarded_for (apps/web/nginx.conf) — and ignore
// whatever a client puts to the left of it, even though nginx never strips that forged part.
//
// If buildAdapter() went back to `trustProxy: true` ("trust every hop", the pre-fix bug),
// Fastify would read the LEFTMOST entry instead — the attacker-controlled one — and every
// request below would get a fresh throttler key, so the final 429 assertion would fail (every
// attempt would come back 401 instead, unlimited).
describe("trustProxy + X-Forwarded-For (e2e)", () => {
  let app: NestFastifyApplication;
  const ORIGINAL_TRUST_PROXY = process.env.TRUST_PROXY;

  beforeAll(async () => {
    process.env.TRUST_PROXY = "1";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(buildAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    // A restore, not a stringify: assigning `undefined` to a process.env key coerces it to
    // the literal string "undefined" instead of leaving the key unset.
    if (ORIGINAL_TRUST_PROXY === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = ORIGINAL_TRUST_PROXY;
    await app.close();
  });

  it(`still throttles after AUTH_RATE_LIMIT attempts even when the attacker sends a different X-Forwarded-For on every request`, async () => {
    const server = app.getHttpServer();
    const credentials = { email: "nobody@nowhere.invalid", password: "wrong-password" };
    // The rightmost entry stands in for the one nginx itself would append (the real,
    // unforgeable-by-the-client hop) — constant across every request. The leftmost entry is
    // what the attacker controls and rotates on every single call. Leftmost values used here
    // (10.0.0.1..10.0.0.5, then 10.0.0.999) are deliberately reused by the second test below —
    // see its comment for why.
    const realHopSeenByProxy = "203.0.113.7";

    for (let attempt = 1; attempt <= AUTH_RATE_LIMIT; attempt++) {
      const res = await request(server)
        .post("/auth/login")
        .set("X-Forwarded-For", `10.0.0.${attempt}, ${realHopSeenByProxy}`)
        .send(credentials);
      // Not throttled yet — proves this isn't just "every request 429s regardless of IP".
      expect(res.status).toBe(401);
    }

    const throttled = await request(server)
      .post("/auth/login")
      .set("X-Forwarded-For", `10.0.0.999, ${realHopSeenByProxy}`)
      .send(credentials);
    expect(throttled.status).toBe(429);
  });

  // Fix round 2, finding 2: the previous version of this test sent a single request with a
  // leftmost value ("10.0.0.1") that had only ONE prior hit, so it read as "not yet throttled"
  // under the correct rightmost-keyed mode AND under the pre-fix `trustProxy: true` (leftmost)
  // bug AND under `trustProxy: false` (single shared socket-IP bucket) — it didn't actually
  // distinguish any of the three, and the round-1 report oversold what it proved.
  //
  // This version does distinguish them, by construction:
  // - It reuses "10.0.0.1" — the exact leftmost value the test above already sent once — as
  //   the CONSTANT leftmost across every request here, and pairs it with a genuinely NEW
  //   rightmost ("198.51.100.42", never used above).
  // - Under the correct mode (key = rightmost, trustProxy: 1): "198.51.100.42" is a fresh,
  //   isolated bucket regardless of what leftmost value rides along with it — AUTH_RATE_LIMIT
  //   attempts get 401, the next one gets 429, exactly like the test above.
  // - Under the pre-fix bug (key = leftmost, trustProxy: true): "10.0.0.1" already carries ONE
  //   hit from the test above, so this test's own AUTH_RATE_LIMIT attempts would push that
  //   bucket past the limit one request EARLY — its own loop's last "still not throttled" (401)
  //   assertion would fail, since that request would actually come back 429.
  // - Under `trustProxy: false` (key = the one shared socket address, headers ignored
  //   entirely): the test above already spent all AUTH_RATE_LIMIT + 1 hits on that single
  //   bucket, so every request in THIS test — including the very first — would already be 429,
  //   failing the loop's first "not yet throttled" assertion.
  //
  // Only the correct, hop-count-keyed mode makes both tests in this file pass together.
  it("a genuinely different real (rightmost) hop, reusing an already-used (but not yet exhausted) leftmost, gets its own separate limit", async () => {
    const server = app.getHttpServer();
    const credentials = { email: "nobody@nowhere.invalid", password: "wrong-password" };
    const reusedLeftmost = "10.0.0.1"; // same value the test above sent once, as attempt 1
    const newRightmost = "198.51.100.42"; // never sent above

    for (let attempt = 1; attempt <= AUTH_RATE_LIMIT; attempt++) {
      const res = await request(server)
        .post("/auth/login")
        .set("X-Forwarded-For", `${reusedLeftmost}, ${newRightmost}`)
        .send(credentials);
      expect(res.status).toBe(401);
    }

    const throttled = await request(server)
      .post("/auth/login")
      .set("X-Forwarded-For", `${reusedLeftmost}, ${newRightmost}`)
      .send(credentials);
    expect(throttled.status).toBe(429);
  });
});
