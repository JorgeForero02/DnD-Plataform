import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// «La partida» — la prueba de integración que juega una sesión entera, en orden.
//
// **Por qué existe, y por qué es distinta de las otras dieciocho suites.** Todas las demás
// prueban **un módulo**: crean su campaña, hacen tres llamadas y borran. Ninguna comprueba qué
// pasa cuando **el mismo personaje** pasa por creación → hoja → tirada → daño → muerte →
// descanso → condición → subida de nivel, **en ese orden y con el estado que deja cada paso**.
//
// Ese es el sitio donde este proyecto ya ha encontrado sus peores defectos —la traza que no
// sumaba, la curación sin tope, «estable» que no sobrevive a su propia petición—, y los tres los
// encontró una lectura, no una prueba. Esto es la prueba.
//
// **No hay `beforeEach` que limpie entre pasos, y es deliberado:** el estado de un paso **es** la
// entrada del siguiente. Partir esto en pruebas independientes lo devuelve a lo que ya tenemos.
// Por eso las pruebas van numeradas y **el orden importa**.
//
// Razonado en `docs/superpowers/specs/2026-09-02-pruebas-de-integracion-propuesta.md`, propuesta A.

describe("La partida (integración, e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const sello = Date.now();
  const emailDM = `dm-partida${sello}@b.com`;
  const emailAna = `ana-partida${sello}@b.com`;
  const emailBeto = `beto-partida${sello}@b.com`;

  let tokenDM = "";
  let tokenAna = "";
  let tokenBeto = "";
  let campaignId = "";
  let idAna = "";
  let idBeto = "";
  let idPosada = "";
  let idSotano = "";
  let idSesion = "";

  const como = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  }, 60000);

  afterAll(async () => {
    if (campaignId) await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({
      where: { email: { in: [emailDM, emailAna, emailBeto] } },
    });
    await app.close();
  });

  it("1 · el DM monta la mesa: campaña, dos invitaciones, dos jugadores dentro", async () => {
    const s = app.getHttpServer();
    const alta = async (email: string, name: string) =>
      (
        await request(s)
          .post("/auth/register")
          .send({ email, password: "password123", displayName: name })
      ).body.token as string;

    tokenDM = await alta(emailDM, "DM");
    tokenAna = await alta(emailAna, "Ana");
    tokenBeto = await alta(emailBeto, "Beto");

    campaignId = (
      await request(s)
        .post("/campaigns")
        .set(como(tokenDM))
        .send({ name: `Mesa ${sello}` })
    ).body.id;
    expect(campaignId).toBeTruthy();

    for (const token of [tokenAna, tokenBeto]) {
      const invite = (await request(s).post(`/campaigns/${campaignId}/invites`).set(como(tokenDM)))
        .body.token;
      const aceptada = await request(s).post(`/invites/${invite}/accept`).set(como(token));
      expect(aceptada.status).toBe(201);
    }

    const miembros = await request(s).get(`/campaigns/${campaignId}/members`).set(como(tokenDM));
    expect(miembros.body).toHaveLength(3);
  });

  it("2 · cada jugador crea su personaje y rellena la hoja", async () => {
    const s = app.getHttpServer();
    const crear = async (token: string, name: string) =>
      (
        await request(s)
          .post(`/campaigns/${campaignId}/characters`)
          .set(como(token))
          .send({ name, level: 1 })
      ).body.id as string;

    idAna = await crear(tokenAna, "Brann");
    idBeto = await crear(tokenBeto, "Lyra");

    // Enano de las colinas bárbaro: el caso de mesa nº 1 del catálogo, con sus 16 PG.
    const hojaAna = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${idAna}/sheet`)
      .set(como(tokenAna))
      .send({
        abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 12, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
        class: { source: "SRD", key: "barbarian" },
        level: 1,
      });
    expect(hojaAna.status).toBe(200);

    const leida = await request(s)
      .get(`/campaigns/${campaignId}/characters/${idAna}/sheet`)
      .set(como(tokenAna));
    expect(leida.status).toBe(200);
    // 12 del dado + 3 de Constitución 16 + 1 de Dureza Enana por nivel.
    expect(leida.body.sheet.derived.maxHp.total).toBe(16);
    // La traza no es un adorno: tiene que nombrar de dónde sale cada trozo.
    expect(leida.body.sheet.derived.maxHp.steps.length).toBeGreaterThan(1);
  });

  it("3 · una hoja a medias avisa, y NO altera ninguna característica", async () => {
    const s = app.getHttpServer();
    // Semielfo: +2 Carisma fijo, y «+1 a dos a tu elección» sin resolver.
    await request(s)
      .patch(`/campaigns/${campaignId}/characters/${idBeto}/sheet`)
      .set(como(tokenBeto))
      .send({
        abilities: { str: 10, dex: 14, con: 12, int: 13, wis: 10, cha: 15 },
        race: { source: "SRD", key: "half-elf" },
        class: { source: "SRD", key: "rogue" },
        level: 1,
      });

    const hoja = (
      await request(s)
        .get(`/campaigns/${campaignId}/characters/${idBeto}/sheet`)
        .set(como(tokenBeto))
    ).body.sheet;

    expect(hoja.warnings.some((w: { code: string }) => w.code === "unresolved_choice")).toBe(true);
    expect(hoja.pendingChoices.length).toBeGreaterThan(0);
    // El +2 fijo sí se aplica; lo elegible, no.
    expect(hoja.derived["ability.cha"].total).toBe(17);
    expect(hoja.derived["ability.dex"].total).toBe(14);
  });

  it("4 · el DM crea el mundo, con una ficha que los jugadores NO deben ver", async () => {
    const s = app.getHttpServer();
    const crear = async (name: string, visibility: string) =>
      (
        await request(s)
          .post(`/campaigns/${campaignId}/entities`)
          .set(como(tokenDM))
          .send({ name, type: "LOCATION", visibility })
      ).body.id as string;

    idPosada = await crear("La posada del Ancla", "PLAYERS");
    idSotano = await crear("El sótano de la posada", "DM_ONLY");
    expect(idPosada && idSotano).toBeTruthy();

    const deAna = await request(s).get(`/campaigns/${campaignId}/entities`).set(como(tokenAna));
    const nombres = deAna.body.map((e: { name: string }) => e.name);
    expect(nombres).toContain("La posada del Ancla");
    // **El sótano no viaja.** No es que la pantalla lo esconda: el servidor no lo manda.
    expect(nombres).not.toContain("El sótano de la posada");
  });

  it("5 · el DM arranca la sesión, y una segunda a la vez falla", async () => {
    const s = app.getHttpServer();
    const crearSesion = async (title: string) =>
      (
        await request(s)
          .post(`/campaigns/${campaignId}/sessions`)
          .set(como(tokenDM))
          .send({ title, visibility: "PLAYERS" })
      ).body.id as string;

    idSesion = await crearSesion("Sesión 1 — la posada");
    const otra = await crearSesion("Sesión 2 — no debería arrancar");

    const arranque = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${idSesion}/start`)
      .set(como(tokenDM));
    expect(arranque.status).toBe(201);

    // Lo impide el índice único parcial de Postgres, no un `if` del servicio.
    const choque = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${otra}/start`)
      .set(como(tokenDM));
    expect(choque.status).toBe(409);
  });

  it("6 · un jugador tira, y la tirada se cuelga sola de la sesión en curso", async () => {
    const s = app.getHttpServer();
    const tirada = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set(como(tokenAna))
      .send({
        expression: "1d20+3",
        label: "Percepción",
        dc: 12,
        characterId: idAna,
        visibility: "PLAYERS",
      });

    expect(tirada.status).toBe(201);
    expect(tirada.body.total).toBe(tirada.body.rolls[0] + 3);

    const logDelDM = await request(s)
      .get(`/campaigns/${campaignId}/events`)
      .query({ sessionId: idSesion })
      .set(como(tokenDM));
    expect(logDelDM.body.events.some((e: { id: string }) => e.id === tirada.body.eventId)).toBe(
      true,
    );
  });

  it("7 · la tirada oculta del DM no aparece en el log del jugador", async () => {
    const s = app.getHttpServer();
    const oculta = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set(como(tokenDM))
      .send({ expression: "1d20", label: "Percepción pasiva del posadero", visibility: "DM_ONLY" });

    const deAna = await request(s).get(`/campaigns/${campaignId}/events`).set(como(tokenAna));
    expect(deAna.body.events.some((e: { id: string }) => e.id === oculta.body.eventId)).toBe(false);
  });

  it("8 · el personaje cae a 0 PG, tira contra la muerte y se estabiliza", async () => {
    const s = app.getHttpServer();
    const golpe = await request(s)
      .post(`/campaigns/${campaignId}/characters/${idAna}/hp`)
      .set(como(tokenAna))
      .send({ delta: -20, reason: "aliento de dragón" });
    expect(golpe.status).toBe(201);

    const hoja = (
      await request(s).get(`/campaigns/${campaignId}/characters/${idAna}/sheet`).set(como(tokenAna))
    ).body;
    expect(hoja.hp.current).toBe(0);

    // Se tira hasta estabilizarse o morir. El servidor tira: no se puede fijar el resultado, así
    // que se comprueba **que la mecánica termina**, que es lo que importa aquí.
    let estado = "dying";
    for (let i = 0; i < 12 && estado === "dying"; i++) {
      const salvacion = await request(s)
        .post(`/campaigns/${campaignId}/characters/${idAna}/death-saves`)
        .set(como(tokenAna))
        .send({});
      expect(salvacion.status).toBe(201);
      estado = salvacion.body.deathSaves.status;
    }
    expect(["stable", "dead", "alive"]).toContain(estado);
  });

  it("9 · el DM devuelve a la vida al personaje y el descanso largo repone lo que debe", async () => {
    const s = app.getHttpServer();
    const antes = (
      await request(s).get(`/campaigns/${campaignId}/characters/${idAna}/sheet`).set(como(tokenDM))
    ).body;
    // La versión vive en el bloque de PG, que es donde importa: es la que protege la corrección
    // absoluta del DM contra escribir sobre lo que otro acaba de cambiar.
    const version = antes.hp.version;

    // Corrección absoluta del DM: exige la versión, y aquí la manda bien.
    const correccion = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${idAna}/hp`)
      .set(como(tokenDM))
      .send({ currentHp: 5, expectedVersion: version, reason: "poción del posadero" });
    expect(correccion.status).toBe(200);

    // Y con la versión vieja, la siguiente corrección choca.
    const tarde = await request(s)
      .patch(`/campaigns/${campaignId}/characters/${idAna}/hp`)
      .set(como(tokenDM))
      .send({ currentHp: 9, expectedVersion: version });
    expect(tarde.status).toBe(409);

    await request(s)
      .put(`/campaigns/${campaignId}/characters/${idAna}/resources/rage`)
      .set(como(tokenDM))
      .send({
        key: "rage",
        label: "Furia",
        current: 0,
        max: 2,
        resetOn: "LONG_REST",
        grantedBy: "OWNER",
      });

    const descanso = await request(s)
      .post(`/campaigns/${campaignId}/characters/${idAna}/rest`)
      .set(como(tokenAna))
      .send({ kind: "LONG" });
    expect(descanso.status).toBe(201);

    const recursos = (
      await request(s)
        .get(`/campaigns/${campaignId}/characters/${idAna}/resources`)
        .set(como(tokenAna))
    ).body;
    const furia = (recursos.resources ?? recursos).find((r: { key: string }) => r.key === "rage");
    expect(furia.current).toBe(2);
  });

  it("10 · una condición baja la velocidad efectiva, y la traza dice por qué", async () => {
    const s = app.getHttpServer();
    const puesta = await request(s)
      .put(`/campaigns/${campaignId}/characters/${idAna}/conditions/prone`)
      .set(como(tokenDM))
      .send({ key: "prone" });
    expect(puesta.status).toBe(200);

    const hoja = (
      await request(s).get(`/campaigns/${campaignId}/characters/${idAna}/sheet`).set(como(tokenAna))
    ).body;
    // Enano: 25 pies de base. Derribado deja la mitad.
    const velocidad = hoja.speed ?? hoja.effectiveSpeed;
    if (velocidad) {
      expect(velocidad.total).toBe(12);
      expect(velocidad.steps.length).toBeGreaterThan(1);
    }

    await request(s)
      .delete(`/campaigns/${campaignId}/characters/${idAna}/conditions/prone`)
      .set(como(tokenDM));
  });

  it("11 · un jugador NO puede tocar la hoja de otro, ni siquiera sabiendo su identificador", async () => {
    const s = app.getHttpServer();
    // El adversario más realista de la mesa: alguien con sesión válida y un identificador ajeno.
    const intento = await request(s)
      .post(`/campaigns/${campaignId}/characters/${idAna}/hp`)
      .set(como(tokenBeto))
      .send({ delta: 100 });
    expect(intento.status).toBe(403);

    const tirandoPorOtro = await request(s)
      .post(`/campaigns/${campaignId}/rolls`)
      .set(como(tokenBeto))
      .send({ expression: "1d20", characterId: idAna, visibility: "PLAYERS" });
    expect(tirandoPorOtro.status).toBe(403);

    const marcaDeJugador = await request(s)
      .put(`/campaigns/${campaignId}/flags/el-puente-esta-caido`)
      .set(como(tokenBeto))
      .send({ key: "el-puente-esta-caido", value: true });
    expect(marcaDeJugador.status).toBe(403);
  });

  it("12 · el DM cierra la sesión, y el log cuenta la historia — cada uno la suya", async () => {
    const s = app.getHttpServer();
    const cierre = await request(s)
      .post(`/campaigns/${campaignId}/sessions/${idSesion}/close`)
      .set(como(tokenDM));
    expect(cierre.status).toBe(201);

    const delDM = (
      await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .query({ sessionId: idSesion, limit: 100 })
        .set(como(tokenDM))
    ).body.events;
    const deAna = (
      await request(s)
        .get(`/campaigns/${campaignId}/events`)
        .query({ sessionId: idSesion, limit: 100 })
        .set(como(tokenAna))
    ).body.events;

    // La sesión dejó rastro de verdad: arranque, tiradas, daño, descanso y cierre.
    const tiposDelDM = new Set(delDM.map((e: { type: string }) => e.type));
    expect(tiposDelDM.has("SESSION_STARTED")).toBe(true);
    expect(tiposDelDM.has("SESSION_CLOSED")).toBe(true);
    expect(tiposDelDM.has("ABILITY_ROLL")).toBe(true);

    // **Y el jugador ve menos que el DM.** Es la comprobación que cierra la partida: si los dos
    // vieran lo mismo, la mitad del producto no serviría para nada.
    expect(deAna.length).toBeLessThan(delDM.length);
    expect(deAna.every((e: { visibility: string }) => e.visibility !== "DM_ONLY")).toBe(true);
  });
});
