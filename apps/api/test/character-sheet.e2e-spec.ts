import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tareas 2A.6 y 2A.7 — la hoja persistida y los PG mutables, contra Postgres real.
//
// **Por qué esto no puede ser una unitaria.** Dos cosas concretas exigen la base real: que dos
// deltas de PG lanzados a la vez (`Promise.all`) aterricen los dos —el Prisma simulado no sabe
// bloquear una fila, así que una carrera ahí pasaría en verde aunque el `FOR UPDATE` desapareciera
// del servicio—, y que el filtro de autorización sobreviva al viaje completo HTTP → guardia →
// pipe → servicio → base con los códigos de estado reales.

describe("Hoja de personaje y PG (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-sh${Date.now()}@b.com`;
  const emailA = `pa-sh${Date.now()}@b.com`;
  const emailB = `pb-sh${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenA = "";
  let tokenB = "";
  let campaignId = "";
  let characterId = "";
  let maxHp = 0;

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
    tokenA = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailA, password: "password123", displayName: "A" })
    ).body.token;
    tokenB = (
      await request(s)
        .post("/auth/register")
        .send({ email: emailB, password: "password123", displayName: "B" })
    ).body.token;

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de la hoja" })
    ).body.id;

    for (const token of [tokenA, tokenB]) {
      const invite = (
        await request(s)
          .post(`/campaigns/${campaignId}/invites`)
          .set("Authorization", `Bearer ${tokenDM}`)
      ).body.token;
      await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${token}`);
    }

    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Thorin", level: 1, visibility: "PLAYERS" })
    ).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailA, emailB] } } });
    await app.close();
  });

  const sheetUrl = () => `/campaigns/${campaignId}/characters/${characterId}/sheet`;
  const hpUrl = () => `/campaigns/${campaignId}/characters/${characterId}/hp`;
  const deathSavesUrl = () => `/campaigns/${campaignId}/characters/${characterId}/death-saves`;

  it("sin raza ni clase la hoja no se puede derivar: sheet null y un motivo, no un 500", async () => {
    const res = await request(app.getHttpServer())
      .get(sheetUrl())
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.sheet).toBeNull();
    expect(typeof res.body.reason).toBe("string");
    expect(res.body.hp.max).toBeNull();
  });

  it("el dueño rellena la hoja con PATCH, y GET la deriva con maxHp y CA calculados", async () => {
    const s = app.getHttpServer();
    const patch = await request(s)
      .patch(sheetUrl())
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    expect(patch.status).toBe(200);
    expect(patch.body.sheet).not.toBeNull();

    const get = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenA}`);
    expect(get.status).toBe(200);
    expect(get.body.sheet).not.toBeNull();
    expect(get.body.hp.max).toBeGreaterThan(0);
    expect(get.body.character.str).toBe(15);
    maxHp = get.body.hp.max;
  });

  it("una clave de raza que el catálogo no reconoce es 400, no un 500", async () => {
    const res = await request(app.getHttpServer())
      .patch(sheetUrl())
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ race: { source: "SRD", key: "no-existe-esta-raza" } });
    expect(res.status).toBe(400);
  });

  it("un jugador que no es el dueño ni el DM no puede editar la hoja de otro (403)", async () => {
    const res = await request(app.getHttpServer())
      .patch(sheetUrl())
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ level: 5 });
    expect(res.status).toBe(403);
  });

  it("un jugador que no es el dueño ni el DM no puede tocar sus PG (403)", async () => {
    const res = await request(app.getHttpServer())
      .post(hpUrl())
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ delta: -1 });
    expect(res.status).toBe(403);
  });

  it("dos deltas de PG lanzados a la vez aterrizan los dos (−5 y −3)", async () => {
    const s = app.getHttpServer();
    const [r1, r2] = await Promise.all([
      request(s)
        .post(hpUrl())
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ delta: -5, reason: "Flecha" }),
      request(s)
        .post(hpUrl())
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ delta: -3, reason: "Mordisco" }),
    ]);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);

    const get = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenA}`);
    // Los dos deltas aterrizaron: no hay -5 XOR -3, están los dos.
    expect(get.body.hp.current).toBe(maxHp - 8);
    expect(get.body.hp.version).toBe(2);
  });

  it("un PATCH de PG absoluto exige ser DM (403 para el dueño)", async () => {
    const res = await request(app.getHttpServer())
      .patch(hpUrl())
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ expectedVersion: 2, currentHp: maxHp });
    expect(res.status).toBe(403);
  });

  it("un PATCH con expectedVersion viejo da 409 con el estado actual en el cuerpo", async () => {
    const res = await request(app.getHttpServer())
      .patch(hpUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ expectedVersion: 0, currentHp: maxHp });
    expect(res.status).toBe(409);
    expect(res.body.hp.version).toBe(2);
  });

  it("el DM corrige con la versión correcta, y deja al personaje a 0 PG", async () => {
    const s = app.getHttpServer();
    const antes = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
    const res = await request(s)
      .patch(hpUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ expectedVersion: antes.body.hp.version, currentHp: 0 });
    expect(res.status).toBe(200);
    expect(res.body.hp.current).toBe(0);
  });

  it("no se puede tirar salvación de muerte sin estar a 0 PG (400)", async () => {
    const s = app.getHttpServer();
    // Se cura a 1 antes de comprobarlo, para no depender del estado que dejó la prueba anterior.
    const actual = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
    await request(s)
      .patch(hpUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ expectedVersion: actual.body.hp.version, currentHp: 1 });

    const res = await request(s)
      .post(deathSavesUrl())
      .set("Authorization", `Bearer ${tokenA}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("a 0 PG, el servidor tira y escribe un DEATH_SAVE con uno de los cuatro resultados", async () => {
    const s = app.getHttpServer();
    const actual = await request(s).get(sheetUrl()).set("Authorization", `Bearer ${tokenDM}`);
    await request(s)
      .patch(hpUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ expectedVersion: actual.body.hp.version, currentHp: 0 });

    const res = await request(s)
      .post(deathSavesUrl())
      .set("Authorization", `Bearer ${tokenA}`)
      .send({});
    expect(res.status).toBe(201);
    expect(["alive", "dying", "stable", "dead"]).toContain(res.body.deathSaves.status);

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(log.body.events[0].type).toBe("DEATH_SAVE");
  });

  it("un jugador que no es miembro no puede leer la hoja (403), aunque adivine el identificador", async () => {
    const email = `x-sh${Date.now()}@b.com`;
    const token = (
      await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email, password: "password123", displayName: "X" })
    ).body.token;
    const res = await request(app.getHttpServer())
      .get(sheetUrl())
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    await prisma.user.deleteMany({ where: { email } });
  });
});
