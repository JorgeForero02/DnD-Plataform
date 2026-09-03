import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2C.3 contra Postgres real.
//
// Lo unitario ya comprueba las cuentas con un Prisma simulado. Esto comprueba lo que aquel no
// puede: que el reloj **es una columna que de verdad sube**, que el descanso lo lee y que las dos
// reglas del SRD que necesitan tiempo de juego se cumplen de punta a punta.

describe("El reloj de la campaña (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-clock${Date.now()}@b.com`;
  const emailPL = `pl-clock${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let characterId = "";

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
        .send({ name: "Campaña del reloj" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
    characterId = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Brann", level: 1 })
    ).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("una campaña nueva empieza con el reloj a cero", async () => {
    const r = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/clock`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ seconds: 0 });
  });

  it("**un jugador no puede adelantar el reloj** (403), aunque sí mirarlo", async () => {
    const s = app.getHttpServer();
    const prohibido = await request(s)
      .post(`/campaigns/${campaignId}/clock/advance`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ kind: "TIME", seconds: 3600 });
    expect(prohibido.status).toBe(403);

    const sigueAcero = await request(s)
      .get(`/campaigns/${campaignId}/clock`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(sigueAcero.body.seconds).toBe(0);
  });

  it("el DM avanza una hora, y **la columna sube de verdad**", async () => {
    const s = app.getHttpServer();
    const r = await request(s)
      .post(`/campaigns/${campaignId}/clock/advance`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ kind: "TIME", seconds: 3600, reason: "Cae la noche" });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ from: 0, to: 3600, seconds: 3600 });

    const leido = await request(s)
      .get(`/campaigns/${campaignId}/clock`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(leido.body.seconds).toBe(3600);
  });

  it("y deja rastro en la línea de tiempo **que el jugador también ve**", async () => {
    const log = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const suceso = log.body.events.find((e: { type: string }) => e.type === "CLOCK_ADVANCED");
    expect(suceso).toBeDefined();
    expect(suceso.payload).toMatchObject({ from: 0, to: 3600, reason: "Cae la noche" });
  });

  it("viajar diez horas a paso normal da 30 millas y **pide dos salvaciones de marcha forzada**", async () => {
    const r = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/clock/advance`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ kind: "TRAVEL", pace: "NORMAL", hours: 10 });
    expect(r.status).toBe(201);
    expect(r.body.miles).toBe(30);
    expect(r.body.seconds).toBe(36_000);
    expect(r.body.forcedMarchSaves).toEqual([
      { hora: 9, dc: 11 },
      { hora: 10, dc: 12 },
    ]);
  });

  it("un cuerpo que no valida es 400: un viaje sin ritmo no existe", async () => {
    const r = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/clock/advance`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ kind: "TRAVEL", hours: 3 });
    expect(r.status).toBe(400);
  });

  describe("las reglas del descanso que el reloj hace comprobables", () => {
    it("el primer descanso largo entra", async () => {
      const r = await request(app.getHttpServer())
        .post(`/campaigns/${campaignId}/characters/${characterId}/rest`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ kind: "LONG" });
      expect(r.status).toBe(201);
    });

    it("**el segundo en menos de 24 horas de juego se rechaza con un 409 que dice cuánto falta**", async () => {
      const s = app.getHttpServer();
      // Han pasado unas horas, pero no un día.
      await request(s)
        .post(`/campaigns/${campaignId}/clock/advance`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ kind: "TIME", seconds: 3600 * 5 });

      const r = await request(s)
        .post(`/campaigns/${campaignId}/characters/${characterId}/rest`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ kind: "LONG" });
      expect(r.status).toBe(409);
      expect(r.body.message).toMatch(/24 horas de juego/i);
    });

    it("un descanso **corto** no lo impide: el límite es del largo", async () => {
      const r = await request(app.getHttpServer())
        .post(`/campaigns/${campaignId}/characters/${characterId}/rest`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ kind: "SHORT" });
      expect(r.status).toBe(201);
    });

    it("pasado un día entero de juego, vuelve a entrar", async () => {
      const s = app.getHttpServer();
      await request(s)
        .post(`/campaigns/${campaignId}/clock/advance`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ kind: "TIME", seconds: 86_400 });

      const r = await request(s)
        .post(`/campaigns/${campaignId}/characters/${characterId}/rest`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ kind: "LONG" });
      expect(r.status).toBe(201);
    });

    it("**a 0 puntos de golpe no se descansa largo** (400)", async () => {
      const s = app.getHttpServer();
      await prisma.character.update({ where: { id: characterId }, data: { currentHp: 0 } });
      // Y que no sea el límite de 24 horas el que lo rechaza: se avanza un día largo antes.
      await request(s)
        .post(`/campaigns/${campaignId}/clock/advance`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ kind: "TIME", seconds: 86_400 * 2 });

      const r = await request(s)
        .post(`/campaigns/${campaignId}/characters/${characterId}/rest`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ kind: "LONG" });
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/al menos 1 punto de golpe/i);
    });

    it("**un descanso interrumpido no cura ni repone**, y así queda escrito", async () => {
      const s = app.getHttpServer();
      await prisma.character.update({ where: { id: characterId }, data: { currentHp: 3 } });

      const r = await request(s)
        .post(`/campaigns/${campaignId}/characters/${characterId}/rest`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ kind: "LONG", interrupted: true });
      expect(r.status).toBe(201);

      // Los PG siguen donde estaban: un descanso largo sin interrumpir los habría puesto a `null`,
      // que es la convención de «a máximos».
      const fila = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
      expect(fila.currentHp).toBe(3);

      const log = await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenDM}`);
      const suceso = log.body.events.find(
        (e: { type: string; payload: { interrupted?: boolean } }) =>
          e.type === "REST_DECLARED" && e.payload.interrupted,
      );
      expect(suceso).toBeDefined();
    });
  });
});
