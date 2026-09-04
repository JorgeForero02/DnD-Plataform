import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2.5.1 contra Postgres real.
//
// **Lo que solo puede vivir aquí**: que `GameEvent.damageType` de verdad se guarda como columna
// consultable (y no solo dentro del `payload` Json) y que reducir un daño por resistencia es la
// cadena completa HTTP → guardia → pipe → servicio → base, sobre un PNJ del catálogo real, no
// sobre un mock. Las unitarias ya cubren la aritmética (`apply-damage-modifiers.spec.ts`) y el
// cableado con Prisma simulado (`character-sheet.service.spec.ts`); esto comprueba que lo que se
// escribió de verdad es lo que sale por el cable.

describe("Tipos de daño y resistencias que reducen (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-dmg${Date.now()}@b.com`;
  const emailPL = `pl-dmg${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const npcs = () => `/campaigns/${campaignId}/npcs`;
  const ficha = (id: string) => `/campaigns/${campaignId}/characters/${id}`;
  const eventos = () => `/campaigns/${campaignId}/events`;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();
    tokenDM = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailDM, password: "password123", displayName: "DM" })
    ).body.token;
    tokenPL = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailPL, password: "password123", displayName: "PL" })
    ).body.token;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", auth(tokenDM))
        .send({ name: "La cripta del tumulario" })
    ).body.id;
    const invite = (
      await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } }).catch(() => {});
    await app.close();
  });

  let tumularioId = "";

  it("el DM baja un tumulario, con sus 45 PG del libro", async () => {
    const r = await request(app.getHttpServer())
      .post(npcs())
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:wight" });
    expect(r.status).toBe(201);
    expect(r.body[0].currentHp).toBe(45);
    tumularioId = r.body[0].id;
  });

  it("un ataque de 25 de necrótico le reduce solo a la mitad, y la traza sale en la respuesta", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -25, damageType: "NECROTIC" });
    expect(r.status).toBe(201);
    // 25 de necrótico con resistencia: 12 de verdad, redondeado hacia abajo. 45 − 12 = 33.
    expect(r.body.hp.current).toBe(33);
    expect(r.body.damageTrace).toBeDefined();
    expect(r.body.damageTrace.total).toBe(12);
    expect(r.body.damageTrace.steps.length).toBeGreaterThanOrEqual(2);
  });

  it("un ataque de contundente no mágico se reduce igual, y la traza trae la nota que limita la regla", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -10, damageType: "BLUDGEONING" });
    expect(r.status).toBe(201);
    // 10 de contundente con resistencia: 5. 33 − 5 = 28.
    expect(r.body.hp.current).toBe(28);
    expect(r.body.damageTrace.total).toBe(5);
    // La nota que LIMITA la regla — el servidor la enseña, no la interpreta.
    expect(r.body.damageTrace.notes).toContain(
      "de ataques no mágicos con armas que no sean de plata",
    );
  });

  it("un tipo de daño sin resistencia (psíquico) no se reduce nada", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -8, damageType: "PSYCHIC" });
    expect(r.status).toBe(201);
    expect(r.body.hp.current).toBe(20);
  });

  it("un delta sin damageType no cambia de comportamiento: la reducción es reversible", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -10 });
    expect(r.status).toBe(201);
    expect(r.body.hp.current).toBe(10);
    expect(r.body.damageTrace).toBeUndefined();
  });

  it("¿de qué murió? — el registro guarda el damageType como columna, no solo dentro del payload", async () => {
    const r = await request(app.getHttpServer()).get(eventos()).set("Authorization", auth(tokenDM));
    expect(r.status).toBe(200);
    const necrotico = r.body.events.find(
      (e: { subjectId: string; damageType: string | null }) =>
        e.subjectId === tumularioId && e.damageType === "NECROTIC",
    );
    expect(necrotico).toBeDefined();
    expect(necrotico.payload.damageType).toBe("NECROTIC");

    // Y la consulta que "¿de qué murió Elara?" pide de verdad: filtrar por columna, no leer todo
    // el Json entero. Prueba directa contra la base, con el mismo criterio que el resto de la
    // fase usa para las restricciones que Postgres puede garantizar.
    const porColumna = await prisma.gameEvent.findMany({
      where: { subjectId: tumularioId, damageType: "NECROTIC" },
    });
    expect(porColumna.length).toBeGreaterThanOrEqual(1);
  });

  it("un jugador que no es dueño ni DM no puede aplicar daño a este PNJ", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenPL))
      .send({ delta: -5, damageType: "FIRE" });
    expect(r.status).toBe(403);
  });

  it("un damageType fuera de la lista cerrada del SRD es 400, no 500", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -5, damageType: "HOLY" });
    expect(r.status).toBe(400);
  });
});
