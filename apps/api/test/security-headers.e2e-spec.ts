import request from "supertest";
import { Test } from "@nestjs/testing";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "../src/app.module";
import { buildAdapter, configureApp } from "../src/configure-app";
import { PrismaService } from "../src/prisma/prisma.service";

// Proves hallazgo 4 (security headers) and hallazgo 5 (CORS), and closes the gap Important 1
// flagged: main.ts's boot path — adapter options, helmet policy, CORS allow-list parsing — used
// to be completely untested, because the e2e suites build AppModule directly via
// Test.createTestingModule, bypassing main.ts's bootstrap() entirely. This spec builds the app
// through the exact same buildAdapter() + configureApp() that bootstrap() calls, so it exercises
// the real production configuration, not a hand-rolled stand-in.
describe("Security headers + CORS (e2e)", () => {
  let app: NestFastifyApplication;
  const ORIGINAL_CORS_ORIGIN = process.env.CORS_ORIGIN;

  beforeAll(async () => {
    // Forced unset, not assumed: configureApp() reads process.env.CORS_ORIGIN at call time, so
    // this test would fail for anyone who happens to have that variable exported in their
    // shell (or a stray apps/api/.env entry) rather than actually testing the unset case.
    delete process.env.CORS_ORIGIN;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(buildAdapter());
    await configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    // A restore, not a stringify: assigning `undefined` to a process.env key coerces it to
    // the literal string "undefined" instead of leaving the key unset.
    if (ORIGINAL_CORS_ORIGIN === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = ORIGINAL_CORS_ORIGIN;
    await app.close();
  });

  it("ships helmet's headers on every response, including a 401", async () => {
    const server = app.getHttpServer();
    // GET /auth/me with no token: 401 is fine and expected — headers are set by the fastify
    // plugin before the route handler (or its guard) ever runs.
    const res = await request(server).get("/auth/me");
    expect(res.status).toBe(401);

    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBeDefined();
    // Deliberately disabled (see configure-app.ts's comment) — pinning that choice so a
    // future helmet upgrade or config change can't silently turn it back on unnoticed.
    expect(res.headers["content-security-policy"]).toBeUndefined();
  });

  it("does not send CORS headers when CORS_ORIGIN is unset", async () => {
    const server = app.getHttpServer();
    const res = await request(server).get("/auth/me").set("Origin", "https://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  // Ola de arreglos de 3A.2 (fix round 5) — `@fastify/compress` en `configureApp`: un cuerpo
  // > 1 KB vuelve comprimido SOLO si el cliente lo pide; sin `Accept-Encoding` (supertest, y por
  // tanto el resto de e2e de la API) vuelve tal cual. `/catalog` es la respuesta grande más a
  // mano (clases, razas y objetos del SRD, muy por encima de 1 KB).
  describe("compresión de respuestas (> 1 KB, si el cliente la pide)", () => {
    const email = `gzip${Date.now()}@b.com`;
    let token = "";

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email, password: "password123", displayName: "Gzip" });
      token = res.body.token;
    });

    afterAll(async () => {
      await app.get(PrismaService).user.deleteMany({ where: { email } });
    });

    it("con Accept-Encoding: gzip, /catalog vuelve con content-encoding: gzip y el JSON se lee igual", async () => {
      const res = await request(app.getHttpServer())
        .get("/catalog")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept-Encoding", "gzip");
      expect(res.status).toBe(200);
      expect(res.headers["content-encoding"]).toBe("gzip");
      // supertest descomprime por su cuenta: el cuerpo sigue siendo el JSON del catálogo.
      expect(res.body).toEqual(expect.objectContaining({ classes: expect.any(Array) }));
    });

    it("sin Accept-Encoding, /catalog vuelve sin comprimir (los e2e de la API no cambian)", async () => {
      const res = await request(app.getHttpServer())
        .get("/catalog")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept-Encoding", "identity");
      expect(res.status).toBe(200);
      expect(res.headers["content-encoding"]).toBeUndefined();
      expect(Number(res.headers["content-length"])).toBeGreaterThan(1024);
    });

    it("un cuerpo pequeño (< 1 KB) no se comprime aunque se pida", async () => {
      const res = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept-Encoding", "gzip");
      expect(res.status).toBe(200);
      expect(res.headers["content-encoding"]).toBeUndefined();
    });
  });
});
