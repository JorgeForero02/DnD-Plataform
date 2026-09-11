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

// High #1 de la revisión final de `ficha/tanda-2-a-5` (branch-review-verdict.md): el cubo por
// usuario de UserOrIpThrottlerGuard NO debe aplicar en rutas sin `JwtAuthGuard` (login, registro,
// aceptar invitación), aunque el cliente mande un Bearer válido de OTRA cuenta. Si aplicara, un
// atacante con N cuentas propias tendría N cubos independientes de AUTH_RATE_LIMIT/min contra el
// login de su víctima, todos desde la misma IP — el límite estrecho de hallazgo 3 quedaría
// multiplicado por N.
//
// App propia (no comparte fichero con rate-limit.e2e-spec.ts) para que el cubo de
// `AuthController-login-<ip>` empiece limpio: ese fichero ya lo agota a propósito en su propia
// prueba, y ambos ficheros corren contra la misma IP real de supertest.
describe("El cubo de /auth/login es por IP incluso con un Bearer válido de otra cuenta (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(buildAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    }
    await app.close();
  });

  async function mintToken(label: string): Promise<string> {
    const users = app.get(UsersService);
    const jwt = app.get(JwtService);
    const email = `login-bucket-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@b.com`;
    createdEmails.push(email);
    const passwordHash = await argon2.hash("password123");
    const user = await users.create(email, passwordHash, "Login Bucket Fixture");
    return jwt.signAsync({ sub: user.id, email: user.email });
  }

  it(
    "un Bearer válido en /auth/login (ruta sin JwtAuthGuard) sigue contando por IP, no por " +
      "el usuario del token",
    async () => {
      const server = app.getHttpServer();
      const credentials = { email: "nobody@nowhere.invalid", password: "wrong-password" };
      const v1 = await mintToken("v1");
      const v2 = await mintToken("v2");

      // AUTH_RATE_LIMIT intentos contra /auth/login, cada uno con el Bearer de un usuario real
      // (v1) — agota el cubo de esta IP para esta ruta, sea cual sea la clave que use el guard.
      for (let attempt = 1; attempt <= AUTH_RATE_LIMIT; attempt++) {
        const res = await request(server)
          .post("/auth/login")
          .set("Authorization", `Bearer ${v1}`)
          .send(credentials);
        expect(res.status).toBe(401);
      }

      // Un intento más, mismo IP, mismo minuto, pero con el Bearer de OTRO usuario (v2). Si el
      // cubo fuera por usuario (el bug), v2 abre un cubo propio sin gastar y esto seguiría en
      // 401. El cubo correcto en esta ruta es por IP: debe dar 429.
      const throttled = await request(server)
        .post("/auth/login")
        .set("Authorization", `Bearer ${v2}`)
        .send(credentials);
      expect(throttled.status).toBe(429);
    },
    60000,
  );
});
