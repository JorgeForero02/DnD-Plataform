import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Plan 08, ficha I8 — **el camino entero de la inspiración, contra Postgres.**
//
// SRD 5.1: *«If you have inspiration, you can expend it when you make an attack roll, saving
// throw, or ability check. Spending your inspiration gives you advantage on that roll.»*
//
// Lo unitario ya comprueba las reglas con mocks. Esto comprueba lo que ningún mock puede: que la
// fila **se siembra al crear el personaje**, que el candado del `DM_ONLY` es del servidor y no del
// navegador, y que gastar y tirar caen **en la misma transacción** — o sea, que después de un 409
// no quedó ni tirada ni gasto.
//
// **No hay booleano `Character.inspired`, y es deliberado.** La inspiración vive en
// `CharacterResource` con `max: 1`, que es la misma tabla que `schema.prisma` ya nombraba como
// «recursos consumibles: inspiracion, furia, ki…» desde 2A.8. Una columna nueva habría sido una
// segunda verdad sobre el mismo hecho.

describe("Inspiración (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-insp${Date.now()}@b.com`;
  const emailPL = `pl-insp${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let suyo = "";
  let elOtro = "";

  const CLAVE = "inspiration";
  const inspiracionDe = async (characterId: string, token: string) => {
    const r = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/characters/${characterId}/resources`)
      .set("Authorization", `Bearer ${token}`);
    return (r.body as { key: string; current: number; max: number }[]).find((x) => x.key === CLAVE);
  };

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
        .send({ name: "Campaña de inspiración" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
    suyo = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Brann", level: 1 })
    ).body.id;
    elOtro = (
      await request(s)
        .post(`/campaigns/${campaignId}/characters`)
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Sirella", level: 1 })
    ).body.id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } });
    await app.close();
  });

  it("**se siembra al crear el personaje**: a cero, con tope 1", async () => {
    // Sin la fila, «no la tienes» y «este personaje no sabe qué es la inspiración» se verían
    // igual, y el DM no tendría nada que conceder.
    const fila = await inspiracionDe(suyo, tokenPL);
    expect(fila).toMatchObject({ current: 0, max: 1 });
  });

  it("**el jugador NO se la puede dar a sí mismo**: reponer un DM_ONLY es 403", async () => {
    // La regla del SRD es que la concede el DM por interpretar bien. Hasta el plan 08 el candado
    // vivía solo en `upsert`, así que el «+1» de la propia hoja se la habría regalado.
    const r = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/characters/${suyo}/resources/${CLAVE}/restore`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ amount: 1 });
    expect(r.status).toBe(403);
    expect((await inspiracionDe(suyo, tokenPL))?.current).toBe(0);
  });

  it("gastar la que no se tiene es **409**, y no se tira ni se escribe nada", async () => {
    const s = app.getHttpServer();
    const eventos = async () =>
      (
        await request(s)
          .get(`/campaigns/${campaignId}/events`)
          .set("Authorization", `Bearer ${tokenDM}`)
      ).body.events.length;
    const antes = await eventos();

    const r = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        expression: "1d20+3",
        label: "Percepción",
        audience: "PUBLIC",
        characterId: suyo,
        spendInspiration: true,
      });
    expect(r.status).toBe(409);

    // **Ni tirada ni gasto.** Es lo que la transacción compartida garantiza y ningún mock ve.
    expect(await eventos()).toBe(antes);
  });

  it("el DM la concede, y **dos concesiones seguidas dejan UNA**", async () => {
    const s = app.getHttpServer();
    for (let i = 0; i < 2; i += 1) {
      const r = await request(s)
        .post(`/campaigns/${campaignId}/characters/${suyo}/resources/${CLAVE}/restore`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ amount: 1 });
      expect(r.status).toBe(201);
    }
    // SRD: la tienes o no la tienes. El tope de 1 es esa regla escrita donde se cumple.
    expect((await inspiracionDe(suyo, tokenPL))?.current).toBe(1);
  });

  it("**gastarla tira 2d20 con ventaja y la deja a cero, en la misma transacción**", async () => {
    const s = app.getHttpServer();
    const r = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        expression: "1d20+3",
        label: "Percepción",
        audience: "PUBLIC",
        characterId: suyo,
        spendInspiration: true,
      });
    expect(r.status).toBe(201);
    // **La ventaja la compone el servidor**: dos dados y se queda el mejor. Si el cliente pudiera
    // montarla, podría decir que tira con ventaja y mandar `3d20kh1`.
    expect(r.body.rolls).toHaveLength(2);
    expect(r.body.kept).toHaveLength(1);
    expect(r.body.total).toBe(Math.max(...r.body.rolls) + 3);
    expect((await inspiracionDe(suyo, tokenPL))?.current).toBe(0);

    // Y la mesa lo lee: la tirada y el gasto, los dos.
    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const tipos = (log.body.events as { type: string }[]).slice(0, 2).map((e) => e.type);
    expect(tipos).toContain("RESOURCE_SPENT");
    expect(tipos).toContain("ABILITY_ROLL");
  });

  it("con **desventaja** declarada se rechaza con 400 en vez de quemarla para nada", async () => {
    // SRD: ventaja y desventaja se anulan. Gastarla ahí sería perderla y tirar normal, así que la
    // puerta la cierra el esquema antes de tocar la fila.
    const s = app.getHttpServer();
    await request(s)
      .post(`/campaigns/${campaignId}/characters/${suyo}/resources/${CLAVE}/restore`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ amount: 1 });

    const r = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        expression: "1d20+3",
        audience: "PUBLIC",
        mode: "DISADVANTAGE",
        characterId: suyo,
        spendInspiration: true,
      });
    expect(r.status).toBe(400);
    // Y sigue teniéndola: un rechazo no cuesta la inspiración.
    expect((await inspiracionDe(suyo, tokenPL))?.current).toBe(1);
  });

  it("**regalarla mueve las dos filas y deja UN suceso** con los dos nombres", async () => {
    const s = app.getHttpServer();
    const r = await request(s)
      .post(`/campaigns/${campaignId}/characters/${suyo}/resources/${CLAVE}/give`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ toCharacterId: elOtro, amount: 1 });
    expect(r.status).toBe(201);

    expect((await inspiracionDe(suyo, tokenPL))?.current).toBe(0);
    expect((await inspiracionDe(elOtro, tokenPL))?.current).toBe(1);

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const dado = (log.body.events as { type: string; payload: Record<string, unknown> }[]).find(
      (e) => e.type === "RESOURCE_GIVEN",
    );
    // Los nombres, no las claves: el registro se lee.
    expect(dado?.payload).toMatchObject({ fromName: "Brann", toName: "Sirella", remaining: 0 });
  });

  it("y regalar a un personaje de **otra campaña** es 404, no 403", async () => {
    // Un 403 confirmaría que ese personaje existe en algún sitio, que es la fuga de siempre.
    const s = app.getHttpServer();
    const otraCampana = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Otra mesa" })
    ).body.id;
    const ajeno = (
      await request(s)
        .post(`/campaigns/${otraCampana}/characters`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Ajeno", level: 1 })
    ).body.id;

    await request(s)
      .post(`/campaigns/${campaignId}/characters/${elOtro}/resources/${CLAVE}/give`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ toCharacterId: ajeno, amount: 1 })
      .expect(404);

    await prisma.campaign.deleteMany({ where: { id: otraCampana } });
  });
});
