import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 1 del plan de 2026-09-05 («iniciativa y bando»), contra Postgres real.
//
// Lo que hace falta demostrar aquí no lo puede probar una unitaria (docs/04-convenciones.md): que
// el índice único parcial `encounter_one_active_per_session` sigue impidiendo dos encuentros sin
// terminar en la misma sesión ahora que `PREPARING` es un estado más, no solo `ACTIVE`. Antes de
// esta tarea el `WHERE` del índice solo miraba `ACTIVE`, así que un `PREPARING` y un `ACTIVE`
// convivían sin que nada lo impidiera — el lío que el índice existe para evitar.

describe("Encounter en PREPARING y el índice recontado (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const email = `dm-prep${Date.now()}@b.com`;
  let token = "";
  let campaignId = "";
  let sessionId = "";

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();

    token = (
      await request(s)
        .post("/auth/register")
        .send({ email, password: "password123", displayName: "DM" })
    ).body.token;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Campaña de la iniciativa" })
    ).body.id;
    sessionId = (
      await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Sesión de la iniciativa", visibility: "PLAYERS" })
    ).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("no deja dos encuentros sin terminar en la misma sesión, ni siquiera preparándose", async () => {
    const primero = await prisma.encounter.create({
      data: { sessionId, status: "PREPARING", round: 1, activePosition: 0 },
    });
    expect(primero.status).toBe("PREPARING");

    // El brief pedía comprobar el mensaje contra `/encounter_one_active_per_session/`, pero el
    // motor de Prisma 5.x no expone el nombre de la restricción en el mensaje de un P2002 sobre un
    // índice creado a mano por SQL: solo el código y la columna. Eso sí lo expone de verdad —
    // comprobado aquí mismo con un script contra la base real antes de escribir esta línea—, así
    // que se afirma lo que Prisma SÍ da en vez de un `toThrow()` a secas que aceptaría cualquier
    // error por el motivo que sea. Mismo patrón que `encounters.e2e-spec.ts` usa para este mismo
    // índice (línea 242).
    await expect(
      prisma.encounter.create({
        data: { sessionId, status: "ACTIVE", round: 1, activePosition: 0 },
      }),
    ).rejects.toMatchObject({
      code: "P2002",
      meta: { target: ["sessionId"] },
    });

    await prisma.encounter.delete({ where: { id: primero.id } });
  });
});
