import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2C.5 contra Postgres real: **el DM pide, el jugador tira, el DM ve el resultado.**
//
// El recorrido entero con dos cuentas de verdad, que es lo que ninguna unitaria puede: que la
// petición **le llega al jugador y no a los demás**, que al responderla se tira con SU hoja, y que
// pedida a ciegas el jugador **no ve su propio resultado** y el DM sí.

describe("Petición de tirada (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-req${Date.now()}@b.com`;
  const emailPL = `pl-req${Date.now()}@b.com`;
  const emailOtro = `otro-req${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let tokenOtro = "";
  let campaignId = "";
  let characterId = "";

  const reqUrl = () => `/campaigns/${campaignId}/roll-requests`;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    const s = app.getHttpServer();

    const registrar = async (email: string, nombre: string) =>
      (
        await request(s)
          .post("/auth/register")
          .send({ email, password: "password123", displayName: nombre })
      ).body.token;

    tokenDM = await registrar(emailDM, "DM");
    tokenPL = await registrar(emailPL, "Jugadora");
    tokenOtro = await registrar(emailOtro, "Otro");

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ name: "Campaña de las peticiones" })
    ).body.id;

    for (const token of [tokenPL, tokenOtro]) {
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
        .set("Authorization", `Bearer ${tokenPL}`)
        .send({ name: "Ana", level: 3 })
    ).body.id;
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({
        abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 16, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL, emailOtro] } } });
    await app.close();
  });

  it("un jugador no puede pedir tiradas (403)", async () => {
    const r = await request(app.getHttpServer())
      .post(reqUrl())
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ characterIds: [characterId], key: "skill.perception", label: "Percepción" });
    expect(r.status).toBe(403);
  });

  it("**el DM pide, y le aparece a quien es — y a nadie más**", async () => {
    const s = app.getHttpServer();
    const pedir = await request(s)
      .post(reqUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        characterIds: [characterId],
        key: "skill.perception",
        label: "Percepción para ver si oís al posadero",
        dc: 14,
      });
    expect(pedir.status).toBe(201);
    expect(pedir.body).toHaveLength(1);

    const deLaJugadora = await request(s).get(reqUrl()).set("Authorization", `Bearer ${tokenPL}`);
    expect(deLaJugadora.body).toHaveLength(1);
    expect(deLaJugadora.body[0]).toMatchObject({ key: "skill.perception", dc: 14 });

    // El otro jugador de la mesa no tiene nada pendiente: no es su personaje.
    const delOtro = await request(s).get(reqUrl()).set("Authorization", `Bearer ${tokenOtro}`);
    expect(delOtro.body).toHaveLength(0);

    // Y el DM ve la que hizo.
    const delDM = await request(s).get(reqUrl()).set("Authorization", `Bearer ${tokenDM}`);
    expect(delDM.body).toHaveLength(1);
  });

  it("**otro jugador no puede responderla**, y recibe 404: un 403 confirmaría que existe", async () => {
    const s = app.getHttpServer();
    const pendiente = (await request(s).get(reqUrl()).set("Authorization", `Bearer ${tokenDM}`))
      .body[0];

    const r = await request(s)
      .post(`${reqUrl()}/${pendiente.id}/roll`)
      .set("Authorization", `Bearer ${tokenOtro}`);
    // 404 y no 403, igual que decidió la pantalla de tablas para el mismo dilema: un 403 confirma
    // que esa petición existe en esta campaña, y el listado ya esconde las ajenas.
    expect(r.status).toBe(404);
  });

  it("la jugadora responde, y **se tira con el modificador de SU hoja**", async () => {
    const s = app.getHttpServer();
    const pendiente = (await request(s).get(reqUrl()).set("Authorization", `Bearer ${tokenPL}`))
      .body[0];

    const hoja = await request(s)
      .get(`/campaigns/${campaignId}/characters/${characterId}/sheet`)
      .set("Authorization", `Bearer ${tokenPL}`);
    const modificador = hoja.body.sheet.derived["skill.perception"].total;

    const tirada = await request(s)
      .post(`${reqUrl()}/${pendiente.id}/roll`)
      .set("Authorization", `Bearer ${tokenPL}`);

    expect(tirada.status).toBe(201);
    expect(tirada.body.revealed).toBe(true);
    expect(tirada.body.modifier).toBe(modificador);
    expect(tirada.body.total).toBe(tirada.body.rolls[0] + modificador);
    expect(tirada.body.dc).toBe(14);
  });

  it("y deja de estar pendiente: **el botón desaparece**, y no se puede responder dos veces", async () => {
    const s = app.getHttpServer();
    const pendientes = await request(s).get(reqUrl()).set("Authorization", `Bearer ${tokenPL}`);
    expect(pendientes.body).toHaveLength(0);

    const todas = await request(s)
      .get(reqUrl())
      .query({ includeResolved: "true" })
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(todas.body).toHaveLength(1);
    expect(todas.body[0].resolvedEventId).toBeTruthy();

    const otraVez = await request(s)
      .post(`${reqUrl()}/${todas.body[0].id}/roll`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(otraVez.status).toBe(400);
  });

  it("**pedida a ciegas: la jugadora tira y no ve su resultado; el DM sí**", async () => {
    const s = app.getHttpServer();
    const pedir = await request(s)
      .post(reqUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({
        characterIds: [characterId],
        key: "skill.perception",
        label: "Percepción a ciegas",
        audience: "BLIND",
      });
    const peticion = pedir.body[0];

    const tirada = await request(s)
      .post(`${reqUrl()}/${peticion.id}/roll`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(tirada.body.revealed).toBe(false);
    expect(tirada.body.total).toBeUndefined();

    const registroDM = await request(s)
      .get(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const suya = registroDM.body.events.find((e: { id: string }) => e.id === tirada.body.eventId);
    expect(suya.payload.total).toBeGreaterThan(0);
  });

  it("pedir un valor que la hoja no deriva es un 400 al responder, no una tirada de 1d20+0", async () => {
    const s = app.getHttpServer();
    const pedir = await request(s)
      .post(reqUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ characterIds: [characterId], key: "skill.inventada", label: "Lo que no existe" });
    const peticion = pedir.body[0];

    const r = await request(s)
      .post(`${reqUrl()}/${peticion.id}/roll`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(r.status).toBe(400);
  });

  it("la guía de CD del SRD llega en el catálogo, para que la pantalla no la transcriba", async () => {
    const r = await request(app.getHttpServer())
      .get("/catalog")
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(r.body.difficultyClasses).toEqual([
      { key: "very-easy", dc: 5 },
      { key: "easy", dc: 10 },
      { key: "medium", dc: 15 },
      { key: "hard", dc: 20 },
      { key: "very-hard", dc: 25 },
      { key: "nearly-impossible", dc: 30 },
    ]);
  });

  // Esta es la que la ficha P2-10 nombraba: 1,4 s sola, y por encima del tope por defecto con la
  // suite entera junta. Ya no lleva número propio — el tope de esta capa se declara una sola vez,
  // en `test/tiempo-de-espera.ts`, con la medición que lo justifica.
  it("con 60 peticiones sueltas, las de un encuentro siguen saliendo (paso 1, tarea 17)", async () => {
    const s = app.getHttpServer();
    // **El corte de cincuenta hacía mentir a la sala de espera.** La lista sale por fecha
    // descendente con `take: 50`; con más de cincuenta pendientes de otro tipo, las de iniciativa
    // del combate recién abierto se caen de la página y `TiraDeIniciativa` lee «todos han tirado»
    // sin que nadie haya tirado. El `[]` de la página cincuenta es indistinguible de cero.
    //
    // Contra Postgres y no con un Prisma simulado **a propósito**: lo que falla aquí son el `take`
    // y el `orderBy` de verdad, y un mock devuelve lo que se le ponga sin mirar ninguno.

    // La petición del combate va PRIMERO, que es lo que la condena con el orden descendente.
    const sesion = (
      await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "La sala de espera", visibility: "PLAYERS" })
    ).body.id;
    const laDelCombate = (
      await request(s)
        .post(reqUrl())
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ characterIds: [characterId], key: "initiative", label: "Iniciativa" })
    ).body[0];
    // El encuentro no lo abre esta prueba —eso es otra suite—; lo que hace falta es que la fila
    // esté ligada a uno, y eso es legítimo prepararlo por Prisma cuando la API no lo expone así.
    const encuentro = await prisma.encounter.create({
      data: { sessionId: sesion, status: "PREPARING", round: 1, activePosition: 0 },
    });
    await prisma.rollRequest.update({
      where: { id: laDelCombate.id },
      data: { encounterId: encuentro.id },
    });

    for (let i = 0; i < 60; i++) {
      await request(s)
        .post(reqUrl())
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ characterIds: [characterId], key: "skill.perception", label: `Ruido ${i}` })
        .expect(201);
    }

    // **Sin filtro, la del combate ya no está**: es exactamente el fallo, y sigue ahí porque el
    // arreglo no sube el tope.
    const sinFiltro = await request(s)
      .get(reqUrl())
      .set("Authorization", `Bearer ${tokenDM}`)
      .expect(200);
    expect(sinFiltro.body).toHaveLength(50);
    expect(sinFiltro.body.map((r: { id: string }) => r.id)).not.toContain(laDelCombate.id);

    // **Con el filtro, sí.** Es lo que permite a la sala de espera distinguir «nadie ha tirado» de
    // «se cayeron de la página».
    const conFiltro = await request(s)
      .get(reqUrl())
      .query({ encounterId: encuentro.id })
      .set("Authorization", `Bearer ${tokenDM}`)
      .expect(200);
    expect(conFiltro.body.map((r: { id: string }) => r.id)).toEqual([laDelCombate.id]);
  });
});
