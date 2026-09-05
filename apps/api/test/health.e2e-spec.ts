import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Ficha D3 — la API no tenía endpoint de salud, y el `healthcheck` de producción dependía de que
// `GET /` respondiera **404**: un 404 resuelve el `fetch` igual que un 200, así que el contenedor
// se declaraba sano con Postgres caído.
//
// **La prueba que importa es la segunda.** Un `/health` que solo devuelve `{ status: "ok" }` pasa
// siempre, y escribir eso es escribir un endpoint que nunca dice que no.

describe("GET /health (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("con la base viva responde 200 y dice que está sana", async () => {
    const r = await request(app.getHttpServer()).get("/health");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ status: "ok" });
  });

  it("**no lleva autenticación**: responde sin token", async () => {
    // Un comprobador de salud no puede tener credenciales. Se afirma explícitamente porque el
    // resto de la API sí las exige, y que este no las pida es una decisión, no un olvido.
    const r = await request(app.getHttpServer()).get("/health");
    expect(r.status).not.toBe(401);
  });

  it("**y no cuenta nada**: ni versión, ni conteos, ni el nombre de la base", async () => {
    // Información gratis para quien la pida, y quien la pide desde fuera no es el orquestador.
    const r = await request(app.getHttpServer()).get("/health");
    expect(Object.keys(r.body as object)).toEqual(["status"]);
    const json = JSON.stringify(r.body);
    expect(json).not.toMatch(/version|count|database|postgres|dnd/i);
  });

  it("**con la base caída responde 503**, no 200", async () => {
    // Esto es lo único que distingue un endpoint de salud de una constante. Se simula la caída
    // sobre la consulta que el controlador hace, que es la que de verdad toca la base.
    const espia = jest
      .spyOn(prisma, "$queryRaw")
      .mockRejectedValueOnce(new Error("no hay conexión"));

    const r = await request(app.getHttpServer()).get("/health");

    expect(r.status).toBe(503);
    // Y no cuenta por qué: el detalle va a los registros del servidor, no a la respuesta.
    expect(JSON.stringify(r.body)).not.toContain("no hay conexión");
    espia.mockRestore();
  });

  it("y se recupera solo cuando la base vuelve", async () => {
    const r = await request(app.getHttpServer()).get("/health");
    expect(r.status).toBe(200);
  });
});
