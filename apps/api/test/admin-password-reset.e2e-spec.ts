import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Ficha D8 (2026-09-02), decisión D-CF-18: la contraseña olvidada la reinicia un administrador
// con una temporal. Sin servicio de correo: cinco amigos y el autor de administrador.
describe("Reinicio de contraseña por administrador (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const sufijo = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const emailAdmin = `admin${sufijo}@b.com`;
  const emailOlvidadizo = `olvido${sufijo}@b.com`;
  const emailCualquiera = `otro${sufijo}@b.com`;
  let tokenAdmin = "";
  let tokenOlvidadizo = "";
  let tokenCualquiera = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();
    const registrar = async (email: string, displayName: string) =>
      (
        await request(s)
          .post("/auth/register")
          .send({ email, password: "password123", displayName })
      ).body.token as string;
    tokenAdmin = await registrar(emailAdmin, "Admin");
    tokenOlvidadizo = await registrar(emailOlvidadizo, "Olvidadizo");
    tokenCualquiera = await registrar(emailCualquiera, "Otro");
    // `isAdmin` se concede a mano en la base (D-CF-7): igual aquí.
    await prisma.user.update({ where: { email: emailAdmin }, data: { isAdmin: true } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [emailAdmin, emailOlvidadizo, emailCualquiera] } },
    });
    await app.close();
  });

  it("quien no es administrador recibe 403 y no cambia nada", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .post("/admin/password-resets")
      .set("Authorization", `Bearer ${tokenCualquiera}`)
      .send({ email: emailOlvidadizo, temporaryPassword: "temporal-123" });
    expect(res.status).toBe(403);
    const login = await request(s)
      .post("/auth/login")
      .send({ email: emailOlvidadizo, password: "password123" });
    expect(login.status).toBe(201);
  });

  it("el administrador pone una temporal: la vieja deja de valer, la temporal entra, y el token anterior caduca", async () => {
    const s = app.getHttpServer();
    // El `iat` del JWT tiene precisión de segundos y el empate se trata como caduco: se espera
    // un segundo para que el token viejo sea estrictamente anterior al cambio.
    await new Promise((r) => setTimeout(r, 1100));
    const res = await request(s)
      .post("/admin/password-resets")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ email: emailOlvidadizo, temporaryPassword: "temporal-123" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const yo = await request(s).get("/auth/me").set("Authorization", `Bearer ${tokenOlvidadizo}`);
    expect(yo.status).toBe(401);
    const vieja = await request(s)
      .post("/auth/login")
      .send({ email: emailOlvidadizo, password: "password123" });
    expect(vieja.status).toBe(401);
    const temporal = await request(s)
      .post("/auth/login")
      .send({ email: emailOlvidadizo, password: "temporal-123" });
    expect(temporal.status).toBe(201);
  });

  it("un correo que no existe es 404 — el administrador sí puede saberlo", async () => {
    const res = await request(app.getHttpServer())
      .post("/admin/password-resets")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ email: `nadie${sufijo}@b.com`, temporaryPassword: "temporal-123" });
    expect(res.status).toBe(404);
  });

  // Revisión final de `ficha/tanda-2-a-5`, Low #10: reiniciarse la CONTRASEÑA PROPIA por esta
  // puerta era 200 y mataba la sesión del propio admin sin aviso (su `iat` queda
  // `<= passwordChangedAt` y la siguiente petición suya da 401) — el formulario que existe
  // para eso es `PATCH /auth/password`, que exige la contraseña actual.
  it("el administrador no puede reiniciarse su propia contraseña por esta puerta (400)", async () => {
    const s = app.getHttpServer();
    const res = await request(s)
      .post("/admin/password-resets")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ email: emailAdmin, temporaryPassword: "temporal-456" });
    expect(res.status).toBe(400);

    // Y de verdad no cambió nada: la sesión del admin sigue viva y la contraseña es la misma.
    const yo = await request(s).get("/auth/me").set("Authorization", `Bearer ${tokenAdmin}`);
    expect(yo.status).toBe(200);
    const sigueViva = await request(s)
      .post("/auth/login")
      .send({ email: emailAdmin, password: "password123" });
    expect(sigueViva.status).toBe(201);
  });

  it("GET /auth/me dice si soy administrador, para que la pantalla sepa qué ofrecer", async () => {
    const s = app.getHttpServer();
    const admin = await request(s).get("/auth/me").set("Authorization", `Bearer ${tokenAdmin}`);
    expect(admin.body.isAdmin).toBe(true);
    const otro = await request(s).get("/auth/me").set("Authorization", `Bearer ${tokenCualquiera}`);
    expect(otro.body.isAdmin).toBe(false);
  });
});
