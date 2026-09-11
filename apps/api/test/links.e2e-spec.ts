import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Entity links (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm${Date.now()}@b.com`;
  const emailPL = `pl${Date.now()}@b.com`;
  const emailOutsider = `out${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let tokenOutsider = "";
  let campaignId = "";
  let npcId = "";
  let pubLocId = "";
  let secretLocId = "";

  const mkEntity = (token: string, name: string, type: string, visibility: string) =>
    request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/entities`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type, name, visibility });

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
    const regPL = await request(s)
      .post("/auth/register")
      .send({ email: emailPL, password: "password123", displayName: "PL" });
    tokenPL = regPL.body.token;
    const regOutsider = await request(s)
      .post("/auth/register")
      .send({ email: emailOutsider, password: "password123", displayName: "OUT" });
    tokenOutsider = regOutsider.body.token;
    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "C" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
    npcId = (await mkEntity(tokenDM, "Strahd", "NPC", "PLAYERS")).body.id;
    pubLocId = (await mkEntity(tokenDM, "Village", "LOCATION", "PLAYERS")).body.id;
    secretLocId = (await mkEntity(tokenDM, "Secret Lair", "LOCATION", "DM_ONLY")).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL, emailOutsider] } } });
    await app.close();
  });

  it("DM links the NPC to both locations; self-link is rejected", async () => {
    const s = app.getHttpServer();
    const l1 = await request(s)
      .post(`/entities/${npcId}/links`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ toId: pubLocId, label: "lives in" });
    expect(l1.status).toBe(201);
    const l2 = await request(s)
      .post(`/entities/${npcId}/links`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ toId: secretLocId });
    expect(l2.status).toBe(201);
    const self = await request(s)
      .post(`/entities/${npcId}/links`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ toId: npcId });
    expect(self.status).toBe(400);
  });

  it("the same link twice is a 409, not a 500 (ficha P3 · enlace duplicado)", async () => {
    // El índice único `(fromId, toId, label)` ya rechazaba el duplicado; lo que faltaba era
    // traducir el choque de Prisma (P2002) a un conflicto legible en vez de dejarlo reventar.
    const s = app.getHttpServer();
    const repetido = await request(s)
      .post(`/entities/${npcId}/links`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ toId: pubLocId, label: "lives in" });
    expect(repetido.status).toBe(409);
    expect(repetido.body.message).toMatch(/ya existe/i);
  });

  it("DM sees both links, player sees only the public-target link", async () => {
    const s = app.getHttpServer();
    const dm = await request(s)
      .get(`/entities/${npcId}/links`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(dm.body.length).toBe(2);
    const pl = await request(s)
      .get(`/entities/${npcId}/links`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(pl.body.map((l: any) => l.to.id)).toEqual([pubLocId]); // secret lair hidden
  });

  // **Enlazar deja rastro en el registro, y hasta el 2026-09-04 no lo dejaba.** `LinksService`
  // creaba la fila y no escribia el suceso, asi que el motor de reglas —que sabe evaluar
  // `ENTITY_LINKED` desde que existe— no se disparaba nunca y enlazar era invisible en la
  // cronica. Se comprueba **leyendo el log por su endpoint**, no mirando que la llamada este
  // escrita en el codigo: es la diferencia entre demostrar y afirmar.
  it("linking writes ENTITY_LINKED, and the secret link stays out of the player log", async () => {
    const s = app.getHttpServer();
    const delDm = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(delDm.status).toBe(200);
    const enlacesDm = delDm.body.events.filter((e: any) => e.type === "ENTITY_LINKED");
    // Los dos enlaces del recorrido anterior: al lugar publico y al secreto.
    expect(enlacesDm.length).toBe(2);
    expect(enlacesDm.map((e: any) => e.payload.toId).sort()).toEqual(
      [pubLocId, secretLocId].sort(),
    );
    expect(enlacesDm.find((e: any) => e.payload.toId === pubLocId).payload.label).toBe("lives in");

    // **Y el jugador ve uno solo.** El enlace al escondite es `DM_ONLY` aunque el PNJ sea
    // `PLAYERS`: un enlace revela que dos cosas tienen que ver aunque no se pueda abrir ninguna,
    // asi que el suceso no hereda la visibilidad de un extremo.
    const delJugador = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const enlacesPl = delJugador.body.events.filter((e: any) => e.type === "ENTITY_LINKED");
    expect(enlacesPl.map((e: any) => e.payload.toId)).toEqual([pubLocId]);
  });

  // Task 22: el taller pedía los enlaces ficha a ficha (hasta 18 llamadas al abrir). Ahora hay
  // una sola ruta por campaña, filtrada por `canView` en LOS DOS extremos — la misma regla que
  // `listFor` ya aplica por ficha.
  describe("GET /campaigns/:campaignId/links", () => {
    it("DM sees every link of the campaign", async () => {
      const s = app.getHttpServer();
      const res = await request(s)
        .get(`/campaigns/${campaignId}/links`)
        .set("Authorization", `Bearer ${tokenDM}`);
      expect(res.status).toBe(200);
      // Los dos enlaces creados antes: NPC -> lugar público, NPC -> escondite secreto.
      expect(res.body.length).toBe(2);
      expect(res.body.map((l: any) => l.toId).sort()).toEqual([pubLocId, secretLocId].sort());
      const publico = res.body.find((l: any) => l.toId === pubLocId);
      expect(publico.from).toEqual({ id: npcId, name: "Strahd", type: "NPC" });
      expect(publico.to).toEqual({ id: pubLocId, name: "Village", type: "LOCATION" });
    });

    it("the player does not see the link whose DM_ONLY end they cannot view", async () => {
      const s = app.getHttpServer();
      const res = await request(s)
        .get(`/campaigns/${campaignId}/links`)
        .set("Authorization", `Bearer ${tokenPL}`);
      expect(res.status).toBe(200);
      expect(res.body.map((l: any) => l.toId)).toEqual([pubLocId]);
    });

    it("a non-member gets 403", async () => {
      const s = app.getHttpServer();
      const res = await request(s)
        .get(`/campaigns/${campaignId}/links`)
        .set("Authorization", `Bearer ${tokenOutsider}`);
      expect(res.status).toBe(403);
    });
  });
});
