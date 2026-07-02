import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Auth (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const email = `test${Date.now()}@b.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
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
    const reg = await require("supertest")(server)
      .post("/auth/register")
      .send({ email, password: "password123", displayName: "Gandalf" });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeDefined();

    const login = await require("supertest")(server)
      .post("/auth/login")
      .send({ email, password: "password123" });
    expect(login.status).toBe(201);

    const me = await require("supertest")(server)
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
  });
});
