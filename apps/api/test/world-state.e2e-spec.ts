import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// **Se importa `AppModule`, no una copia suya.** La primera version declaraba aqui un
// `TestAppModule` que reproducia su composicion, porque la tarea que escribio esta suite tenia
// prohibido tocar `app.module.ts`. Eso dejaba **dos copias del mismo hecho**, y dos copias
// derivan: el dia que la aplicacion real gane un guardia global, esta suite seguiria pasando sin
// el. Cableados ya los modulos, se usa el de verdad.

describe("Estado del mundo (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-ws${Date.now()}@b.com`;
  const emailPL = `pl-ws${Date.now()}@b.com`;
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
        .send({ name: "Campaña del mundo" })
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

  it("un jugador no puede poner una marca (403)", async () => {
    const res = await request(app.getHttpServer())
      .put(`/campaigns/${campaignId}/flags/puente-caido`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ key: "puente-caido", value: true });
    expect(res.status).toBe(403);
  });

  it("el DM pone una marca, escribe su FLAG_SET, y el jugador la lee en /flags", async () => {
    const s = app.getHttpServer();
    const puesta = await request(s)
      .put(`/campaigns/${campaignId}/flags/puente-caido`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ key: "puente-caido", value: true });
    expect(puesta.status).toBe(200);
    expect(puesta.body).toMatchObject({ key: "puente-caido", value: true });

    const lista = await request(s)
      .get(`/campaigns/${campaignId}/flags`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(lista.status).toBe(200);
    expect(lista.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "puente-caido", value: true })]),
    );

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(log.body.events.map((e: { type: string }) => e.type)).toContain("FLAG_SET");
  });

  it("poner la misma marca otra vez la sobrescribe, no la duplica", async () => {
    const s = app.getHttpServer();
    await request(s)
      .put(`/campaigns/${campaignId}/flags/puente-caido`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ key: "puente-caido", value: false });

    const lista = await request(s)
      .get(`/campaigns/${campaignId}/flags`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const marcas = lista.body.filter((f: { key: string }) => f.key === "puente-caido");
    expect(marcas).toHaveLength(1);
    expect(marcas[0].value).toBe(false);
  });

  it("un jugador no puede crear un conjunto (403)", async () => {
    const res = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/sets`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ key: "sabios", label: "Los que saben lo del posadero" });
    expect(res.status).toBe(403);
  });

  it("el DM crea un conjunto, y añadir dos veces el mismo miembro NO lo duplica", async () => {
    const s = app.getHttpServer();
    const creado = await request(s)
      .post(`/campaigns/${campaignId}/sets`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ key: "sabios", label: "Los que saben lo del posadero" });
    expect(creado.status).toBe(201);

    const primera = await request(s)
      .post(`/campaigns/${campaignId}/sets/sabios/members`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ memberType: "user", memberId: "p1" });
    expect(primera.status).toBe(201);

    // La misma llamada otra vez: ni duplica ni falla.
    const segunda = await request(s)
      .post(`/campaigns/${campaignId}/sets/sabios/members`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ memberType: "user", memberId: "p1" });
    expect(segunda.status).toBe(201);

    const lista = await request(s)
      .get(`/campaigns/${campaignId}/sets`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const conjunto = lista.body.find((set: { key: string }) => set.key === "sabios");
    expect(conjunto.members).toHaveLength(1);
  });

  it("quitar el miembro lo borra, y volver a quitarlo no falla", async () => {
    const s = app.getHttpServer();
    const primera = await request(s)
      .delete(`/campaigns/${campaignId}/sets/sabios/members/user/p1`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(primera.status).toBe(200);

    const segunda = await request(s)
      .delete(`/campaigns/${campaignId}/sets/sabios/members/user/p1`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(segunda.status).toBe(200);

    const lista = await request(s)
      .get(`/campaigns/${campaignId}/sets`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const conjunto = lista.body.find((set: { key: string }) => set.key === "sabios");
    expect(conjunto.members).toHaveLength(0);
  });

  it("un jugador no puede levantar una señal (403), y el DM sí — y es DM_ONLY en el log", async () => {
    const s = app.getHttpServer();
    const negado = await request(s)
      .post(`/campaigns/${campaignId}/signals`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ key: "trampa-descubierta" });
    expect(negado.status).toBe(403);

    const ok = await request(s)
      .post(`/campaigns/${campaignId}/signals`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ key: "trampa-descubierta", reason: "el pícaro tiró percepción" });
    expect(ok.status).toBe(201);

    const delJugador = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(delJugador.body.events.some((e: { type: string }) => e.type === "SIGNAL_RAISED")).toBe(
      false,
    );

    const delDM = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(delDM.body.events.some((e: { type: string }) => e.type === "SIGNAL_RAISED")).toBe(true);
  });
});
