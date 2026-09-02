import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2A.9 — la subida de nivel, contra Postgres real.
//
// **Por qué esto no puede ser solo una unitaria.** Las unitarias (`src/level-up`) prueban el
// cálculo con Prisma simulado; esto prueba que el endpoint real, con el `Character` real de la
// base, sube el nivel y escribe el evento en la misma transacción — y que el máximo de PG que
// enseña la hoja después es exactamente el que el previo anunció antes, mismo patrón que
// `game-state.e2e-spec.ts`.

describe("Subida de nivel (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-lu${Date.now()}@b.com`;
  const emailPL = `pl-lu${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";

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
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de subida de nivel" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  /** Un guerrero de nivel 1, con la hoja completa, dueño del propio jugador. */
  const crearPersonaje = async () => {
    const s = app.getHttpServer();
    const characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Personaje de subida" })
    ).body.id as string;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        level: 1,
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    return characterId;
  };

  it("subir de nivel 1 a 2 escribe LEVEL_CHANGED y los PG máximos de la hoja suben en la cantidad prevista", async () => {
    const s = app.getHttpServer();
    const characterId = await crearPersonaje();

    const antes = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(antes.status).toBe(200);
    const maxHpAntes = antes.body.hp.max as number;

    const previo = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/level-up/preview`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(previo.status).toBe(200);
    expect(previo.body.from).toBe(1);
    expect(previo.body.to).toBe(2);
    const deltaAnunciado = previo.body.hp.delta as number;

    const subida = await request(s)
      .post(`/campaigns/${campaignId}/characters/${characterId}/level-up`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(subida.status).toBe(201);
    expect(subida.body.level).toBe(2);

    const despues = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(despues.body.character.level).toBe(2);
    expect(despues.body.hp.max).toBe(maxHpAntes + deltaAnunciado);

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const evento = log.body.events.find(
      (e: { type: string; subjectId: string }) =>
        e.type === "LEVEL_CHANGED" && e.subjectId === characterId,
    );
    expect(evento).toBeTruthy();
    expect(evento.payload).toEqual({ type: "LEVEL_CHANGED", from: 1, to: 2 });
  });

  it("el previo llamado dos veces da lo mismo y no cambia nada", async () => {
    const s = app.getHttpServer();
    const characterId = await crearPersonaje();

    const primero = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/level-up/preview`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const segundo = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/level-up/preview`)
      .set("Authorization", `Bearer ${tokenPL}`);

    expect(segundo.body).toEqual(primero.body);

    const sheet = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(sheet.body.character.level).toBe(1);
  });

  it("un jugador ajeno recibe 403, tanto en el previo como al aplicar", async () => {
    const s = app.getHttpServer();
    const characterId = await crearPersonaje();
    const emailOtro = `otro-lu${Date.now()}@b.com`;
    const tokenOtro = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailOtro, password: "password123", displayName: "Otro" })
    ).body.token;
    // Miembro de la campaña, pero ni dueño ni DM del personaje.
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenOtro}`);

    const previo = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/level-up/preview`)
      .set("Authorization", `Bearer ${tokenOtro}`);
    expect(previo.status).toBe(403);

    const aplicar = await request(s)
      .post(`/campaigns/${campaignId}/characters/${characterId}/level-up`)
      .set("Authorization", `Bearer ${tokenOtro}`);
    expect(aplicar.status).toBe(403);

    await prisma.user.deleteMany({ where: { email: emailOtro } });
  });

  it("el nivel 20 es el techo: subir se rechaza con 400", async () => {
    const s = app.getHttpServer();
    const characterId = await crearPersonaje();
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ level: 20 });

    const previo = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/level-up/preview`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(previo.status).toBe(400);

    const aplicar = await request(s)
      .post(`/campaigns/${campaignId}/characters/${characterId}/level-up`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(aplicar.status).toBe(400);

    const sheet = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(sheet.body.character.level).toBe(20);
  });
});
