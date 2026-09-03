import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2A.13 contra Postgres real.
//
// Lo unitario ya comprueba la clasificación con dados fijos. Esto comprueba lo otro: que la
// tirada **queda escrita** y que el log la enseña a quien debe y a nadie más — que es lo que
// hace que una tirada sea un hecho de la partida y no una afirmación del navegador.

describe("Tiradas (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-roll${Date.now()}@b.com`;
  const emailPL = `pl-roll${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let idPersonajeDelJugador = "";

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
        .send({ name: "Campaña de tiradas" })
    ).body.id;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${tokenPL}`);
    idPersonajeDelJugador = (
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

  it("un jugador tira, y el DM lo ve en el log", async () => {
    const s = app.getHttpServer();
    const tirada = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ expression: "1d20+3", label: "Percepción", dc: 12, audience: "PUBLIC" });

    expect(tirada.status).toBe(201);
    expect(tirada.body.eventId).toBeTruthy();
    expect(tirada.body.rolls).toHaveLength(1);
    expect(tirada.body.modifier).toBe(3);
    expect(["SUCCESS", "FAILURE"]).toContain(tirada.body.outcome);
    // El total es coherente consigo mismo, sin depender de qué salió el dado.
    expect(tirada.body.total).toBe(tirada.body.rolls[0] + 3);

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const evento = log.body.events.find((e: { id: string }) => e.id === tirada.body.eventId);
    expect(evento.type).toBe("ABILITY_ROLL");
    expect(evento.payload).toMatchObject({ expression: "1d20+3", reason: "Percepción", dc: 12 });
  });

  it("una tirada a ciegas no aparece en el GET del jugador, y sí en el del DM", async () => {
    const s = app.getHttpServer();
    const oculta = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ expression: "1d20", label: "Tirada oculta", audience: "BLIND" });
    expect(oculta.status).toBe(201);

    const delJugador = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(delJugador.body.events.some((e: { id: string }) => e.id === oculta.body.eventId)).toBe(
      false,
    );

    const delDM = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(delDM.body.events.some((e: { id: string }) => e.id === oculta.body.eventId)).toBe(true);
  });

  it("la tirada se cuelga de la sesión en curso sin que nadie lo pida", async () => {
    const s = app.getHttpServer();
    const sesion = (
      await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "La sesión de las tiradas", visibility: "PLAYERS" })
    ).body.id;
    await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion}/start`)
      .set("Authorization", `Bearer ${tokenDM}`);

    const tirada = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ expression: "1d20", audience: "PUBLIC" });

    const log = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ sessionId: sesion })
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(log.body.events.some((e: { id: string }) => e.id === tirada.body.eventId)).toBe(true);

    await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion}/close`)
      .set("Authorization", `Bearer ${tokenDM}`);
  });

  it("el dueño puede tirar por su personaje, y el evento apunta a él", async () => {
    const tirada = await request(app.getHttpServer())
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ expression: "1d20", characterId: idPersonajeDelJugador, audience: "PUBLIC" });
    expect(tirada.status).toBe(201);
    const evento = await prisma.gameEvent.findUnique({ where: { id: tirada.body.eventId } });
    expect(evento).toMatchObject({
      subjectType: "character",
      subjectId: idPersonajeDelJugador,
    });
  });

  it("otro jugador NO puede tirar por esa hoja (403)", async () => {
    const s = app.getHttpServer();
    const email = `otro-roll${Date.now()}@b.com`;
    const token = (
      await request(s)
        .post("/auth/register")
        .send({ email, password: "password123", displayName: "Otro" })
    ).body.token;
    const invite = (
      await request(s)
        .post(`/campaigns/${campaignId}/invites`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", `Bearer ${token}`);

    const res = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${token}`)
      .send({ expression: "1d20", characterId: idPersonajeDelJugador, audience: "PUBLIC" });
    expect(res.status).toBe(403);
    await prisma.user.deleteMany({ where: { email } });
  });

  it("quien no es miembro no puede tirar en esta campaña (403)", async () => {
    const s = app.getHttpServer();
    const email = `fuera-roll${Date.now()}@b.com`;
    const token = (
      await request(s)
        .post("/auth/register")
        .send({ email, password: "password123", displayName: "Fuera" })
    ).body.token;
    const res = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${token}`)
      .send({ expression: "1d20", audience: "PUBLIC" });
    expect(res.status).toBe(403);
    await prisma.user.deleteMany({ where: { email } });
  });

  it("una expresión inválida es 400 y no deja rastro en el log", async () => {
    const s = app.getHttpServer();
    const antes = (
      await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.events.length;

    const res = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ expression: "4d", audience: "PUBLIC" });
    expect(res.status).toBe(400);

    const despues = (
      await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .set("Authorization", `Bearer ${tokenDM}`)
    ).body.events.length;
    expect(despues).toBe(antes);
  });

  it("treinta tiradas de d20 caen todas dentro de 1..20 — el azar es del servidor", async () => {
    // No comprueba la distribución, que sería una prueba inestable: comprueba que **ningún**
    // resultado se sale del dado, que es lo que un sesgo de módulo o un `NaN` romperían.
    //
    // **Treinta y no cien, y el motivo merece leerse:** con cien, esta prueba se ponía roja
    // sola. No por los dados — por el **límite global de 100 peticiones por minuto y por IP**
    // (`DEFAULT_RATE_LIMIT`), que empezaba a devolver 429 a mitad de bucle. La prueba estaba
    // midiendo el limitador. Que eso ocurra deja además una pregunta abierta para una mesa real,
    // anotada como deuda en `docs/06-pendientes.md`.
    const s = app.getHttpServer();
    const totales: number[] = [];
    for (let i = 0; i < 30; i++) {
      const r = await request(s)
        .post(`/campaigns/${campaignId}/rolls`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ expression: "1d20", audience: "BLIND" });
      totales.push(r.body.total);
    }
    expect(totales.every((t) => Number.isInteger(t) && t >= 1 && t <= 20)).toBe(true);
    // Y salen valores distintos: cien tiradas iguales serían un dado roto.
    expect(new Set(totales).size).toBeGreaterThan(5);
  });
  it("**a ciegas, la respuesta del jugador no trae el resultado, y el DM sí lo ve**", async () => {
    // El agujero de 2C.1, contra Postgres real: hasta hoy la tirada quedaba escondida en el
    // registro y **visible en el cuerpo de la petición de su propio autor**, así que la tirada a
    // ciegas no existía aunque el vocabulario dijera que sí.
    const s = app.getHttpServer();
    const ciega = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ expression: "1d20+3", label: "Percepción a ciegas", audience: "BLIND" });

    expect(ciega.status).toBe(201);
    expect(ciega.body.revealed).toBe(false);
    expect(ciega.body.total).toBeUndefined();
    expect(ciega.body.rolls).toBeUndefined();
    expect(ciega.body.natural).toBeUndefined();
    // Y **se tiró de verdad**: el DM la tiene entera en el registro. Ocultar no es no tirar.
    const delDM = await request(s)
      .get(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenDM}`);
    const suya = delDM.body.events.find((e: { id: string }) => e.id === ciega.body.eventId);
    expect(suya.payload.total).toBe(suya.payload.rolls[0] + 3);

    // Y no viaja al jugador: **no se esconde en el cliente, no se manda**.
    const delJugador = await request(s)
      .get(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenPL}`);
    expect(delJugador.body.events.some((e: { id: string }) => e.id === ciega.body.eventId)).toBe(
      false,
    );
  });

  it("el registro de tiradas trae tiradas y nada más, y filtra por sesión y por personaje", async () => {
    const s = app.getHttpServer();
    const sesion = (
      await request(s)
        .post(`/campaigns/${campaignId}/sessions`)
        .set("Authorization", `Bearer ${tokenDM}`)
        .send({ title: "Sesión del registro", visibility: "PLAYERS" })
    ).body.id;
    await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion}/start`)
      .set("Authorization", `Bearer ${tokenDM}`);

    const dePersonaje = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ expression: "1d20", characterId: idPersonajeDelJugador, audience: "PUBLIC" });
    const deCampana = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ expression: "1d6", audience: "PUBLIC" });

    const registro = await request(s)
      .get(`/campaigns/${campaignId}/rolls`)
      .query({ sessionId: sesion })
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(registro.status).toBe(200);
    // **Solo tiradas**: el arranque de la sesión es un suceso de esta misma sesión y NO sale.
    expect(
      registro.body.events.every((e: { type: string }) =>
        ["ABILITY_ROLL", "DEATH_SAVE"].includes(e.type),
      ),
    ).toBe(true);
    const ids = registro.body.events.map((e: { id: string }) => e.id);
    expect(ids).toContain(dePersonaje.body.eventId);
    expect(ids).toContain(deCampana.body.eventId);

    const soloDelPersonaje = await request(s)
      .get(`/campaigns/${campaignId}/rolls`)
      .query({ characterId: idPersonajeDelJugador })
      .set("Authorization", `Bearer ${tokenDM}`);
    const idsPersonaje = soloDelPersonaje.body.events.map((e: { id: string }) => e.id);
    expect(idsPersonaje).toContain(dePersonaje.body.eventId);
    expect(idsPersonaje).not.toContain(deCampana.body.eventId);

    await request(s)
      .post(`/campaigns/${campaignId}/sessions/${sesion}/close`)
      .set("Authorization", `Bearer ${tokenDM}`);
  });

  it("**«solo las mías» son las de MIS personajes**, no las de la mesa (ficha C2C-7)", async () => {
    const s = app.getHttpServer();
    // Una del personaje de la jugadora y otra del DM, sin personaje.
    const suya = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ expression: "1d20", characterId: idPersonajeDelJugador, audience: "PUBLIC" });
    const delDM = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ expression: "1d20", audience: "PUBLIC" });

    const mias = await request(s)
      .get(`/campaigns/${campaignId}/rolls`)
      .query({ mine: "true" })
      .set("Authorization", `Bearer ${tokenPL}`);

    const ids = mias.body.events.map((e: { id: string }) => e.id);
    expect(ids).toContain(suya.body.eventId);
    expect(ids).not.toContain(delDM.body.eventId);
  });

  it("y para quien no tiene personajes, «las mías» son **ninguna**, no todas", async () => {
    // Es el fallo silencioso de este filtro: enseñar la lista entera a quien pidió la suya.
    //
    // Se comprueba con **el DM, que no tiene personajes en esta campaña**, y no registrando una
    // cuenta nueva a propósito: el límite de intentos de `/auth/register` es de cinco por minuto y
    // por IP, y esta suite ya gasta cuatro. Una prueba que añade un registro más hace fallar a
    // **otra** prueba, que es justo el intermitente que este proyecto ya documentó.
    const s = app.getHttpServer();

    const mias = await request(s)
      .get(`/campaigns/${campaignId}/rolls`)
      .query({ mine: "true" })
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(mias.body.events).toHaveLength(0);

    // Y sin el filtro sí ve las de la mesa: `mine` acota, no relaja.
    const todas = await request(s)
      .get(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${tokenDM}`);
    expect(todas.body.events.length).toBeGreaterThan(0);
  });

  it("quien no es miembro no puede leer el registro de tiradas (403)", async () => {
    const s = app.getHttpServer();
    const email = `fuera-reg${Date.now()}@b.com`;
    const token = (
      await request(s)
        .post("/auth/register")
        .send({ email, password: "password123", displayName: "Fuera" })
    ).body.token;
    const res = await request(s)
      .get(`/campaigns/${campaignId}/rolls`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    await prisma.user.deleteMany({ where: { email } });
  });
});
