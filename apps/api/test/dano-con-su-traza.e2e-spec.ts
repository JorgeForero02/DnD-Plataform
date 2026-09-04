import { Test } from "@nestjs/testing";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// Tarea 2.5.4, contra Postgres real — el daño aplicado desde la tirada, con su traza.
//
// **Lo que solo puede vivir aquí.** Las unitarias (`character-sheet.service.spec.ts`) ya cubren
// la aritmética y el cableado con Prisma simulado; esto comprueba la cadena HTTP → guardia →
// pipe → servicio → base sobre un `GameEvent` y un `RollRequest` reales: que `rollEventId`
// sobrevive el viaje de ida y vuelta por la columna `Json`, que un identificador inventado se
// rechaza contra la base de verdad (un mock nunca lo haría — siempre "existe" lo que el test le
// diga), y que la petición de salvación de concentración aparece donde la pantalla del jugador
// la sondea de verdad: `GET /campaigns/:id/roll-requests`.

describe("El daño, con su traza (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const emailDM = `dm-dmg2${Date.now()}@b.com`;
  const emailPL = `pl-dmg2${Date.now()}@b.com`;
  let tokenDM = "";
  let tokenPL = "";
  let campaignId = "";
  let tumularioId = "";

  const auth = (t: string) => `Bearer ${t}`;
  const npcs = () => `/campaigns/${campaignId}/npcs`;
  const ficha = (id: string) => `/campaigns/${campaignId}/characters/${id}`;
  const eventos = () => `/campaigns/${campaignId}/events`;
  const rolls = () => `/campaigns/${campaignId}/rolls`;
  const rollRequests = () => `/campaigns/${campaignId}/roll-requests`;
  const condiciones = (id: string, key: string) => `${ficha(id)}/conditions/${key}`;

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
        .send({ name: "El cadáver que concentraba" })
    ).body.id;
    const invite = (
      await request(s).post(`/campaigns/${campaignId}/invites`).set("Authorization", auth(tokenDM))
    ).body.token;
    await request(s).post(`/invites/${invite}/accept`).set("Authorization", auth(tokenPL));

    const npc = await request(s)
      .post(npcs())
      .set("Authorization", auth(tokenDM))
      .send({ ref: "SRD:wight" });
    tumularioId = npc.body[0].id;
  });

  afterAll(async () => {
    if (campaignId) await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: [emailDM, emailPL] } } }).catch(() => {});
    await app.close();
  });

  it("el suceso del registro dice de qué tirada salió el daño, y sobrevive el viaje por la base", async () => {
    const s = app.getHttpServer();
    // Una tirada de daño real, con su propio eventId — el mismo patrón que usaría la DAMAGE de
    // `rollAttack`.
    const tirada = await request(s)
      .post(rolls())
      .set("Authorization", auth(tokenDM))
      .send({ expression: "2d8+3", label: "Daño de mandoble" });
    expect(tirada.status).toBe(201);
    const rollEventId = tirada.body.eventId;
    expect(rollEventId).toBeTruthy();

    const golpe = await request(s)
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -10, damageType: "BLUDGEONING", rollEventId });
    expect(golpe.status).toBe(201);

    const log = await request(s).get(eventos()).set("Authorization", auth(tokenDM));
    const hpChanged = log.body.events.find(
      (e: { subjectId: string; payload: { type: string } }) =>
        e.subjectId === tumularioId && e.payload.type === "HP_CHANGED",
    );
    expect(hpChanged).toBeDefined();
    expect(hpChanged.payload.rollEventId).toBe(rollEventId);
  });

  it("un rollEventId que no existe en esta campaña es 400, no una causa inventada", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -3, rollEventId: "clx000000000000000000009" });
    expect(r.status).toBe(400);
  });

  it("un personaje concentrado que recibe daño real hace que el sistema PIDA una salvación de Constitución, con CD 10 o la mitad del daño", async () => {
    const s = app.getHttpServer();
    // Un jugador con su propio personaje, concentrándose — el ejemplo que trae el propio spec.
    const jugador = await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set("Authorization", auth(tokenPL))
      // **Nivel 8, y el nivel es lo que hace alcanzable este caso.** A nivel 1 una guerrera con
      // Constitución 14 tiene 12 PG máximos, así que los 25 de daño del ejemplo del spec la
      // matan de golpe —sobrante ≥ máximos: muerte masiva— y la salvación no se pide nunca. El
      // ejemplo de cierre del propio spec («25 de daño … CD 12») era **irrealizable a nivel 1**,
      // y esta prueba se escribió sin ejecutarse. Con 68 PG el golpe la deja viva, que es la
      // situación que la regla describe.
      .send({ name: "Elara", level: 8, visibility: "PLAYERS" });
    const elaraId = jugador.body.id;
    await request(s)
      .patch(`${ficha(elaraId)}/sheet`)
      .set("Authorization", auth(tokenPL))
      .send({
        abilities: { str: 10, dex: 12, con: 14, int: 15, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    await request(s)
      .put(condiciones(elaraId, "concentrating-on-bless"))
      .set("Authorization", auth(tokenDM))
      .send({ note: "Concentrándose en Bendición" });

    // 25 de daño, sin resistencia: la mitad (12) supera el suelo de 10 — el ejemplo del propio
    // spec ("si estaba concentrado, el sistema pide una salvación con CD 12").
    const golpe = await request(s)
      .post(`${ficha(elaraId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -25 });
    expect(golpe.status).toBe(201);
    expect(golpe.body.concentrationSave).toBeDefined();
    expect(golpe.body.concentrationSave.dc).toBe(12);

    // Y la pide de VERDAD: donde la pantalla del jugador sondea, no solo en la respuesta HTTP
    // del golpe.
    const pendientes = await request(s).get(rollRequests()).set("Authorization", auth(tokenPL));
    expect(pendientes.status).toBe(200);
    const peticion = pendientes.body.find(
      (p: { characterId: string; key: string }) =>
        p.characterId === elaraId && p.key === "save.con",
    );
    expect(peticion).toBeDefined();
    expect(peticion.dc).toBe(12);
    expect(peticion.resolvedAt).toBeNull();

    // **El sistema no decide si se pierde.** Responderla es tirar, como cualquier petición de
    // 2C.5 — se comprueba que el camino de siempre sigue abierto, no que la tirada salga bien.
    const respuesta = await request(s)
      .post(`${rollRequests()}/${peticion.id}/roll`)
      .set("Authorization", auth(tokenPL));
    expect(respuesta.status).toBe(201);
  });

  it("una salvación por cada fuente de daño: dos golpes concentrados piden dos peticiones, no una", async () => {
    const s = app.getHttpServer();
    const jugador = await request(s)
      .post(`/campaigns/${campaignId}/characters`)
      .set("Authorization", auth(tokenPL))
      .send({ name: "Bram", level: 1, visibility: "PLAYERS" });
    const bramId = jugador.body.id;
    await request(s)
      .patch(`${ficha(bramId)}/sheet`)
      .set("Authorization", auth(tokenPL))
      .send({
        abilities: { str: 10, dex: 12, con: 16, int: 15, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      });
    await request(s)
      .put(condiciones(bramId, "concentrating-on-haste"))
      .set("Authorization", auth(tokenDM))
      .send({});

    await request(s)
      .post(`${ficha(bramId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -6 });
    await request(s)
      .post(`${ficha(bramId)}/hp`)
      .set("Authorization", auth(tokenDM))
      .send({ delta: -6 });

    const pendientes = await request(s)
      .get(`${rollRequests()}?includeResolved=true`)
      .set("Authorization", auth(tokenPL));
    const deBram = pendientes.body.filter(
      (p: { characterId: string; key: string }) => p.characterId === bramId && p.key === "save.con",
    );
    expect(deBram.length).toBe(2);
  });

  it("un jugador que no es dueño ni DM no puede aplicar daño con un rollEventId ajeno", async () => {
    const r = await request(app.getHttpServer())
      .post(`${ficha(tumularioId)}/hp`)
      .set("Authorization", auth(tokenPL))
      .send({ delta: -5, rollEventId: "clx000000000000000000009" });
    expect(r.status).toBe(403);
  });
});
